"use strict";
/* Plate-to-administrative-boundary resolution. Receives a user-picked entry,
 * invokes the existing explicitly enabled Nominatim area finder (no bulk scan).
 * A country mismatch is never silently mapped to another polygon.
 */
(function(root){
 class LicensePlateSearch{
  constructor({catalog,areaFinder}){
   if(!catalog?.lookup||!areaFinder?.find)throw new TypeError("Plate search ports required");
   this.catalog=catalog;this.finder=areaFinder;this.cache=new Map();
  }
  find(code){return this.catalog.lookup(code);}
  async resolve(entry,{signal}={}){
   if(!entry||!this.catalog.records.includes(entry))
     throw new TypeError("Unknown license plate catalog entry");
   const key=entry.country+"|"+entry.code+"|"+entry.query;
   if(this.cache.has(key))return this.cache.get(key);
   const results=await this.finder.find(entry.query,{kind:"area",signal});
   if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
   const candidates=results.filter(x=>{
     const country=String(x.address?.country_code||"").toUpperCase();
     if(country!==entry.country)return false;
     if(!["Polygon","MultiPolygon"].includes(x.geojson?.type))return false;
     const type=String(x.addresstype||x.type||"").toLowerCase();
     const category=String(x.class||x.category||"").toLowerCase();
     if(entry.admin==="state")return ["state","region","province"].includes(type)||
       category==="boundary"&&String(x.extratags?.admin_level||"")==="4";
     if(entry.admin==="county")return ["county","state_district","district","province","municipality"].includes(type)||
       category==="boundary"&&["6","7"].includes(String(x.extratags?.admin_level||""));
     return ["city","town","municipality","administrative"].includes(type)||
       category==="boundary"&&["6","8","9"].includes(String(x.extratags?.admin_level||""));
   });
   // Avoid inventing a geographic relationship for an ambiguous provider answer.
   if(candidates.length!==1)throw new Error(candidates.length===0?
     "Keine eindeutige Verwaltungsgrenze für dieses Kennzeichen gefunden.":
     "Mehrere mögliche Verwaltungsgrenzen – Zuordnung nicht eindeutig.");
   const result={...entry,geojson:candidates[0].geojson,osmType:candidates[0].osm_type,
     osmId:candidates[0].osm_id};
   this.cache.set(key,result);
   return result;
  }
 }
 root.Pin2MapLicensePlateSearch=LicensePlateSearch;
 if(typeof module!=="undefined"&&module.exports)module.exports=LicensePlateSearch;
})(typeof window!=="undefined"?window:globalThis);
