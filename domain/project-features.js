"use strict";
/* Project-owned area, lake and river objects: no map, DOM or storage APIs.
 * GeoJSON polygons preserve [longitude, latitude]; river chains preserve
 * the predecessor's [latitude, longitude] point convention.
 */
(function(root){
  function isPolygon(geometry){
    return !!geometry&&["Polygon","MultiPolygon"].includes(geometry.type)&&
      Array.isArray(geometry.coordinates)&&geometry.coordinates.length>0;
  }
  function validateChains(chains){
    return Array.isArray(chains)&&chains.length>0&&chains.every(chain=>
      Array.isArray(chain)&&chain.length>=2&&chain.every(p=>
        Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&
        Math.abs(p[0])<=90&&Math.abs(p[1])<=180));
  }
  function ensure(state){
    if(!Array.isArray(state.areas))state.areas=[];
    if(!Array.isArray(state.rivers))state.rivers=[];
    return state;
  }
  function createArea(state,{id,name,geometry,kind="area",note="",url=""},privateLayerId="private"){
    if(!["area","lake"].includes(kind)||!isPolygon(geometry))throw new TypeError("Valid area polygon required");
    if(!id||!String(name||"").trim())throw new TypeError("Area id and name required");
    ensure(state);
    if(state.areas.some(a=>a.id===id))throw new Error("Duplicate area id");
    const area={id:String(id),name:String(name).trim().slice(0,120),kind,layerId:privateLayerId,
      geometry,note:String(note),url:String(url)};
    state.areas.push(area);return area;
  }
  function createRiver(state,{id,name,chains,note="",url=""},privateLayerId="private"){
    if(!validateChains(chains)||!id||!String(name||"").trim())
      throw new TypeError("Valid named river line required");
    ensure(state);
    if(state.rivers.some(r=>r.id===id))throw new Error("Duplicate river id");
    const river={id:String(id),name:String(name).trim().slice(0,120),layerId:privateLayerId,
      chains,note:String(note),url:String(url)};
    state.rivers.push(river);return river;
  }
  function change(state,type,id,patch){
    ensure(state);
    const collection=type==="river"?state.rivers:state.areas;
    const item=collection.find(x=>x.id===id);
    if(!item)return null;
    for(const key of ["name","note","url","layerId"]){
      if(Object.hasOwn(patch,key)){
        if(key==="layerId"&&!state.layers.some(l=>l.id===patch.layerId))throw new Error("Unknown layer");
        item[key]=key==="name"?String(patch[key]).trim().slice(0,120):String(patch[key]||"");
      }
    }
    return item;
  }
  function remove(state,type,id){
    ensure(state);
    const collection=type==="river"?state.rivers:state.areas;
    const i=collection.findIndex(x=>x.id===id);
    if(i<0)return false;
    collection.splice(i,1);return true;
  }
  const api=Object.freeze({isPolygon,validateChains,ensure,createArea,createRiver,change,remove});
  root.Pin2MapProjectFeatures=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
