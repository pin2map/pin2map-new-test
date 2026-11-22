"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const GeometryMutations=require("../application/geometry-mutation-session.js");
function fixture(){
 const events=[],project={areas:[],rivers:[]};
 let changed=true,removed=true;
 const features={
  change:(p,type,id,patch,options)=>{
   events.push(["change",p,type,id,patch,options]);return changed?{id}:null;
  },
  remove:(p,type,id)=>{events.push(["remove",p,type,id]);return removed;}
 };
 const session=new GeometryMutations({features,getProject:()=>project,
  now:()=> "2026-11-22T10:00:00.000Z",
  onSave:()=>events.push("save"),
  onRender:()=>events.push("render"),
  onNotice:s=>events.push(["notice",s])});
 return {session,project,events,setChanged:x=>changed=x,setRemoved:x=>removed=x};
}
test("geometry change passes exact project, patch and update timestamp before save/render",()=>{
 const x=fixture(),patch={name:"Neu"},result=x.session.change("area","a",patch);
 assert.deepEqual(result,{id:"a"});
 assert.deepEqual(x.events,[
  ["change",x.project,"area","a",patch,{updatedAt:"2026-11-22T10:00:00.000Z"}],
  "save","render"]);
});
test("unsuccessful geometry change never persists or redraws",()=>{
 const x=fixture();x.setChanged(false);
 assert.equal(x.session.change("river","r",{name:"X"}),null);
 assert.equal(x.events.length,1);
});
test("river/area deletion retains existing notice and save/render ordering",()=>{
 const x=fixture();x.session.remove("river","r");x.session.remove("area","a");
 assert.deepEqual(x.events.map(v=>Array.isArray(v)?v[0]:v),
  ["remove","save","render","notice","remove","save","render","notice"]);
 assert.deepEqual(x.events.filter(v=>Array.isArray(v)&&v[0]==="notice"),
  [["notice","Fluss entfernt"],["notice","Fläche entfernt"]]);
});
test("missing object deletion does not notify, save or change display",()=>{
 const x=fixture();x.setRemoved(false);x.session.remove("area","missing");
 assert.deepEqual(x.events,[["remove",x.project,"area","missing"]]);
});
test("module has only injected dependencies and is packaged offline",()=>{
 assert.throws(()=>new GeometryMutations(),/ports required/);
 const fs=require("node:fs"),path=require("node:path");
 const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
 const app=read("app.js"),html=read("index.html"),sw=read("sw.js");
 assert.match(app,/new window\.Pin2MapGeometryMutationSession/);
 assert.match(app,/function saveGeometry\(type,id,patch\)\{return geometryMutations\.change\(type,id,patch\);\}/);
 assert.ok(html.indexOf('src="./application/geometry-mutation-session.js"')<
  html.indexOf('src="./app.js"'));
 assert.match(sw,/".\/application\/geometry-mutation-session\.js"/);
});
