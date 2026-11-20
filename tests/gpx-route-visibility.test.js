"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const app=read("app.js"),adapter=read("map-adapter-leaflet.js");
test("closing a pin dialog or selecting another pin does not hide its GPX overlay",()=>{
  const render=app.slice(app.indexOf("function renderPinPanel(){"),app.indexOf("function selectPin(id){"));
  assert.doesNotMatch(render,/hideAttachedRoute\(/);
  const close=app.slice(app.indexOf("function closeAllMapMenus(){"),app.indexOf("const mapClickCoordinator"));
  assert.doesNotMatch(close,/hideAttachedRoute\(|clearAttachedGpx/);
  assert.match(render,/attachedRoutePinId===pin\.id/);
  assert.match(render,/Route verbergen/);
});
test("only intentional actions or project replacement clear the displayed route",()=>{
  const toggle=app.slice(app.indexOf("function toggleAttachedRoute(){"),app.indexOf("function exportAttachedRoute(){"));
  assert.match(toggle,/if\(attachedRoutePinId===pin\.id\)\{hideAttachedRoute\(\);return;\}/);
  assert.match(toggle,/mapAdapter\.showAttachedGpx\(attachment\.chains\)/);
  assert.match(adapter,/showAttachedGpx\(chains\)/);
  assert.match(adapter,/clearAttachedGpx\(\)/);
  const restore=app.slice(app.indexOf("function applyTransfer(choice){"),app.indexOf("function bindTransfer(){"));
  assert.match(restore,/committed=true;\s*hideAttachedRoute\(\)/);
});
test("NEW project export contains no predecessor raw document records",()=>{
  const transfer=require("../application/project-transfer.js");
  const project={layers:[{id:"private",name:"Privat",visible:true}],
    pins:[{id:"a",name:"Start",lat:48,lng:9,layerId:"private"}],
    areas:[],rivers:[],favorites:[],
    legacySources:[{filename:"legacy.pin2map",original:{sensitive:"test"},unresolved:["x"]}]};
  const encoded=transfer.encodeProject(project);
  assert.doesNotMatch(encoded,/legacySources|legacy\.pin2map|sensitive/);
  assert.equal(transfer.parseProject(encoded).project.legacySources,undefined);
  assert.deepEqual(transfer.parseProject(encoded).project.pins,project.pins);
});
