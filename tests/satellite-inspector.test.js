"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const Metadata=require("../adapters/esri-imagery-metadata.js");
const Inspector=require("../ui/satellite-inspector.js");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");

test("Esri imagery requests only on selection and returns the ordered user fields",async()=>{
  const calls=[];
  const provider=new Metadata({fetchImpl:async (url,options)=>{
    calls.push({url:String(url),options});
    return {ok:true,json:async()=>({results:[{layerId:4,attributes:{
      SOURCE:"Imagery consortium","DATE (YYYYMMDD)":20240115,"ACCURACY (M)":2.7,
      "RESOLUTION (M)":0.5,SOURCE_INFO:"Imagery attribution",
      OBJECTID:18,OTHER_SECRET:"not displayed"
    }}]})};
  }});
  assert.equal(calls.length,0);
  const result=await provider.identify({lat:48.7758,lng:9.1829},{zoom:17});
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.cache,"no-store");
  assert.match(calls[0].url,/World_Imagery\/MapServer\/identify/);
  assert.match(calls[0].url,/layers=all%3A4/);
  assert.deepEqual(result.fields,[
    {name:"Aufnahmedatum",value:"20240115"},
    {name:"Resolution",value:"0.5"},
    {name:"Accuracy",value:"2.7"},
    {name:"Source_info",value:"Imagery attribution"},
    {name:"Datenquelle",value:"Imagery consortium"}
  ]);
  assert.match(result.waybackUrl,/^https:\/\/livingatlas\.arcgis\.com\/wayback\/#mapCenter=/);
  assert.match(decodeURIComponent(result.waybackUrl),/9\.1829,48\.7758,17/);
});
test("alternative Esri field keys and original values are preserved",async()=>{
  const provider=new Metadata({fetchImpl:async()=>({ok:true,json:async()=>({results:[{
    attributes:{SRC_DATE:"20260230",SRC_RES:99999,SRC_ACC:99999,
      NICE_NAME:"Photograph by agency",NICE_DESC:"Agency source",UNRELATED:"ignore"}
  }]})})});
  const result=await provider.identify({lat:0,lng:0},{zoom:4});
  assert.deepEqual(result.fields,[
    {name:"Aufnahmedatum",value:"20260230"},
    {name:"Resolution",value:"Nicht verfügbar"},
    {name:"Accuracy",value:"Nicht verfügbar"},
    {name:"Source_info",value:"Photograph by agency"},
    {name:"Datenquelle",value:"Agency source"}
  ]);
});
test("actual Esri alias labels preserve original zero, precision and date text",async()=>{
  const provider=new Metadata({fetchImpl:async()=>({ok:true,json:async()=>({results:[{layerId:4,attributes:{
    "DATE (YYYYMMDD)":"2024-05-19","RESOLUTION (M)":0.31,"ACCURACY (M)":0,
    "SOURCE_INFO":"Vivid Advanced","SOURCE":"Vantor","OBJECTID":4
  }}]})})});
  const {fields}=await provider.identify({lat:48.78,lng:9.18},{zoom:18});
  assert.deepEqual(fields,[
    {name:"Aufnahmedatum",value:"2024-05-19"},
    {name:"Resolution",value:"0.31"},
    {name:"Accuracy",value:"0"},
    {name:"Source_info",value:"Vivid Advanced"},
    {name:"Datenquelle",value:"Vantor"}
  ]);
});
test("Esri missing citations never fabricate metadata",async()=>{
  const provider=new Metadata({fetchImpl:async()=>({ok:true,json:async()=>({results:[]})})});
  const result=await provider.identify({lat:0,lng:0},{zoom:4});
  assert.deepEqual(result.fields.map(x=>x.value),Array(5).fill("Nicht verfügbar"));
});
test("reference tile URLs include Reference/ and map adapter owns ephemeral crosshair",()=>{
  const map=read("map-adapter-leaflet.js"),styles=read("styles.css"),app=read("app.js");
  assert.match(map,/rest\/services\/Reference\/"\+service/);
  assert.match(map,/World_Transportation/);
  assert.match(map,/World_Boundaries_and_Places/);
  assert.match(map,/setInspectionCursor\(active\)/);
  assert.match(styles,/p2m-satellite-inspecting[\s\S]*?cursor:crosshair/);
  assert.match(app,/setInspectionCursor:active=>mapAdapter\?\.setInspectionCursor\(active\)/);
});
test("inspector replaces selection, renders six rows and cleans up crosshair",async()=>{
  function node(){
    return {classList:{add(){},remove(){}},setAttribute(){},replaceChildren(...parts){this.parts=parts;},
      append(...parts){this.parts=(this.parts||[]).concat(parts);},addEventListener(){},
      get disabled(){return false}};
  }
  const nodes=Object.fromEntries(["satelliteInfoPanel","satelliteInspect","satelliteInfoFields","satelliteInfoClose","basemapMenu","basemapButton"].map(k=>[k,node()]));
  const actions=[];
  const inspector=new Inspector({
    getElement:id=>nodes[id],
    document:{createElement:()=>({className:"",textContent:"",append(){}}),addEventListener(){}},
    mapPort:{showSatelliteSelection:pos=>actions.push(["show",pos]),clearSatelliteSelection:()=>actions.push(["clear"]),getViewport:()=>({zoom:16}),setInspectionCursor:on=>actions.push(["cursor",on])},
    provider:{identify:async pos=>({fields:[
      {name:"Aufnahmedatum",value:"2024-01-15"},{name:"Resolution",value:"0.5"},
      {name:"Accuracy",value:"2"},{name:"Source_info",value:"Info"},{name:"Datenquelle",value:"Source"}
    ],waybackUrl:"https://livingatlas.arcgis.com/wayback/#mapCenter=9%2C48%2C16"})}
  });
  inspector.start();
  assert.equal(inspector.isActive(),true);
  await inspector.pick({lat:1,lng:2});
  await inspector.pick({lat:3,lng:4});
  assert.equal(nodes.satelliteInfoFields.parts?.length,6);
  inspector.stop();
  assert.equal(inspector.isActive(),false);
  assert.equal(actions.filter(a=>a[0]==="show").length,2);
  assert.deepEqual(actions.at(-1),["cursor",false]);
  assert.deepEqual(actions.filter(a=>a[0]==="cursor"),[["cursor",true],["cursor",false]]);
});
