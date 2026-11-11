"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Overlay=require("../ui/map-overlay-coordinator.js");
function fixture(){
  const listeners=new Map();
  const el=(id)=>({
    id,dataset:{},hidden:false,
    classList:{contains(name){return name==="hidden"&&this.owner.hidden;},add(name){if(name==="hidden")this.owner.hidden=true;}},
    addEventListener(type,fn){const key=id+":"+type;listeners.set(key,[...(listeners.get(key)||[]),fn]);},
    removeEventListener(type,fn){const key=id+":"+type;listeners.set(key,(listeners.get(key)||[]).filter(f=>f!==fn));},
    fire(type,ev={}){for(const fn of listeners.get(id+":"+type)||[])fn(ev);}
  });
  const panels={layersPanel:el("layersPanel"),settingsPanel:el("settingsPanel")};
  for(const panel of Object.values(panels))panel.classList.owner=panel;
  const dialog=el("deleteDialog");dialog.open=false;dialog.closed=[];
  dialog.close=value=>{dialog.open=false;dialog.closed.push(value);};
  const pinClose=el("pinClose");pinClose.dataset.close="pinPanel";
  const otherClose=el("otherClose");otherClose.dataset.close="settingsPanel";
  const elements={...panels,deleteDialog:dialog};
  const calls=[];let moving=false,selected=null,visible=false,blurred=false;
  const doc=el("document");
  doc.querySelectorAll=sel=>{assert.equal(sel,"[data-close]");return [pinClose,otherClose];};
  doc.activeElement={blur(){blurred=true;}};
  const searchView={hide(){calls.push("hide-results");visible=false;},isVisible:()=>visible};
  const uiShell={closePanels(){calls.push("close-panels");},hideNotice(){calls.push("hide-notice");},
    togglePanel:id=>calls.push("toggle:"+id),closePanel:id=>calls.push("close:"+id)};
  const basemapMenu={close(){calls.push("close-basemap");}};
  const coordinator=new Overlay({
    getElement:id=>elements[id],document:doc,searchView,uiShell,basemapMenu,
    getMoveMode:()=>moving,getSelectedPinId:()=>selected,
    onCancelMove:()=>{calls.push("cancel-move");moving=false;},
    onClearSelection:()=>{calls.push("clear-selection");selected=null;moving=false;}
  });
  return {coordinator,panels,dialog,pinClose,otherClose,doc,calls,
    setMove:v=>moving=v,setSelected:v=>selected=v,setResults:v=>visible=v,
    wasBlurred:()=>blurred,listeners};
}
test("preparing pin selection closes visible search and overlays without state mutation",()=>{
  const x=fixture();x.setSelected("pin-1");
  x.coordinator.preparePinSelection();
  assert.equal(x.panels.layersPanel.hidden,true);
  assert.equal(x.panels.settingsPanel.hidden,true);
  assert.deepEqual(x.calls,["hide-results","close-basemap"]);
});
test("closeAll cancels open delete dialog and relocation before resetting selection",()=>{
  const x=fixture();x.setMove(true);x.setSelected("pin-1");x.dialog.open=true;
  x.coordinator.closeAll();
  assert.deepEqual(x.dialog.closed,["cancel"]);
  assert.deepEqual(x.calls,["hide-results","close-panels","close-basemap","hide-notice","cancel-move","clear-selection"]);
  assert.equal(x.wasBlurred(),true);
});
test("closeAll leaves untouched state alone and panel toggle closes basemap first",()=>{
  const x=fixture();x.coordinator.closeAll();x.coordinator.togglePanel("layersPanel");
  assert.ok(!x.calls.includes("clear-selection"));
  assert.deepEqual(x.calls.slice(-2),["close-basemap","toggle:layersPanel"]);
});
test("close buttons and outside pointer listener bind once, dispose cleanly",()=>{
  const x=fixture();x.coordinator.bind();x.coordinator.bind();
  x.setResults(true);
  x.doc.fire("pointerdown",{target:{closest:()=>true}});
  assert.deepEqual(x.calls,[]);
  x.doc.fire("pointerdown",{target:{closest:()=>false}});
  assert.deepEqual(x.calls,["hide-results"]);
  x.otherClose.fire("click");
  assert.equal(x.calls.at(-1),"close:settingsPanel");
  x.setSelected("pin-1");x.pinClose.fire("click");
  assert.equal(x.calls.filter(s=>s==="clear-selection").length,1);
  x.coordinator.dispose();const before=x.calls.length;
  x.pinClose.fire("click");x.doc.fire("pointerdown",{target:{closest:()=>false}});
  assert.equal(x.calls.length,before);
});
test("composition boundary, load order and offline cache include overlay coordinator",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
  const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
  const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
  assert.match(app,/new window\.Pin2MapMapOverlayCoordinator/);
  const session=fs.readFileSync(path.resolve(__dirname,"../application/pin-session.js"),"utf8");
  assert.match(session,/this\.overlays\.preparePinSelection\(\)/);
  assert.match(session,/this\.overlays\.closeAll\(\)/);
  assert.match(app,/overlayCoordinator\.closeAll\(\)/);
  assert.match(app,/overlayCoordinator\.bind\(\)/);
  assert.doesNotMatch(app,/function closeMapOverlays\(/);
  assert.ok(html.indexOf("./ui/map-overlay-coordinator.js")>html.indexOf("./ui/shell.js"));
  assert.ok(html.indexOf("./ui/map-overlay-coordinator.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/ui\/map-overlay-coordinator\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
});
