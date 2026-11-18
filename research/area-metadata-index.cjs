"use strict";
/* Experimental metadata-first BBox index. No UI, app bootstrap, persistent
 * storage, network transport, or real polygon geometry in this module.
 * A BBox hit is an UNVERIFIED CANDIDATE, not a matching area.
 * Antimeridian-spanning metadata are explicitly rejected until split support.
 */
const {containsPoint,pointCount}=require("../domain/area-geometry.js");
const {bounds}=require("./spatial-index-prototype.cjs");
function validCoordinate(n,min,max){return Number.isFinite(n)&&n>=min&&n<=max;}
function normalized(record){
 if(!record||typeof record.id!=="string"||!record.id.trim()||
   typeof record.name!=="string"||!record.name.trim()||
   !["water","protected","ecoregion","special","region"].includes(record.kind))
   throw new TypeError("Named typed area metadata required");
 const b=record.bbox;
 if(!b||!validCoordinate(b.west,-180,180)||!validCoordinate(b.east,-180,180)||
   !validCoordinate(b.south,-90,90)||!validCoordinate(b.north,-90,90)||
   b.west>b.east||b.south>b.north)
   throw new RangeError("Invalid/antimeridian-spanning bbox");
 return Object.freeze({id:record.id,name:record.name,kind:record.kind,
   bbox:Object.freeze({...b}),source:record.source||null});
}
function inBBox(b,lon,lat){
 return lon>=b.west&&lon<=b.east&&lat>=b.south&&lat<=b.north;
}
function build(records,{cellSize=2,maxCellsPerArea=256}={}){
 if(!Array.isArray(records)||!records.length)throw new TypeError("Metadata required");
 if(!Number.isFinite(cellSize)||cellSize<=0||cellSize>30||
   !Number.isInteger(maxCellsPerArea)||maxCellsPerArea<1)
   throw new RangeError("Invalid spatial index options");
 const items=records.map(normalized),byId=new Map(),cells=new Map(),large=new Set();
 const cell=v=>Math.floor(v/cellSize);
 for(let i=0;i<items.length;i++){
  const m=items[i];if(byId.has(m.id))throw new Error("Duplicate area id: "+m.id);
  byId.set(m.id,m);
  const b=m.bbox,x0=cell(b.west),x1=cell(b.east),y0=cell(b.south),y1=cell(b.north);
  if((x1-x0+1)*(y1-y0+1)>maxCellsPerArea){large.add(m.id);continue;}
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
   const key=x+","+y,list=cells.get(key)||[];
   list.push(m.id);cells.set(key,list);
  }
 }
 const cache=new Map(),inflight=new Map();
 function candidates(lon,lat){
  if(!validCoordinate(lon,-180,180)||!validCoordinate(lat,-90,90))
   throw new RangeError("Invalid query coordinate");
  const ids=new Set([...large,...(cells.get(cell(lon)+","+cell(lat))||[])]);
  // Preserve source order: no expected reference ID or name involved.
  return items.filter(m=>ids.has(m.id)&&inBBox(m.bbox,lon,lat))
    .map(m=>({...m,status:"unverified",needsGeometry:!cache.has(m.id)}));
 }
 async function verify(id,lon,lat,load){
  if(typeof load!=="function")throw new TypeError("Injected geometry loader required");
  const possible=candidates(lon,lat);
  if(!possible.some(m=>m.id===id))return {id,status:"outside_bbox",contains:false,fromCache:false,bytesFetched:0};
  const existing=cache.has(id);
  let promise=inflight.get(id);
  if(!existing&&!promise){
   promise=Promise.resolve().then(()=>load(id,byId.get(id))).then(payload=>{
    const geom=payload?.geometry||payload;
    if(!geom||!["Polygon","MultiPolygon"].includes(geom.type))
     throw new TypeError("Polygon/MultiPolygon required");
    const bbox=bounds(geom);
    if(!bbox||!Object.keys(bbox).every(k=>Math.abs(bbox[k]-byId.get(id).bbox[k])<1e-5))
     throw new Error("Metadata bbox does not match loaded geometry");
    const result={geometry:geom,bytes:payload?.bytes??null,vertices:pointCount(geom)};
    cache.set(id,result);return result;
   }).finally(()=>inflight.delete(id));
   inflight.set(id,promise);
  }
  const value=existing?cache.get(id):await promise;
  return {id,status:"verified",contains:containsPoint(value.geometry,lon,lat),
   fromCache:existing,bytesFetched:existing?0:value.bytes,
   vertices:value.vertices};
 }
 function clearCache(){cache.clear();}
 return {candidates,verify,clearCache,
  stats:()=>({areas:items.length,spatialCells:cells.size,largeAreas:large.size,
    cachedGeometries:cache.size,metadataBytes:Buffer.byteLength(JSON.stringify(items),"utf8")})};
}
module.exports={build,inBBox};
