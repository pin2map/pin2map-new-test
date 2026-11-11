"use strict";
/* Only provider-specific HTTP and response validation live here.
 * Caller must enforce Nominatim usage policy; browser-local throttling
 * alone does not enforce an application-wide quota. */
(function(root){
  class NominatimGeocoder{
    constructor({fetchImpl,language="de",endpoint="https://nominatim.openstreetmap.org/search"}={}){
      if(typeof fetchImpl!=="function")throw new TypeError("fetchImpl required");
      this.fetchImpl=fetchImpl;this.language=language;this.endpoint=endpoint;
    }
    async search(query,{signal}={}){
      const url=new URL(this.endpoint);
      url.searchParams.set("q",query);
      url.searchParams.set("format","jsonv2");
      url.searchParams.set("addressdetails","1");
      url.searchParams.set("accept-language",this.language||"de");
      url.searchParams.set("limit","8");
      const response=await this.fetchImpl(url.toString(),{
        method:"GET",signal,headers:{Accept:"application/json"}
      });
      if(!response.ok)throw new Error("HTTP "+response.status);
      const json=await response.json();
      if(!Array.isArray(json))throw new Error("Ungültige Suchantwort");
      return json.filter(r=>r&&Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lon)));
    }
  }
  root.Pin2MapNominatimGeocoder=NominatimGeocoder;
  if(typeof module!=="undefined"&&module.exports)module.exports=NominatimGeocoder;
})(typeof window!=="undefined"?window:globalThis);
