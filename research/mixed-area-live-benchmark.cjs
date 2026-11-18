"use strict";
/* RESEARCH ONLY: mixed Natural Earth/RESOLVE polygons locally checked out.
 * The 36 named coordinates and 160 seeded points are independent of
 * expected polygon names and never used for candidate construction.
 * The brute-force geometry oracle is run separately from the bbox index.
 * Source files were already downloaded before timing: NO network latency.
 */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {performance}=require("node:perf_hooks");
const {build}=require("./area-metadata-index.cjs");
const {bounds}=require("./spatial-index-prototype.cjs");
const {containsPoint,pointCount}=require("../domain/area-geometry.js");
const {named,randomPoints}=require("./mixed-area-blind-points.cjs");

const natural=process.env.PIN2MAP_NATURAL_EARTH_ROOT;
const resolve=process.env.PIN2MAP_RESOLVE_ROOT;
if(!natural||!resolve)throw Error("Missing two read-only sparse source checkouts");
function readFile(root,subpath){
 const file=path.resolve(root,subpath);
 const data=fs.readFileSync(file);
 return {data:JSON.parse(data.toString("utf8")),bytes:data.length};
}
const sources=[
 {file:"geojson/ne_110m_admin_0_countries.geojson",kind:"region",label:"country"},
 {file:"geojson/ne_110m_lakes.geojson",kind:"water",label:"lake"},
 {file:"geojson/ne_10m_parks_and_protected_lands_area.geojson",kind:"protected",label:"protected"}
];
const features=[],sourceStats=[],geometryById=new Map();
for(const src of sources){
 const read=readFile(natural,src.file),rows=read.data.features;
 assert.equal(read.data.type,"FeatureCollection");
 let added=0;
 rows.forEach((f,i)=>{
  if(!["Polygon","MultiPolygon"].includes(f.geometry?.type))return;
  const box=bounds(f.geometry);if(!box)return;
  const id=src.label+":"+i;
  const name=String(f.properties?.NAME||f.properties?.name||f.properties?.ADMIN||id);
  features.push({id,name,kind:src.kind,bbox:box,source:src.label});
  geometryById.set(id,f.geometry);added++;
 });
 sourceStats.push({source:src.label,fileBytes:read.bytes,polygons:added});
}
for(const ecoId of [689,676,751,513]){
 const read=readFile(resolve,"teow/features/"+ecoId+".geojson");
 const f=read.data;assert.equal(f.type,"Feature");
 assert.equal(f.properties.ECO_ID,ecoId);
 assert.equal(f.properties.LICENSE,"CC-BY 4.0");
 const box=bounds(f.geometry),id="ecoregion:"+ecoId;
 assert.ok(box);
 features.push({id,name:f.properties.ECO_NAME,kind:"ecoregion",bbox:box,source:"RESOLVE CC BY 4.0"});
 geometryById.set(id,f.geometry);
 sourceStats.push({source:id,fileBytes:read.bytes,polygons:1});
}
const start=performance.now(),idx=build(features,{cellSize:2,maxCellsPerArea:256});
const indexBuildMs=performance.now()-start;
const points=[...named,...randomPoints(160)];
const results=[],kindCounts={region:0,water:0,protected:0,ecoregion:0};
let bboxCandidates=0,exactChecks=0,baselineChecks=0,overlapSites=0,
  falseBboxCandidates=0,coldLoads=0,metadataQueryMs=0,oracleMs=0,verificationMs=0;
const sourceLookup=async id=>{coldLoads++;return {geometry:geometryById.get(id),bytes:0}};
(async()=>{
 for(const p of points){
  const ts=performance.now(),candidateList=idx.candidates(p.lon,p.lat);
  metadataQueryMs+=performance.now()-ts;
  bboxCandidates+=candidateList.length;
  assert.ok(candidateList.every(c=>c.status==="unverified"));
  const t1=performance.now(),expected=[];
  for(const f of features){
   baselineChecks++;
   if(containsPoint(geometryById.get(f.id),p.lon,p.lat))expected.push(f.id);
  }
  oracleMs+=performance.now()-t1;
  const t2=performance.now(),found=[];
  for(const c of candidateList){
   exactChecks++;
   const r=await idx.verify(c.id,p.lon,p.lat,sourceLookup);
   if(r.contains)found.push(c.id);
  }
  verificationMs+=performance.now()-t2;
  expected.sort();found.sort();
  assert.deepEqual(found,expected,"Index vs exhaustive oracle mismatch: "+p.name);
  falseBboxCandidates+=candidateList.length-found.length;
  if(found.length>1)overlapSites++;
  for(const id of found)kindCounts[features.find(f=>f.id===id).kind]++;
  results.push({name:p.name,group:p.group,candidates:candidateList.length,matches:found.length,
   types:[...new Set(found.map(id=>features.find(f=>f.id===id).kind))].sort()});
 }
 // Warm query: replay identical points without any new geometry loads.
 const before=coldLoads;let warmMatches=0;
 const wt=performance.now();
 for(const p of points){
  for(const c of idx.candidates(p.lon,p.lat)){
   const r=await idx.verify(c.id,p.lon,p.lat,()=>{throw Error("Warm must not refetch")});
   if(r.contains)warmMatches++;
  }
 }
 const warmMs=performance.now()-wt;
 assert.equal(coldLoads,before);
 assert.equal(warmMatches,results.reduce((n,r)=>n+r.matches,0));
 assert.ok(sourceStats.some(s=>s.source==="country"&&s.polygons>=100));
 assert.ok(sourceStats.some(s=>s.source==="lake"&&s.polygons>=20));
 assert.ok(sourceStats.some(s=>s.source==="protected"&&s.polygons>=30));
 assert.equal(idx.stats().areas,features.length);
 console.log("MIXED_AREA_BLIND_INDEX",JSON.stringify({
  note:"Predeclared and seeded coordinates, exact independent exhaustive oracle. Source files locally checked out BEFORE timing; no network latency or global coverage claims.",
  totalQueries:points.length,predeclaredQueries:named.length,seededQueries:points.length-named.length,
  areas:features.length,sourceStats,metadataBytes:idx.stats().metadataBytes,
  indexCells:idx.stats().spatialCells,largeAreas:idx.stats().largeAreas,
  sourceFileBytes:sourceStats.reduce((n,s)=>n+s.fileBytes,0),
  indexBuildMs:+indexBuildMs.toFixed(3),
  metadataQueryMs:+metadataQueryMs.toFixed(3),
  oracleMs:+oracleMs.toFixed(3),verificationMs:+verificationMs.toFixed(3),
  warmReplayMs:+warmMs.toFixed(3),coldLoads,cached:idx.stats().cachedGeometries,
  exhaustiveGeometryChecks:baselineChecks,indexGeometryChecks:exactChecks,
  bboxCandidates,falseBboxCandidates,overlapSites,kindMatches:kindCounts,
  hitSites:results.filter(r=>r.matches>0).length,
  sampleResults:results.filter(r=>r.group==="predeclared")
 },null,2));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
