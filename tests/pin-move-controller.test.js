"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const PinMoveController=require("../application/pin-move-controller.js");
const UIState=require("../ui/ui-state.js");
const model=require("../domain/project-model.js");
const pins=require("../application/pin-operations.js");

function fixture(){
  const project=model.defaultProject();
  project.pins.push({id:"a",lat:48,lng:9,name:"A",layerId:"private"},
    {id:"b",lat:49,lng:10,name:"B",layerId:"private"});
  const uiState=new UIState();
  let candidate=null,clearCount=0,shown=0,entered=0,exited=0,commits=0;
  const preview={
    clear(){candidate=null;clearCount++;},
    show(pos,pin){candidate={...pos};shown++;},
    current(){return candidate?{...candidate}:null;}
  };
  const controller=new PinMoveController({
    uiState,getProject:()=>project,getSelectedPin:()=>pins.findPin(project,uiState.selectedPinId),
    pinOperations:pins,validatePosition:model.position,preview,
    onEnter:()=>entered++,onExit:()=>exited++,onCommitted:()=>commits++
  });
  return {project,uiState,controller,preview,stats:()=>({shown,clearCount,entered,exited,commits})};
}
test("starting requires selected pin and leaves data untouched",()=>{
  const f=fixture();
  assert.equal(f.controller.begin(),false);
  assert.equal(f.uiState.moveMode,false);
  f.uiState.selectPin("a");
  assert.equal(f.controller.begin(),true);
  assert.equal(f.uiState.moveMode,true);
  assert.equal(f.controller.begin(),false);
  assert.equal(f.stats().entered,1);
  assert.deepEqual({lat:f.project.pins[0].lat,lng:f.project.pins[0].lng},{lat:48,lng:9});
});
test("map or marker preview never modifies stored coordinates",()=>{
  const f=fixture();f.uiState.selectPin("a");f.controller.begin();
  assert.equal(f.controller.previewAt({lat:55,lng:12}),true);
  assert.equal(f.stats().shown,1);
  assert.deepEqual(f.preview.current(),{lat:55,lng:12});
  assert.deepEqual([f.project.pins[0].lat,f.project.pins[0].lng],[48,9]);
});
test("cancel discards preview, resets mode and never calls commit",()=>{
  const f=fixture();f.uiState.selectPin("a");f.controller.begin();
  f.controller.previewAt({lat:55,lng:12});
  assert.equal(f.controller.cancel(),true);
  assert.equal(f.uiState.moveMode,false);
  assert.equal(f.preview.current(),null);
  assert.equal(f.stats().commits,0);
  assert.deepEqual([f.project.pins[0].lat,f.project.pins[0].lng],[48,9]);
  assert.equal(f.controller.confirm(),null);
});
test("confirm without preview does not move or exit workflow",()=>{
  const f=fixture();f.uiState.selectPin("a");f.controller.begin();
  assert.equal(f.controller.confirm(),null);
  assert.equal(f.uiState.moveMode,true);
  assert.equal(f.stats().commits,0);
});
test("confirm updates only selected pin via domain operation and notifies once",()=>{
  const f=fixture();f.uiState.selectPin("a");f.controller.begin();
  f.controller.previewAt({lat:55,lng:12});
  const updated=f.controller.confirm();
  assert.equal(updated.id,"a");
  assert.deepEqual([f.project.pins[0].lat,f.project.pins[0].lng],[55,12]);
  assert.deepEqual([f.project.pins[1].lat,f.project.pins[1].lng],[49,10]);
  assert.equal(f.uiState.moveMode,false);
  assert.equal(f.preview.current(),null);
  assert.equal(f.stats().commits,1);
  assert.equal(f.controller.confirm(),null);
  assert.equal(f.stats().commits,1);
});
test("switching selection invalidates old preview and blocks foreign pin move",()=>{
  const f=fixture();f.uiState.selectPin("a");f.controller.begin();
  f.controller.previewAt({lat:55,lng:12});
  f.uiState.selectedPinId="b"; // externally changed selection while moving
  assert.equal(f.controller.previewAt({lat:56,lng:13}),false);
  assert.equal(f.controller.confirm(),null);
  assert.deepEqual([f.project.pins[0].lat,f.project.pins[0].lng],[48,9]);
  assert.deepEqual([f.project.pins[1].lat,f.project.pins[1].lng],[49,10]);
  f.controller.cancel();
  assert.equal(f.preview.current(),null);
});
test("invalid location cannot commit, and preview remains cancelable",()=>{
  const f=fixture();f.uiState.selectPin("a");f.controller.begin();
  f.controller.previewAt({lat:1000,lng:11});
  assert.throws(()=>f.controller.confirm());
  assert.deepEqual([f.project.pins[0].lat,f.project.pins[0].lng],[48,9]);
  assert.equal(f.uiState.moveMode,true);
  f.controller.cancel();
  assert.equal(f.uiState.moveMode,false);
});
test("preview without active mode is ignored",()=>{
  const f=fixture();f.uiState.selectPin("a");
  assert.equal(f.controller.previewAt({lat:52,lng:10}),false);
  assert.equal(f.stats().shown,0);
});
