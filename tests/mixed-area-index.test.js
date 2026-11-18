"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {named,randomPoints}=require("../research/mixed-area-blind-points.cjs");
const {build}=require("../research/area-metadata-index.cjs");
const {bounds}=require("../research/spatial-index-prototype.cjs");
const {containsPoint}=require("../domain/area-geometry.js");
const square=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d],[a,b]];
const feature=(id,kind,b,geometry)=>({id,name:id,kind,bbox:b,geometry});
test("predeclared and seeded points are independent of expected area identities",()=>{
 assert.ok(named.length>=30);
 assert.equal(randomPoints(160).length,160);
 assert.deepEqual(randomPoints(4),randomPoints(4));
 assert.notDeepEqual(randomPoints(4,7),randomPoints(4,8));
 assert.ok([...named,...randomPoints()].every(p=>p.lon>=-180&&p.lon<=180&&p.lat>=-90&&p.lat<=90));
 assert.equal(new Set(named.map(p=>p.name)).size,named.length);
});
test("mixed-layer index equals exhaustive exact geometry for all blind point fixtures",async()=>{
 const shapes=[
  feature("country","region",{west:0,south:0,east:10,north:10},{type:"Polygon",coordinates:[square(0,0,10,10)]}),
  feature("lake","water",{west:2,south:2,east:8,north:8},{type:"Polygon",coordinates:[square(2,2,8,8)]}),
  feature("reserve","protected",{west:3,south:3,east:7,north:7},{type:"Polygon",coordinates:[square(3,3,7,7)]}),
  feature("ecosystem","ecoregion",{west:1,south:1,east:9,north:9},{type:"Polygon",coordinates:[square(1,1,9,9),square(4,4,6,6)]})
 ];
 const index=build(shapes.map(({geometry,...data})=>data),{cellSize:2});
 const byId=new Map(shapes.map(x=>[x.id,x]));
 const points=[...named,...randomPoints(),{lon:5,lat:5},{lon:3.5,lat:3.5},{lon:12,lat:1}];
 for(const p of points){
  const expected=shapes.filter(x=>containsPoint(x.geometry,p.lon,p.lat)).map(x=>x.id).sort();
  const actual=[];
  for(const x of index.candidates(p.lon,p.lat)){
   const result=await index.verify(x.id,p.lon,p.lat,async id=>({geometry:byId.get(id).geometry,bytes:0}));
   if(result.contains)actual.push(x.id);
  }
  assert.deepEqual(actual.sort(),expected,p.name||"synthetic");
 }
 assert.deepEqual(index.candidates(3.5,3.5).map(x=>x.id),["country","lake","reserve","ecosystem"]);
 assert.deepEqual(shapes.map(x=>bounds(x.geometry)),shapes.map(x=>x.bbox));
});
