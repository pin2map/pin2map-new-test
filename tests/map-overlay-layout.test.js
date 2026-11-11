"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const Layout=require("../ui/map-overlay-layout.js");
function fixture(){
  const events=[],handlers=new Map(),windows=new Map(),frames=new Map();
  let next=0,activePress=false,moving=false,pin={id:"pin-1"};
  const map={
    on:(type,fn)=>{handlers.set(type,fn);events.push(["bind-map",type]);},
    off:(type,fn)=>{if(handlers.get(type)===fn)handlers.delete(type);},
    invalidateSize:()=>events.push("invalidate")
  };
  const win={addEventListener:(type,fn)=>windows.set(type,fn),
    removeEventListener:(type,fn)=>{if(windows.get(type)===fn)windows.delete(type);}};
  const coordinator=new Layout({
    mapPort:map,windowPort:win,getPin:()=>pin,isMoving:()=>moving,
    isMarkerPressActive:()=>activePress,
    panelPositioner:{
      layout:args=>events.push(["layout",args]),
      keepVisibleAtOpen:args=>events.push(["open-pan",args])
    },
    movePreview:{positionBar:()=>events.push("position-bar")},
    onPersistViewport:()=>events.push("persist"),
    onRenderMarkers:()=>events.push("markers"),
    requestFrame:fn=>{let id=++next;frames.set(id,fn);return id;},
    cancelFrame:id=>{events.push(["cancel-frame",id]);frames.delete(id);}
  });
  return {coordinator,events,handlers,windows,frames,
    active:value=>activePress=value,moving:value=>moving=value,pin:value=>pin=value,
    fire:(name)=>handlers.get(name)?.(),
    flush:()=>{for(const [id,fn] of [...frames]){frames.delete(id);fn();}}};
}
test("continuous map movement coalesces into one panel/preview frame",()=>{
  const x=fixture();x.coordinator.bind();x.events.length=0;
  x.fire("move");x.fire("move");x.fire("move");
  assert.equal(x.frames.size,1);assert.deepEqual(x.events,[]);
  x.flush();assert.deepEqual(x.events,[["layout",{pin:{id:"pin-1"},moving:false}],"position-bar"]);
  x.fire("move");assert.equal(x.frames.size,1);
});
test("moveend persists before guarded marker render and queues layout",()=>{
  const x=fixture();x.coordinator.bind();x.events.length=0;
  x.fire("moveend");assert.deepEqual(x.events,["persist","markers"]);
  x.flush();assert.deepEqual(x.events.slice(-2),[["layout",{pin:{id:"pin-1"},moving:false}],"position-bar"]);
});
test("marker long-press inhibits render but not viewport persistence or overlay layout",()=>{
  const x=fixture();x.active(true);x.coordinator.bind();x.events.length=0;
  x.fire("moveend");x.fire("zoomend");
  assert.deepEqual(x.events,["persist"]);
  x.flush();assert.equal(x.events.filter(e=>e==="position-bar").length,1);
});
test("zoomend redraws once; resize invalidates size before render and layout",()=>{
  const x=fixture();x.coordinator.bind();x.events.length=0;
  x.fire("zoomend");assert.deepEqual(x.events,["markers"]);
  x.windows.get("resize")();assert.deepEqual(x.events,["markers","invalidate","markers"]);
  assert.equal(x.frames.size,1);x.flush();
  assert.equal(x.events.at(-1),"position-bar");
});
test("opening correction only runs explicitly; drag/zoom never triggers it",()=>{
  const x=fixture();x.moving(true);x.coordinator.bind();x.events.length=0;
  x.fire("move");x.fire("zoomend");x.flush();
  assert.equal(x.events.some(e=>Array.isArray(e)&&e[0]==="open-pan"),false);
  x.coordinator.keepVisibleAtOpen();
  assert.deepEqual(x.events.at(-1),["open-pan",{pin:{id:"pin-1"},moving:true}]);
});
test("binding is idempotent; dispose cancels queued frame and detaches listeners",()=>{
  const x=fixture();x.coordinator.bind();x.coordinator.bind();
  assert.equal(x.events.filter(e=>Array.isArray(e)&&e[0]==="bind-map").length,3);
  x.fire("move");assert.equal(x.frames.size,1);
  x.coordinator.dispose();
  assert.equal(x.frames.size,0);assert.equal(x.handlers.size,0);assert.equal(x.windows.size,0);
  x.coordinator.bind();assert.equal(x.handlers.size,3);
});
test("module order, offline cache and composition preserve map engine separation",()=>{
  const read=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");
  const app=read("app.js"),html=read("index.html"),sw=read("sw.js");
  assert.match(app,/new window\.Pin2MapMapOverlayLayoutCoordinator/);
  assert.match(app,/mapOverlayLayout\.bind\(\)/);
  assert.match(app,/mapOverlayLayout\.keepVisibleAtOpen\(\)/);
  assert.ok(html.indexOf("./ui/map-overlay-layout.js")>html.indexOf("./ui/pin-panel-positioner.js"));
  assert.ok(html.indexOf("./ui/map-overlay-layout.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/ui\/map-overlay-layout\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
});
