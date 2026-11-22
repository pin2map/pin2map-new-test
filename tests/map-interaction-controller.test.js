"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const MapInteraction=require("../ui/map-interaction-controller.js");
function fixture(){
  const events=[],nodes=new Map();let temporary=false,satellite=false,mapHandler=null,longPress=0;
  const element=id=>{
    if(!nodes.has(id)){
      const listeners=[];
      nodes.set(id,{id,listeners,addEventListener:(event,handler)=>listeners.push({event,handler}),
        removeEventListener:(event,handler)=>{
          const i=listeners.findIndex(l=>l.event===event&&l.handler===handler);
          if(i>=0)listeners.splice(i,1);
        }});
    }
    return nodes.get(id);
  };
  const controller=new MapInteraction({
    getElement:element,closeTransient:()=>events.push("close-transient"),
    onMoveBegin:()=>events.push("move-begin"),
    isTemporaryMoveActive:()=>temporary,
    onTemporaryMoveCancel:()=>events.push("temporary-cancel"),
    onRegularMoveCancel:()=>events.push("regular-cancel"),
    onTemporaryMoveConfirm:()=>events.push("temporary-confirm"),
    onRegularMoveConfirm:()=>events.push("regular-confirm"),
    onMapClick:handler=>{mapHandler=handler;events.push("map-bound");},
    isSatellitePicking:()=>satellite,
    onSatellitePick:point=>events.push(["satellite",point]),
    onRegularMapClick:point=>events.push(["map",point]),
    attachLongPress:()=>{longPress++;events.push("longpress-bound");}
  });
  const click=id=>{for(const l of [...element(id).listeners])if(l.event==="click")l.handler();};
  return {controller,events,element,click,setTemporary:value=>temporary=value,
    setSatellite:value=>satellite=value,getMapClick:()=>mapHandler,
    getLongPress:()=>longPress};
}
test("pin move button bindings retain transient-dismissal-before-begin ordering",()=>{
 const x=fixture();x.controller.bindPinMoveButtons();x.click("movePin");
 assert.deepEqual(x.events,["close-transient","move-begin"]);
 x.events.length=0;
 for(const id of ["deletePin","pinLayerTrigger","closePin"])x.click(id);
 assert.deepEqual(x.events,["close-transient","close-transient","close-transient"]);
});
test("cancel and confirm route dynamically to temporary or normal move commands",()=>{
 const x=fixture();x.controller.bindPinMoveButtons();
 x.click("cancelMove");x.click("confirmMove");
 x.setTemporary(true);x.click("cancelMove");x.click("confirmMove");
 assert.deepEqual(x.events,["regular-cancel","regular-confirm","temporary-cancel","temporary-confirm"]);
});
test("satellite picks precede regular map clicks; no duplicate propagation",()=>{
 const x=fixture();x.controller.bindMapClick();const point={lat:48.8,lng:9.1};
 x.setSatellite(true);x.getMapClick()(point);
 assert.deepEqual(x.events,["map-bound",["satellite",point]]);
 x.setSatellite(false);x.getMapClick()(point);
 assert.deepEqual(x.events.at(-1),["map",point]);
});
test("bindings are idempotent and removable click handlers may be rebound",()=>{
 const x=fixture();
 x.controller.bindPinMoveButtons();x.controller.bindPinMoveButtons();
 x.controller.bindMapClick();x.controller.bindMapClick();
 x.controller.bindLongPress();x.controller.bindLongPress();
 assert.equal(x.element("movePin").listeners.length,2,"dismissal and begin are separate ordered handlers");
 assert.equal(x.events.filter(x=>x==="map-bound").length,1);
 assert.equal(x.getLongPress(),1);
 x.controller.disposeButtons();
 for(const id of ["deletePin","movePin","pinLayerTrigger","closePin","cancelMove","confirmMove"])
   assert.equal(x.element(id).listeners.length,0);
 x.controller.bindPinMoveButtons();x.click("movePin");
 assert.deepEqual(x.events.slice(-2),["close-transient","move-begin"]);
});
test("composition retains move-target priority port and offline module loading",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const read=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");
 const app=read("app.js"),html=read("index.html"),sw=read("sw.js");
 assert.match(app,/allowNonSurface:\(\)=>uiState\.moveMode\|\|temporaryMove\.isActive\(\)\|\|satelliteInspector\.isActive\(\)/);
 assert.match(app,/onRegularMapClick:position=>mapClickCoordinator\.handle\(position\)/);
 assert.ok(html.indexOf('src="./ui/map-interaction-controller.js"')<html.indexOf('src="./app.js"'));
 assert.match(sw,/"\.\/ui\/map-interaction-controller\.js"/);
});
