"use strict";
/* Country-wide, evidence-driven registration-area resolution.
 * Never turn a registration office into an invented administrative polygon.
 * Candidate choices and a labelled reference-place fallback are separate
 * kinds; no persistence or renderer API lives here.
 */
(function(root){
 const normalized=value=>String(value||"").normalize("NFKD")
   .replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 const validTypes={
   state:new Set(["state","region","province"]),
   county:new Set(["county","state_district","district","province"]),
   city:new Set(["city","town","municipality","village"])
 };
 function isMatchingArea(entry,x){
   const country=String(x.address?.country_code||"").toUpperCase();
   if(country!==entry.country||!["Polygon","MultiPolygon"].includes(x.geojson?.type))return false;
   const type=String(x.addresstype||x.type||"").toLowerCase();
   const category=String(x.class||x.category||"").toLowerCase();
   const level=String(x.extratags?.admin_level||"");
   // Explicitly reviewed districts must never accept a city/municipality
   // polygon as a county just because both share the same namesake.
   if((entry.jurisdictionVerified||entry.adminRuleVerified)&&entry.admin==="county"&&
      ["city","town","village","municipality"].includes(type))return false;
   if(validTypes[entry.admin]?.has(type))return true;
   if(category!=="boundary")return false;
   if(entry.admin==="state")return level==="4";
   if(entry.admin==="county")return ["6","7"].includes(level);
   return ["6","8","9"].includes(level);
 }
 function areaChoice(entry,x){
   const name=String(x.name||x.display_name?.split(",")[0]||entry.query);
   const admin=String(x.addresstype||x.type||"Verwaltungsgebiet");
   return Object.freeze({...entry,kind:"area",geojson:x.geojson,
     osmType:x.osm_type,osmId:x.osm_id,
     choiceTitle:name+" – "+admin,choiceDetail:x.display_name||entry.country});
 }
 class LicensePlateSearch{
   constructor({catalog,areaFinder}){
     if(!catalog?.lookup||!areaFinder?.find)throw new TypeError("Plate search ports required");
     this.catalog=catalog;this.finder=areaFinder;this.cache=new Map();
   }
   find(code){return this.catalog.lookup(code);}
   async referencePoint(entry,{signal}={}){
     // A code already documented as a CITY may use its namesake as an
     // automatic reference place. Counties/states ALWAYS require an explicit
     // reviewed reference; we never assume their capital is inside the area.
     const place=entry.referencePlace||
       (entry.admin==="city"&&!/\b(?:kreis|district|county|province|region)\b/i.test(entry.query)
         ?entry.query:null);
     if(!place||typeof this.finder.findPlace!=="function")return null;
     const matches=await this.finder.findPlace(place,{
       countryCode:entry.country,signal
     });
     if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
     const target=normalized(place);
     const valid=matches.filter(p=>{
       const pointName=normalized(p.name||p.display_name?.split(",")[0]);
       return pointName===target&&
         String(p.address?.country_code||"").toUpperCase()===entry.country&&
         Number.isFinite(Number(p.lat))&&Math.abs(Number(p.lat))<=90&&
         Number.isFinite(Number(p.lon))&&Math.abs(Number(p.lon))<=180;
     });
     if(!valid.length)return null;
     const best=valid.find(p=>["city","town","village","municipality"].includes(
       String(p.addresstype||p.type||"").toLowerCase()))||valid[0];
     return Object.freeze({...entry,kind:"point",point:{
       lat:Number(best.lat),lng:Number(best.lon)
     },referencePlace:place,
     choiceTitle:place+" – Ersatzort",
     choiceDetail:(entry.placeRelation||"Geografischer Referenzort")+
       " · kein vollständiges Zulassungsgebiet"});
   }
   async resolve(entry,{signal}={}){
     if(!entry||!this.catalog.records.includes(entry))
       throw new TypeError("Unknown license plate catalog entry");
     const key=entry.country+"|"+entry.code+"|"+entry.query+"|"+entry.admin;
     if(this.cache.has(key))return this.cache.get(key);
     if(entry.geometryPolicy==="unmapped-historic")
       throw Error("Historischer Zulassungsbezirk ohne heutige eindeutige Verwaltungsgrenze.");
     if(entry.geometryPolicy==="reference-only"){
       const result=await this.referencePoint(entry,{signal});
       if(!result)throw Error("Mehrgemeindiger oder besonderer Zulassungsbereich: kein verlässlicher Referenzort.");
       this.cache.set(key,result);return result;
     }
     if(Array.isArray(entry.areaOptions)&&entry.areaOptions.length){
       const seen=new Set(),choices=[];
       for(const option of entry.areaOptions){
         const scoped={...entry,admin:option.admin,query:option.query,
           name:option.areaName,
           label:entry.flag+" "+entry.code+" ("+option.areaName+")"};
         const found=await this.finder.find(option.query,{kind:"area",signal});
         if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
         for(const candidate of Array.isArray(found)?found:[]){
           if(!isMatchingArea(scoped,candidate))continue;
           const identity=candidate.osm_type+":"+candidate.osm_id;
           if(seen.has(identity))continue;
           seen.add(identity);
           choices.push(Object.freeze({...areaChoice(scoped,candidate),
             choiceTitle:option.areaName+" – "+(option.admin==="city"?"Stadt":"Landkreis")}));
         }
       }
       if(!choices.length)
         throw Error("Keine geprüfte Stadt- oder Landkreisgrenze für dieses gemeinsam genutzte Kennzeichen gefunden.");
       // Keep explicit selection even when only one side is available:
       // never imply that the only found boundary represents the whole code.
       const result=Object.freeze({kind:"choices",entry,choices:Object.freeze(choices)});
       this.cache.set(key,result);return result;
     }
     const results=await this.finder.find(entry.query,{kind:"area",signal});
     if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
     const seen=new Set();
     const choices=(Array.isArray(results)?results:[]).filter(x=>{
       if(!isMatchingArea(entry,x))return false;
       const key=x.osm_type+":"+x.osm_id;
       if(seen.has(key))return false;
       seen.add(key);return true;
     }).map(x=>areaChoice(entry,x));
     // A historic registration office can refer to both the named town
     // and today's larger registration district. Search that district ONLY
     // when the local, source-reviewed mapping explicitly supplies it.
     if(entry.relatedArea){
       try{
         const nearby=await this.finder.find(entry.relatedArea,{kind:"area",signal});
         for(const candidate of Array.isArray(nearby)?nearby:[]){
           const hint={...entry,admin:"county"};
           if(!isMatchingArea(hint,candidate))continue;
           if(choices.some(c=>c.osmType===candidate.osm_type&&
             String(c.osmId)===String(candidate.osm_id)))continue;
           const choice=areaChoice(entry,candidate);
           choices.push(Object.freeze({...choice,choiceTitle:
             String(candidate.name||entry.relatedArea)+" – heutiger Landkreis"}));
         }
       }catch(error){if(signal?.aborted||error?.name==="AbortError")throw error;}
     }
     // A unique polygon is useful immediately; multiple geometries require
     // an explicit user decision, NEVER blindly choose the first result.
     if(choices.length===1){
       const found=choices[0];this.cache.set(key,found);return found;
     }
     let point=null;
     // Reference lookup only if polygon choice cannot be decided.
     // A known code without a verified reference city remains unresolved.
     try{point=await this.referencePoint(entry,{signal});}
     catch(error){if(error?.name==="AbortError"||signal?.aborted)throw error;}
     if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
     if(choices.length>1){
       const found=Object.freeze({kind:"choices",entry,
         choices:Object.freeze([...choices,...(point?[point]:[])])});
       this.cache.set(key,found);return found;
     }
     if(point){this.cache.set(key,point);return point;}
     throw new Error(entry.referencePlace||entry.admin==="city"?
       "Weder eindeutige Verwaltungsgrenze noch der hinterlegte Referenzort gefunden.":
       "Keine eindeutige Verwaltungsgrenze verfügbar; für diesen Code ist noch kein geprüfter Ersatzort hinterlegt.");
   }
 }
 root.Pin2MapLicensePlateSearch=LicensePlateSearch;
 if(typeof module!=="undefined"&&module.exports)module.exports=LicensePlateSearch;
})(typeof window!=="undefined"?window:globalThis);
