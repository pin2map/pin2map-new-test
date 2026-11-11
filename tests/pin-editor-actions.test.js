"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const PinEditorActions=require("../ui/pin-editor-actions.js");
function fixture(){
  const make=()=>{const handlers=new Map();return {
    value:"",addEventListener:(kind,handler)=>handlers.set(kind,handler),
    removeEventListener:(kind,handler)=>{if(handlers.get(kind)===handler)handlers.delete(kind);},
    fire(kind){handlers.get(kind)?.({target:this});},handlers
  };};
  const pinName=make(),pinLayer=make(),showPinLayer=make();
  const calls=[];
  const controller=new PinEditorActions({
    getElement:id=>({pinName,pinLayer,showPinLayer})[id],
    cleanText:value=>value.trim(),
    onNameChange:value=>calls.push(["name",value]),
    onLayerChange:value=>calls.push(["layer",value]),
    onShowLayer:()=>calls.push(["show"])
  });
  return {controller,calls,pinName,pinLayer,showPinLayer};
}
test("name input dispatches raw value; blur only normalizes visible field",()=>{
  const x=fixture();x.controller.bind();x.controller.bind();
  x.pinName.value="  Reise  ";
  x.pinName.fire("input");
  assert.deepEqual(x.calls,[["name","  Reise  "]]);
  x.pinName.fire("blur");
  assert.equal(x.pinName.value,"Reise");
  assert.equal(x.calls.length,1);
});
test("layer choice and reveal are delegated without business state ownership",()=>{
  const x=fixture();x.controller.bind();
  x.pinLayer.value="layer-1";x.pinLayer.fire("change");x.showPinLayer.fire("click");
  assert.deepEqual(x.calls,[["layer","layer-1"],["show"]]);
});
test("dispose removes all listeners and bind may safely reconnect",()=>{
  const x=fixture();x.controller.bind();x.controller.dispose();
  x.pinName.value="abc";x.pinName.fire("input");x.pinLayer.fire("change");x.showPinLayer.fire("click");
  assert.deepEqual(x.calls,[]);
  x.controller.bind();x.pinName.fire("input");
  assert.deepEqual(x.calls,[["name","abc"]]);
});
test("composition, script ordering and offline app shell include the new UI module",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
  const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
  const worker=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
  assert.match(app,/new window\.Pin2MapPinEditorActions/);
  assert.match(app,/pinEditorActions\.bind\(\)/);
  assert.match(app,/pinOps\.renamePin\(state,p\.id,value/);
  assert.match(app,/pinOps\.assignLayer\(state,p\.id,id\)/);
  assert.match(app,/filterOps\.setLayerVisible\(state,p\.layerId,true\)/);
  assert.ok(html.indexOf('./ui/pin-editor-actions.js')>html.indexOf('./ui/pin-editor.js'));
  assert.ok(html.indexOf('./ui/pin-editor-actions.js')<html.indexOf('./app.js'));
  assert.match(worker,/"\.\/ui\/pin-editor-actions\.js"/);
  assert.match(worker,/const CACHE='pin2map-new-v\d+'/);
});
