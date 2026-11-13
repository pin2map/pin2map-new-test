"use strict";
/* Device-only, bounded, linear map viewport history. This is deliberately NOT
 * a project property: future Firebase synchronization must never include it. */
(function(root){
  const LIMIT=20;
  function snapshot(view){
    const lat=Number(view?.center?.lat),lng=Number(view?.center?.lng),zoom=Number(view?.zoom);
    if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180||
      !Number.isFinite(zoom)||zoom<0||zoom>24)return null;
    return {center:{lat,lng},zoom};
  }
  function same(a,b){
    if(!a||!b||Math.abs(a.zoom-b.zoom)>1e-6)return false;
    // Leaflet normalizes setView() to its pixel grid. A half-pixel rounding
    // delta is NOT a user navigation; recording it would make Undo loop.
    const halfPixel=0.6*360/(256*2**a.zoom);
    return Math.abs(a.center.lat-b.center.lat)<halfPixel&&
      Math.abs(a.center.lng-b.center.lng)<halfPixel;
  }
  class MapViewHistory{
    constructor({onChange=()=>{},onSave=()=>{},maxUndo=LIMIT}={}){
      this.onChange=onChange;this.onSave=onSave;this.maxUndo=maxUndo;
      this.entries=[];this.index=-1;
    }
    load(value,fallback){
      const items=Array.isArray(value?.entries)?value.entries.map(snapshot).filter(Boolean):[];
      this.entries=items.slice(-(this.maxUndo+1));
      const removed=items.length-this.entries.length;
      const chosen=Number.isInteger(value?.index)?value.index-removed:this.entries.length-1;
      this.index=Math.max(0,Math.min(chosen,this.entries.length-1));
      if(!this.entries.length){this.entries=[snapshot(fallback)].filter(Boolean);this.index=0;}
      this.emit(false);
      return this.current();
    }
    current(){return this.entries[this.index]||null;}
    canUndo(){return this.index>0;}
    canRedo(){return this.index>=0&&this.index<this.entries.length-1;}
    emit(save=true){
      this.onChange({undo:this.canUndo(),redo:this.canRedo()});
      if(save)this.onSave(this.serialize());
    }
    serialize(){return {entries:this.entries.map(v=>snapshot(v)),index:this.index};}
    push(view){
      const next=snapshot(view);
      if(!next||same(this.current(),next))return false;
      this.entries.splice(this.index+1);
      this.entries.push(next);
      if(this.entries.length>this.maxUndo+1)this.entries.shift();
      this.index=this.entries.length-1;
      this.emit();return true;
    }
    undo(){
      if(!this.canUndo())return null;
      this.index--;this.emit();return this.current();
    }
    redo(){
      if(!this.canRedo())return null;
      this.index++;this.emit();return this.current();
    }
  }
  const api=Object.freeze({MapViewHistory,snapshot,same,LIMIT});
  root.Pin2MapMapViewHistory=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
