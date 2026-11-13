"use strict";
/* Sync-ready project favorites: only data, no DOM, map, or storage APIs.
 * Stable layer IDs preserve intent across synced devices; unknown/new IDs
 * remain untouched when a favorite is applied. */
(function(root){
  const CAPACITY=26;
  const ACTIVE_CAPACITY=15; // Trial UI limit A–O; preserve 26-place data contract.
  const letter=index=>String.fromCharCode(65+index);
  function capture(view,layers,date,name="",basemap="street"){
    const lat=Number(view?.center?.lat),lng=Number(view?.center?.lng),zoom=Number(view?.zoom);
    if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180||
      !Number.isFinite(zoom))throw new RangeError("Invalid favorite viewport");
    return {
      viewport:{center:{lat,lng},zoom},
      layers:(layers||[]).filter(l=>typeof l?.id==="string").map(l=>({id:l.id,visible:!!l.visible})),
      savedAt:String(date),
      name:String(name||"").trim().slice(0,120),
      basemap:String(basemap||"street")
    };
  }
  function list(project){
    if(!Array.isArray(project.favorites))project.favorites=[];
    if(project.favorites.length>CAPACITY)project.favorites=project.favorites.slice(0,CAPACITY);
    return project.favorites;
  }
  function items(project){return list(project).map((entry,index)=>({...entry,letter:letter(index)}));}
  function append(project,view,layers,date,name="",basemap="street"){
    const values=list(project);
    if(values.length>=ACTIVE_CAPACITY)return null;
    const record=capture(view,layers,date,name,basemap);
    values.push(record);
    return letter(values.length-1);
  }
  function replace(project,index,view,layers,date,name="",basemap="street"){
    const values=list(project);
    if(!Number.isInteger(index)||index<0||index>=values.length)return false;
    values[index]=capture(view,layers,date,name,basemap);
    return true;
  }
  function rename(project,index,name){
    const record=list(project)[index];
    if(!record||typeof name!=="string"||!name.trim())return false;
    record.name=name.trim().slice(0,120);
    return true;
  }
  function remove(project,index){
    const values=list(project);
    if(!Number.isInteger(index)||index<0||index>=values.length)return false;
    values.splice(index,1);return true;
  }
  function apply(project,index){
    const item=list(project)[index];
    if(!item)return null;
    const remembered=new Map((item.layers||[]).filter(l=>l&&typeof l.id==="string")
      .map(l=>[l.id,!!l.visible]));
    for(const layer of project.layers||[]){
      if(remembered.has(layer.id))layer.visible=remembered.get(layer.id);
    }
    // A layer created later is intentionally left in its current visibility.
    return item.viewport;
  }
  const api=Object.freeze({CAPACITY,ACTIVE_CAPACITY,letter,capture,list,items,append,replace,rename,remove,apply});
  root.Pin2MapMapFavorites=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
