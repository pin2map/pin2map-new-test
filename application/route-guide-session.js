"use strict";
/* Application-owned soft geographic guide flags. These are map hints and
 * never become part of the itinerary.
 * Storage and drawing are explicit injected ports; no DOM, Leaflet or HTTP.
 */
(function(root){
 const {radiusForScale}=root.Pin2MapRouteGuideCorridor||require("../domain/route-guide-corridor.js");
 class RouteGuideSession {
  constructor({getGuides,setGuides,makeId,onChange}){
   if([getGuides,setGuides,makeId,onChange].some(fn=>typeof fn!=="function"))
    throw new TypeError("Guide state, storage and presentation ports required");
   Object.assign(this,{getGuides,setGuides,makeId,onChange});
  }
  list(){const data=this.getGuides();return Array.isArray(data)?data.map(({id,lat,lng,radiusMeters})=>({id,lat,lng,radiusMeters:radiusForScale(radiusMeters)})):[];}
  add(point){
   if(!point||!Number.isFinite(point.lat)||!Number.isFinite(point.lng)||
      Math.abs(point.lat)>90||Math.abs(point.lng)>180)
    throw new RangeError("Invalid direction flag coordinate");
   const current=this.list();
   const flag={id:this.makeId(),lat:point.lat,lng:point.lng,radiusMeters:radiusForScale(point.radiusMeters)};
   if(typeof flag.id!=="string"||!flag.id||current.some(item=>item.id===flag.id))
    throw new Error("Nonunique direction flag ID");
   this.setGuides([...current,flag]);this.onChange();return flag;
  }
  remove(id){
   const current=this.list(),next=current.filter(flag=>flag.id!==id);
   if(next.length===current.length)return false;
   this.setGuides(next);this.onChange();return true;
  }
 }
 const api=Object.freeze({RouteGuideSession});
 root.Pin2MapRouteGuideSession=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
