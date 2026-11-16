"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Gps=require("../ui/gps-location.js");
class Node{
 constructor(){
  this.hidden=true;this.classList={add:()=>this.hidden=true,
   remove:()=>this.hidden=false,contains:()=>this.hidden};
 }
}
function fixture(geolocation){
 const box=new Node();
 const map={on(){},getViewport:()=>({zoom:11}),setView(view){this.view=view;}};
 const staged=[],notices=[];
 const controller=new Gps({document:{},getElement:()=>box,
  geolocation,mapPort:map,onAccept:(point,name)=>staged.push({point,name}),
  onNotice:message=>notices.push(message),now:()=>new Date(2026,10,15,4,57)});
 controller.bind();
 return {controller,box,map,staged,notices};
}
test("Unavailable and denied GPS access never stage or persist a pin",()=>{
 const missing=fixture(null);missing.controller.locate();
 assert.equal(missing.staged.length,0);
 const denied=fixture({getCurrentPosition(ok,error){error({code:1});}});
 denied.controller.locate();
 assert.match(denied.notices.at(-1),/nicht erlaubt/);
 assert.equal(denied.staged.length,0);
});
test("GPS fix stages a full named pin without opening a premature save popup",()=>{
 const x=fixture({getCurrentPosition(ok){
  ok({coords:{latitude:47.65,longitude:9.18}});
 }});
 x.controller.locate();
 assert.deepEqual(x.staged,[{point:{lat:47.65,lng:9.18},
  name:"GPS - 2026-11-15 04:57"}]);
 assert.equal(x.map.view.zoom,15);
 assert.equal(x.box.hidden,true,"The shared dialog must open only on pin tap");
});
test("cancelled pending GPS callback cannot restore an obsolete preview",()=>{
 let late;
 const x=fixture({getCurrentPosition(ok){late=ok;}});
 x.controller.locate();
 x.controller.close();
 late({coords:{latitude:47.65,longitude:9.18}});
 assert.equal(x.staged.length,0);
});
test("invalid GPS coordinates do not stage objects",()=>{
 const x=fixture({getCurrentPosition(ok){ok({coords:{latitude:100,longitude:9}});}});
 x.controller.locate();
 assert.equal(x.staged.length,0);
 assert.match(x.notices.at(-1),/keine gültigen Koordinaten/);
});
test("GPS discovery remains UI-only and is part of the offline app shell",()=>{
 const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
 const sw=read("sw.js"),app=read("app.js"),source=read("ui/gps-location.js");
 assert.ok(sw.includes("ui/gps-location.js"));
 assert.ok(app.includes("new window.Pin2MapGpsLocationController"));
 assert.match(app,/onAccept:\(point,name,"gps"\)=>addPin\(point\.lat,point\.lng,name\)/);
 assert.doesNotMatch(source,/\bL\.|\bindexedDB\b/);
});
