"use strict";
/* Only provider-specific HTTP and response validation live here.
 * Caller must enforce Nominatim usage policy; browser-local throttling
 * alone does not enforce an application-wide quota. */
(function(root){
  const {localizedName}=root.Pin2MapPlaceSearch||
    (typeof module!=="undefined"?require("../../domain/place-search.js"):{});
  class NominatimGeocoder{
    constructor({fetchImpl,language="de",endpoint="https://nominatim.openstreetmap.org/search"}={}){
      if(typeof fetchImpl!=="function")throw new TypeError("fetchImpl required");
      this.fetchImpl=fetchImpl;this.language=language;this.endpoint=endpoint;
      this.resultLimit=25;
    }
    // Called only for an explicit user-created pin and only when existing
    // geocoding consent is enabled. No automatic grid or background scans.
    async reverse(point,{signal,zoom=10}={}){
      const lat=Number(point?.lat),lon=Number(point?.lng);
      if(!Number.isFinite(lat)||Math.abs(lat)>90||
         !Number.isFinite(lon)||Math.abs(lon)>180)
        throw new RangeError("Invalid reverse geocoding coordinate");
      const url=new URL(this.endpoint.replace(/\/search\/?$/,"/reverse"));
      url.searchParams.set("lat",String(lat));
      url.searchParams.set("lon",String(lon));
      url.searchParams.set("format","jsonv2");
      url.searchParams.set("addressdetails","1");
      url.searchParams.set("namedetails","1");
      if(!Number.isInteger(zoom)||zoom<0||zoom>18)
        throw new RangeError("Invalid reverse geocoding detail level");
      url.searchParams.set("zoom",String(zoom));
      url.searchParams.set("layer","address");
      url.searchParams.set("accept-language",(this.language||"de")+",int,en");
      const response=await this.fetchImpl(url.toString(),{
        method:"GET",signal,headers:{Accept:"application/json"}
      });
      if(!response.ok)throw new Error("HTTP "+response.status);
      const result=await response.json();
      if(!result||typeof result!=="object"||Array.isArray(result))
        throw new Error("Ungültige Ortsantwort");
      const kind=result.addresstype||result.type;
      const name=localizedName(result.namedetails);
      if(name&&result.address?.[kind])result.address[kind]=name;
      return result;
    }
    async search(query,{signal}={}){
      const url=new URL(this.endpoint);
      url.searchParams.set("q",query);
      url.searchParams.set("format","jsonv2");
      url.searchParams.set("addressdetails","1");
      url.searchParams.set("namedetails","1");
      url.searchParams.set("accept-language",(this.language||"de")+",int,en");
      url.searchParams.set("limit",String(this.resultLimit));
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
