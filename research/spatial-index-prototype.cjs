"use strict";
/* Independent research prototype; no app imports, IO or persistent records.
 * Input is user-approved GeoJSON, indexed as bounding-box search cells.
 * A cell/BBox hit is NEVER an assertion of point containment.
 */
const {containsPoint,pointCount}=require("../domain/area-geometry.js");
function visitCoordinates(g,fn){
 if(!g)return;
 if(g.type==="GeometryCollection"){for(const part of g.geometries||[])visitCoordinates(part,fn);return}
 function walk(v){
  if(!Array.isArray(v))return;
  if(v.length>=2&&typeof v[0]==="number"&&typeof v[1]==="number"){fn(v[0],v[1]);return}
  for(const c of v)walk(c);
 }
 walk(g.coordinates);
}
function bounds(g){
 let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
 visitCoordinates(g,(lon,lat)=>{west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat)});
 return Number.isFinite(west)?{west,south,east,north}:null;
}
function build(features,{cellSize=0.5,maxCellsPerGeometry=2048}={}){
 if(!(cellSize>0&&cellSize<=10))throw Error("invalid cellSize");
 const cells=new Map(),large=[],items=[];
 const cell=v=>Math.floor(v/cellSize);
 for(const f of features){
  const g=f.geometry||f,box=bounds(g);
  if(!box||!["Polygon","MultiPolygon"].includes(g?.type))continue;
  const i=items.length;items.push({id:f.id||i,geometry:g,box});
  const x0=cell(box.west),x1=cell(box.east),y0=cell(box.south),y1=cell(box.north);
  if((x1-x0+1)*(y1-y0+1)>maxCellsPerGeometry){large.push(i);continue}
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
   const k=x+","+y,arr=cells.get(k)||[];arr.push(i);cells.set(k,arr);
  }
 }
 function query(lon,lat){
  const candidates=new Set(large);
  for(const i of cells.get(cell(lon)+","+cell(lat))||[])candidates.add(i);
  const matches=[],scanned=[];
  for(const i of candidates){
   const item=items[i],b=item.box;
   if(lon<b.west||lon>b.east||lat<b.south||lat>b.north)continue;
   scanned.push(item.id);
   if(containsPoint(item.geometry,lon,lat))matches.push(item.id);
  }
  return {matches,scanned,globalFeatures:items.length};
 }
 return {query,featureCount:items.length,cellCount:cells.size,largeCount:large.length,
  vertexCount:items.reduce((n,x)=>n+pointCount(x.geometry),0)};
}
module.exports={bounds,build};
