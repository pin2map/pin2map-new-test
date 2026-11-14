"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const geometry=require("../domain/area-geometry.js");
function denseRing(n=13000){
  const ring=[];
  for(let i=0;i<n;i++){
    const t=i*2*Math.PI/n;
    ring.push([10+Math.cos(t),50+Math.sin(t)]);
  }
  ring.push(ring[0].slice());
  return ring;
}
test("predecessor keeps polygons through 12000 coordinate points unchanged",()=>{
  const ring=denseRing(11999),g={type:"Polygon",coordinates:[ring]};
  const result=geometry.prepare(g);
  assert.equal(result.before,12000);
  assert.equal(result.after,12000);
  assert.equal(result.geometry,g);
});
test("predecessor uses adaptive bounded geographic tolerance",()=>{
  assert.equal(geometry.tolerance({type:"Polygon",coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}),0.0002);
  assert.equal(geometry.tolerance({type:"Polygon",coordinates:[[[0,0],[100,0],[100,100],[0,0]]]}),0.0018);
  assert.equal(geometry.tolerance(null),0.0008);
});
test("closed rings preserve closure and are reduced only for large geometries",()=>{
  const g={type:"Polygon",coordinates:[denseRing()]};
  const r=geometry.simplify(g);
  assert.equal(r.before,13001);
  assert.ok(r.after<r.before);
  const ring=r.geometry.coordinates[0];
  assert.deepEqual(ring[0],ring[ring.length-1]);
  assert.ok(ring.length>=4);
});
test("adaptive touch budget uses strict historical thresholds and returns accumulated total",()=>{
  const g={type:"Polygon",coordinates:[denseRing()]};
  const normal=geometry.prepare(g);
  const touch=geometry.prepare(g,{touchDevice:true,existingPoints:180000});
  assert.equal(touch.before,normal.before);
  assert.ok(touch.after<=normal.after);
  assert.equal(touch.totalPoints,180000+touch.after);
});
test("multipolygon holes and geometry collections retain geometry types",()=>{
  const original={type:"GeometryCollection",geometries:[
    {type:"MultiPolygon",coordinates:[[denseRing(),[[0,0],[1,0],[1,1],[0,0]]]]},
    {type:"Point",coordinates:[9,49]}
  ]};
  const r=geometry.simplify(original);
  assert.equal(r.geometry.type,"GeometryCollection");
  assert.equal(r.geometry.geometries[0].type,"MultiPolygon");
  assert.deepEqual(r.geometry.geometries[0].coordinates[0][1],
    original.geometries[0].coordinates[0][1]);
  assert.deepEqual(r.geometry.geometries[1],original.geometries[1]);
});
