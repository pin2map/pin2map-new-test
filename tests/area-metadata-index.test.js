"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {build}=require("../research/area-metadata-index.cjs");
const fixtures=require("../research/area-metadata-fixtures.cjs");
const bbox=(west,south,east,north)=>({west,south,east,north});
const square=(west,south,east,north)=>[[west,south],[east,south],[east,north],[west,north],[west,south]];
const sample=(id,b)=>({id,name:id,kind:"ecoregion",bbox:b});
test("new real-source coordinates do not overlap the historical 15 reference points",()=>{
 const old=require("./area-source-fixtures.cjs");
 assert.equal(fixtures.length,4);
 for(const f of fixtures){
  assert.ok(!old.some(p=>Math.abs(p.lat-f.point.lat)<.000001&&
    Math.abs(p.lng-f.point.lon)<.000001),f.name);
 }
});
test("metadata-first queries don't load geometry or claim polygon containment",()=>{
 const index=build(fixtures);
 assert.equal(index.stats().areas,4);
 assert.equal(index.stats().cachedGeometries,0);
 assert.ok(index.stats().metadataBytes<2500);
 for(const f of fixtures){
  const hits=index.candidates(f.point.lon,f.point.lat);
  assert.ok(hits.some(x=>x.id===f.id&&x.status==="unverified"));
  assert.equal(index.stats().cachedGeometries,0);
 }
});
test("bbox false positive, hole and true overlap are resolved ONLY after full polygons",async()=>{
 const records=[sample("concave",bbox(0,0,4,4)),sample("hole",bbox(0,0,4,4)),
  sample("square",bbox(0,0,4,4))];
 const polys={
  concave:{type:"Polygon",coordinates:[[[0,0],[4,0],[4,1],[1,1],[1,4],[0,4],[0,0]]]},
  hole:{type:"Polygon",coordinates:[square(0,0,4,4),square(1,1,3,3)]},
  square:{type:"Polygon",coordinates:[square(0,0,4,4)]}
 };
 const index=build(records,{cellSize:1});
 const candidates=index.candidates(2,2);
 assert.deepEqual(candidates.map(c=>c.id),["concave","hole","square"]);
 assert.ok(candidates.every(c=>c.status==="unverified"));
 const matched=[];
 for(const c of candidates){
  const result=await index.verify(c.id,2,2,async id=>({geometry:polys[id],bytes:125}));
  if(result.contains)matched.push(c.id);
 }
 assert.deepEqual(matched,["square"]);
 const second=await index.verify("square",2,2,()=>{throw Error("should use cache")});
 assert.equal(second.fromCache,true);
 assert.equal(second.bytesFetched,0);
});
test("concurrent cold requests share one injected network load, then warm cache",async()=>{
 const index=build([sample("a",bbox(0,0,2,2))]);
 let calls=0;const geom={type:"Polygon",coordinates:[square(0,0,2,2)]};
 const loader=async()=>{calls++;await new Promise(r=>setTimeout(r,5));return {geometry:geom,bytes:1024}};
 const [first,second]=await Promise.all([index.verify("a",1,1,loader),index.verify("a",1,1,loader)]);
 assert.equal(calls,1);assert.ok(first.contains&&second.contains);
 assert.equal(index.stats().cachedGeometries,1);
 const warm=await index.verify("a",1,1,loader);
 assert.equal(calls,1);assert.equal(warm.fromCache,true);
 assert.equal(warm.bytesFetched,0);
 index.clearCache();assert.equal(index.stats().cachedGeometries,0);
 await index.verify("a",1,1,loader);assert.equal(calls,2);
});
test("failed geometry never enters cache and can retry",async()=>{
 const index=build([sample("a",bbox(0,0,1,1))]);
 await assert.rejects(index.verify("a",.5,.5,async()=>{throw Error("HTTP 503")}),/503/);
 assert.equal(index.stats().cachedGeometries,0);
 const actual={type:"Polygon",coordinates:[square(0,0,1,1)]};
 const result=await index.verify("a",.5,.5,async()=>({geometry:actual,bytes:250}));
 assert.equal(result.contains,true);
});
test("invalid bbox, antimeridian and malformed geometry are explicitly rejected",async()=>{
 assert.throws(()=>build([sample("x",bbox(170,-10,-170,10))]),/bbox/);
 assert.throws(()=>build([sample("x",bbox(-200,-10,10,10))]),/bbox/);
 assert.throws(()=>build([sample("x",bbox(0,0,1,1)),sample("x",bbox(0,0,1,1))]),/Duplicate/);
 const index=build([sample("a",bbox(0,0,1,1))]);
 assert.deepEqual(index.candidates(-30,20),[]);
 assert.throws(()=>index.candidates(200,0),/coordinate/);
 assert.equal((await index.verify("a",3,3,async()=>{throw Error("never load") })).status,"outside_bbox");
 await assert.rejects(index.verify("a",.5,.5,async()=>({geometry:{type:"Point",coordinates:[.5,.5]}})),/Polygon/);
 assert.equal(index.stats().cachedGeometries,0);
});
