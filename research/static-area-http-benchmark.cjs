"use strict";
/* Real-source no-server publication experiment:
 * all source polygons checked out READ-ONLY in Github Actions,
 * static assets created TEMPORARILY in runner (never pushed to Pages),
 * HTTP localhost static-file server mimics public blob hosting,
 * exact 196-point validation vs original unindexed geometry.
 */
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const http=require("node:http"),assert=require("node:assert/strict");
const {performance}=require("node:perf_hooks");
const sources=require("./area-source-registry.cjs");
const {normalizeGeoJSON}=require("./area-source-catalog.cjs");
const {writeStaticCatalog,createLookup}=require("./static-area-catalog.cjs");
const {containsPoint}=require("../domain/area-geometry.js");
const {named,randomPoints}=require("./mixed-area-blind-points.cjs");
const root=process.env.PIN2MAP_NATURAL_EARTH_ROOT,eco=process.env.PIN2MAP_RESOLVE_ROOT;
if(!root||!eco)throw Error("Source sparse checkouts required");
const data=[];
for(const s of sources){
 const source={...s,version:"runner-snapshot"};
 if(s.key==="resolve-eco"){
  const features=[689,676,751,513].map(id=>JSON.parse(
   fs.readFileSync(path.join(eco,"teow/features/"+id+".geojson"),"utf8")));
  data.push({source,features});
 }else{
  const features=JSON.parse(fs.readFileSync(path.join(root,s.sourceFile),"utf8")).features;
  data.push({source,features});
 }
}
const records=normalizeGeoJSON(data),dir=fs.mkdtempSync(path.join(os.tmpdir(),"pin2map-static-"));
let requests=0,requestBytes=0;
let server;
(async()=>{
 const created=writeStaticCatalog(records.rows,records.geometries,dir);
 server=http.createServer((req,res)=>{
  const requested=new URL(req.url,"http://127.0.0.1");
  const relative=requested.pathname.replace(/^\//,"");
  if(!/^index\.json$|^objects\/[a-f0-9]{64}\.geojson$/.test(relative)){
   res.writeHead(404);res.end();return;
  }
  const target=path.resolve(dir,relative);
  if(!target.startsWith(dir+path.sep)){res.writeHead(403);res.end();return}
  let bytes;try{bytes=fs.readFileSync(target)}catch{res.writeHead(404);res.end();return}
  requests++;requestBytes+=bytes.length;
  res.writeHead(200,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*",
   "Cache-Control":"public, max-age=3600","Content-Length":bytes.length});
  res.end(bytes);
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const baseUrl="http://127.0.0.1:"+server.address().port+"/";
 const start=performance.now();
 const response=await fetch(new URL("index.json",baseUrl));
 assert.equal(response.status,200);
 assert.equal(response.headers.get("access-control-allow-origin"),"*");
 const idx=await response.json(),list=idx.entries;
 const lookup=createLookup(idx,{baseUrl});
 const points=[...named,...randomPoints(160)];
 let candidateChecks=0,exactChecks=0,confirmed=0,overlaps=0;
 for(const p of points){
  const expected=records.rows.filter(r=>containsPoint(records.geometries.get(r.id),p.lon,p.lat))
   .map(r=>r.id).sort();
  const found=[];
  for(const candidate of lookup.metadata(p.lon,p.lat)){
   candidateChecks++;
   const hit=await lookup.verify(candidate.id,p.lon,p.lat);
   exactChecks++;
   if(hit.contains)found.push(candidate.id);
  }
  assert.deepEqual(found.sort(),expected,"Static polygon export mismatch "+p.name);
  confirmed+=found.length;if(found.length>1)overlaps++;
 }
 const coldMs=performance.now()-start;
 const coldRequests=requests,coldBytes=requestBytes;
 const warmStart=performance.now();
 let warmChecks=0;
 for(const p of points)for(const candidate of lookup.metadata(p.lon,p.lat)){
  const result=await lookup.verify(candidate.id,p.lon,p.lat);
  if(result.contains)warmChecks++;
 }
 const warmMs=performance.now()-warmStart;
 assert.equal(warmChecks,confirmed);assert.equal(requests,coldRequests);
 assert.equal(lookup.stats().cached,66);
 assert.equal(candidateChecks,247);
 assert.equal(idx.entries.length,266);
 console.log("STATIC_SERVERLESS_RESEARCH",JSON.stringify({
  note:"Files served via temporary localhost HTTP server; representative static HTTP semantics, NOT public Internet timings. No artifacts deployed, no real OSM specialty coverage claims.",
  areas:list.length,points:points.length,indexBytes:created.metadataBytes,
  allShardsBytes:created.polygonBytes,allShards:created.objects,
  coldHttpRequests:coldRequests,coldHttpBytes:coldBytes,coldMs:+coldMs.toFixed(2),
  warmAdditionalHttpRequests:requests-coldRequests,warmMs:+warmMs.toFixed(2),
  cachedGeometries:lookup.stats().cached,verifiedMatches:confirmed,
  candidateChecks,exactChecks,overlapPoints:overlaps
 },null,2));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(dir,{recursive:true,force:true});
});
