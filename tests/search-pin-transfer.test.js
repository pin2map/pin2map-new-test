"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Transfer=require("../application/search-pin-transfer.js");
function fixture({zoom=9,privateVisible=true,addResult={id:"pin-1"},nameOf=r=>r.name}={}){
  const events=[];const view={center:{lat:40,lng:5},zoom};
  const searchView={
    message:text=>events.push(["message",text]),
    hide:()=>events.push("hide"),
    show:list=>events.push(["show",list])
  };
  const mapPort={
    getViewport:()=>view,
    setView:(target,options)=>events.push(["view",target,options])
  };
  const transfer=new Transfer({
    searchView,titleOf:nameOf,
    addPin:(lat,lng,name)=>{events.push(["add",lat,lng,name]);return addResult;},
    mapPort,onLayout:()=>events.push("layout"),
    isPrivateLayerVisible:()=>privateVisible,
    onRenderMarkers:()=>events.push("markers")
  });
  return {transfer,events};
}
test("zero results show existing no-place message without creating a pin",()=>{
  const x=fixture();x.transfer.present([]);
  assert.deepEqual(x.events,[["message","Kein Ort gefunden"]]);
});
test("multiple results show list without prematurely creating a pin",()=>{
  const x=fixture(),list=[{name:"A"},{name:"B"}];x.transfer.present(list);
  assert.deepEqual(x.events,[["show",list]]);
});
test("one result creates a pin, centers map at minimum zoom 13, without animation",()=>{
  const x=fixture();const result={lat:"48.77",lon:"9.18",name:"Stuttgart"};
  x.transfer.present([result]);
  assert.deepEqual(x.events,[
    "hide",["add",48.77,9.18,"Stuttgart"],
    ["view",{center:{lat:48.77,lng:9.18},zoom:13},{animate:false}],
    "layout","markers"
  ]);
});
test("map above zoom 13 remains at its current zoom, no extra markers for hidden private layer",()=>{
  const x=fixture({zoom:16,privateVisible:false});
  x.transfer.choose({lat:47,lon:8,name:"Zürich"});
  assert.deepEqual(x.events,[
    "hide",["add",47,8,"Zürich"],
    ["view",{center:{lat:47,lng:8},zoom:16},{animate:false}],
    "layout"
  ]);
});
test("invalid coordinates retain results and display error without pin or map change",()=>{
  for(const p of [{lat:"bad",lon:8},{lat:48,lon:Infinity},{lat:undefined,lon:8}]){
    const x=fixture();assert.equal(x.transfer.choose(p),null);
    assert.deepEqual(x.events,[["message","Ort konnte nicht übernommen werden"]]);
  }
});
test("failed pin creation does not shift map or request layout",()=>{
  const x=fixture({addResult:null});
  assert.equal(x.transfer.choose({lat:47,lon:8,name:"X"}),null);
  assert.deepEqual(x.events,["hide",["add",47,8,"X"]]);
});
test("search selection transfers full street and house number into newly created pin",()=>{
  const placeDomain=require("../domain/place-search.js");
  const x=fixture({nameOf:placeDomain.pinName});
  x.transfer.choose({lat:53.55,lon:10,name:"49",
    display_name:"49, Bilser Str., Hamburg, Deutschland",
    address:{road:"Bilser Str.",house_number:"49",city:"Hamburg"}});
  assert.deepEqual(x.events[0],"hide");
  assert.deepEqual(x.events[1],["add",53.55,10,"Bilser Str. 49"]);
});
test("script, app composition, offline shell and Leaflet boundary",()=>{
  const read=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");
  const app=read("app.js"),html=read("index.html"),sw=read("sw.js");
  assert.match(app,/new window\.Pin2MapSearchPinTransfer/);
  assert.match(app,/searchPinTransfer\.choose\(result\)/);
  assert.match(app,/searchPinTransfer\.present\(list\)/);
  assert.match(app,/searchView,titleOf:result=>placeDomain\.pinName\(result\)/);
  assert.doesNotMatch(app,/function choosePlace\(r\)/);
  assert.ok(html.indexOf("./application/search-pin-transfer.js")>html.indexOf("./application/place-search-service.js"));
  assert.ok(html.indexOf("./application/search-pin-transfer.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/application\/search-pin-transfer\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
});
