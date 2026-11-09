"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {anchorGeometry,openingCorrection,PinPanelPositioner}=require("../ui/pin-panel-positioner.js");

test("pin panel preserves the original anchor and 76px arrow offset",()=>{
  const p=anchorGeometry({
    point:{x:100,y:80},mapRect:{left:10,top:20},
    appRect:{left:0,top:0,width:500,height:450},panelHeight:120
  });
  assert.deepEqual(p,{
    panel:{left:-45,top:-96,width:310},
    tip:{left:110,top:24}
  });
});
test("narrow screens keep prior width formula without silently clamping panel coordinates",()=>{
  const p=anchorGeometry({
    point:{x:0,y:0},mapRect:{left:10,top:20},
    appRect:{left:0,top:0,width:240,height:400},panelHeight:120
  });
  assert.equal(p.panel.width,224);
  assert.equal(p.panel.left,-102);
});
test("opening correction moves initial dialog inward without modifying pin",()=>{
  assert.deepEqual(openingCorrection({
    appRect:{left:0,top:0,right:320,bottom:500},
    panelRect:{left:-20,right:260,top:30,bottom:180},
    tipRect:{bottom:190}
  }),{dx:32,dy:0,needsPan:true});
});
test("opening correction handles top and bottom edges using the same precedence",()=>{
  assert.deepEqual(openingCorrection({
    appRect:{left:0,top:0,right:320,bottom:500},
    panelRect:{left:30,right:260,top:-40,bottom:120},
    tipRect:{bottom:140}
  }),{dx:0,dy:52,needsPan:true});
  assert.deepEqual(openingCorrection({
    appRect:{left:0,top:0,right:320,bottom:500},
    panelRect:{left:30,right:260,top:350,bottom:520},
    tipRect:{bottom:540}
  }),{dx:0,dy:-52,needsPan:true});
});
test("already visible panel produces no opening pan",()=>{
  assert.deepEqual(openingCorrection({
    appRect:{left:0,top:0,right:320,bottom:500},
    panelRect:{left:20,right:260,top:20,bottom:210},
    tipRect:{bottom:230}
  }),{dx:0,dy:0,needsPan:false});
});
function fixture({panelRect={left:-20,right:260,top:30,bottom:180},hidden=false}={}){
  const toggles=[];
  function element(rect={}){
    const classes=new Set(hidden?["hidden"]:[]);
    return {
      classList:{
        contains:token=>classes.has(token),
        toggle:(token,on)=>{toggles.push([token,on]);if(on)classes.add(token);else classes.delete(token);},
        remove:token=>classes.delete(token)
      },
      style:{},offsetHeight:120,getBoundingClientRect:()=>rect
    };
  }
  const panel=element(panelRect),tip=element({bottom:190}),app=element({left:0,top:0,width:320,height:500,right:320,bottom:500});
  const nodes={pinPanel:panel,pinDialogTip:tip,app};
  const mapRect={left:0,top:0};const pans=[];
  const map={
    project:()=>({x:130,y:250}),
    getContainer:()=>({getBoundingClientRect:()=>mapRect}),
    panBy:(point,options)=>pans.push({point,options})
  };
  const document={body:{classList:{toggle:(name,on)=>toggles.push([name,on])}}};
  return {view:new PinPanelPositioner({mapAdapter:map,getElement:id=>nodes[id],document}),
    panel,tip,pans,toggles};
}
test("initial opening pans only once and subsequent relayout never pans",()=>{
  const f=fixture();const pin={lat:48,lng:9};
  assert.equal(f.view.keepVisibleAtOpen({pin,moving:false}),true);
  // Negating a zero pan offset yields -0; both describe the same map movement.
  assert.equal(f.pans.length,1);
  assert.equal(f.pans[0].point.x,-32);
  assert.equal(f.pans[0].point.y,0);
  assert.deepEqual(f.pans[0].options,{animate:false});
  f.view.layout({pin,moving:false});
  assert.equal(f.pans.length,1);
  assert.deepEqual(pin,{lat:48,lng:9});
  assert.equal(f.panel.style.width,"304px");
  assert.equal(f.panel.style.transform,"none");
});
test("hidden dialog or active relocation does not pan or anchor",()=>{
  const hidden=fixture({hidden:true});
  assert.equal(hidden.view.keepVisibleAtOpen({pin:{lat:1,lng:2}}),false);
  assert.deepEqual(hidden.pans,[]);
  const moving=fixture();
  assert.equal(moving.view.keepVisibleAtOpen({pin:{lat:1,lng:2},moving:true}),false);
  assert.deepEqual(moving.pans,[]);
  assert.equal(moving.tip.classList.contains("hidden"),true);
});
