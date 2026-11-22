"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const Chooser=require("../ui/map-action-chooser.js");

test("Kartentip: area search is left and pin creation is right",()=>{
  const buttons=[];
  const box={classList:{add(){},remove(){},contains(){return false;}},replaceChildren(){buttons.length=0;},append(button){buttons.push(button);}};
  const doc={createElement(){return {listeners:{},setAttribute(k,v){this[k]=v;},append(){},
    addEventListener(k,fn){this.listeners[k]=fn;}};},addEventListener(){}};
  const clicks=[];
  const chooser=new Chooser({document:doc,getElement:()=>box,icons:{svg:icon=>icon},
    onPin:point=>clicks.push(["pin",point]),onArea:point=>clicks.push(["area",point])});
  chooser.bind();
  assert.deepEqual(buttons.map(b=>b["aria-label"]),["Gebiet suchen","Pin setzen"]);
  chooser.point={lat:48,lng:9};
  buttons[0].listeners.click({stopPropagation(){}});
  buttons[1].listeners.click({stopPropagation(){}});
  assert.deepEqual(clicks.map(x=>x[0]),["area","pin"]);
});

test("Kartentip preview retains camera; searched previews keep auto-fit",()=>{
  const app=source("app.js"),adapter=source("map-adapter-leaflet.js");
  const geometry=source("ui/geometry-search-controller.js");
  assert.match(app,/preserveViewport:source==="map"/);
  assert.match(geometry,/previewAreaObject\(choice,"area",result.name,true\)/);
  assert.match(geometry,/function previewAreaObject\(source,kind,nameOverride=null,preserveViewport=false\)/);
  assert.match(geometry,/geojson:source.geojson,preserveViewport/);
  assert.match(app,/getMap:\(\)=>mapAdapter/);
  assert.match(adapter,/if\(!entry.preserveViewport\)\s*this.map.setView\(/);
  assert.equal((adapter.match(/if\(!entry.preserveViewport\)this.map.fitBounds\(/g)||[]).length,2);
  assert.match(app,/onPin:point=>addPin\(point.lat,point.lng,"","map"\)/);
});

test("Kartentip pin immediately enters the regular stored pin-info dataflow",()=>{
 const app=source("app.js"),service=source("application/object-creation-service.js"),
   acceptance=source("ui/object-acceptance-controller.js");
 assert.match(app,/onPin:point=>addPin\(point\.lat,point\.lng,"","map"\)/);
 assert.match(app,/showObjectPreview=entry=>objectAcceptance.accept\(entry\)/);
 assert.match(service,/pinOperations.createPin\(project,/);
 assert.match(service,/lat:entry.point.lat,lng:entry.point.lng,name,layerId/);
 assert.match(app,/privateId:PRIVATE_ID/);
 const presentation=source("ui/project-object-presentation.js");
 assert.match(app,/getTemporaryInfoPin:\(\)=>temporaryInfoPin/);
 assert.match(presentation,/this\.pinInfoService\.setVisiblePins\(temporary\?\[\.\.\.visible,temporary\.point\]:visible\)/);
 assert.match(acceptance,/this.onSave\(\);\s*this.onRender\(\)/);
 assert.match(acceptance,/void this.onPersist\(\)\.catch/);
 assert.doesNotMatch(acceptance,/temporaryInfoPin=entry|platePanel\.show|temporaryLayerPicker\.show/);
});

