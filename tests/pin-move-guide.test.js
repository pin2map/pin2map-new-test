"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const PinMoveGuide=require("../ui/pin-move-guide.js");
function fixture(){
  const listeners=new Map(),lines=[],removed=[],updated=[];
  const mapRect={left:100,top:50,width:400,height:300};
  const container={
    getBoundingClientRect:()=>mapRect,
    addEventListener(type,fn){listeners.set(type,fn);},
    removeEventListener(type,fn){if(listeners.get(type)===fn)listeners.delete(type);}
  };
  const map={
    getContainer:()=>container,
    unproject:point=>({lat:point.y,lng:point.x}),
    createLine:(coordinates,options)=>{const line={coordinates,options};lines.push(line);return line;},
    setLinePositions:(line,coordinates)=>{updated.push(coordinates);line.coordinates=coordinates;},
    removeOverlay:line=>removed.push(line)
  };
  let pending=null;
  const guide=new PinMoveGuide({mapAdapter:map,
    requestFrame:callback=>{pending=callback;return 1;},
    cancelFrame:()=>{pending=null;}
  });
  const fire=(type,opts)=>listeners.get(type)?.({type,pointerType:"mouse",isPrimary:true,
    target:{closest:()=>null},...opts});
  const flush=()=>{const fn=pending;pending=null;fn?.();};
  return {guide,listeners,lines,removed,updated,fire,flush};
}
test("mouse pointer traces dashed line from original pin without mutating it",()=>{
  const f=fixture(),pin={lat:48,lng:9};
  f.guide.start(pin);
  f.fire("pointermove",{clientX:245,clientY:170});
  f.flush();
  assert.equal(f.lines.length,1);
  assert.deepEqual(f.lines[0].coordinates,[{lat:48,lng:9},{lat:120,lng:145}]);
  assert.equal(f.lines[0].options.interactive,false);
  assert.equal(f.lines[0].options.dashArray,"5 6");
  assert.deepEqual(pin,{lat:48,lng:9});
  f.fire("pointermove",{clientX:265,clientY:190});
  f.flush();
  assert.equal(f.lines.length,1);
  assert.deepEqual(f.updated[0][1],{lat:140,lng:165});
  f.guide.stop();
  assert.equal(f.removed.length,1);
  assert.equal(f.listeners.size,0);
});
test("touch down and touch movement display pointer guide; lifting finger retains until target click",()=>{
  const f=fixture();
  f.guide.start({lat:48,lng:9});
  f.fire("pointerdown",{clientX:220,clientY:100,pointerType:"touch",buttons:1});
  f.flush();
  assert.equal(f.lines.length,1);
  f.fire("pointermove",{clientX:240,clientY:120,pointerType:"touch",buttons:1});
  f.flush();
  assert.equal(f.updated.length,1);
  f.fire("pointermove",{clientX:280,clientY:130,pointerType:"touch",buttons:0});
  f.flush();
  assert.equal(f.updated.length,1,"No hover after touch release");
  f.guide.stop();
  assert.equal(f.lines.length,1);
  assert.equal(f.removed.length,1);
});
test("pointer on UI controls and outside map never creates a line",()=>{
  const f=fixture();
  f.guide.start({lat:48,lng:9});
  f.fire("pointermove",{clientX:240,clientY:100,target:{closest:()=>({})}});
  f.fire("pointermove",{clientX:5,clientY:5});
  f.flush();
  assert.equal(f.lines.length,0);
  f.guide.stop();
});
