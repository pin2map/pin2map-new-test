"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Entry=require("../application/pin-entry-coordinator.js");
function fixture(){
 const calls=[];let zoom=11,saved={id:"new-pin"};
 const controller=new Entry({
  closeMapMenus:()=>calls.push("close"),
  getMapZoom:()=>{calls.push("zoom");return zoom;},
  accept:entry=>{calls.push(["accept",entry]);return saved;},
  resolveAutoName:entry=>{calls.push(["auto-name",entry]);return Promise.resolve();}
 });
 return {controller,calls,setZoom:z=>zoom=z,setSaved:v=>saved=v};
}
test("map pin preserves viewport, name fallback and original scale before adoption",()=>{
 const f=fixture(),result=f.controller.create(48.3,9.2,"","map");
 assert.equal(result.id,"new-pin");
 assert.deepEqual(f.calls.map(x=>Array.isArray(x)?x[0]:x),
   ["close","zoom","accept","auto-name"]);
 const entry=f.calls[2][1];
 assert.deepEqual(entry.point,{lat:48.3,lng:9.2});
 assert.equal(entry.mapZoom,11);assert.equal(entry.kind,"point");
 assert.equal(entry.label,"Neuer Pin");assert.equal(entry.name,"");
 assert.equal(entry.source,"map");assert.equal(entry.autoNamed,true);
 assert.equal(entry.preserveViewport,true);
 assert.equal(f.calls[3][1],entry);
});
test("search and GPS sources preserve their distinct semantics",()=>{
 const f=fixture();
 f.controller.create(0,180,"Ort");
 f.controller.create(-90,-180,"","gps");
 assert.deepEqual(f.calls.filter(x=>Array.isArray(x)&&x[0]==="accept")
  .map(x=>({source:x[1].source,autoNamed:x[1].autoNamed,
     preserve:x[1].preserveViewport,label:x[1].label})),[
  {source:"search",autoNamed:false,preserve:false,label:"Ort"},
  {source:"gps",autoNamed:false,preserve:false,label:"Neuer Pin"}]);
 assert.equal(f.calls.filter(x=>Array.isArray(x)&&x[0]==="auto-name").length,0);
});
test("invalid and nonfinite coordinates do not close menus, move map or save",()=>{
 const f=fixture();
 for(const [lat,lng] of [[91,0],[-91,0],[0,181],[0,-181],
  [NaN,0],[0,Infinity],[-Infinity,0],["48",9],[null,9]]){
  assert.equal(f.controller.create(lat,lng,"ignored"),null);
 }
 assert.deepEqual(f.calls,[]);
});
test("an unsuccessful adoption never triggers automatic naming",()=>{
 const f=fixture();f.setSaved(null);
 assert.equal(f.controller.create(48,9,"","map"),null);
 assert.deepEqual(f.calls.map(x=>Array.isArray(x)?x[0]:x),["close","zoom","accept"]);
});
test("ports are explicit and module remains outside browser/map/storage",()=>{
 assert.throws(()=>new Entry(),/ports required/);
 const fs=require("node:fs"),path=require("node:path");
 const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
 const app=read("app.js"),mod=read("application/pin-entry-coordinator.js");
 const html=read("index.html"),sw=read("sw.js");
 assert.match(app,/new window\.Pin2MapPinEntryCoordinator/);
 assert.match(app,/function addPin\(lat,lng,name,source="search"\)\{return pinEntry\.create\(lat,lng,name,source\);\}/);
 assert.ok(html.indexOf('src="./application/pin-entry-coordinator.js"')<
  html.indexOf('src="./app.js"'));
 assert.match(sw,/".\/application\/pin-entry-coordinator\.js"/);
 assert.doesNotMatch(mod,/\b(?:indexedDB|localStorage|document|fetch|\bL\.)\b/);
});
