"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const model=require("../domain/project-model.js");
const pins=require("../application/pin-operations.js");
const features=require("../domain/project-features.js");
const createService=require("../application/object-creation-service.js");
const Acceptance=require("../ui/object-acceptance-controller.js");
const polygon={type:"Polygon",coordinates:[[[10,49],[11,49],[11,50],[10,49]]]};
function setup(){
  const project=model.defaultProject(),calls=[],ids=["p1","r1","a1","p2","a2"];
  const service=createService({pinOperations:pins,projectFeatures:features,
    validatePosition:model.position,cleanText:model.cleanText,
    newId:()=>ids.shift(),now:()=>"2026-11-22T12:00:00.000Z"});
  const acceptance=new Acceptance({
    service,getProject:()=>project,getLayer:id=>project.layers.find(l=>l.id===id),
    privateId:"private",
    clearPrevious:()=>calls.push("clearPrevious"),
    clearSelection:()=>calls.push("clearSelection"),
    onSetGpsPin:id=>calls.push(["gps",id]),
    onCurrentPin:e=>calls.push(["current",e.savedId]),
    onFlash:(type,id)=>calls.push(["flash",type,id]),
    onMapPoint:point=>calls.push(["pointZoom",point]),
    onMapGeometry:obj=>calls.push(["fit",obj.id]),
    onSave:()=>calls.push("save"),
    onRender:()=>calls.push("render"),
    onNotice:notice=>calls.push(["notice",notice]),
    onPersist:()=>{calls.push("persist");return Promise.resolve();}
  });
  return {project,calls,service,acceptance};
}
test("accepted map pin immediately becomes a Privat record, preserving map camera",()=>{
  const f=setup();
  const entry={kind:"point",point:{lat:49,lng:10},name:"",label:"Neuer Pin",
    source:"map",autoNamed:true,preserveViewport:true};
  const pin=f.acceptance.accept(entry);
  assert.equal(pin.id,"p1");assert.equal(pin.layerId,"private");
  assert.equal(pin.name,"Neuer Pin");assert.equal(entry.savedId,"p1");
  assert.deepEqual(f.project.pins.map(p=>p.id),["p1"]);
  assert.deepEqual(f.calls.slice(0,2),["clearPrevious","clearSelection"]);
  assert.deepEqual(f.calls.filter(x=>Array.isArray(x)&&x[0]==="flash"),[["flash","pins","p1"]]);
  assert.ok(!f.calls.some(x=>Array.isArray(x)&&x[0]==="pointZoom"));
  assert.deepEqual(f.calls.slice(-3),["save","render","persist"]);
});
test("GPS entry records new GPS pin and does not move viewport; reference place name retained",()=>{
 const f=setup();
 const pin=f.acceptance.accept({kind:"point",source:"gps",point:{lat:49,lng:10},
   label:"Named",referencePlace:"Nearby",name:"",preserveViewport:false});
 assert.equal(pin.name,"Named – Nearby (Ersatzort)");
 assert.deepEqual(f.calls.filter(x=>Array.isArray(x)&&x[0]==="gps"),[["gps","p1"]]);
 assert.ok(!f.calls.some(x=>Array.isArray(x)&&x[0]==="pointZoom"));
});
test("frozen source is copied, original untouched, and ordinary pin zoom only when intended",()=>{
 const f=setup();
 const entry=Object.freeze({kind:"point",point:{lat:49,lng:10},
  label:"Alt",source:"plate",preserveViewport:false});
 const pin=f.acceptance.accept(entry);
 assert.equal(pin.name,"Alt");assert.equal(Object.hasOwn(entry,"savedId"),false);
 assert.deepEqual(f.calls.filter(x=>Array.isArray(x)&&x[0]==="pointZoom"),[
   ["pointZoom",{lat:49,lng:10}]]);
});
test("river/lake/area use existing project feature functions and typed flash",()=>{
 const f=setup();
 const river=f.acceptance.accept({kind:"river",label:"River",chains:[[[49,10],[50,11]]],
   preserveViewport:false});
 const lake=f.acceptance.accept({kind:"area",featureKind:"lake",label:"Lake",
   geojson:polygon,preserveViewport:true});
 const area=f.acceptance.accept({kind:"area",label:"Area",geojson:polygon,
   preserveViewport:false});
 assert.deepEqual([river.id,lake.id,area.id],["p1","r1","a1"]);
 assert.deepEqual(f.calls.filter(x=>Array.isArray(x)&&x[0]==="flash"),[
   ["flash","rivers","p1"],["flash","lakes","r1"],["flash","areas","a1"]]);
 assert.deepEqual(f.calls.filter(x=>Array.isArray(x)&&x[0]==="fit"),[
   ["fit","p1"],["fit","a1"]]);
 assert.deepEqual([f.project.rivers.length,f.project.areas.length],[1,2]);
});
test("named alternate-layer area remains explicit and avoids hidden Privat adoption",()=>{
 const f=setup(),newLayer={id:"other",visible:true};
 f.project.layers.push(newLayer);
 const area=f.service.createArea(f.project,{name:"Original",geojson:polygon},
   "area","other","Override");
 assert.equal(area.layerId,"other");assert.equal(area.name,"Override");
 assert.equal(f.calls.length,0,"use case must not cause implicit UI or persistence side effects");
});
test("no invalid object creates records or starts persistence; hidden Privat warning preserved",()=>{
 const f=setup();assert.equal(f.acceptance.accept(null),null);
 assert.equal(f.calls.length,0);
 f.project.layers[0].visible=false;
 assert.equal(f.acceptance.accept({kind:"unrecognized"}),null);
 assert.deepEqual(f.calls,["clearPrevious","clearSelection"]);
 f.acceptance.accept({kind:"point",label:"Pin",point:{lat:48,lng:9},source:"search"});
 assert.ok(f.calls.some(x=>Array.isArray(x)&&x[0]==="notice"&&
   x[1]==="Objekt in ausgeblendeter Ebene Privat gespeichert"));
});
