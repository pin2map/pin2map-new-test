"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Dialog=require("../ui/object-dialog-core.js");
const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
function surface(){
 const style={};
 const popup={style};
 const panel={getBoundingClientRect:()=>rect(20,350,320,250)};
 const header={getBoundingClientRect:()=>rect(20,350,320,40)};
 const footer={getBoundingClientRect:()=>rect(20,555,320,40)};
 return {panel,header,footer,popup,style};
}
test("iPhone keyboard cannot collapse Pin or geometry URL popups",()=>{
 const {panel,header,footer,popup,style}=surface();
 const doc={defaultView:{innerWidth:390,innerHeight:750,
  visualViewport:{offsetLeft:0,offsetTop:0,width:390,height:420}}};
 Dialog.positionPopup({panel,header,footer,popup,doc});
 assert.ok(Number.parseFloat(style.height)>=160,"URL retains visible editor and actions");
 assert.ok(Number.parseFloat(style.top)>=12,"URL stays in visible viewport");
 assert.ok(Number.parseFloat(style.top)+Number.parseFloat(style.height)<=420-12);
});
test("Layer selector remains usable when keyboard obscures owner panel",()=>{
 const layout=Dialog.layerMenuLayout({
  panel:rect(20,350,320,250),trigger:rect(100,560,42,42),
  header:rect(20,350,320,40),footer:rect(20,555,320,40),
  viewport:{left:0,top:0,width:390,height:420},
  contained:true,visibleRows:5
 });
 assert.ok(layout.width>200&&layout.height>=100,"layer rows remain clickable");
 assert.ok(layout.top>=12&&layout.top+layout.height<=408,"picker remains above keyboard");
});
