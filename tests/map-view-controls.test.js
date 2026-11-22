"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Controls=require("../ui/map-view-controls.js");
function fixture({storageFails=false}={}){
  const nodes=new Map(),calls=[],storage=new Map();
  const bodyClasses=new Set();
  const doc={body:{classList:{
    toggle:(name,on)=>{on?bodyClasses.add(name):bodyClasses.delete(name);},
    contains:name=>bodyClasses.has(name)
  }}};
  let labels=false,geocode=false,layerOpen=false;
  const node=id=>{
    if(!nodes.has(id)){
      const listeners=new Map();
      nodes.set(id,{id,listeners,checked:false,
        classList:{contains:name=>id==="layersPanel"&&name==="hidden"?!layerOpen:false},
        addEventListener:(type,handler)=>listeners.set(type,handler),
        removeEventListener:(type,handler)=>{
          if(listeners.get(type)===handler)listeners.delete(type);
        }
      });
    }
    return nodes.get(id);
  };
  const controller=new Controls({
    getElement:node,document:doc,
    getLabelsVisible:()=>labels,setLabelsVisible:value=>{labels=value;calls.push("labels:"+value);},
    onSave:()=>calls.push("save"),onRenderMarkers:()=>calls.push("markers"),
    onUpdateLabelButton:()=>calls.push("label-button"),
    layerView:{close:()=>calls.push("layer-close"),show:()=>calls.push("layer-show"),
      footerAction:()=>calls.push("layer-add"),footerCancel:()=>calls.push("layer-cancel"),
      beginMerge:()=>calls.push("layer-merge")},
    overlayCoordinator:{closeAll:()=>calls.push("overlays-close")},
    onToggleSettings:()=>calls.push("settings-toggle"),
    getGeocodeEnabled:()=>geocode,setGeocodeEnabled:value=>{geocode=value;calls.push("geocode:"+value);},
    readLocalPreference:key=>{if(storageFails)throw new Error("blocked");return storage.get(key);},
    writeLocalPreference:(key,value)=>{if(storageFails)throw new Error("blocked");storage.set(key,value);}
  });
  const click=id=>node(id).listeners.get("click")({});
  const change=(id,checked)=>node(id).listeners.get("change")({target:{checked}});
  return {controller,node,calls,storage,doc,bodyClasses,click,change,
    get labels(){return labels;},get geocode(){return geocode;},
    setLayerOpen:value=>{layerOpen=value;},setGeocode:value=>{geocode=value;}};
}
test("labels toggle preserves save, marker redraw and button-update order",()=>{
  const x=fixture();x.controller.bindMapButtons();
  x.click("labelsToggle");
  assert.equal(x.labels,true);
  assert.deepEqual(x.calls,["labels:true","save","markers","label-button"]);
  x.calls.length=0;x.click("labelsToggle");
  assert.equal(x.labels,false);
  assert.deepEqual(x.calls,["labels:false","save","markers","label-button"]);
});
test("layers button keeps same-button close, competing overlay close and settings toggle",()=>{
  const x=fixture();x.controller.bindMapButtons();
  x.click("layersButton");
  assert.deepEqual(x.calls,["overlays-close","layer-show"]);
  x.calls.length=0;x.setLayerOpen(true);x.click("layersButton");
  assert.deepEqual(x.calls,["layer-close"]);
  x.click("settingsButton");assert.equal(x.calls.at(-1),"settings-toggle");
});
test("yellow debug hitbox display is local-only; stored false hides only CSS overlay",()=>{
  const x=fixture();const key="pin2map-show-yellow-pin-hitboxes-v1";
  x.storage.set(key,"false");x.controller.bindSettingsAndLayerActions();
  assert.equal(x.node("showPinHitboxes").checked,false);
  assert.equal(x.bodyClasses.has("pin-hitboxes-hidden"),true);
  assert.deepEqual(x.calls,[],"no project mutation, render or save");
  x.change("showPinHitboxes",true);
  assert.equal(x.storage.get(key),"true");
  assert.equal(x.bodyClasses.has("pin-hitboxes-hidden"),false);
  x.change("showPinHitboxes",false);
  assert.equal(x.storage.get(key),"false");
  assert.deepEqual(x.calls,[]);
});
test("unavailable localStorage retains default hitbox presentation and non-crashing toggles",()=>{
  const x=fixture({storageFails:true});x.controller.bindSettingsAndLayerActions();
  assert.equal(x.node("showPinHitboxes").checked,true);
  assert.equal(x.bodyClasses.has("pin-hitboxes-hidden"),false);
  x.change("showPinHitboxes",false);
  assert.equal(x.bodyClasses.has("pin-hitboxes-hidden"),true);
  assert.deepEqual(x.calls,[]);
});
test("geocode consent is project state; layer footer actions preserve exact semantics",()=>{
  const x=fixture();x.setGeocode(true);x.controller.bindSettingsAndLayerActions();
  assert.equal(x.node("allowGeocode").checked,true);
  x.change("allowGeocode",false);
  assert.equal(x.geocode,false);
  assert.deepEqual(x.calls,["geocode:false","save"]);
  x.calls.length=0;
  x.click("addLayer");x.click("layersClose");x.click("layersCloseBottom");x.click("layersUnite");
  assert.deepEqual(x.calls,["layer-add","layer-close","layer-cancel","layer-merge"]);
});
test("both binding phases are idempotent and dispose detaches all callbacks",()=>{
  const x=fixture();
  x.controller.bindMapButtons();x.controller.bindMapButtons();
  x.controller.bindSettingsAndLayerActions();x.controller.bindSettingsAndLayerActions();
  for(const id of ["labelsToggle","layersButton","settingsButton","showPinHitboxes",
    "allowGeocode","addLayer","layersClose","layersCloseBottom","layersUnite"])
    assert.equal(x.node(id).listeners.size,1,id);
  x.controller.dispose();
  for(const id of ["labelsToggle","layersButton","settingsButton","showPinHitboxes",
    "allowGeocode","addLayer","layersClose","layersCloseBottom","layersUnite"])
    assert.equal(x.node(id).listeners.size,0,id);
  x.controller.bindMapButtons();x.controller.bindSettingsAndLayerActions();
  assert.equal(x.node("labelsToggle").listeners.size,1);
});
test("new UI ownership is loaded before composition root and is offline cached",()=>{
  const fs=require("node:fs"),path=require("node:path");
  const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
  const app=read("app.js"),html=read("index.html"),sw=read("sw.js");
  assert.match(app,/mapViewControls\.bindMapButtons\(\)/);
  assert.match(app,/mapViewControls\.bindSettingsAndLayerActions\(\)/);
  assert.ok(html.indexOf('src="./ui/map-view-controls.js"')<
    html.indexOf('src="./app.js"'));
  assert.match(sw,/"\.\/ui\/map-view-controls\.js"/);
});
