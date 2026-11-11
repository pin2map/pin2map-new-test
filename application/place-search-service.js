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
      this.resultLimit=Number.isInteger(geocoder.resultLimit)?geocoder.resultLimit:25;
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
      const key=this.domain.cacheKey(query);
      const cached=state.geoCache[key];
      // Previous NEW releases cached up to 8 or 40 hits without recording
      // the request limit. Preserve offline results; refresh truncated old
      // caches when the user has explicitly enabled Nominatim access.
      const cachedResults=cached?.results?.slice(0,this.resultLimit);
      const cacheComplete=cached&&(cached.requestLimit===this.resultLimit||
        cached.results.length>=this.resultLimit);
      if(cached&&(cacheComplete||!allowed))
        return {kind:"results",results:cachedResults,fromCache:true};
      if(!allowed)return {kind:"disabled"};
      const remaining=this.throttleMs-(this.now()-this.lastRequestAt);
      if(remaining>0)return cached
        ? {kind:"results",results:cachedResults,fromCache:true}
        : {kind:"throttled"};
      const controller=new AbortController();
      this.controller=controller;this.lastRequestAt=this.now();
      onStart();
      try{
        const results=await this.geocoder.search(query,{signal:controller.signal});
        if(serial!==this.serial)return {kind:"stale"};
        state.geoCache[key]={time:this.now(),results:results.slice(0,this.resultLimit),
          requestLimit:this.resultLimit};
        this.cleanup(state);onCacheWrite();
        return {kind:"results",results:results.slice(0,this.resultLimit),fromCache:false};
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
