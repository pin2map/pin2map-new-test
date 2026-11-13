"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {HIT_WIDTH,HIT_HEIGHT,overlaps,connectedPins,allSeparated,zoomDecision,fittingZoom,PinOverlapZoom}
  =require("../ui/pin-overlap-zoom.js");

test("real 52x56 hitbox rectangles, not visible 30x40 art, define overlaps",()=>{
  assert.deepEqual([HIT_WIDTH,HIT_HEIGHT],[52,56]);
  assert.equal(overlaps({x:0,y:0},{x:51,y:0}),true);
  assert.equal(overlaps({x:0,y:0},{x:52,y:0}),false);
  assert.equal(overlaps({x:0,y:0},{x:0,y:55}),true);
  assert.equal(overlaps({x:0,y:0},{x:0,y:56}),false);
  assert.equal(allSeparated([{x:0,y:0},{x:54,y:0}],pin=>pin),false,
    "Add a small selection safety gap beyond the overlapping hitboxes");
});
test("only overlapping connected pins zoom, never distant unrelated pins",()=>{
  const pins=[{id:"a",x:0,y:0},{id:"b",x:50,y:0},
    {id:"c",x:100,y:0},{id:"far",x:500,y:0}];
  assert.deepEqual(connectedPins(pins,"a",p=>p).map(p=>p.id),["a","b","c"]);
  assert.deepEqual(connectedPins(pins,"far",p=>p).map(p=>p.id),["far"]);
  assert.deepEqual(connectedPins(pins,"missing",p=>p),[]);
});
test("minimal zoom resolves nearby pins with 6px safety gap",()=>{
  const pins=[{id:"a",x:0,y:0},{id:"b",x:10,y:0}];
  const zoom=zoomDecision(pins,10,19,(p,z)=>({x:p.x*2**(z-10),y:0}));
  assert.deepEqual(zoom,{zoom:13,separated:true});
});
test("provider maximum caps zoom and identical coordinates require chooser",()=>{
  const pins=[{id:"a",x:8,y:15},{id:"b",x:8,y:15}];
  assert.deepEqual(zoomDecision(pins,14,17,p=>p),{zoom:17,separated:false});
  assert.deepEqual(zoomDecision(pins,19,19,p=>p),{zoom:19,separated:false});
});
function fixture(pins,maxZoom=19,zoom=10){
  const selected=[],pans=[],nodes=[];
  const map={
    getViewport:()=>({center:{lat:0,lng:0},zoom}),
    getSize:()=>({x:1100,y:780}),
    getContainer:()=>({getBoundingClientRect:()=>({left:0,top:0})}),
    project:pin=>({x:pin.lng,y:pin.lat}),
    projectAtZoom:(pin,z)=>({x:pin.lng*2**(z-10),y:pin.lat*2**(z-10)}),
    unproject:point=>({lat:point.y,lng:point.x}),
    setView:(next,options)=>{pans.push({next,options});zoom=next.zoom;}
  };
  const classList={};
  const doc={
    addEventListener:()=>{},
    createElement(tag){
      const el={tag,children:[],className:"",style:{},offsetWidth:200,offsetHeight:130,
        attributes:{},textContent:"",type:"",
        setAttribute(name,value){this.attributes[name]=value;},
        addEventListener(){},
        append(...children){this.children.push(...children);},
        querySelector(){return {focus(){}};},
        remove(){this.removed=true;}
      };
      nodes.push(el);return el;
    }
  };
  const app={append(el){nodes.push(el);},getBoundingClientRect:()=>({left:0,top:0,width:390,height:800})};
  let before=0;
  const controller=new PinOverlapZoom({mapPort:map,getPins:()=>pins,getMaxZoom:()=>maxZoom,
    onSelect:id=>selected.push(id),onBeforeZoom:()=>before++,
    getElement:id=>id==="app"?app:null,document:doc});
  return {controller,selected,pans,getBefore:()=>before,nodes};
}
test("single isolated pin selects immediately without moving the map",()=>{
  const f=fixture([{id:"alone",lat:0,lng:0}]);
  assert.equal(f.controller.handleTap("alone"),"selected");
  assert.deepEqual(f.selected,["alone"]);assert.deepEqual(f.pans,[]);
  assert.equal(f.getBefore(),0);
});
test("overlapping pins zoom once without opening ANY pin editor",()=>{
  const f=fixture([{id:"a",lat:0,lng:0},{id:"b",lat:0,lng:10}]);
  assert.equal(f.controller.handleTap("a"),"zoomed");
  assert.deepEqual(f.selected,[]);
  assert.equal(f.pans.length,1);
  assert.equal(f.pans[0].next.zoom,13);
  assert.deepEqual(f.pans[0].options,{animate:false});
  assert.equal(f.getBefore(),1);
});
test("overview duplicates zoom into a centered visible pin before asking for choices",()=>{
  const f=fixture([{id:"a",lat:10,lng:20,name:"Fulda",layerName:"Privat"},
    {id:"b",lat:10,lng:20,name:"Fulda",layerName:"Ebene 1"}],19,6);
  assert.equal(f.controller.handleTap("a"),"zoomed");
  assert.deepEqual(f.pans[0].next,{center:{lat:10,lng:20},zoom:19});
  assert.equal(f.controller.menu,null);
  assert.equal(f.controller.canUndo(),true);
  assert.equal(f.controller.handleTap("b"),"choices");
  assert.deepEqual(f.controller.menu.children.slice(1).map(b=>b.textContent),
    ["Fulda · Ebene 1 · 1","Fulda · Privat · 2"]);
  assert.deepEqual(f.selected,[]);
  assert.equal(f.controller.undo(),true);
  assert.equal(f.pans.at(-1).next.zoom,6);
  assert.equal(f.controller.canUndo(),false);
  assert.equal(f.controller.menu,null);
});
test("first autozoom fits every connected pin even if distant members cannot be fully separated",()=>{
  const pins=[0,48,96,144,192].map((x,i)=>({id:String(i),x,y:0}));
  const projected=(p,z)=>({x:p.x*2**(z-10),y:0});
  assert.deepEqual(connectedPins(pins,"0",p=>p).map(p=>p.id),
    ["0","1","2","3","4"]);
  assert.equal(zoomDecision(pins,10,19,projected).zoom,11);
  const group=[{x:0},{x:5},{x:10},{x:15},{x:20}];
  assert.equal(fittingZoom(group,10,19,projected,{x:350,y:650}),12,
    "Fit constraints must cap zoom before losing initial members");
});
test("viewport undo is inert until an autozoom and restores exact previous center and zoom",()=>{
  const f=fixture([{id:"a",lat:0,lng:0},{id:"b",lat:0,lng:10}]);
  assert.equal(f.controller.undo(),false);
  f.controller.handleTap("a");
  assert.equal(f.controller.canUndo(),true);
  f.controller.undo();
  assert.deepEqual(f.pans.at(-1).next,{center:{lat:0,lng:0},zoom:10});
});

test("thousands of identical visible pins form one selectable group without pairwise rescans",()=>{
  const pins=Array.from({length:2200},(_,i)=>({id:"pin-"+i,x:5,y:6}));
  const group=connectedPins(pins,"pin-103",pin=>pin);
  assert.equal(group.length,2200);
  assert.equal(group[0].id,"pin-103");
  assert.deepEqual(new Set(group.map(p=>p.id)).size,2200);
});
