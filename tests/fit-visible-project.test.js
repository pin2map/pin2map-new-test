"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const projectFit=require("../application/fit-visible-project.js");
const pinFilter=require("../domain/pin-filter.js");
const layer=l=>({id:l,visible:true});
const project={
 layers:[layer("private"),layer("geo"),{id:"hidden",visible:false}],
 pins:[{id:"p1",lat:50,lng:8,layerId:"private"},
  {id:"p2",lat:11,lng:20,layerId:"hidden"}],
 areas:[
 {id:"a",layerId:"geo",kind:"lake",geometry:{type:"Polygon",coordinates:[[[9,51],[10,51],[10,52],[9,51]]]}},
 {id:"b",layerId:"hidden",geometry:{type:"Polygon",coordinates:[[[20,10],[21,10],[20,10]]]}},
 {id:"c",layerId:"geo",geometry:{type:"MultiPolygon",coordinates:[[[[11,53],[12,53],[11,53]]]]}}
 ],
 rivers:[{id:"r",layerId:"geo",chains:[[[54,13],[55,14]]]},
 {id:"r2",layerId:"hidden",chains:[[[60,20],[60,21]]]}]
};
test("autozoom collects all visible pin, polygon, lake and river coordinate types",()=>{
 const pts=projectFit.visiblePoints(project,pinFilter,pinFilter.createFilter());
 for(const point of [[50,8],[51,9],[52,10],[53,11],[54,13],[55,14]])
   assert.ok(pts.some(p=>p[0]===point[0]&&p[1]===point[1]),JSON.stringify({point,pts}));
 assert.ok(!pts.some(p=>p[0]===60));
 assert.ok(!pts.some(p=>p[0]===11));
});
test("visibility change fits map safely once for full combined feature set",()=>{
 let record=null,count=0;
 assert.equal(projectFit.fit({project,pinFilter,currentFilter:pinFilter.createFilter(),
  mapPort:{fitBounds:(bounds,options)=>record={bounds,options}},
  onFit:()=>count++}),true);
 assert.equal(count,1);
 assert.ok(record.bounds.length>3);
 assert.deepEqual(record.options,{padding:[35,35],maxZoom:15,animate:false});
});
test("empty visible map does not unexpectedly change viewport",()=>{
 const p={layers:[{id:"private",visible:false}],pins:[],areas:[],rivers:[]};
 let called=false;
 assert.equal(projectFit.fit({project:p,pinFilter,currentFilter:pinFilter.createFilter(),
  mapPort:{fitBounds:()=>called=true}}),false);
 assert.equal(called,false);
});
