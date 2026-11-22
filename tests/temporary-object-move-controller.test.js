"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Controller=require("../ui/temporary-object-move-controller.js");
const model=require("../domain/project-model.js");
function fixture(){
 const events=[],preview={position:null,clear(){this.position=null;events.push("clear-preview");},
  show(pos,origin){this.position={...pos};events.push(["preview",{...pos},{...origin}]);},
  current(){return this.position?{...this.position}:null;}};
 const guide={start:pos=>events.push(["guide-start",{...pos}]),stop:()=>events.push("guide-stop")};
 const params={
  moving:false,zoom:8,
  getMoveMode:()=>params.moving,getPreview:()=>preview,getGuide:()=>guide,
  closeLayerPicker:()=>events.push("close-layer"),
  closePlatePanel:()=>events.push("close-plate"),
  invalidateLocality:()=>events.push("invalidate-name"),
  updateModeUI:()=>events.push("update-mode"),
  validatePosition:model.position,getZoom:()=>params.zoom,
  accept:entry=>{events.push(["accept",entry.point,entry.mapZoom,entry.label]);return {id:"p"};},
  resolveName:entry=>{events.push(["resolve",entry.point]);return Promise.resolve();}
 };
 const controller=new Controller(params);
 return {controller,params,events,preview};
}
const point=()=>({kind:"point",point:{lat:48.23,lng:9.1},
 label:"Neuer Pin",name:"",autoNamed:true,source:"map",mapZoom:4});
test("only point entries start; active stored-pin movement and overlapping moves block",()=>{
 const f=fixture();assert.equal(f.controller.begin(null),false);
 assert.equal(f.controller.begin({kind:"river",chains:[]}),false);
 f.params.moving=true;
 assert.equal(f.controller.begin(point()),false);assert.deepEqual(f.events,[]);
 f.params.moving=false;assert.equal(f.controller.begin(point()),true);
 assert.equal(f.controller.begin(point()),false);
 assert.deepEqual(f.events.slice(0,4),["close-layer","close-plate","invalidate-name","clear-preview"]);
 assert.deepEqual(f.events[4],["guide-start",{lat:48.23,lng:9.1}]);
});
test("drag preview never mutates source entry or invokes acceptance",()=>{
 const f=fixture(),entry=point();
 assert.equal(f.controller.previewAt({lat:50,lng:8}),false);
 assert.equal(f.controller.begin(entry),true);
 assert.equal(f.controller.previewAt({lat:50,lng:8}),true);
 assert.deepEqual(entry.point,{lat:48.23,lng:9.1});
 assert.equal(entry.mapZoom,4);
 assert.equal(f.events.filter(x=>Array.isArray(x)&&x[0]==="accept").length,0);
 assert.deepEqual(f.events.find(x=>Array.isArray(x)&&x[0]==="preview"),
  ["preview",{lat:50,lng:8},{lat:48.23,lng:9.1}]);
});
test("cancel removes both preview and move guide, never changes source or persists",()=>{
 const f=fixture(),entry=point();f.controller.begin(entry);
 f.controller.previewAt({lat:50,lng:8});
 assert.equal(f.controller.cancel(),true);
 assert.equal(f.controller.isActive(),false);
 assert.equal(f.preview.current(),null);
 assert.equal(f.controller.cancel(),false);
 assert.equal(f.controller.confirm(),false);
 assert.deepEqual(entry.point,{lat:48.23,lng:9.1});
 assert.deepEqual(f.events.slice(-3),["guide-stop","clear-preview","update-mode"]);
 assert.ok(!f.events.some(x=>Array.isArray(x)&&x[0]==="accept"));
});
test("confirm requires valid preview, retains cancelable state after invalid target",()=>{
 const f=fixture(),entry=point();f.controller.begin(entry);
 assert.equal(f.controller.confirm(),false);assert.equal(f.controller.isActive(),true);
 f.controller.previewAt({lat:110,lng:8});
 assert.equal(f.controller.confirm(),false);
 assert.equal(f.controller.isActive(),true);
 assert.deepEqual(entry.point,{lat:48.23,lng:9.1});
 assert.ok(!f.events.some(x=>Array.isArray(x)&&x[0]==="accept"));
 assert.equal(f.controller.cancel(),true);
});
test("confirm transfers validated position once, captures new map zoom and re-resolves auto name",()=>{
 const f=fixture(),entry=point();f.params.zoom=16;f.controller.begin(entry);
 f.controller.previewAt({lat:49.1,lng:10.2});
 assert.equal(f.controller.confirm(),true);
 assert.deepEqual(entry.point,{lat:49.1,lng:10.2});
 assert.equal(entry.mapZoom,16);assert.equal(entry.name,"");assert.equal(entry.label,"Neuer Pin");
 assert.equal(f.controller.confirm(),false);assert.equal(f.controller.isActive(),false);
 assert.equal(f.events.filter(x=>Array.isArray(x)&&x[0]==="accept").length,1);
 assert.equal(f.events.filter(x=>Array.isArray(x)&&x[0]==="resolve").length,1);
 assert.ok(f.events.findIndex(x=>x==="guide-stop") <
  f.events.findIndex(x=>Array.isArray(x)&&x[0]==="accept"));
});
test("manual naming survives confirmation and never starts reverse naming",()=>{
 const f=fixture(),entry={...point(),autoNamed:false,name:"Eigener Name",label:"Eigener Name"};
 f.controller.begin(entry);f.controller.previewAt({lat:47.9,lng:9.3});
 assert.equal(f.controller.confirm(),true);
 assert.equal(entry.name,"Eigener Name");assert.equal(entry.label,"Eigener Name");
 assert.equal(f.events.filter(x=>Array.isArray(x)&&x[0]==="resolve").length,0);
});

test("app routes every temporary cleanup through the owning controller (v314 regression)",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
 assert.match(app,/function clearObjectPreview\(\)\{\s*temporaryMove\.cancel\(\)/);
 assert.doesNotMatch(app,/\bcancelTemporaryMove\s*\(/,
   "Removed function reference breaks all new object adoption and the live place search");
 assert.match(app,/onMove:entry=>temporaryMove\.begin\(entry\)/);
});
