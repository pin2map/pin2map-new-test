"use strict";
/*
 * Independent river discovery/geometry orchestration port.
 * OSM relations, ways, candidate ranking, geometry stitching, persistence,
 * styles, labeling and UI belong in separately testable future components.
 * This file intentionally chooses no provider, algorithm or result schema.
 */
(function(root){
 class RiverService{
  constructor(){this.discovery=null;this.geometry=null;}
  registerDiscovery(provider){
   if(!provider||typeof provider.search!=="function")
    throw new TypeError("River discovery provider must implement search(query, options)");
   this.discovery=provider;return this;
  }
  registerGeometry(provider){
   if(!provider||typeof provider.load!=="function")
    throw new TypeError("River geometry provider must implement load(candidate, options)");
   this.geometry=provider;return this;
  }
  async search(query,options){
   if(typeof query!=="string"||!query.trim())throw new TypeError("Nonempty river query required");
   if(!this.discovery)throw new Error("No river discovery provider configured");
   return this.discovery.search(query,options);
  }
  async loadGeometry(candidate,options){
   if(candidate===null||candidate===undefined)throw new TypeError("River candidate required");
   if(!this.geometry)throw new Error("No river geometry provider configured");
   return this.geometry.load(candidate,options);
  }
 }
 root.Pin2MapRiverService=RiverService;
 if(typeof module!=="undefined"&&module.exports)module.exports=RiverService;
})(typeof window!=="undefined"?window:globalThis);
