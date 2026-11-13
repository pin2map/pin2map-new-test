"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {anchorGeometry,openingCorrection,PinPanelPositioner}=require("../ui/pin-panel-positioner.js");

test("pin panel and tip retain a 94px clearance for label and pin gaps",()=>{
  const p=anchorGeometry({
    point:{x:100,y:80},mapRect:{left:10,top:20},
    appRect:{left:0,top:0,width:500,height:450},panelHeight:120
  });
  assert.deepEqual(p,{
    panel:{left:-85,top:-114,width:390},
    tip:{left:110,top:6}
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
test("a centered 304px editor on a 320px iPhone never pans back and forth",()=>{
  const appRect={left:0,top:0,right:320,bottom:568};
  const aligned={left:8,right:312,top:100,bottom:420};
  const tip={bottom:435};
  for(let i=0;i<12;i++){
    assert.deepEqual(openingCorrection({appRect,panelRect:aligned,tipRect:tip}),
      {dx:0,dy:0,needsPan:false},"reopening must keep the existing map center");
  }
  // Starting off-center still corrects once to the closest feasible inset.
  const shifted={...aligned,left:3,right:307};
  const first=openingCorrection({appRect,panelRect:shifted,tipRect:tip});
  assert.equal(first.dx,5);
  assert.equal(first.needsPan,true);
  const corrected={...shifted,left:shifted.left+first.dx,right:shifted.right+first.dx};
  assert.deepEqual(openingCorrection({appRect,panelRect:corrected,tipRect:tip}),
    {dx:0,dy:0,needsPan:false});
});
test("wide screens retain the full 12px opening margin",()=>{
  const appRect={left:0,top:0,right:390,bottom:650};
  const panelRect={left:5,right:355,top:75,bottom:480};
  assert.equal(openingCorrection({appRect,panelRect,tipRect:{bottom:495}}).dx,7);
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
  assert.ok(Math.abs(f.pans[0].point.y)<Number.EPSILON);
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
