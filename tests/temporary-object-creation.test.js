"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
const model=require("../domain/project-model.js");
const pinOps=require("../application/pin-operations.js");
const features=require("../domain/project-features.js");
test("new pin, area, lake and river all enter Privat as ordinary project records",()=>{
 const state=model.defaultProject(),ports={validatePosition:model.position,cleanText:model.cleanText};
 const pin=pinOps.createPin(state,{id:"p",lat:49,lng:10,name:"Pin",layerId:"private"},ports);
 const polygon={type:"Polygon",coordinates:[[[10,49],[11,49],[11,50],[10,49]]]};
 const area=features.createArea(state,{id:"a",name:"A",geometry:polygon}, "private");
 const lake=features.createArea(state,{id:"l",name:"L",kind:"lake",geometry:polygon}, "private");
 const river=features.createRiver(state,{id:"r",name:"R",chains:[[[49,10],[50,11]]]}, "private");
 assert.deepEqual([pin,area,lake,river].map(item=>item.layerId),
  ["private","private","private","private"]);
 assert.deepEqual([state.pins.length,state.areas.length,state.rivers.length],[1,2,1]);
 assert.equal(state.layers[0].color,"#E64294");
});
test("every creation entry is immediately saved; no former temporary confirmation",()=>{
 const app=read("app.js"),service=read("application/object-creation-service.js");
 const ui=read("ui/object-acceptance-controller.js");
 for(const fragment of ['new window.Pin2MapObjectAcceptanceController',
   'Pin2MapObjectCreationService','onPersist:()=>dbWrite()',
   'onSave:()=>save()','onPin:point=>addPin(point.lat,point.lng,"","map")',
   'onAccept:(point,name)=>addPin(point.lat,point.lng,name,"gps")'])
   assert.ok(app.includes(fragment),fragment);
 for(const fragment of ['pinOperations.createPin(project,',
   'projectFeatures.createArea(project,','projectFeatures.createRiver(project,'])
   assert.ok(service.includes(fragment),fragment);
 for(const fragment of ['this.clearPrevious()','this.clearSelection()',
   'this.onSave()','this.onRender()','this.onPersist().catch',
   'this.onFlash("pins",created.id)'])
   assert.ok(ui.includes(fragment),fragment);
 assert.doesNotMatch(ui,/temporaryLayerPicker.show|platePanel.show|showTemporaryPin|showTemporaryRiver/);
 const geometry=read("ui/geometry-search-controller.js");
 for(const fragment of ['showObjectPreview({kind:"river",label:','showObjectPreview(result)'])
   assert.ok(geometry.includes(fragment),fragment);
});
test("new persisted object pulse expires after 10 seconds without touching project data",()=>{
 const app=read("app.js"),css=read("styles.css");
 assert.match(app,/Date\.now\(\)\+10000/);
 assert.match(app,/setTimeout\(\(\)=>\{/);
 assert.match(app,/\},10000\);/);
 assert.match(css,/animation:p2m-temporary-pin-blink 1\.3s ease-in-out 7 forwards/);
 assert.match(css,/\.p2m-new-object-blink \.pin-marker-shape/);
 assert.match(css,/path\.p2m-new-object-blink-geometry/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});