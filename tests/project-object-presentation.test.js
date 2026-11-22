"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Presentation=require("../ui/project-object-presentation.js");
function fixture(){
  let project={layers:[{id:"private",visible:true,color:"#aabbcc"},{id:"hidden",visible:false,color:"#dd0000"}],
    pins:[{id:"a",layerId:"private"},{id:"b",layerId:"hidden"}],
    areas:[{id:"area",layerId:"private",kind:"area"},{id:"lake",layerId:"hidden",kind:"lake"}],
    rivers:[{id:"river",layerId:"hidden"}],labelsVisible:true};
  let view=null,selected="a",temporary=null,flash=new Set(["pins:a","lakes:lake","rivers:river"]);
  const calls=[],viewCalls=[],geometryCalls=[],clicks=[];
  let markerView={render:args=>viewCalls.push(args)};
  const pinInfoService={
    setVisiblePins:pins=>calls.push(["visible",pins.map(p=>p.id)]),
    label:pin=>pin?.id==="temporary"?{text:"weather"}:null
  };
  const instance=new Presentation({
    getProject:()=>project,getSearchView:()=>view,
    getPinFilter:p=>p.pins.filter(pin=>p.layers.find(l=>l.id===pin.layerId)?.visible),
    getSelectedPinId:()=>selected,getTemporaryInfoPin:()=>temporary,getFlashIds:()=>flash,
    mapPort:{
      renderProjectGeometry:options=>geometryCalls.push(options),
      setTemporaryPinInfo:markup=>calls.push(["markup",markup])
    },
    getMarkerView:()=>markerView,pinInfoService,
    getPinInfoMarkup:info=>"<weather>"+info.text+"</weather>",
    onAreaLabel:(area,point)=>clicks.push(["area",area.id,point]),
    onRiverLine:(river,point)=>clicks.push(["river",river.id,point]),
    getAreaOverlapHandler:()=>((type,id)=>{clicks.push(["overlap",type,id]);return id==="area";})
  });
  return {instance,project,calls,viewCalls,geometryCalls,clicks,
    setView:value=>view=value,setTemporary:value=>temporary=value,
    setMarkerView:value=>markerView=value,setFlash:value=>flash=value,
    setSelected:value=>selected=value};
}
test("geometry selection preserves layer visibility, lake namespace and search-only constraints",()=>{
  const x=fixture();x.instance.renderGeometry();
  let args=x.geometryCalls.at(-1);
  assert.deepEqual(args.areas.map(a=>a.id),["area"]);
  assert.deepEqual(args.rivers.map(r=>r.id),[]);
  assert.deepEqual(args.layerColors,{"private":"#aabbcc","hidden":"#dd0000"});
  assert.equal(args.highlightIds,undefined);
  assert.deepEqual(args.flashIds,new Set(["pins:a","lakes:lake","rivers:river"]));
  x.setView({onlyHits:false,ids:new Set(["lakes:lake","rivers:river"]),matches:[]});
  x.instance.renderGeometry();args=x.geometryCalls.at(-1);
  assert.deepEqual(args.areas.map(a=>a.id),["area","lake"]);
  assert.deepEqual(args.rivers.map(r=>r.id),["river"]);
  assert.deepEqual(args.highlightIds,new Set(["lakes:lake","rivers:river"]));
  x.setView({onlyHits:true,ids:new Set(["lakes:lake"]),matches:[]});
  x.instance.renderGeometry();args=x.geometryCalls.at(-1);
  assert.deepEqual(args.areas.map(a=>a.id),["lake"]);
  assert.deepEqual(args.rivers,[]);
  assert.equal(args.highlightIds,null);
});
test("geometry labels honor overlap intercept only outside search matches",()=>{
  const x=fixture();x.instance.renderGeometry();
  const args=x.geometryCalls.at(-1),point={lat:1,lng:2};
  args.onAreaLabel({id:"area",kind:"area"},point);
  assert.deepEqual(x.clicks,[["overlap","area","area"]]);
  args.onRiverLine({id:"river"},point);
  assert.deepEqual(x.clicks.at(-1),["river","river",point]);
  x.setView({onlyHits:true,ids:new Set(["areas:area"]),matches:[]});
  x.instance.renderGeometry();x.geometryCalls.at(-1).onAreaLabel({id:"area",kind:"area"},point);
  assert.deepEqual(x.clicks.at(-1),["area","area",point]);
});
test("pins merge canonical search hits, avoid duplicate IDs and maintain highlight namespaces",()=>{
  const x=fixture();
  x.instance.renderMarkers();let args=x.viewCalls.at(-1);
  assert.deepEqual(args.pins.map(p=>p.id),["a"]);
  assert.equal(args.selectedPinId,"a");assert.equal(args.labelsVisible,true);
  assert.deepEqual(args.flashIds,new Set(["a"]));
  assert.deepEqual(args.highlightIds,new Set());
  const canonical={id:"b",layerId:"hidden",name:"canonical"};
  x.setView({onlyHits:false,ids:new Set(["pins:b","rivers:river"]),matches:[
    {type:"pins",id:"a",object:{id:"a",name:"duplicate"}},
    {type:"pins",id:"b",object:canonical},
    {type:"rivers",id:"river",object:{id:"river"}}
  ]});
  x.instance.renderMarkers();args=x.viewCalls.at(-1);
  assert.deepEqual(args.pins.map(p=>p.id),["a","b"]);
  assert.equal(args.pins[1],canonical);
  assert.deepEqual(args.highlightIds,new Set(["b"]));
  x.setView({onlyHits:true,ids:new Set(["pins:b"]),matches:[{type:"pins",id:"b",object:canonical}]});
  x.instance.renderMarkers();args=x.viewCalls.at(-1);
  assert.deepEqual(args.pins,[canonical]);assert.equal(args.highlightIds,null);
});
test("temporary pin info only joins weather provider list, never persisted map markers",()=>{
  const x=fixture();
  x.setTemporary({point:{id:"temporary"}});
  x.instance.renderMarkers();
  assert.deepEqual(x.viewCalls.at(-1).pins.map(p=>p.id),["a"]);
  assert.deepEqual(x.calls[0],["visible",["a","temporary"]]);
  assert.deepEqual(x.calls[1],["markup","<weather>weather</weather>"]);
  x.setTemporary(null);x.calls.length=0;
  x.instance.renderMarkers();
  assert.deepEqual(x.calls,[["visible",["a"]]]);
});
test("rendering remains inert until marker view is initialized",()=>{
  const x=fixture();x.setMarkerView(null);
  x.instance.renderMarkers();
  assert.equal(x.viewCalls.length,0);assert.equal(x.calls.length,0);
});
test("offline shell includes presentation module before app composition",()=>{
  const fs=require("node:fs"),path=require("node:path");
  const root=path.resolve(__dirname,"..");
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  const sw=fs.readFileSync(path.join(root,"sw.js"),"utf8");
  assert.ok(html.indexOf('src="./ui/project-object-presentation.js"')<
    html.indexOf('src="./app.js"'));
  assert.match(sw,/"\.\/ui\/project-object-presentation\.js"/);
});
