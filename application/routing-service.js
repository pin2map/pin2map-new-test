"use strict";
/*
 * Transport-neutral routing coordinator. No HTTP, map engine, UI, database,
 * provider-specific request/response format, or itinerary policy in here.
 * No routing providers are configured yet: this is an explicit seam only.
 */
(function(root){
  const MODES=Object.freeze({
    CAR:"car",PEDESTRIAN:"pedestrian",BICYCLE:"bicycle",TRANSIT:"transit"
  });
  const knownModes=Object.freeze(Object.values(MODES));
  class RoutingService {
    constructor(){this.providers=new Map();}
    register(mode,provider){
      if(!knownModes.includes(mode))throw new RangeError("Unsupported routing mode");
      if(!provider||typeof provider.calculate!=="function")
        throw new TypeError("Provider must implement calculate(request)");
      this.providers.set(mode,provider);
      return this;
    }
    isAvailable(mode){
      return this.providers.has(mode);
    }
    async calculate({mode,...request}={}){
      if(!knownModes.includes(mode))throw new RangeError("Unsupported routing mode");
      const provider=this.providers.get(mode);
      if(!provider)throw new Error("No routing provider configured for "+mode);
      return provider.calculate(request);
    }
  }
  const api=Object.freeze({MODES,RoutingService});
  root.Pin2MapRouting=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
