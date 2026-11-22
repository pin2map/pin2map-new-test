"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");
const pins=require("../application/pin-operations.js");
const model=require("../domain/project-model.js");
test("v302: a new map pin is immediately stored and may subsequently be moved as a normal pin",()=>{
 const project=model.defaultProject();
 const created=pins.createPin(project,{id:"new",lat:50.971,lng:9.795,
  name:"Neuer Pin",layerId:"private"},{validatePosition:model.position,cleanText:model.cleanText});
 assert.equal(project.pins.length,1);
 assert.equal(created.layerId,"private");
 assert.equal(pins.movePin(project,created.id,{lat:51.001,lng:9.84},
  {validatePosition:model.position}),created);
 assert.deepEqual([created.lat,created.lng],[51.001,9.84]);
 assert.equal(project.pins.length,1,"Relocation must not create a second object");
});
test("v302: invalid relocation never mutates a freshly saved pin",()=>{
 const project=model.defaultProject();
 const created=pins.createPin(project,{id:"new",lat:50.971,lng:9.795,name:"Neuer Pin",
  layerId:"private"},{validatePosition:model.position,cleanText:model.cleanText});
 assert.throws(()=>pins.movePin(project,"new",{lat:100,lng:9.84},
  {validatePosition:model.position}),/Invalid/);
 assert.deepEqual([created.lat,created.lng],[50.971,9.795]);
});
test("v302: all creation entries commit without the obsolete temporary-move selector",()=>{
 const app=read("app.js"),service=read("application/object-creation-service.js"),
   controller=read("ui/object-acceptance-controller.js");
 assert.match(app,/showObjectPreview=entry=>objectAcceptance.accept\(entry\)/);
 assert.match(service,/pinOperations.createPin\(project,/);
 assert.match(service,/projectFeatures.createArea\(project,/);
 assert.match(service,/projectFeatures.createRiver\(project,/);
 assert.match(app,/privateId:PRIVATE_ID/);
 assert.doesNotMatch(controller,/beginTemporaryMove|platePanel\.show|temporaryLayerPicker\.show/);
 assert.match(app,/onPin:point=>addPin\(point\.lat,point\.lng,"","map"\)/);
 assert.match(app,/onAccept:\(point,name\)=>addPin\(point\.lat,point\.lng,name,"gps"\)/);
});
