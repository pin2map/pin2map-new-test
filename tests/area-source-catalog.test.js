"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {normalizeGeoJSON,manifest,diff,coverageProbe}=require("../research/area-source-catalog.cjs");
const square=(x,y,d)=>[[x,y],[x+d,y],[x+d,y+d],[x,y+d],[x,y]];
const geom=(x,y,d)=>({type:"Polygon",coordinates:[square(x,y,d)]});
const src={
 key:"test-water",license:"Public Domain",attribution:"Fixture source",
 version:"v1",kind:"water",sourceFile:"water.geojson",
 identifier:f=>f.properties.id,name:f=>f.properties.name
};
const make=(id="lake-1",name="Lake Example",geometry=geom(0,0,2))=>
 ({type:"Feature",properties:{id,name},geometry});
function load(feature=make(),source=src){
 return normalizeGeoJSON([{source,features:[feature]}]);
}
test("source-aware manifest records rights, provenance, stable IDs and no coordinates array",()=>{
 const state=load(),m=manifest(state.rows,{builtAt:"2026-11-18T00:00:00Z",
   sourceRevisions:{"test-water":"commit-123"}});
 assert.equal(state.rows[0].id,"test-water:lake-1");
 assert.equal(state.rows[0].sourceRecordKey,"lake-1");
 assert.equal(state.rows[0].stableId,true);
 assert.equal(state.rows[0].license,"Public Domain");
 assert.equal(state.rows[0].sourceFile,"water.geojson");
 assert.equal(m.schema,1);
 assert.equal(m.sha256.length,64);
 assert.ok(!JSON.stringify(m).includes("coordinates"));
 assert.equal(JSON.stringify(m).includes("sourceRevisions"),true);
});
test("independent snapshots detect exact geometry, metadata and license changes",()=>{
 const before=manifest(load().rows,{builtAt:"2026-11-18T00:00:00Z"});
 const updatedSource={...src,license:"CC BY 4.0",version:"v2",attribution:"New credit"};
 const after=manifest(load(make("lake-1","Updated lake",geom(0,0,3)),updatedSource).rows,
  {builtAt:"2026-11-19T00:00:00Z"});
 const changes=diff(before,after);
 assert.deepEqual(changes.geometryChanged,["test-water:lake-1"]);
 assert.deepEqual(changes.metadataChanged,["test-water:lake-1"]);
 assert.deepEqual(changes.rightsChanged,["test-water:lake-1"]);
 assert.deepEqual(changes.added,[]);
 const removed=manifest([],{builtAt:"2026-11-20T00:00:00Z"});
 assert.deepEqual(diff(before,removed).removed,["test-water:lake-1"]);
});
test("different license sources with same name remain separate identities",()=>{
 const other={...src,key:"another-source",license:"ODbL 1.0"};
 const state=normalizeGeoJSON([{source:src,features:[make()]},
  {source:other,features:[make()]}]);
 assert.equal(state.rows.length,2);
 assert.notEqual(state.rows[0].id,state.rows[1].id);
 assert.deepEqual(state.rows.map(x=>x.license),["Public Domain","ODbL 1.0"]);
});
test("unstable positional fallbacks and unsupported coordinates are explicit",()=>{
 const f=make();delete f.properties.id;
 const result=load(f);
 assert.equal(result.rows[0].stableId,false);
 assert.equal(result.counts["test-water"].unstableIds,1);
 assert.deepEqual(diff(manifest(result.rows,{builtAt:"2026-11-18"}),
  manifest(result.rows,{builtAt:"2026-11-19"})).needsReview,["test-water:row-0"]);
 const clipped=normalizeGeoJSON([{source:src,features:[
  {type:"Feature",properties:{id:"x",name:"out-of-range"},
   geometry:geom(200,0,2)},
  {type:"Feature",properties:{id:"point",name:"POI"},
   geometry:{type:"Point",coordinates:[0,0]}}
 ]}]);
 assert.equal(clipped.counts["test-water"].skippedBbox,1);
 assert.equal(clipped.counts["test-water"].skippedGeometry,1);
});
test("duplicate sources, IDs and unreviewed licenses are rejected",()=>{
 assert.throws(()=>load(make(),{...src,license:"unknown"}),/Unreviewed license/);
 assert.throws(()=>normalizeGeoJSON([{source:src,features:[make(),make()]}]),/Duplicate record/);
 assert.throws(()=>normalizeGeoJSON([{source:src,features:[]},{source:src,features:[]}]),/Duplicate source/);
 assert.throws(()=>manifest([],{}),/timestamp/);
});
test("corpus coverage report never claims global absence or OSM identity",()=>{
 const state=load(make("lake-1","Lake Example"));
 const res=coverageProbe(state.rows,state.geometries,[
  {name:"Lake Example",region:"Example",kind:"water",lng:1,lat:1},
  {name:"Unrelated Reserve",region:"Example",kind:"protected",lng:1,lat:1},
  {name:"Somewhere",region:"Example",kind:"water",lng:50,lat:50}
 ]);
 assert.deepEqual(res.map(r=>r.sameKindCount),[1,0,0]);
 assert.deepEqual(res.map(r=>r.exactNormalizedNameCount),[1,0,0]);
 assert.ok(res.every(r=>r.interpretation.includes("Corpus-only")));
});
