"use strict";
/* Provider-neutral search orchestration: caching, latest-request wins,
 * cancellation and per-browser throttling, without DOM/map/storage APIs.
 * This throttle is NOT an aggregate provider quota across devices. */
(function(root){
  class PlaceSearchService{
    constructor({geocoder,domain,now=()=>Date.now(),ttlMs=24*3600000,throttleMs=1100}){
      if(!geocoder||typeof geocoder.search!=="function")throw new TypeError("Geocoder required");
      if(!domain||typeof domain.cacheKey!=="function"||typeof domain.cleanCache!=="function")
        throw new TypeError("Place search domain required");
      this.geocoder=geocoder;this.domain=domain;this.now=now;
      this.ttlMs=ttlMs;this.throttleMs=throttleMs;this.lastRequestAt=0;
      this.serial=0;this.controller=null;
    }
    cleanup(state){
      state.geoCache=this.domain.cleanCache(state.geoCache,this.now(),this.ttlMs);
    }
    cancel(){
      ++this.serial;
      if(this.controller)this.controller.abort();
      this.controller=null;
    }
    async search(query,{state,allowed,onStart=()=>{},onFinish=()=>{},onCacheWrite=()=>{}}){
      const serial=++this.serial;
      if(this.controller)this.controller.abort();
      this.controller=null;
      this.cleanup(state);
      const cached=state.geoCache[this.domain.cacheKey(query)];
      if(cached)return {kind:"results",results:cached.results,fromCache:true};
      if(!allowed)return {kind:"disabled"};
      const remaining=this.throttleMs-(this.now()-this.lastRequestAt);
      if(remaining>0)return {kind:"throttled"};
      const controller=new AbortController();
      this.controller=controller;this.lastRequestAt=this.now();
      onStart();
      try{
        const results=await this.geocoder.search(query,{signal:controller.signal});
        if(serial!==this.serial)return {kind:"stale"};
        state.geoCache[this.domain.cacheKey(query)]={time:this.now(),results};
        this.cleanup(state);onCacheWrite();
        return {kind:"results",results,fromCache:false};
      }catch(error){
        if(serial!==this.serial||error?.name==="AbortError")return {kind:"stale"};
        return {kind:"error",error};
      }finally{
        if(serial===this.serial){this.controller=null;onFinish();}
      }
    }
  }
  root.Pin2MapPlaceSearchService=PlaceSearchService;
  if(typeof module!=="undefined"&&module.exports)module.exports=PlaceSearchService;
})(typeof window!=="undefined"?window:globalThis);
