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

test("overlapping result circles share one count; separated circles do not",()=>{
 const {groupCircles}=require("../ui/object-search-spotlight.js");
 const items=[{id:"pins:a",x:100,y:100,radius:60},
   {id:"pins:b",x:105,y:102,radius:60},
   {id:"pins:c",x:109,y:103,radius:60},
   {id:"pins:c",x:109,y:103,radius:60},
   {id:"pins:far",x:320,y:100,radius:40}];
 const groups=groupCircles(items);
 assert.equal(groups.length,2);
 assert.deepEqual(groups.map(g=>new Set(g.map(c=>c.id)).size),[3,1]);
 const source=require("node:fs").readFileSync(require("node:path").resolve(__dirname,"../ui/object-search-spotlight.js"),"utf8");
 assert.doesNotMatch(source,/setAttribute\("stroke","rgba\(255,255,255/);
});
