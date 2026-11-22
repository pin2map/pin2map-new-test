"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Session=require("../application/project-transfer-session.js");
const Controller=require("../ui/project-transfer-controller.js");
test("project import is validated before state change and committed once",async()=>{
 const original={id:"original",viewport:{lat:48,lng:9,zoom:7},basemap:"street"};
 let project=original,writes=0,prepared=0;
 const session=new Session({
  transfer:{safeProject:incoming=>{prepared++;return {...incoming};},
   addInNewLayer:()=>{throw Error("not needed");}},
  defaults:()=>({viewport:{lat:1,lng:2,zoom:3},basemap:"street"}),
  repairPrivate:()=>{},ensureFeatures:()=>{},cleanupSearch:()=>{},
  getProject:()=>project,setProject:value=>{project=value;},
  getStore:()=>({}),writeProject:async()=>{writes++;}
 });
 const next=await session.commit("replace",{id:"new",basemap:"invalid",
  viewport:{lat:99,lng:9,zoom:4}},"new.pin2map");
 assert.equal(prepared,1);assert.equal(writes,1);assert.equal(project,next);
 assert.equal(next.basemap,"street");
 assert.deepEqual(next.viewport,original.viewport);
 assert.equal(original.id,"original");
});
test("failed validation or IndexedDB save restores exact original state",async()=>{
 const original={id:"existing",pins:[{id:"keep"}],viewport:{lat:1,lng:2,zoom:3}};
 let project=original,writes=0;
 const session=new Session({
  transfer:{safeProject:incoming=>({...incoming}),addInNewLayer:()=>{throw Error("bad import");}},
  defaults:()=>({}),repairPrivate:()=>{},ensureFeatures:()=>{},cleanupSearch:()=>{},
  getProject:()=>project,setProject:value=>{project=value;},
  getStore:()=>({}),writeProject:async()=>{writes++;throw Error("disk full");}
 });
 await assert.rejects(()=>session.commit("add",{pins:[]},"bad.pin2map"),/bad import/);
 assert.equal(project,original);assert.equal(writes,0);
 await assert.rejects(()=>session.commit("replace",{id:"new",viewport:original.viewport},"ok.pin2map"),/disk full/);
 assert.equal(project,original);assert.equal(writes,1);
 assert.deepEqual(project.pins,[{id:"keep"}]);
});
test("UI controller preserves import mode, confirmation and download-only contract",async()=>{
 const controls={},events={},notice=[],applied=[];
 function element(id){
  if(!controls[id])controls[id]={
   id,value:"",textContent:"",attributes:{},classList:{set:new Set(["hidden"]),
    add(x){this.set.add(x)},remove(x){this.set.delete(x)},contains(x){return this.set.has(x)}},
   setAttribute(k,v){this.attributes[k]=v},
   addEventListener(type,cb){events[id+":"+type]=cb;},
   focus(){},click(){this.clickCount=(this.clickCount||0)+1;}
  };
  return controls[id];
 }
 const imported={pins:[],areas:[],rivers:[],layers:[{id:"private"}]};
 const session={commit:async(choice,project,filename)=>{
  assert.equal(choice,"add");assert.equal(filename,"route.gpx");
  assert.equal(project,imported);return project;
 }};
 const c=new Controller({
  getElement:element,document:{querySelector:()=>null},windowPort:{confirm:()=>true},
  transfer:{gpxRead:(content,dom,opts)=>{
   assert.equal(content,"<gpx/>");assert.equal(opts.attachTracks,true);
   return {project:imported,gpx:true,unresolved:0};
  }},
  session,getProject:()=>imported,filterPins:()=>true,
  onCloseOtherMenus:()=>{},onSave:async()=>{},onApplied:()=>{applied.push("yes");},
  onNotice:x=>notice.push(x),onError:()=>{}
 });
 c.bind();events["transferImportHike:click"]();
 assert.equal(c.gpxMode,"start");assert.equal(element("transferFileInput").clickCount,1);
 c.choose({size:7,name:"route.gpx",text:async()=>"<gpx/>"});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(c.pending.filename,"route.gpx");
 await c.apply("add");
 assert.equal(c.pending,null);
 assert.deepEqual(applied,["yes"]);
 assert.deepEqual(notice,["Objekte in neue Ebene importiert"]);
});
