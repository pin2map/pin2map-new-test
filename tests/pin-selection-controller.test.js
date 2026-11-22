"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const PinSelection=require("../ui/pin-selection-controller.js");
function fixture(){
 const events=[];let pin={id:"p1",layerId:"visible"},mode=false,satellite=false,
 ids=null,selected=null,gps="p1",overlap=true,feature=false,frame=null;
 const elements={pinName:{focus:options=>events.push(["focus",options]),
   select:()=>events.push("select-text")},
   pinPanel:{classList:{contains:()=>false}}};
 const overlapPort={close:()=>events.push("overlap-close"),
   handleTap:(id,pins)=>events.push(["overlap-tap",id,pins?.map(p=>p.id)])};
 const ctrl=new PinSelection({
  getPin:()=>pin,getLayer:id=>({visible:id==="visible"}),getLayers:()=>["layer"],
  getMoveMode:()=>mode,getSelectedId:()=>selected,getSearchIds:()=>ids,
  isSatelliteActive:()=>satellite,getVisiblePins:()=>[{id:"p1"},{id:"p2"}],
  getPinOverlap:()=>overlap?overlapPort:null,
  getFeatureOverlap:()=>({handleTap:()=>feature}),
  closeMapMenus:()=>events.push("close-menus"),
  selectPinUseCase:id=>{selected=id;events.push(["select-pin",id]);},
  takeGpsFocusId:id=>{if(gps!==id)return false;gps=null;return true;},
  scheduleFrame:fn=>{frame=fn;},
  getElement:id=>elements[id],
  renderEditor:v=>events.push(["editor",v]),
  renderDetails:v=>events.push(["details",v]),
  renderNavigation:v=>events.push(["navigation",v]),
  renderGpxActions:v=>events.push(["gpx",v]),
  renderLayerPicker:v=>events.push(["picker",v]),
  closeLayerPicker:()=>events.push("picker-close"),
  onLayout:()=>{}
 });
 return {ctrl,events,getFrame:()=>frame,setPin:v=>pin=v,setMode:v=>mode=v,
  setSatellite:v=>satellite=v,setIds:v=>ids=v,setFeature:v=>feature=v,
  setOverlap:v=>overlap=v,setGps:v=>gps=v};
}
test("render preserves editor, details, navigation, GPX and layer ordering",()=>{
 const f=fixture();f.ctrl.render();
 assert.deepEqual(f.events.map(v=>v[0]),["editor","details","navigation","gpx","picker"]);
 assert.equal(f.events[0][1].layerVisible,true);
 f.events.length=0;f.setPin(null);f.ctrl.render();
 assert.equal(f.events.at(-1),"picker-close");
});
test("selection closes overlays before use case and only focuses the matching GPS pin",()=>{
 const f=fixture();f.ctrl.select("p1");
 assert.deepEqual(f.events.slice(0,3),["close-menus","overlap-close",["select-pin","p1"]]);
 f.getFrame()();
 assert.equal(f.events.at(-1),"select-text");
 f.events.length=0;f.ctrl.select("p2");assert.equal(f.getFrame() instanceof Function,true);
 assert.equal(f.events.some(v=>v==="select-text"),false);
});
test("map marker priority: picking lock, filtered hits, feature overlap, pin overlap, selection",()=>{
 const f=fixture();f.setMode(true);f.ctrl.handleMarkerTap("p1");assert.deepEqual(f.events,[]);
 f.setMode(false);f.setSatellite(true);f.ctrl.handleMarkerTap("p1");assert.deepEqual(f.events,[]);
 f.setSatellite(false);f.setIds(new Set(["pins:p1"]));f.ctrl.handleMarkerTap("p1");
 assert.deepEqual(f.events,[["overlap-tap","p1",["p1"]]]);
 f.events.length=0;f.setIds(null);f.setFeature(true);f.ctrl.handleMarkerTap("p1");
 assert.deepEqual(f.events,[]);
 f.setFeature(false);f.ctrl.handleMarkerTap("p1");
 assert.deepEqual(f.events,[["overlap-tap","p1",undefined]]);
 f.events.length=0;f.setOverlap(false);f.ctrl.handleMarkerTap("p2");
 assert.deepEqual(f.events,["close-menus",["select-pin","p2"]]);
});
test("standalone UI owner is loaded before app and available offline",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const read=f=>fs.readFileSync(path.resolve(__dirname,"..",f),"utf8");
 assert.ok(read("index.html").indexOf('src="./ui/pin-selection-controller.js"')<
           read("index.html").indexOf('src="./app.js"'));
 assert.match(read("sw.js"),/".\/ui\/pin-selection-controller\.js"/);
 assert.match(read("app.js"),/new window\.Pin2MapPinSelectionController/);
});
