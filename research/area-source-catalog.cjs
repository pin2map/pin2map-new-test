"use strict";
/* Research-only source-aware polygon catalog. This module neither downloads
 * nor republishes geometry, and is never imported by the PWA.
 * Different licensing regimes are never silently conflated.
 */
const crypto=require("node:crypto");
const {bounds}=require("./spatial-index-prototype.cjs");
const {containsPoint}=require("../domain/area-geometry.js");
const REQUIRED=["key","license","attribution","version","kind","sourceFile"];
const KINDS=new Set(["region","water","protected","ecoregion","special"]);
const hash=data=>crypto.createHash("sha256").update(typeof data==="string"?data:JSON.stringify(data)).digest("hex");
function assertSource(source){
 if(!source||REQUIRED.some(k=>typeof source[k]!=="string"||!source[k].trim())||!KINDS.has(source.kind))
  throw new TypeError("Source identity, version, type, rights and provenance required");
 if(!/^(Public Domain|CC BY 4\.0|ODbL 1\.0)$/.test(source.license))
  throw new TypeError("Unreviewed license");
 return source;
}
function normalizeGeoJSON(datasets){
 if(!Array.isArray(datasets)||!datasets.length)throw new TypeError("Nonempty datasets required");
 const rows=[],geometries=new Map(),counts={};
 for(const input of datasets){
  const src=assertSource(input.source);
  if(counts[src.key])throw new Error("Duplicate source "+src.key);
  counts[src.key]={accepted:0,skippedGeometry:0,skippedBbox:0,unstableIds:0};
  const features=input.features;
  if(!Array.isArray(features))throw new TypeError("Features must be an array");
  const seen=new Set();
  for(let i=0;i<features.length;i++){
   const f=features[i],g=f?.geometry;
   if(!["Polygon","MultiPolygon"].includes(g?.type)){
    counts[src.key].skippedGeometry++;continue;
   }
   const b=bounds(g);
   // Current grid metadata index has no dateline-crossing support.
   if(!b||b.west>b.east||b.west< -180||b.east>180||
      b.south< -90||b.north>90){
    counts[src.key].skippedBbox++;continue;
   }
   const rawId=src.identifier?.(f,i);
   const validId=typeof rawId==="string"&&rawId.trim()&&rawId!=="-99";
   const candidate=validId?rawId.trim():"row-"+i;
   if(seen.has(candidate))throw new Error("Duplicate record key "+src.key+":"+candidate);
   seen.add(candidate);
   const id=src.key+":"+candidate,geomDigest=hash(g);
   const name=String(src.name?.(f,i)||candidate).trim();
   if(!name)throw new TypeError("Name required for "+id);
   const stable=Boolean(validId);
   const row={
    id,name,kind:src.kind,bbox:b,source:src.key,sourceVersion:src.version,
    sourceFile:src.sourceFile,sourceRow:i,sourceRecordKey:candidate,
    stableId:stable,geometrySha256:geomDigest,license:src.license,
    attribution:src.attribution
   };
   rows.push(row);geometries.set(id,g);
   counts[src.key].accepted++;if(!stable)counts[src.key].unstableIds++;
  }
 }
 return {rows,geometries,counts};
}
function manifest(rows,{builtAt,sourceRevisions={}}={}){
 if(!Array.isArray(rows))throw new TypeError("Rows required");
 if(!builtAt||!Number.isFinite(Date.parse(builtAt)))throw new TypeError("Build timestamp required");
 const unique=new Set();
 const safe=rows.map(row=>{
  const {id,name,kind,bbox,source,sourceVersion,sourceFile,sourceRow,
   sourceRecordKey,stableId,geometrySha256,license,attribution}=row;
  if(unique.has(id))throw new Error("Duplicate manifest ID "+id);
  unique.add(id);
  if(!KINDS.has(kind)||!license||!attribution||!sourceVersion||
   !/^[a-f0-9]{64}$/.test(geometrySha256)||!bbox)
   throw new TypeError("Invalid catalog record "+id);
  return {id,name,kind,bbox,source,sourceVersion,sourceFile,
   sourceRow,sourceRecordKey,stableId,geometrySha256,license,attribution};
 });
 // No GeoJSON polygons or person-specific data in the manifest.
 return {schema:1,builtAt,sourceRevisions,entries:safe,
  sha256:hash(safe)};
}
function diff(previous,next){
 if(previous?.schema!==1||next?.schema!==1)throw new TypeError("Incompatible catalog schemas");
 const old=new Map(previous.entries.map(x=>[x.id,x]));
 const fresh=new Map(next.entries.map(x=>[x.id,x]));
 const changes={added:[],removed:[],geometryChanged:[],metadataChanged:[],rightsChanged:[],
  needsReview:[]};
 for(const [id,row] of fresh){
  const prev=old.get(id);
  if(!prev){changes.added.push(id);continue}
  if(prev.geometrySha256!==row.geometrySha256)changes.geometryChanged.push(id);
  if(prev.name!==row.name||prev.kind!==row.kind||
     JSON.stringify(prev.bbox)!==JSON.stringify(row.bbox))
   changes.metadataChanged.push(id);
  if(prev.license!==row.license||prev.attribution!==row.attribution)
   changes.rightsChanged.push(id);
  if(!row.stableId||!prev.stableId)changes.needsReview.push(id);
 }
 for(const id of old.keys())if(!fresh.has(id))changes.removed.push(id);
 return changes;
}
function coverageProbe(rows,geometries,fixtures){
 if(!Array.isArray(fixtures))throw new TypeError("Fixtures required");
 return fixtures.map(f=>{
  const lon=f.lng,lat=f.lat;
  const hits=rows.filter(row=>{
   const b=row.bbox;
   return lon>=b.west&&lon<=b.east&&lat>=b.south&&lat<=b.north&&
      containsPoint(geometries.get(row.id),lon,lat);
  });
  const categoryHits=hits.filter(row=>row.kind===
   ({water:"water",protected:"protected",special:"special"}[f.kind]||f.kind));
  const namedHits=categoryHits.filter(row=>
   row.name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g,"")===
   f.name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g,""));
  return {name:f.name,region:f.region,expectedKind:f.kind,
   totalContaining:hits.length,sameKindCount:categoryHits.length,
   exactNormalizedNameCount:namedHits.length,
   availableKinds:[...new Set(hits.map(row=>row.kind))].sort(),
   interpretation:"Corpus-only comparison. Name agreement does not imply OSM identity; no result does not prove absence worldwide."};
 });
}
module.exports={normalizeGeoJSON,manifest,diff,coverageProbe,hash};
