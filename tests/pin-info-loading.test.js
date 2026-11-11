"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {PinInfoService}=require("../application/pin-info-service.js");
const pins=Array.from({length:41},(_,i)=>({id:"p"+i,lat:47+i/100,lng:10}));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test("spinner covers every sequential visible-pin batch and goes off only after final result",async()=>{
 const gates=[];const states=[];const displayed=[];
 const svc=new PinInfoService({
  provider:{request:(mode,batch)=>new Promise(resolve=>gates.push({ids:batch.map(p=>p.id),resolve}))},
  onLoadingChange:active=>states.push(active),
  onUpdate:()=>{displayed.push(svc.visible.length);svc.setVisiblePins(pins);}
 });
 svc.setVisiblePins(pins);svc.setMode("temperature");
 assert.deepEqual(states,[true]);
 assert.equal(svc.isLoading(),true);
 assert.deepEqual(gates.map(x=>x.ids.length),[20]);
 // While first batch awaits, incidental render must not duplicate any batch.
 svc.setVisiblePins(pins);
 assert.equal(gates.length,1);
 for(const length of [20,20,1]){
  assert.equal(gates[displayed.length].ids.length,length);
  gates[displayed.length].resolve(Array.from({length},()=>({value:12})));
  await flush();
  if(displayed.length<3)assert.equal(svc.isLoading(),true,"Remain busy between batches");
 }
 assert.equal(displayed.length,3);
 assert.equal(svc.isLoading(),false);
 assert.deepEqual(states,[true,false]);
 svc.setVisiblePins(pins);await flush();
 assert.equal(gates.length,3,"No duplicate requests for cached pins");
 svc.setMode("off");
 assert.equal(svc.isLoading(),false);
});
test("spinner follows layer visibility and disappears immediately when hidden or Off",async()=>{
 const gates=[];const states=[];
 const svc=new PinInfoService({
  provider:{request:(mode,batch)=>new Promise(resolve=>gates.push({mode,batch,resolve}))},
  onLoadingChange:active=>states.push(active)
 });
 svc.setVisiblePins([pins[0]]);svc.setMode("temperature");
 assert.equal(svc.isLoading(),true);
 svc.setVisiblePins([]);assert.equal(svc.isLoading(),false);
 gates[0].resolve([{value:1}]);await flush();
 assert.equal(svc.isLoading(),false,"Stale hidden response cannot reenable spinner");
 svc.setVisiblePins([pins[0]]);
 assert.equal(svc.isLoading(),true);
 svc.setMode("off");
 assert.equal(svc.isLoading(),false);
 gates[1].resolve([{value:2}]);await flush();
 assert.equal(svc.isLoading(),false);
 assert.deepEqual(states,[true,false,true,false]);
});
test("spinner transfers between modes and stale responses cannot end newer requests",async()=>{
 const gates=[];const states=[];
 const svc=new PinInfoService({
  provider:{request:(mode,batch)=>new Promise(resolve=>gates.push({mode,resolve}))},
  onLoadingChange:active=>states.push(active)
 });
 svc.setVisiblePins([pins[0]]);
 svc.setMode("daily","01");
 assert.equal(svc.isLoading(),true);
 svc.setMode("sun","02");
 assert.equal(svc.isLoading(),true);
 assert.deepEqual(gates.map(x=>x.mode),["daily","sun"]);
 gates[0].resolve([{min:2,max:15}]);await flush();
 assert.equal(svc.isLoading(),true,"Old daily completion cannot switch off sun spinner");
 gates[1].resolve([{rise:"08:00",set:"17:00"}]);await flush();
 assert.equal(svc.isLoading(),false);
 assert.deepEqual(states,[true,false]);
});
test("provider rejection and negative cache stop spinner, avoiding permanent loading state",async()=>{
 let rejects=0;const states=[];let errors=0;
 const svc=new PinInfoService({
  provider:{async request(){rejects++;throw Error("provider unavailable")}},
  onError:()=>errors++,
  onLoadingChange:active=>states.push(active)
 });
 svc.setVisiblePins([pins[0]]);svc.setMode("temperature");
 await flush();
 assert.equal(svc.isLoading(),false);
 assert.deepEqual(states,[true,false]);
 assert.equal(errors,1);
 svc.setVisiblePins([pins[0]]);await flush();
 assert.equal(rejects,1,"Failed result temporarily cached, not endlessly requested");
});
test("cached modes, no visible pins and Off never show loading state",async()=>{
 let calls=0;const states=[];
 const svc=new PinInfoService({provider:{async request(){calls++;return [{value:7}]}},
  onLoadingChange:active=>states.push(active)});
 svc.setMode("temperature");await flush();
 assert.equal(states.length,0);
 svc.setVisiblePins([pins[0]]);await flush();
 assert.deepEqual(states,[true,false]);
 svc.setMode("off");
 svc.setMode("temperature");await flush();
 assert.deepEqual(states,[true,false],"Cache should render instantly without spinner");
 assert.equal(calls,1);
});
