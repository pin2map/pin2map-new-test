"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Gps=require("../ui/gps-location.js");
class Node{
  constructor(){
    this.children=[];this.listeners={};this.style={};this.hidden=true;
    this.classList={add:()=>this.hidden=true,remove:()=>this.hidden=false,contains:()=>this.hidden};
  }
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(){this.children=[];}
  addEventListener(name,fn){this.listeners[name]=fn;}
  set textContent(value){this.text=value;}
  get offsetWidth(){return 160;}
  get offsetHeight(){return 48;}
  getBoundingClientRect(){return {left:0,top:0,width:400,height:600};}
}
function fixture(geolocation){
  const box=new Node(),app=new Node();
  const map={point:null,on(){},getViewport:()=>({zoom:11}),
    setView(view){this.view=view;},project:()=>({x:200,y:300}),getContainer:()=>app,
    showTemporaryGpsPoint(point){this.point=point;},
    clearTemporaryGpsPoint(){this.point=null;}};
  const doc={createElement:()=>new Node(),addEventListener:()=>{}};
  const accepted=[],notices=[];
  const controller=new Gps({document:doc,getElement:id=>({gpsPinPrompt:box,app})[id],
    geolocation,mapPort:map,onAccept:(point,name)=>accepted.push({point,name}),
    onNotice:message=>notices.push(message),now:()=>new Date(2026,10,15,4,57)});
  controller.bind();return {controller,box,map,accepted,notices};
}
test("Unavailable and denied GPS access do not create a pin",()=>{
  const missing=fixture(null);missing.controller.locate();
  assert.equal(missing.accepted.length,0);assert.equal(missing.map.point,null);
  const denied=fixture({getCurrentPosition(ok,error){error({code:1});}});
  denied.controller.locate();
  assert.match(denied.notices.at(-1),/nicht erlaubt/);
  assert.equal(denied.accepted.length,0);
});
test("No leaves temporary GPS point; Yes converts to named private pin through callback",()=>{
  const gps={getCurrentPosition(success){success({coords:{latitude:47.65,longitude:9.18}});}};
  const x=fixture(gps);x.controller.locate();
  assert.deepEqual(x.map.point,{lat:47.65,lng:9.18});
  assert.equal(x.map.view.zoom,15);
  x.box.children[2].listeners.click({stopPropagation(){}});
  assert.equal(x.box.hidden,true);assert.equal(x.accepted.length,0);
  assert.deepEqual(x.map.point,{lat:47.65,lng:9.18});
  x.controller.locate();
  x.box.children[1].listeners.click({stopPropagation(){}});
  assert.deepEqual(x.accepted,[{point:{lat:47.65,lng:9.18},name:"GPS - 2026-11-15 04:57"}]);
  assert.equal(x.map.point,null);
});
test("GPS UI remains independent of Leaflet and persistence and is in the offline shell",()=>{
  const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
  const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
  const map=fs.readFileSync(path.resolve(__dirname,"../map-adapter-leaflet.js"),"utf8");
  const source=fs.readFileSync(path.resolve(__dirname,"../ui/gps-location.js"),"utf8");
  assert.match(sw,/ui\/gps-location\.js/);
  assert.match(app,/new window\.Pin2MapGpsLocationController/);
  assert.match(map,/showTemporaryGpsPoint\(/);
  assert.match(map,/clearTemporaryGpsPoint\(/);
  assert.doesNotMatch(source,/\bL\.|\bindexedDB\b/);
});
