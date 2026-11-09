"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const create=require("../ui/map-gesture-controller.js");

function clock(){
  let current=10000,number=0;
  const timers=new Map();
  return {
    now:()=>current,
    setTimer:(fn,delay)=>{const id=++number;timers.set(id,{fn,due:current+delay});return id;},
    clearTimer:id=>timers.delete(id),
    advance:ms=>{
      const target=current+ms;
      while(true){
        const next=[...timers.entries()].filter(([,t])=>t.due<=target).sort((a,b)=>a[1].due-b[1].due)[0];
        if(!next)break;
        current=next[1].due;timers.delete(next[0]);next[1].fn();
      }
      current=target;
    }
  };
}
function element(){
  const callbacks=new Map();
  return {
    dataset:{},style:{},
    addEventListener:(type,cb)=>{if(!callbacks.has(type))callbacks.set(type,new Set());callbacks.get(type).add(cb);},
    removeEventListener:(type,cb)=>callbacks.get(type)?.delete(cb),
    dispatch(type,values={}) {
      const evt={
        button:0,pointerId:1,pointerType:"mouse",clientX:100,clientY:100,
        target:{closest:()=>null},stopPropagation(){},preventDefault(){},
        ...values
      };
      for(const handler of [...(callbacks.get(type)||[])])handler(evt);
      return evt;
    },
    getBoundingClientRect:()=>({left:10,top:20}),
    setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}
  };
}
function harness({basemap="street"}={}){
  const time=clock(),surface=element(),pinElement=element(),selected=[],added=[],zooms=[],pans=[],vibrations=[];
  let moving=false,panEnabled=true,viewportSaves=0,layoutUpdates=0,markersRendered=0;
  const marker={};
  const adapter={
    getContainer:()=>surface,isMapSurface:()=>true,unproject:p=>({lat:p.y,lng:p.x}),
    on(){},
    getMarkerElement:()=>pinElement,stopMarkerEventPropagation(){},
    isPanEnabled:()=>panEnabled,setPanEnabled:v=>{panEnabled=v;},
    hasOverlay:()=>true,getMarkerPosition:()=>({lat:48,lng:9}),
    project:()=>({x:20,y:30}),zoomAround:(_p,z)=>zooms.push(z),panBy:p=>pans.push(p)
  };
  const gestures=create({mapAdapter:adapter,getBasemap:()=>basemap,isMoveMode:()=>moving,
    selectPin:id=>selected.push(id),addPin:(lat,lng,name)=>{added.push({lat,lng,name});return {id:"new"};},
    renderMarkers:()=>markersRendered++,persistViewport:()=>viewportSaves++,
    updatePanelLayout:()=>layoutUpdates++,scheduleFrame:fn=>fn(),
    vibrate:ms=>vibrations.push(ms),...time});
  return {time,surface,pinElement,selected,added,zooms,pans,vibrations,gestures,marker,
    setMoving:v=>moving=v,panEnabled:()=>panEnabled,viewportSaves:()=>viewportSaves,layoutUpdates:()=>layoutUpdates,
    markersRendered:()=>markersRendered};
}
test("long press on map creates pin at converted pointer position after 650ms",()=>{
  const h=harness();h.gestures.attachLongPress();
  h.surface.dispatch("pointerdown",{pointerType:"touch"});
  h.time.advance(649);assert.equal(h.added.length,0);
  h.time.advance(1);assert.deepEqual(h.added,[{lat:80,lng:90,name:""}]);
  assert.equal(h.gestures.isSuppressed(),true);
  assert.deepEqual(h.vibrations,[15]);
  assert.equal(h.layoutUpdates(),1);
});
test("moving pointer beyond threshold cancels map long press",()=>{
  const h=harness();h.gestures.attachLongPress();
  h.surface.dispatch("pointerdown");
  h.surface.dispatch("pointermove",{clientX:112});
  h.time.advance(700);assert.equal(h.added.length,0);
});
test("multitouch and move mode cannot create pin",()=>{
  const h=harness();h.gestures.attachLongPress();
  h.surface.dispatch("pointerdown",{pointerId:1});
  h.surface.dispatch("pointerdown",{pointerId:2});
  h.time.advance(700);assert.equal(h.added.length,0);
  h.surface.dispatch("pointerup",{pointerId:1});h.surface.dispatch("pointerup",{pointerId:2});
  h.setMoving(true);h.surface.dispatch("pointerdown",{pointerId:3});
  h.time.advance(700);assert.equal(h.added.length,0);
});
test("a tapped marker selects pin and restores map panning",()=>{
  const h=harness();h.gestures.attachMarkerLongPress(h.marker,"pin-a");
  h.pinElement.dispatch("pointerdown");
  assert.equal(h.gestures.isMarkerPressActive(),true);
  assert.equal(h.panEnabled(),false);
  h.time.advance(100);h.pinElement.dispatch("pointerup");
  assert.deepEqual(h.selected,["pin-a"]);
  assert.equal(h.gestures.isMarkerPressActive(),false);
  assert.equal(h.panEnabled(),true);
  assert.equal(h.gestures.isSuppressed(),true);
});
test("held marker zooms 18 then 14 while never selecting or moving pin",()=>{
  const h=harness();h.gestures.attachMarkerLongPress(h.marker,"pin-a");
  for(let i=0;i<2;i++){
    h.pinElement.dispatch("pointerdown");
    h.time.advance(550);
    h.pinElement.dispatch("pointerup");
  }
  assert.deepEqual(h.zooms,[18,14]);assert.deepEqual(h.selected,[]);
  assert.equal(h.viewportSaves(),2);assert.equal(h.markersRendered(),2);
});
test("topographic map caps held zoom at 17",()=>{
  const h=harness({basemap:"topo"});h.gestures.attachMarkerLongPress(h.marker,"pin-a");
  h.pinElement.dispatch("pointerdown");h.time.advance(550);
  assert.deepEqual(h.zooms,[17]);
});
test("marker pointer movement cancels zoom, without selecting a pin",()=>{
  const h=harness();h.gestures.attachMarkerLongPress(h.marker,"pin-a");
  h.pinElement.dispatch("pointerdown");
  h.pinElement.dispatch("pointermove",{clientX:112});
  h.time.advance(600);assert.deepEqual(h.zooms,[]);
  assert.deepEqual(h.selected,[]);assert.equal(h.panEnabled(),true);
});
