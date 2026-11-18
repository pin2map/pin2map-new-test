"use strict";
/* Research-only static polygon export. No real OSM data hosted here.
 * Can be served by immutable static hosting; no runtime search server.
 * Files generated in Actions temporary directory, never copied into PWA.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {containsPoint}=require("../domain/area-geometry.js");
const sha=data=>crypto.createHash("sha256").update(data).digest("hex");
function writeStaticCatalog(records,geometries,outDir,{createdAt="2026-11-18T00:00:00Z"}={}){
 if(!Array.isArray(records)||!records.length||!(geometries instanceof Map))
  throw new TypeError("Normalized records and geometry Map required");
 if(!outDir||typeof outDir!=="string")throw new TypeError("Output path required");
 const directory=path.resolve(outDir);
 if(fs.existsSync(directory)&&fs.readdirSync(directory).length)
  throw new Error("Static catalog output directory must be empty");
 fs.mkdirSync(path.join(directory,"objects"),{recursive:true});
 const seen=new Set(),entries=[];
 for(const r of records){
  if(typeof r?.id!=="string"||!r.id||
     !r.bbox||!["water","protected","ecoregion","special","region"].includes(r.kind)||
     typeof r.name!=="string"||!r.name||!r.license||!r.attribution)
   throw new TypeError("Invalid typed and attributed polygon metadata");
  if(seen.has(r.id))throw new Error("Duplicate id "+r.id);
  if(!r.stableId)throw new Error("Unstable object ID blocked from publication: "+r.id);
  seen.add(r.id);
  const geometry=geometries.get(r.id);
  if(!["Polygon","MultiPolygon"].includes(geometry?.type))
   throw new TypeError("Missing polygon geometry "+r.id);
  const bytes=Buffer.from(JSON.stringify({type:"Feature",properties:{id:r.id},geometry}));
  const digest=sha(bytes),relative="objects/"+digest+".geojson";
  fs.writeFileSync(path.join(directory,relative),bytes);
  entries.push({id:r.id,name:r.name,kind:r.kind,bbox:r.bbox,
   source:r.source,sourceVersion:r.sourceVersion,license:r.license,
   attribution:r.attribution,geometryUrl:relative,geometrySha256:digest,
   bytes:bytes.length});
 }
 const index={schema:1,createdAt,entries};
 const indexBytes=Buffer.from(JSON.stringify(index));
 fs.writeFileSync(path.join(directory,"index.json"),indexBytes);
 return {index,metadataBytes:indexBytes.length,objects:entries.length,
  polygonBytes:entries.reduce((sum,x)=>sum+x.bytes,0)};
}
function readStaticCatalog(index){
 if(index?.schema!==1||!Array.isArray(index.entries)||!index.entries.length)
  throw new TypeError("Invalid static catalog manifest");
 const ids=new Set();
 for(const r of index.entries){
  if(ids.has(r.id))throw new Error("Duplicate index ID "+r.id);
  ids.add(r.id);
  if(!/^[a-f0-9]{64}$/.test(r.geometrySha256)||
    r.geometryUrl!=="objects/"+r.geometrySha256+".geojson"||
    !Number.isSafeInteger(r.bytes)||r.bytes<=0||
    !r.license||!r.attribution)
    throw new Error("Unsafe or incomplete geometry record "+r.id);
 }
 return index.entries;
}
function createLookup(index,{fetchImpl=fetch,baseUrl}={}){
 if(typeof fetchImpl!=="function"||!baseUrl)throw new TypeError("Fetch and baseUrl required");
 const list=readStaticCatalog(index),byId=new Map(list.map(r=>[r.id,r]));
 const cached=new Map(),inflight=new Map();
 const metadata=(lon,lat)=>{
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon< -180||lon>180||lat< -90||lat>90)
   throw new RangeError("Invalid geographic coordinate");
  return list.filter(r=>r.bbox.west<=lon&&lon<=r.bbox.east&&
   r.bbox.south<=lat&&lat<=r.bbox.north)
   .map(r=>({id:r.id,name:r.name,kind:r.kind,status:"unverified"}));
 };
 async function fetchGeometry(id){
  if(cached.has(id))return cached.get(id);
  if(inflight.has(id))return inflight.get(id);
  const row=byId.get(id);if(!row)throw new RangeError("Unknown polygon id");
  const promise=(async()=>{
   const uri=new URL(row.geometryUrl,baseUrl);
   if(!uri.pathname.endsWith("/"+row.geometryUrl))throw new Error("Invalid geometry URL");
   const response=await fetchImpl(uri);
   if(!response.ok)throw new Error("HTTP "+response.status+" "+id);
   const body=Buffer.from(await response.arrayBuffer());
   if(body.length!==row.bytes||sha(body)!==row.geometrySha256)
    throw new Error("Geometry content integrity mismatch "+id);
   const object=JSON.parse(body.toString("utf8"));
   if(object.type!=="Feature"||object.properties?.id!==id||
     !["Polygon","MultiPolygon"].includes(object.geometry?.type))
    throw new Error("Invalid static polygon "+id);
   cached.set(id,object.geometry);
   return object.geometry;
  })().finally(()=>inflight.delete(id));
  inflight.set(id,promise);
  return promise;
 }
 async function verify(id,lon,lat){
  if(!metadata(lon,lat).some(r=>r.id===id))
   return {id,status:"outside_bbox",contains:false,fromCache:false};
  const fromCache=cached.has(id);
  const polygon=await fetchGeometry(id);
  return {id,status:"verified",contains:containsPoint(polygon,lon,lat),fromCache};
 }
 return {metadata,verify,stats:()=>({cached:cached.size,objects:list.length})};
}
module.exports={writeStaticCatalog,readStaticCatalog,createLookup};
