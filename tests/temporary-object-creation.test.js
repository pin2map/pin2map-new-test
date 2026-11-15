"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Panel=require("../ui/license-plate-panel.js");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
class Element{
 constructor(){this.handlers={};this.children=[];this.style={};this.textContent="";
  this.hidden=true;this.classList={
   add:()=>this.hidden=true,remove:()=>this.hidden=false,
   contains:()=>this.hidden
  };}
 replaceChildren(){this.children=[];}
 append(...nodes){this.children.push(...nodes);}
 addEventListener(type,handler){this.handlers[type]=handler;}
 contains(){return false;}
 get offsetWidth(){return 150;}
 get offsetHeight(){return 50;}
 getBoundingClientRect(){return {left:0,top:0,width:800,height:700};}
}
function fixture(){
 const box=new Element(),app=new Element(),mapElement=new Element(),accepted=[];
 const map={on(){},getContainer:()=>mapElement,project:()=>({x:250,y:250})};
 const doc={createElement:()=>new Element(),addEventListener:()=>{}};
 const panel=new Panel({document:doc,getElement:id=>id==="app"?app:box,
  mapPort:map,onAccept:entry=>accepted.push(entry)});
 panel.bind();
 return {panel,box,accepted,yes:box.children[1],no:box.children[2]};
}
for(const [entry,title] of [
 [{kind:"point",label:"GPS - 2026",point:{lat:47,lng:9}},"Pin speichern?"],
 [{kind:"point",label:"🇩🇪 KN (Ersatzort)",point:{lat:47,lng:9}},"Pin speichern?"],
 [{kind:"area",label:"Gebiet",geojson:{type:"Polygon",coordinates:[]}},"Bereich speichern?"],
 [{kind:"area",featureKind:"lake",label:"See",geojson:{type:"Polygon",coordinates:[]}},"See speichern?"],
 [{kind:"river",label:"Fluss",chains:[[[1,2],[3,4]]]},"Fluss speichern?"]
]){
 test("Only explicit Yes commits "+title+" "+entry.label,()=>{
  const x=fixture();
  x.panel.show(entry,{lat:47,lng:9});
  assert.equal(x.box.children[0].textContent,title);
  assert.equal(x.accepted.length,0);
  x.no.handlers.click({stopPropagation(){}});
  assert.equal(x.accepted.length,0);
  x.panel.show(entry,{lat:47,lng:9});
  x.yes.handlers.click({stopPropagation(){}});
  assert.deepEqual(x.accepted,[entry]);
  assert.equal(x.box.hidden,true);
 });
}
test("every new object creation is routed through temporary preview",()=>{
 const app=read("app.js"),map=read("map-adapter-leaflet.js");
 assert.match(app,/function showObjectPreview\(entry\)/);
 assert.match(app,/function addPin\(lat,lng,name\)[\s\S]*?return showObjectPreview\(entry\)/);
 assert.match(app,/function previewAreaObject\(source,kind,nameOverride=null\)/);
 assert.match(app,/showObjectPreview\(\{kind:"river",label:/);
 assert.match(app,/if\(kind==="area"\|\|kind==="lake"\)\{previewAreaObject/);
 assert.match(app,/onPin:point=>addPin\(point.lat,point.lng,""\)/);
 assert.match(app,/onAccept:\(point,name\)=>addPin\(point.lat,point.lng,name\)/);
 assert.match(app,/onAccept:entry=>\{\s*clearObjectPreview\(\)/);
 assert.match(map,/showTemporaryPin\(entry,onLabel\)/);
 assert.match(map,/showTemporaryRiver\(entry,onLabel\)/);
 assert.match(map,/showTemporaryPlateArea\(entry,onLabel\)/);
 const sw=read("sw.js");
 assert.match(sw,/ui\/license-plate-panel\.js/);
});
