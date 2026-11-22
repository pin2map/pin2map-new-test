"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Lifecycle=require("../ui/app-lifecycle-controller.js");
function target(){
 const listeners=new Map();
 return {addEventListener:(k,fn)=>{const a=listeners.get(k)||[];a.push(fn);listeners.set(k,a);},
  removeEventListener:(k,fn)=>{const a=listeners.get(k)||[];
   const i=a.indexOf(fn);if(i>=0)a.splice(i,1);},
  fire:k=>(listeners.get(k)||[]).forEach(fn=>fn()),
  count:k=>(listeners.get(k)||[]).length};
}
function fixture(){
 const win=target(),doc=target(),btn=target(),events=[];
 btn.disabled=true;btn.removeAttribute=name=>events.push(["remove",name]);
 doc.visibilityState="visible";
 const lifecycle=new Lifecycle({windowTarget:win,documentTarget:doc,
  getElement:id=>{assert.equal(id,"refreshButton");return btn;},
  onRefresh:()=>events.push("refresh"),
  onHidden:()=>events.push("flush-history-then-persist")});
 return {lifecycle,win,doc,btn,events};
}
test("pageshow restores only refresh-button state and click delegates same refresh port",()=>{
 const f=fixture();f.lifecycle.bindRefresh();
 f.win.fire("pageshow");assert.equal(f.btn.disabled,false);
 assert.deepEqual(f.events,[["remove","aria-busy"]]);
 f.btn.fire("click");assert.equal(f.events.at(-1),"refresh");
});
test("visibility save runs only on hidden and receives no application state",()=>{
 const f=fixture();f.lifecycle.bindVisibility();f.doc.fire("visibilitychange");
 assert.deepEqual(f.events,[]);
 f.doc.visibilityState="hidden";f.doc.fire("visibilitychange");
 assert.deepEqual(f.events,["flush-history-then-persist"]);
 f.doc.visibilityState="visible";f.doc.fire("visibilitychange");
 assert.equal(f.events.length,1);
});
test("both binding phases idempotent and disposal removes all owned listeners",()=>{
 const f=fixture();
 f.lifecycle.bindRefresh();f.lifecycle.bindRefresh();
 f.lifecycle.bindVisibility();f.lifecycle.bindVisibility();
 assert.deepEqual([f.win.count("pageshow"),f.btn.count("click"),
  f.doc.count("visibilitychange")],[1,1,1]);
 f.lifecycle.dispose();
 assert.deepEqual([f.win.count("pageshow"),f.btn.count("click"),
  f.doc.count("visibilitychange")],[0,0,0]);
 f.lifecycle.bindRefresh();f.lifecycle.bindVisibility();
 assert.equal(f.win.count("pageshow"),1);
});
test("explicit lifecycle-only module is loaded before composition and cached offline",()=>{
 assert.throws(()=>new Lifecycle(),/ports required/);
 const fs=require("node:fs"),path=require("node:path");
 const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
 const app=read("app.js"),html=read("index.html"),sw=read("sw.js");
 assert.match(app,/new window\.Pin2MapAppLifecycleController/);
 assert.match(app,/appLifecycle\.bindRefresh\(\)/);
 assert.match(app,/appLifecycle\.bindVisibility\(\)/);
 assert.ok(html.indexOf('src="./ui/app-lifecycle-controller.js"')<
  html.indexOf('src="./app.js"'));
 assert.match(sw,/".\/ui\/app-lifecycle-controller\.js"/);
});
