"use strict";
/*
 * River/watercourse workflow boundary. Search, candidate selection,
 * geometry resolution, persistence and rendering must be separable.
 * No OSM API, Overpass endpoint, response format or joining algorithm
 * is fixed here. This module is NOT wired into the app.
 */
(function(root){
  class WatercourseService {
    constructor({finder,resolver}={}){
      this.finder=finder||null;
      this.resolver=resolver||null;
    }
    async find(request){
      if(!this.finder||typeof this.finder.find!=="function")
        throw new Error("Watercourse finder not configured");
      return this.finder.find(request);
    }
    async resolve(candidate){
      if(!this.resolver||typeof this.resolver.resolve!=="function")
        throw new Error("Watercourse geometry resolver not configured");
      return this.resolver.resolve(candidate);
    }
  }
  const api=Object.freeze({WatercourseService});
  root.Pin2MapWatercourses=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
