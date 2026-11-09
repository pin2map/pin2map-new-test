"use strict";
/*
 * Provider-neutral geographic context boundary.
 * Planned domains: weather, elevation, daylight and related local context.
 * No provider, requests, cache policy, derived formulas or presentation
 * are specified here. The app does NOT load or call this module yet.
 */
(function(root){
  class GeographicInformationService {
    constructor(){this.providers=new Map();}
    register(capability,provider){
      if(typeof capability!=="string"||!capability.trim())throw new TypeError("Capability name required");
      if(!provider||typeof provider.lookup!=="function")
        throw new TypeError("Provider must implement lookup(request)");
      this.providers.set(capability,provider);return this;
    }
    has(capability){return this.providers.has(capability);}
    async lookup(capability,request){
      const provider=this.providers.get(capability);
      if(!provider)throw new Error("Geographic information provider not configured: "+capability);
      return provider.lookup(request);
    }
  }
  const api=Object.freeze({GeographicInformationService});
  root.Pin2MapGeographicInformation=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
