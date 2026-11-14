"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {connected,FeatureOverlapZoom}=require("../ui/feature-overlap-zoom.js");
const rect=(x,y,w=52,h=56)=>({left:x,top:y,right:x+w,bottom:y+h});
function fixture({zoom=10,max=19}={}){
 const targets=[
  {type:"pin",id:"p1",name:"Canberra",position:{lat:-35.3,lng:149},
   rects:[rect(100,100),rect(152,110,90,30)]},
  {type:"area",id:"a1",name:"Neusüdwales",kind:"area",
   position:{lat:-35.4,lng:149.1},rects:[rect(153,120,100,30)]},
  {type:"pin",id:"p2",name:"Sydney",position:{lat:-33.8,lng:151},
   rects:[rect(510,250)]}
 ];
 let viewport={center:{lat:-35,lng:150},zoom},action=[],selected=null;
 const doc={addEventListener(){},createElement(tag){
   return {className:"",style:{},textContent:"",children:[],offsetWidth:260,offsetHeight:180,
     setAttribute(){},addEventListener(){},append(...xs){this.children.push(...xs);},
     querySelector(){return {focus(){}}}};
 }};
 const app={append(){},getBoundingClientRect(){return {left:0,top:0,width:900,height:700}}};
 const map={getViewport:()=>viewport,setView:v=>{viewport=v;action.push(v);},
   project:p=>({x:p.lng*3,y:p.lat*3}),unproject:p=>({lat:p.y/3,lng:p.x/3})};
 const flow=new FeatureOverlapZoom({
   mapPort:map,getTargets:()=>targets,getMaxZoom:()=>max,
   onSelect:(type,id)=>selected={type,id},
   onBeforeZoom:()=>action.push("close"),
   document:doc,getElement:()=>app
 });
 return {targets,flow,getViewport:()=>viewport,actions:action,selection:()=>selected};
}
test("mixed pin tooltip and area label belong to same overlap component",()=>{
 const h=fixture(),group=connected(h.targets,"pin","p1");
 assert.deepEqual(group.map(x=>x.id),["p1","a1"]);
 assert.deepEqual(connected(h.targets,"pin","p2").map(x=>x.id),["p2"]);
});
test("tapping either mixed pin or area zooms toward their component first",()=>{
 for(const [type,id] of [["pin","p1"],["area","a1"]]){
  const h=fixture();assert.equal(h.flow.handleTap(type,id),true);
  assert.equal(h.getViewport().zoom,13);
  assert.equal(h.flow.menu,null);
 }
});
test("a solitary pin defers to established pin-overlap zoom logic",()=>{
 const h=fixture();assert.equal(h.flow.handleTap("pin","p2"),false);
 assert.equal(h.getViewport().zoom,10);
});
test("at maximum zoom mixed collision offers explicit object chooser",()=>{
 const h=fixture({zoom:19});assert.equal(h.flow.handleTap("area","a1"),true);
 assert.equal(h.getViewport().zoom,19);
 assert.ok(h.flow.menu);
 assert.match(h.flow.menu.children[0].children[0].textContent,/Objekt auswählen/);
 assert.equal(h.flow.menu.children.length,3);
});
