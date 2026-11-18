"use strict";
/* On-demand 4-object research-only live benchmark.
 * Each RESOLVE CC BY 4.0 geometry is fetched at most once; no storage,
 * no provider scraping, no user data, no GeoJSON committed to repository.
 * These are shape-derived, known-interior points: NOT blinded discovery.
 */
const assert=require("node:assert/strict");
const {performance}=require("node:perf_hooks");
const {build}=require("./area-metadata-index.cjs");
const fixtures=require("./area-metadata-fixtures.cjs");
const index=build(fixtures);
async function fetchGeometry(id,entry){
 // GitHub Contents API is more consistently reachable on Actions runners
 // than raw.githubusercontent.com for this public dataset. Four GETs only.
 const url="https://api.github.com/repos/CatalogueOfLife/col-gazetteers/contents/teow/features/"+entry.sourceId+".geojson?ref=main";
 let last;
 for(let attempt=0;attempt<3;attempt++){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(url,{signal:controller.signal,headers:{"User-Agent":"pin2map-new-limited-area-research"}});
   if(!response.ok)throw Error("HTTP "+response.status+" for "+id);
   const envelope=await response.json();
   if(envelope.encoding!=="base64"||typeof envelope.content!=="string")
    throw Error("GitHub contents missing base64 feature: "+id);
   const body=Buffer.from(envelope.content.replace(/\\s/g,""),"base64").toString("utf8");
   const geojson=JSON.parse(body);
   assert.equal(geojson.type,"Feature");
   assert.equal(geojson.properties.ECO_ID,entry.sourceId);
   assert.equal(geojson.properties.LICENSE,"CC-BY 4.0");
   assert.equal(geojson.properties.ECO_NAME,entry.name);
   return {geometry:geojson.geometry,bytes:Buffer.byteLength(body,"utf8")};
  }catch(error){last=error;if(attempt===2)throw error;
   await new Promise(r=>setTimeout(r,500*(attempt+1)));
  }finally{clearTimeout(timer);}
 }
 throw last;
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
  note:"Known-polygon interior points, new vs original 15. GitHub static GeoJSON, not live OSM discovery; cold includes real network, warm is in-memory.",
  metadataBytes:stats.metadataBytes,metadataCandidates:fixtures.length,
  fetches,actualGeometryBytes:totalBytes,rows:results
 },null,2));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
