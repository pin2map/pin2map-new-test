"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Controller=require("../ui/object-search-controller.js");
function setup(){
 const classes=new Set(),logs=[],input={value:"saale",blur:()=>logs.push("blur")};
 const project={layers:[{id:"shown",visible:true},{id:"hidden",visible:false}],pins:[],
   areas:[],rivers:[]};
 const spotlight={setActive:value=>logs.push(["spotlight",value]),
   schedule:()=>logs.push("schedule")};
 const controller=new Controller({
   document:{body:{classList:{
     add:cls=>classes.add(cls),remove:cls=>classes.delete(cls),
     toggle:(cls,yes)=>yes?classes.add(cls):classes.delete(cls)
   }}},
   getElement:id=>id==="searchInput"?input:null,
   searchDomain:{searchExpanded:(p,options)=>{
     logs.push(["query",options]);
     return p.pins.filter(x=>x.name.toLowerCase().includes(options.query.toLowerCase()))
       .map(x=>({id:x.id,type:"pins",object:x}));
   }},
   getProject:()=>project,getSpotlight:()=>spotlight,
   getMenu:()=>({setResults:results=>logs.push(["results",results.length])}),
   render:()=>logs.push("render"),
   onFit:selected=>logs.push(["fit",selected.pins.map(p=>p.id),selected.layers.every(x=>x.visible)]),
   cancelPlace:()=>logs.push("cancelPlace"),cancelGeometry:()=>logs.push("cancelGeometry"),
   hidePlaceResults:()=>logs.push("hide"),updateClear:()=>logs.push("clear")
 });
 return {controller,project,classes,logs,input};
}
test("search owns current result identity and refreshes without moving map",()=>{
 const {controller,project,logs,classes}=setup();
 project.pins.push({id:"a",name:"Saale",layerId:"shown"});
 controller.run({onlyHits:false});
 assert.deepEqual([...controller.view.ids],["pins:a"]);
 assert.ok(classes.has("object-search-active"));
 assert.deepEqual(logs.find(x=>Array.isArray(x)&&x[0]==="fit"),["fit",["a"],true]);
 project.pins[0].name="Weser";
 const count=logs.filter(x=>Array.isArray(x)&&x[0]==="fit").length;
 controller.refresh();
 assert.equal(controller.view.matches.length,0);
 assert.equal(logs.filter(x=>Array.isArray(x)&&x[0]==="fit").length,count);
 assert.ok(!classes.has("object-search-active"));
});
test("only-hits display toggle does not refit, but changing filter does",()=>{
 const {controller,project,logs}=setup();
 project.pins.push({id:"a",name:"Saale",layerId:"shown"});
 controller.run({onlyHits:false,kind:"all"});
 const first=logs.filter(x=>Array.isArray(x)&&x[0]==="fit").length;
 controller.run({onlyHits:true,kind:"all"});
 assert.equal(logs.filter(x=>Array.isArray(x)&&x[0]==="fit").length,first);
 assert.equal(controller.view.onlyHits,true);
 controller.run({onlyHits:true,kind:"pins"});
 assert.equal(logs.filter(x=>Array.isArray(x)&&x[0]==="fit").length,first+1);
 controller.end();
 assert.equal(controller.view,null);
 assert.ok(logs.includes("blur"));
});
test("reset is inert without active search and preserves camera",()=>{
 const {controller,logs,classes}=setup();
 controller.reset();
 assert.deepEqual(logs,[]);
 controller.run({});
 controller.reset();
 assert.equal(controller.view,null);
 assert.ok(!classes.has("object-search-active"));
 assert.equal(logs.filter(x=>x==="render").length,2);
});
