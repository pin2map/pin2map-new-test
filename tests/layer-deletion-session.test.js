"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const LayerDeletionSession=require("../application/layer-deletion-session.js");
const ops=require("../application/layer-operations.js");
const model=require("../domain/project-model.js");
function fixture(){
 const project=model.defaultProject(),events=[];
 const session=new LayerDeletionSession({operations:ops,getProject:()=>project,
  privateId:"private",onRemovedPins:ids=>events.push(["selected",ids]),
  onSave:()=>events.push("save"),onRender:()=>events.push("render"),
  onNotice:m=>events.push(["notice",m])});
 return {session,project,events};
}
test("deleting regular layer removes assigned pins and rehomes its geometry to Privat",()=>{
 const f=fixture();
 f.project.pins=[{id:"p1",layerId:"layer-1"},{id:"p2",layerId:"private"}];
 f.project.areas=[{id:"a",layerId:"layer-1"},{id:"b",layerId:"private"}];
 f.project.rivers=[{id:"r",layerId:"layer-1"}];
 const result=f.session.confirm("layer-1");
 assert.equal(result.privateOnly,false);
 assert.deepEqual(result.removedPinIds,["p1"]);
 assert.deepEqual(f.project.pins.map(x=>x.id),["p2"]);
 assert.deepEqual(f.project.layers.map(x=>x.id),["private"]);
 assert.deepEqual(f.project.areas.map(x=>x.layerId),["private","private"]);
 assert.equal(f.project.rivers[0].layerId,"private");
 assert.deepEqual(f.events,[["selected",["p1"]],"save","render",
  ["notice","Ebene und Pins gelöscht"]]);
});
test("private-only confirmation removes private pins but retains layer and geometry",()=>{
 const f=fixture();f.project.pins=[{id:"p",layerId:"private"}];
 f.project.areas=[{id:"a",layerId:"private"}];
 f.project.rivers=[{id:"r",layerId:"private"}];
 const r=f.session.confirm("private");assert.equal(r.privateOnly,true);
 assert.equal(f.project.pins.length,0);assert.equal(f.project.layers[0].id,"private");
 assert.equal(f.project.areas[0].layerId,"private");
 assert.equal(f.project.rivers[0].layerId,"private");
 assert.deepEqual(f.events,[["selected",["p"]],"save","render",
  ["notice","Private Pins gelöscht"]]);
});
test("invalid or empty private deletion has no presentation, persistence or selection side effects",()=>{
 const f=fixture();assert.equal(f.session.confirm("private"),null);
 assert.equal(f.session.confirm("missing"),null);
 assert.deepEqual(f.events,[]);
});
test("missing optional arrays are harmless and exact callback ordering is preserved",()=>{
 const f=fixture();delete f.project.areas;delete f.project.rivers;
 assert.ok(f.session.confirm("layer-1"));
 assert.deepEqual(f.events.map(x=>Array.isArray(x)?x[0]:x),
  ["selected","save","render","notice"]);
});
test("application owner has no UI, database, map or routing dependency",()=>{
 assert.throws(()=>new LayerDeletionSession(),/ports required/);
 const fs=require("node:fs"),path=require("node:path");
 const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
 const app=read("app.js"),html=read("index.html"),sw=read("sw.js");
 assert.match(app,/new window\.Pin2MapLayerDeletionSession/);
 assert.match(app,/function confirmBulkDeletion\(id\)\{layerDeletion\.confirm\(id\);\}/);
 assert.ok(html.indexOf('src="./application/layer-deletion-session.js"')<
  html.indexOf('src="./app.js"'));
 assert.match(sw,/".\/application\/layer-deletion-session\.js"/);
});
