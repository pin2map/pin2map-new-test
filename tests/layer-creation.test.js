"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const LayerCreation=require("../application/layer-creation.js");
const ops=require("../application/layer-operations.js");
const model=require("../domain/project-model.js");
function fixture(answer){
  const project=model.defaultProject(),events=[];
  const flow=new LayerCreation({
    getProject:()=>project,operations:ops,
    askName:defaultName=>{events.push(["prompt",defaultName]);return answer;},
    createId:()=>"new-layer",cleanText:model.cleanText,colors:model.DEFAULT_COLORS,
    onNotice:message=>events.push(["notice",message]),
    onRender:()=>events.push("render"),onSave:()=>events.push("save")
  });
  return {project,events,flow};
}
test("success uses default name, existing domain mutation, render then save",()=>{
  const x=fixture("  Reisen  "),p=x.flow.create();
  assert.equal(p.name,"Reisen");assert.equal(p.visible,true);
  assert.equal(x.project.layers.length,3);
  assert.deepEqual(x.events,[["prompt","Ebene 2"],"render","save"]);
});
test("cancel does not mutate project, render, or save",()=>{
  const x=fixture(null);
  assert.equal(x.flow.create(),null);
  assert.equal(x.project.layers.length,2);
  assert.deepEqual(x.events,[["prompt","Ebene 2"]]);
});
for(const [answer,msg] of [["   ","Bitte einen Ebenennamen eingeben"],["PRIVAT","Der Ebenenname ist bereits vergeben"]]){
  test("invalid layer name is reported without save: "+msg,()=>{
    const x=fixture(answer);assert.equal(x.flow.create(),null);
    assert.equal(x.project.layers.length,2);
    assert.deepEqual(x.events,[["prompt","Ebene 2"],["notice",msg]]);
  });
}
test("unexpected create errors retain generic notice without writes",()=>{
  const x=fixture("Reisen");x.flow.operations={nextName:()=> "Ebene 2",create:()=>{throw new Error("unexpected");}};
  assert.equal(x.flow.create(),null);
  assert.deepEqual(x.events,[["prompt","Ebene 2"],["notice","Ebene konnte nicht erstellt werden"]]);
});
test("wiring and packaging separate layer create use case from app and IndexedDB",()=>{
  const source=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");
  const app=source("app.js"),html=source("index.html"),sw=source("sw.js");
  assert.match(app,/new window\.Pin2MapLayerCreation/);
  assert.match(app,/layerCreation\.create\(\)/);
  assert.doesNotMatch(app,/layerOps\.create\(state/);
  assert.ok(html.indexOf("./application/layer-creation.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/application\/layer-creation\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
});
