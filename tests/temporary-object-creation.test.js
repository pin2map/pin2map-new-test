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
test("every creation entry is connected to immediate save; old menus stay hidden",()=>{
 const app=read("app.js");
 for(const fragment of ["function showObjectPreview(entry){","pinOps.createPin(state,",
   "projectFeatures.createArea(state,","projectFeatures.createRiver(state,",
   "flashNewObject(","void dbWrite().catch(","save();renderLayers();renderMarkers();renderGeometry()",
   'onPin:point=>addPin(point.lat,point.lng,"","map")',
   'onAccept:(point,name)=>addPin(point.lat,point.lng,name,"gps")',
   ])
  assert.ok(app.includes(fragment),fragment);
 const geometry=read("ui/geometry-search-controller.js");
 for(const fragment of ['showObjectPreview({kind:"river",label:','showObjectPreview(result)'])
  assert.ok(geometry.includes(fragment),fragment);
 const creation=app.split("function showObjectPreview(entry){")[1]
  .split("function addPin(lat,lng")[0];
 assert.doesNotMatch(creation,/platePanel\.show|temporaryLayerPicker\.show|showTemporaryPin|showTemporaryRiver/);
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