"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Picker=require("../ui/temporary-layer-picker.js");
class El{
 constructor(){this.children=[];this.style={};this.attributes={};this.handlers={};
  this.className="";this.textContent="";
  this.hidden=true;this.classList={add:()=>this.hidden=true,
   remove:()=>this.hidden=false,contains:()=>this.hidden};
  this.scrollHeight=110;
 }
 append(...children){this.children.push(...children);}
 replaceChildren(){this.children=[];}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k];}
 addEventListener(k,fn){this.handlers[k]=fn;}
 contains(target){return target===this||this.children.includes(target);}
}
function fixture(){
 const events={},body=new El(),chosen=[],layers=[
  {id:"private",name:"Privat",color:"#326cc2",visible:true},
  {id:"other",name:"kostenlose Parkhäuser",color:"#c44976",visible:true},
  {id:"hidden",name:"unsichtbare Ebene",color:"#23666a",visible:false}
 ];
 const doc={body,createElement:()=>new El(),
  addEventListener:(name,cb)=>events[name]=cb,
  defaultView:{innerWidth:800,innerHeight:600},
  createTextNode:text=>({textContent:text})};
 let currentLayers=layers;
 const picker=new Picker({document:doc,icons:{svg:name=>{
  const svg=new El();svg.iconName=name;return svg;
 }},onChoose:(entry,id)=>chosen.push({entry,id}),
  getLayers:()=>currentLayers,onCreate:()=>{
   const added={id:"new",name:"Neue Testebene",color:"#128866",visible:true};
   currentLayers=[...currentLayers,added];return added;
  }});
 picker.bind();
 return {picker,doc,events,chosen,layers};
}
test("no default selection and no saving by opening the picker",()=>{
 const x=fixture(),entry={kind:"point",label:"Knudsker"};
 x.picker.show(entry,x.layers,{top:150,bottom:190,left:180,right:220});
 assert.equal(x.chosen.length,0);
 assert.equal(x.picker.box.children.length,4);
 assert.deepEqual(x.picker.box.children.filter(row=>row.getAttribute("role")==="option")
  .map(row=>row.getAttribute("aria-selected")),
  ["false","false","false"]);
 assert.equal(x.picker.box.hidden,false);
});
test("all layers including hidden ones are displayed with no default selection",()=>{
 const x=fixture(),entry={kind:"point"};
 x.picker.show(entry,x.layers,{top:150,bottom:190,left:180,right:220});
 assert.deepEqual(x.picker.box.children.filter(x=>x.getAttribute("role")==="option")
   .map(x=>x.getAttribute("aria-label")),[
  "Privat, Sichtbar","kostenlose Parkhäuser, Sichtbar","unsichtbare Ebene, Ausgeblendet"
 ]);
});
test("single layer warns about project-specific list and offers create without saving pin",()=>{
 const x=fixture(),entry={kind:"point"};
 x.picker.show(entry,x.layers.slice(0,1),{top:150,bottom:190,left:180,right:220});
 assert.equal(x.picker.box.children[1].textContent,
  "In diesem Projekt ist nur eine Ebene vorhanden.");
 assert.equal(x.picker.box.children[2].getAttribute("aria-label"),"Neue Ebene erstellen");
 x.picker.box.children[2].handlers.click({stopPropagation(){}});
 assert.equal(x.chosen.length,0,"Creating an available layer must not save the preview");
 assert.equal(x.picker.box.children.filter(r=>r.getAttribute("role")==="option").length,4);
});
test("explicit nonprivate layer selection commits exactly once",()=>{
 const x=fixture(),entry={kind:"point",label:"Knudsker"};
 x.picker.show(entry,x.layers,{top:150,bottom:190,left:180,right:220});
 const selected=x.picker.box.children[1];
 assert.match(selected.getAttribute("aria-label"),/kostenlose Parkhäuser/);
 selected.handlers.click({stopPropagation(){}});
 assert.deepEqual(x.chosen,[{entry,id:"other"}]);
 assert.equal(x.picker.box.hidden,true);
 selected.handlers.click({stopPropagation(){}});
 assert.equal(x.chosen.length,1,"stale clicks must not commit twice");
});
test("outside tap or Escape cancels without saving or removing the preview",()=>{
 const x=fixture(),entry={kind:"area"};
 x.picker.show(entry,x.layers,{top:150,bottom:190,left:180,right:220});
 x.events.pointerdown({target:new El()});
 assert.equal(x.chosen.length,0);
 assert.equal(x.picker.box.hidden,true);
 x.picker.show(entry,x.layers,{top:150,bottom:190,left:180,right:220});
 x.events.keydown({key:"Escape",preventDefault(){}});
 assert.equal(x.chosen.length,0);
 assert.equal(x.picker.box.hidden,true);
});
test("hidden layer is visible and explicitly selectable",()=>{
 const x=fixture(),entry={kind:"river"};
 x.picker.show(entry,x.layers,{top:150,bottom:190,left:180,right:220});
 const row=x.picker.box.children[2];
 assert.match(row.getAttribute("aria-label"),/Ausgeblendet/);
 row.handlers.click({stopPropagation(){}});
 assert.equal(x.chosen[0].id,"hidden");
});
test("app never opens the full editor on initial commit",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 const block=app.split("onChoose:(entry,layerId)=>{")[1].split("temporaryLayerPicker.bind();")[0];
 assert.doesNotMatch(block,/openGeometryEditor|pinSession\.add\(/);
 assert.match(block,/pinOps\.createPin/);
 assert.match(block,/id:uid\(\),lat:entry\.point\.lat,lng:entry\.point\.lng,name,layerId/);
 assert.match(block,/projectFeatures\.createRiver\(state,[\s\S]*?,layerId\)/);
 assert.match(block,/createAreaObject\([\s\S]*?layerId\)/);
});
