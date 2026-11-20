"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {circleFromRect}=require("../ui/object-search-spotlight.js");
test("spotlight centers circles on actual map-relative display rectangles",()=>{
 const v=circleFromRect({left:150,right:200,top:70,bottom:120},{left:100,top:20});
 assert.equal(v.x,75);assert.equal(v.y,75);
 assert.ok(v.radius>=34);
});
test("spotlight clamps large labels and ignores degenerate geometries",()=>{
 const x=circleFromRect({left:0,right:1500,top:0,bottom:100},{left:0,top:0});
 assert.equal(x.radius,160);
 assert.equal(circleFromRect({left:10,right:10,top:1,bottom:2},{left:0,top:0}),null);
 assert.equal(circleFromRect({left:NaN,right:10,top:1,bottom:2},{left:0,top:0}),null);
});
