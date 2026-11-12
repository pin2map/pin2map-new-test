"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Metadata=require("../adapters/esri-imagery-metadata.js");
const Inspector=require("../ui/satellite-inspector.js");

test("Esri imagery requests only explicitly at point selection; no cache or storage",async()=>{
  const calls=[];
  const provider=new Metadata({fetchImpl:async (url,options)=>{
    calls.push({url:String(url),options});
    return {ok:true,json:async()=>({results:[{layerId:4,attributes:{
      DATE:20240115,PROVIDER:"Vantor",RESOLUTION:0.5,OBJECTID:18,ACCURACY:99999
    }}]})};
  }});
  assert.equal(calls.length,0);
  const result=await provider.identify({lat:48.7758,lng:9.1829},{zoom:17});
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.cache,"no-store");
  assert.match(calls[0].url,/World_Imagery\/MapServer\/identify/);
  assert.match(calls[0].url,/layers=all%3A4/);
  assert.ok(result.fields.some(field=>field.name==="Bildanbieter"&&field.value==="Vantor"));
  assert.ok(result.fields.some(field=>field.name==="Aufnahmedatum"&&field.value==="15.01.2024"));
  assert.ok(!result.fields.some(field=>field.name==="OBJECTID"||field.name==="Genauigkeit (m)"));
});
test("Esri missing citations are not fabricated",async()=>{
  const provider=new Metadata({fetchImpl:async()=>({ok:true,json:async()=>({results:[]})})});
  const result=await provider.identify({lat:0,lng:0},{zoom:4});
  assert.deepEqual(result.fields,[]);
  assert.match(result.message,/Keine Bildinformationen/);
});
test("Satellite inspector cancels previous response and clears selection",async()=>{
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
    mapPort:{showSatelliteSelection:pos=>actions.push(["show",pos]),clearSatelliteSelection:()=>actions.push(["clear"]),getViewport:()=>({zoom:16})},
    provider:{identify:async pos=>({fields:[{name:"DATE",value:String(pos.lat)}]})}
  });
  inspector.start();
  assert.equal(inspector.isActive(),true);
  await inspector.pick({lat:1,lng:2});
  await inspector.pick({lat:3,lng:4});
  assert.equal(nodes.satelliteInfoFields.parts?.length,1);
  inspector.stop();
  assert.equal(inspector.isActive(),false);
  assert.equal(actions.filter(a=>a[0]==="show").length,2);
  assert.equal(actions.at(-1)[0],"clear");
});
