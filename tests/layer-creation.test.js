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
test("success begins with a date-hour name prompt, creates under Private, renders then saves",()=>{
  const x=fixture("  Reisen  "),p=x.flow.create();
  assert.equal(p.name,"Reisen");assert.equal(p.visible,true);
  assert.equal(x.project.layers.length,3);
  assert.equal(x.project.layers[0].id,"private");
  assert.equal(x.project.layers[1].id,"new-layer",
    "LayerCreation must expose new layer immediately below Private");
  assert.deepEqual(x.events,[["prompt",LayerCreation.suggestedName()],"render","save"]);
});
test("cancel does not mutate project, render, or save",()=>{
  const x=fixture(null);
  assert.equal(x.flow.create(),null);
  assert.equal(x.project.layers.length,2);
  assert.deepEqual(x.events,[["prompt",LayerCreation.suggestedName()]]);
});
for(const [answer,msg] of [["   ","Bitte einen Ebenennamen eingeben"],["PRIVAT","Der Ebenenname ist bereits vergeben"]]){
  test("invalid layer name is reported without save: "+msg,()=>{
    const x=fixture(answer);assert.equal(x.flow.create(),null);
    assert.equal(x.project.layers.length,2);
    assert.deepEqual(x.events,[["prompt",LayerCreation.suggestedName()],["notice",msg]]);
  });
}
test("unexpected create errors retain generic notice without writes",()=>{
  const x=fixture("Reisen");x.flow.operations={nextName:()=> "Ebene 2",create:()=>{throw new Error("unexpected");}};
  assert.equal(x.flow.create(),null);
  assert.deepEqual(x.events,[["prompt",LayerCreation.suggestedName()],["notice","Ebene konnte nicht erstellt werden"]]);
});
test("the default name formats local date and hour with zero padding",()=>{
  assert.equal(LayerCreation.suggestedName(new Date(2026,0,2,3,59)),
    "02.01.2026-03");
  assert.equal(LayerCreation.suggestedName(new Date(2026,10,17,23,0)),
    "17.11.2026-23");
  assert.equal(LayerCreation.suggestedName(new Date(2026,11,31,0,0)),
    "31.12.2026-00");
});
test("wiring uses the same suggested name in inline layer creation and the native prompt",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"..","app.js"),"utf8");
  const view=fs.readFileSync(path.resolve(__dirname,"..","ui/layer-view.js"),"utf8");
  assert.match(app,/getSuggestedName:\(\)=>[\s\S]{0,180}window\.Pin2MapLayerCreation\.suggestedName\(\)/);
  assert.match(app,/askName:defaultName=>prompt\("Name der neuen Ebene:",defaultName\)/);
  assert.match(app,/onCreate:\(\)=>layerCreation\.create\(\)/);
  assert.match(view,/const creating=mode==="new",name=creating\?this\.getSuggestedName\(\):layer\.name/);
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
