"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Session=require("../application/pin-session.js");
const pinOps=require("../application/pin-operations.js");
const projectModel=require("../domain/project-model.js");
const UIState=require("../ui/ui-state.js");
function fixture(hidden=false){
  const project=projectModel.defaultProject();
  project.layers[0].visible=!hidden;
  const uiState=new UIState(),calls=[];
  const session=new Session({
    getProject:()=>project,getSelectedPinId:()=>uiState.selectedPinId,
    uiState,pinOps,privateLayerId:projectModel.PRIVATE_ID,
    createId:()=>"pin-1",validatePosition:projectModel.position,cleanText:projectModel.cleanText,
    getLayer:id=>project.layers.find(layer=>layer.id===id),
    overlays:{preparePinSelection:()=>calls.push("prepare"),closeAll:()=>calls.push("close")},
    cancelMove:()=>calls.push("cancel-move"),onModeChange:()=>calls.push("mode"),
    onRenderMarkers:()=>calls.push("markers"),onRenderLayers:()=>calls.push("layers"),
    onRenderPanel:()=>calls.push("panel"),scheduleSelectionLayout:()=>calls.push("layout"),
    onSave:()=>calls.push("save"),onNotice:text=>calls.push(["notice",text])
  });
  return {project,uiState,calls,session};
}
test("creating a pin uses the existing private layer and saves before selecting",()=>{
  const x=fixture();const p=x.session.add(48.7,9.1,"  Reise ");
  assert.deepEqual(x.project.pins,[p]);
  assert.equal(p.layerId,"private");assert.equal(p.name,"Reise");assert.equal(x.uiState.selectedPinId,p.id);
  assert.deepEqual(x.calls,["save","prepare","cancel-move","mode","markers","layers","panel","layout"]);
});
test("invalid coordinates do not create pins or call save or selection",()=>{
  const x=fixture();
  assert.equal(x.session.add(NaN,9,""),undefined);
  assert.equal(x.session.add(4,Infinity,""),undefined);
  assert.equal(x.project.pins.length,0);assert.deepEqual(x.calls,[]);
});
test("creating in hidden private layer preserves exact notice and selection",()=>{
  const x=fixture(true);x.session.add(50,8,"");
  assert.deepEqual(x.calls.at(-1),["notice","Pin in ausgeblendeter Ebene „Privat“ gespeichert"]);
  assert.equal(x.uiState.selectedPinId,"pin-1");
});
test("tapping selected pin only closes overlays without changing selection",()=>{
  const x=fixture();x.uiState.selectPin("pin-1");
  x.session.select("pin-1");
  assert.deepEqual(x.calls,["close"]);assert.equal(x.uiState.selectedPinId,"pin-1");
});
test("selecting another pin retains ordering of overlay/cancel/UI updates",()=>{
  const x=fixture();x.uiState.selectPin("pin-old");
  x.session.select("pin-new");assert.equal(x.uiState.selectedPinId,"pin-new");
  assert.deepEqual(x.calls,["prepare","cancel-move","mode","markers","layers","panel","layout"]);
});
test("composition, module order and offline shell protect application boundary",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
  const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
  const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
  assert.match(app,/new window\.Pin2MapPinSession/);
  assert.match(app,/pinSession\.select\(id\)/);
  assert.match(app,/pinSession\.add\(lat,lng,name\)/);
  assert.ok(html.indexOf("./application/pin-session.js")>html.indexOf("./application/pin-operations.js"));
  assert.ok(html.indexOf("./application/pin-session.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/application\/pin-session\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
});
