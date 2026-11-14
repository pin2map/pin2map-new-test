"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {clipSegment,findVisibleAnchor}=require("../domain/river-label-anchor.js");
const pixel=point=>({x:point[0],y:point[1]});
test("viewport label follows the visible portion when the river extends far beyond the screen",()=>{
  const chain=[[-300,60],[-20,60],[80,60],[200,60],[550,60],[900,60]];
  const p=findVisibleAnchor([chain],pixel,400,180,20);
  assert.ok(p);
  assert.ok(Math.abs(p.x-200)<0.001);
  assert.equal(p.y,60);
});
test("viewport label moves to another river section after panning or zooming",()=>{
  const chains=[[[0,0],[800,0]]];
  const before=findVisibleAnchor(chains,pixel,300,300,20);
  const after=findVisibleAnchor(chains,p=>({x:p[0]-430,y:p[1]+140}),300,300,20);
  assert.equal(before,null,"Entire line above padded viewport");
  assert.ok(after&&after.x>20&&after.x<280&&after.y===140);
});
test("longest continuous visible run wins, not the midpoint of the full river",()=>{
  const chains=[
    [[-900,-900],[-400,-400],[20,120],[90,120],[160,120],[230,120],[310,120],[900,900]],
    [[20,60],[35,60]]
  ];
  const p=findVisibleAnchor(chains,pixel,300,240,20);
  assert.ok(p&&p.x>=90&&p.x<=210&&p.y===120);
});
test("clipSegment includes edge-crossing lines with no endpoints inside viewport",()=>{
  const p=clipSegment({x:-500,y:100},{x:700,y:100},300,200,25);
  assert.deepEqual(p,[{x:25,y:100},{x:275,y:100}]);
});
test("offscreen river has no label; empty or degenerate data remain safe",()=>{
  assert.equal(findVisibleAnchor([[[700,700],[800,800]]],pixel,300,300),null);
  assert.equal(findVisibleAnchor([],pixel,300,300),null);
  assert.equal(findVisibleAnchor([[[100,100],[100,100]]],pixel,300,300),null);
});
