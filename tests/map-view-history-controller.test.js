"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Controller=require("../ui/map-view-history-controller.js");
const {MapViewHistory}=require("../application/map-view-history.js");
const viewport=n=>({center:{lat:48+n/10,lng:9+n/10},zoom:10+n});
function fixture({stored=null,loadError=false,saveError=false,withoutStore=false}={}){
  let mapView=viewport(0),mapOnMove=null,buttons=null,nextTimer=1;
  const timers=new Map(),events=[],saved=[];
  const controller=new Controller({
    History:MapViewHistory,
    mapPort:{
      getViewport:()=>mapView,
      setView:(value,options)=>{
        assert.deepEqual(options,{animate:false});
        events.push(["view",value]);
        mapView=value;
      },
      updateZoomHistory:value=>events.push(["availability",value]),
      addZoomControls:callbacks=>{buttons=callbacks;events.push(["controls"]);},
      onMoveEnd:handler=>{mapOnMove=handler;events.push(["onMoveEnd"]);}
    },
    loadHistory:async()=>{events.push(["load"]);if(loadError)throw Error("load");return stored;},
    saveHistory:value=>{
      if(withoutStore)return undefined;
      saved.push(value);events.push(["save"]);
      return saveError?Promise.reject(Error("save")):Promise.resolve();
    },
    onNotice:message=>events.push(["notice",message]),
    onFitAll:()=>events.push(["fitAll"]),
    onBeforeNavigate:()=>events.push(["closeOverlays"]),
    onPersistViewport:()=>events.push(["persistViewport"]),
    setTimer:(fn,delay)=>{assert.equal(delay,320);const id=nextTimer++;timers.set(id,fn);events.push(["timer",id]);return id;},
    clearTimer:id=>{timers.delete(id);events.push(["clearTimer",id]);}
  });
  return {controller,events,saved,timers,view:n=>{mapView=viewport(n);},get view(){return mapView;},
    get mapOnMove(){return mapOnMove;},get buttons(){return buttons;},fireTimer:()=>{
      const [id,fn]=timers.entries().next().value;timers.delete(id);fn();
    }};
}
test("initialization restores local history before installing zoom controls and map event listener",async()=>{
  const f=fixture();
  const history=await f.controller.initialize();
  assert.ok(history instanceof MapViewHistory);
  assert.deepEqual(f.view,viewport(0));
  assert.deepEqual(f.events.map(e=>e[0]),["load","availability","view","controls","availability","onMoveEnd"]);
  assert.equal(f.buttons.onUndo instanceof Function,true);
  await f.controller.initialize();
  assert.equal(f.events.filter(e=>e[0]==="controls").length,1,"initialization is idempotent");
});
test("settled move events are coalesced and only last map location is written",async()=>{
  const f=fixture();await f.controller.initialize();
  f.view(1);f.mapOnMove();f.view(2);f.mapOnMove();
  assert.equal(f.timers.size,1);
  assert.ok(f.events.some(e=>e[0]==="clearTimer"));
  f.fireTimer();
  assert.equal(f.saved.length,1);
  assert.deepEqual(f.saved[0].entries.map(x=>x.zoom),[10,12]);
  assert.equal(f.timers.size,0);
});
test("Undo flushes pending navigation, dismisses overlays and persists restored viewport without animation",async()=>{
  const f=fixture();await f.controller.initialize();
  f.view(1);f.mapOnMove();f.controller.flush();
  f.view(2);f.mapOnMove();
  const previous=f.events.length;f.buttons.onUndo();
  assert.deepEqual(f.view,viewport(1));
  assert.equal(f.timers.size,0);
  const actions=f.events.slice(previous).map(e=>e[0]);
  assert.ok(actions.indexOf("clearTimer")<actions.indexOf("closeOverlays"));
  assert.deepEqual(actions.slice(-3),["closeOverlays","view","persistViewport"]);
  const after=f.events.length;f.buttons.onRedo();
  assert.equal(f.events.length,after,"nothing to redo after flushing new user navigation");
});
test("Undo and Redo preserve historical positions when no pending movement exists",async()=>{
  const f=fixture();await f.controller.initialize();
  f.view(1);f.controller.flush();f.view(2);f.controller.flush();
  f.buttons.onUndo();assert.deepEqual(f.view,viewport(1));
  f.buttons.onRedo();assert.deepEqual(f.view,viewport(2));
  const before=f.events.filter(e=>e[0]==="persistViewport").length;
  f.buttons.onRedo();
  assert.equal(f.events.filter(e=>e[0]==="persistViewport").length,before);
});
test("history load failure uses current map viewport and emits the existing notice",async()=>{
  const f=fixture({loadError:true});await f.controller.initialize();
  assert.deepEqual(f.view,viewport(0));
  assert.deepEqual(f.events.filter(x=>x[0]==="notice"),
    [["notice","Ansichts-Historie konnte nicht geladen werden"]]);
});
test("save failures are reported, but absent store preserves silent optional persistence",async()=>{
  const f=fixture({saveError:true});await f.controller.initialize();
  f.view(1);f.controller.flush();
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(f.events.some(e=>e[0]==="notice"&&e[1]==="Ansichts-Historie konnte nicht gespeichert werden"));
  const g=fixture({withoutStore:true});await g.controller.initialize();g.view(1);
  assert.doesNotThrow(()=>g.controller.flush());
  assert.equal(g.events.filter(x=>x[0]==="notice").length,0);
});
test("fit-all button dispatches unchanged injected action",async()=>{
  const f=fixture();await f.controller.initialize();f.buttons.onFitAll();
  assert.equal(f.events.at(-1)[0],"fitAll");
});
test("module is bootstrapped before app.js and cached for offline startup",()=>{
  const fs=require("node:fs"),path=require("node:path");
  const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
  const app=read("app.js"),html=read("index.html"),sw=read("sw.js");
  assert.match(app,/await mapHistoryController\.initialize\(\)/);
  assert.match(app,/onHistoryChange:\(\)=>setTimeout\(flushHistoryRecord,0\)/);
  assert.ok(html.indexOf('src="./ui/map-view-history-controller.js"')<html.indexOf('src="./app.js"'));
  assert.match(sw,/"\.\/ui\/map-view-history-controller\.js"/);
});
