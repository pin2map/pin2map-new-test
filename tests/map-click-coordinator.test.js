"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const MapClick=require("../application/map-click-coordinator.js");
function fixture({move=false,suppressed=false,accepted=false}={}){
  const calls=[];
  const coordinator=new MapClick({
    isMoveMode:()=>{calls.push("move?");return move;},
    previewMove:pos=>{calls.push(["preview",pos]);return accepted;},
    isSuppressed:()=>{calls.push("suppressed?");return suppressed;},
    onTargetAccepted:()=>calls.push("accepted"),
    onOrdinaryClick:()=>calls.push("close-all")
  });
  return {coordinator,calls};
}
test("ordinary map click closes overlays only when not suppressed",()=>{
  const x=fixture(),pos={lat:49,lng:9};x.coordinator.handle(pos);
  assert.deepEqual(x.calls,["move?","suppressed?","close-all"]);
});
test("suppressed click after long press does not close overlays",()=>{
  const x=fixture({suppressed:true});x.coordinator.handle({lat:49,lng:9});
  assert.deepEqual(x.calls,["move?","suppressed?"]);
});
test("move-target click takes precedence over long-press suppression",()=>{
  const x=fixture({move:true,suppressed:true,accepted:true}),position={lat:48.5,lng:9.2};
  x.coordinator.handle(position);
  assert.deepEqual(x.calls,["move?",["preview",position],"accepted"]);
});
test("rejected move target never closes overlays or changes marker state",()=>{
  const x=fixture({move:true,accepted:false});
  x.coordinator.handle({lat:48,lng:9});
  assert.deepEqual(x.calls,["move?",["preview",{lat:48,lng:9}]]);
});
test("module wired to app via map adapter and cached for offline startup",()=>{
  const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
  const app=read("app.js"),html=read("index.html"),sw=read("sw.js");
  assert.match(app,/new window\.Pin2MapMapClickCoordinator/);
  assert.match(app,/mapAdapter\.onMapClick\(position=>mapClickCoordinator\.handle\(position\)\)/);
  assert.ok(html.indexOf("./application/map-click-coordinator.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/application\/map-click-coordinator\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
});
