"use strict";
/*
 * Architecture seam for location-related information: weather, elevation,
 * solar times/day length and timezone. No providers, data formats or
 * presentation decisions are selected here. No network calls.
 */
(function(root){
 const KINDS=Object.freeze({
  WEATHER:"weather",ELEVATION:"elevation",SUN:"sun",
  DAYLENGTH:"daylength",TIMEZONE:"timezone"
 });
 class LocationContextService{
  constructor(){this.providers=new Map();}
  register(kind,provider){
   if(!Object.values(KINDS).includes(kind))throw new RangeError("Unsupported context kind");
   if(!provider||typeof provider.load!=="function")
    throw new TypeError("Context provider must implement load(request)");
   this.providers.set(kind,provider);return this;
  }
  isAvailable(kind){return this.providers.has(kind);}
  async load(kind,request){
   if(!Object.values(KINDS).includes(kind))throw new RangeError("Unsupported context kind");
   const provider=this.providers.get(kind);
   if(!provider)throw new Error("No context provider configured for "+kind);
   return provider.load(request);
  }
 }
 const api=Object.freeze({KINDS,LocationContextService});
 root.Pin2MapLocationContext=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
