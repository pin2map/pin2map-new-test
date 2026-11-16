"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Panel=require("../ui/license-plate-panel.js");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
class Element{
 constructor(){this.handlers={};this.children=[];this.style={};this.textContent="";this.attributes={};
  this.hidden=true;this.classList={
   add:()=>this.hidden=true,remove:()=>this.hidden=false,
   contains:()=>this.hidden
  };}
 replaceChildren(){this.children=[];}
 append(...nodes){this.children.push(...nodes);}
 addEventListener(type,handler){this.handlers[type]=handler;}
 setAttribute(key,value){this.attributes[key]=value;}
 getAttribute(key){return this.attributes[key];}
 contains(){return false;}
 get offsetWidth(){return 150;}
 get offsetHeight(){return 50;}
 getBoundingClientRect(){return {left:0,top:0,width:800,height:700};}
}
function fixture(){
 const box=new Element(),app=new Element(),mapElement=new Element(),accepted=[],removed=[],moved=[];
 const events={};
 const map={on(){},getContainer:()=>mapElement,project:()=>({x:250,y:250})};
 const doc={createElement:()=>new Element(),addEventListener:(type,cb)=>events[type]=cb};
 const panel=new Panel({document:doc,getElement:id=>id==="app"?app:box,
  icons:{svg:name=>({iconName:name})},
  mapPort:map,onAccept:entry=>accepted.push(entry),onRemove:entry=>removed.push(entry),
  onMove:entry=>moved.push(entry)});
 panel.bind();
 return {panel,box,accepted,removed,moved,save:box.children[2],
  move:box.children[1],remove:box.children[0],events};
}
for(const entry of [
 {kind:"point",label:"GPS - 2026",point:{lat:47,lng:9}},
 {kind:"point",label:"🇩🇪 KN (Ersatzort)",point:{lat:47,lng:9}},
 {kind:"area",label:"Gebiet",geojson:{type:"Polygon",coordinates:[]}},
 {kind:"area",featureKind:"lake",label:"See",geojson:{type:"Polygon",coordinates:[]}},
 {kind:"river",label:"Fluss",chains:[[[1,2],[3,4]]]}
]){
 test("Speichern commits only after explicit click for "+entry.label,()=>{
  const x=fixture();
  x.panel.show(entry,{lat:47,lng:9});
  assert.equal(x.box.children.length,3);
  assert.equal(x.box.children[0].getAttribute("aria-label"),"Entfernen");
  assert.equal(x.box.children[1].getAttribute("aria-label"),"Verschieben");
  assert.equal(x.box.children[2].getAttribute("aria-label"),"Speichern");
  assert.equal(x.move.hidden,entry.kind!=="point");
  assert.equal(x.save.getAttribute("aria-label"),"Speichern");
  assert.equal(x.remove.getAttribute("aria-label"),"Entfernen");
  assert.equal(x.save.children[0].iconName,"check");
  assert.equal(x.move.children[0].iconName,"pin-relocate");
  assert.equal(x.remove.children[0].iconName,"x");
  assert.equal(x.accepted.length,0);
  x.save.handlers.click({stopPropagation(){}});
  assert.deepEqual(x.accepted,[entry]);
  assert.equal(x.removed.length,0);
  assert.equal(x.box.hidden,true);
 });
 test("Entfernen discards the preview immediately for "+entry.label,()=>{
  const x=fixture();
  x.panel.show(entry,{lat:47,lng:9});
  x.remove.handlers.click({stopPropagation(){}});
  assert.deepEqual(x.removed,[entry]);
  assert.equal(x.accepted.length,0);
  assert.equal(x.box.hidden,true);
 });
 test("outside pointerdown only closes dialog for "+entry.label,()=>{
  const x=fixture();
  x.panel.show(entry,{lat:47,lng:9});
  x.events.pointerdown({target:new Element()});
  assert.equal(x.box.hidden,true);
  assert.equal(x.accepted.length,0);
  assert.equal(x.removed.length,0);
  x.panel.show(entry,{lat:47,lng:9});
  x.events.keydown({key:"Escape",preventDefault(){}});
  assert.equal(x.box.hidden,true);
  assert.equal(x.removed.length,0);
 });
}
test("move on a temporary pin opens move UI without removing or saving",()=>{
 const x=fixture(),entry={kind:"point",point:{lat:47,lng:9},name:"Knudsker"};
 x.panel.show(entry,{lat:47,lng:9});
 x.move.handlers.click({stopPropagation(){}});
 assert.deepEqual(x.moved,[entry]);
 assert.deepEqual(x.accepted,[]);
 assert.deepEqual(x.removed,[]);
 assert.equal(x.box.hidden,true);
});
test("every new object creation is routed through temporary preview",()=>{
 const app=read("app.js"),map=read("map-adapter-leaflet.js");
 assert.match(app,/function showObjectPreview\(entry\)/);
 assert.match(app,/function addPin\(lat,lng,name,source="search"\)[\s\S]*?showObjectPreview\(entry\);[\s\S]*?return entry/);
 assert.match(app,/function previewAreaObject\(source,kind,nameOverride=null\)/);
 assert.match(app,/showObjectPreview\(\{kind:"river",label:/);
 assert.match(app,/if\(kind==="area"\|\|kind==="lake"\)\{previewAreaObject/);
 assert.match(app,/onPin:point=>addPin\(point.lat,point.lng,"","map"\)/);
 assert.match(app,/onAccept:\(point,name,"gps"\)=>addPin\(point.lat,point.lng,name\)/);
 assert.match(app,/autoNamed:source==="map"&&!name/);
 assert.match(app,/onAccept:\(entry,anchor\)=>temporaryLayerPicker\.show\(entry,state\.layers,anchor\)/);
 assert.match(app,/onMove:entry=>beginTemporaryMove\(entry\)/);
 assert.match(app,/onChoose:\(entry,layerId\)=>\{/);
 assert.match(app,/if\(!layer\)return;/);
 assert.match(map,/showTemporaryPin\(entry,onLabel\)/);
 assert.match(map,/showTemporaryRiver\(entry,onLabel\)/);
 assert.match(map,/showTemporaryPlateArea\(entry,onLabel\)/);
 const sw=read("sw.js");
 assert.match(sw,/ui\/license-plate-panel\.js/);
});
