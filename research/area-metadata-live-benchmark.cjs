"use strict";
/* On-demand 4-object research-only live benchmark.
 * Each RESOLVE CC BY 4.0 geometry is fetched at most once; no storage,
 * no provider scraping, no user data, no GeoJSON committed to repository.
 * These are shape-derived, known-interior points: NOT blinded discovery.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {performance}=require("node:perf_hooks");
const {build}=require("./area-metadata-index.cjs");
const fixtures=require("./area-metadata-fixtures.cjs");
const index=build(fixtures);
async function fetchGeometry(id,entry){
 // Live source is a READ-ONLY sparse checkout of the public dataset.
 // Cold measures local file/JSON processing, NOT external network latency.
 const root=process.env.PIN2MAP_RESEARCH_DATA_ROOT;
 if(!root)throw Error("Read-only research data checkout required");
 const full=path.resolve(root,"teow/features/"+entry.sourceId+".geojson");
 const begin=path.resolve(root,"teow/features");
 if(!full.startsWith(begin+path.sep))throw Error("Invalid source path");
 const bytes=fs.readFileSync(full);
 const geojson=JSON.parse(bytes.toString("utf8"));
 assert.equal(geojson.type,"Feature");
 assert.equal(geojson.properties.ECO_ID,entry.sourceId);
 assert.equal(geojson.properties.LICENSE,"CC-BY 4.0");
 assert.equal(geojson.properties.ECO_NAME,entry.name);
 return {geometry:geojson.geometry,bytes:bytes.length};
}

(async()=>{
 const stats=index.stats(),results=[];
 let totalBytes=0,fetches=0;
 for(const f of fixtures){
  const c=index.candidates(f.point.lon,f.point.lat);
  assert.ok(c.some(x=>x.id===f.id),"Real bbox candidate missing: "+f.name);
  assert.ok(c.every(x=>x.status==="unverified"));
  const coldStart=performance.now();
  const first=await index.verify(f.id,f.point.lon,f.point.lat,async(id,m)=>{
   fetches++;return fetchGeometry(id,m);
  });
  const coldMs=performance.now()-coldStart;
  assert.equal(first.status,"verified");
  assert.equal(first.contains,true,"Real source polygon does NOT contain newly sampled point: "+f.name);
  totalBytes+=first.bytesFetched;
  const warmStart=performance.now();
  const second=await index.verify(f.id,f.point.lon,f.point.lat,async()=>{throw Error("warm cache must not fetch")});
  const warmMs=performance.now()-warmStart;
  assert.equal(second.contains,true);assert.equal(second.bytesFetched,0);assert.equal(second.fromCache,true);
  results.push({id:f.id,name:f.name,point:f.point,
    bboxCandidates:c.length,vertices:first.vertices,
    geometryBytes:first.bytesFetched,coldMs:+coldMs.toFixed(2),
    warmMs:+warmMs.toFixed(3)});
 }
 assert.equal(fetches,fixtures.length);
 assert.equal(index.stats().cachedGeometries,fixtures.length);
 console.log("AREA_METADATA_LIVE_BENCH",JSON.stringify({
  source:"RESOLVE 2017; CatalogueOfLife teow; CC BY 4.0",
  note:"New points derived from known RESOLVE polygons, not blind OSM discovery. GitHub sparse checkout of four real files. Cold measures LOCAL file load, warm is in-memory. No network speed inferred.",
  metadataBytes:stats.metadataBytes,metadataCandidates:fixtures.length,
  fetches,sourceGeometryFileBytes:totalBytes,rows:results
 },null,2));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
