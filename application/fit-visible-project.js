"use strict";
/* Fit ALL currently visible project objects after a layer visibility change.
 * Pure traversal and injected renderer port; no Leaflet, DOM or storage. */
(function(root){
 function visiblePoints(project,pinFilter,currentFilter){
  const visible=new Set((project.layers||[]).filter(l=>l.visible).map(l=>l.id));
  const positions=[],seen=new Set();
  function push(lat,lng){
   const y=Number(lat),x=Number(lng);
   if(!Number.isFinite(y)||!Number.isFinite(x)||
    Math.abs(y)>90||Math.abs(x)>180)return;
   const key=y+","+x;if(seen.has(key))return;
   seen.add(key);positions.push([y,x]);
  }
  for(const pin of pinFilter.visiblePins(project.pins||[],project.layers||[],currentFilter))
   push(pin.lat,pin.lng);
  function visitGeometry(node){
   if(!Array.isArray(node))return;
   if(node.length>=2&&typeof node[0]==="number"&&typeof node[1]==="number"){
    push(node[1],node[0]);return;
   }
   for(const child of node)visitGeometry(child);
  }
  for(const area of project.areas||[])
   if(visible.has(area.layerId)&&["Polygon","MultiPolygon"].includes(area.geometry?.type))
    visitGeometry(area.geometry.coordinates);
  for(const river of project.rivers||[])
   if(visible.has(river.layerId))for(const chain of river.chains||[])
    for(const point of chain)if(Array.isArray(point))push(point[0],point[1]);
  return positions;
 }
 function fit({project,pinFilter,currentFilter,mapPort,onFit=()=>{}}){
  const points=visiblePoints(project,pinFilter,currentFilter);
  if(!points.length)return false;
  if(points.length===1)mapPort.setView({center:{lat:points[0][0],lng:points[0][1]},
    zoom:Math.max(mapPort.getViewport().zoom,13)},{animate:false});
  else mapPort.fitBounds(points,{padding:[35,35],maxZoom:15,animate:false});
  onFit();return true;
 }
 const api=Object.freeze({visiblePoints,fit});
 root.Pin2MapFitVisibleProject=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
