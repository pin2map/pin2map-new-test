"use strict";
/* Route use case. No DOM, Leaflet, project storage or HTTP implementation.
 * Each real pin leg is calculated independently to preserve duration/distance
 * and a distinct color. Soft guide flags are deliberately NOT hard waypoints.
 */
(function(root){
 class CarRouteSession {
  constructor({plan,calculate,getPin,onChange,onError}){
   if(!plan||[calculate,getPin,onChange,onError].some(x=>typeof x!=="function"))throw new TypeError("Route session ports required");
   Object.assign(this,{plan,calculate,getPin,onChange,onError});
   this.generation=0;this.pending=null;this.legs=[];this.loading=false;this.allVisibleActive=false;
  }
  snapshot(){return {...this.plan.snapshot(),allVisibleActive:this.allVisibleActive,legs:this.legs.slice(),loading:this.loading,
   distanceMeters:this.legs.reduce((s,l)=>s+l.distanceMeters,0),
   durationSeconds:this.legs.reduce((s,l)=>s+l.durationSeconds,0)};}
  publish(){this.onChange(this.snapshot());}
  cancel(){this.generation++;this.pending?.abort();this.pending=null;this.loading=false;}
  clear(){this.cancel();this.plan.reset();this.legs=[];this.allVisibleActive=false;this.publish();}
  async recalculate(){
   this.cancel();this.legs=[];const ids=this.plan.ids();
   if(!ids.length){this.publish();return;}
   const points=ids.map(this.getPin);
   if(points.some(p=>!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))){
    this.onError("Ein Routen-Pin ist nicht mehr vorhanden.");this.publish();return;
   }
   const generation=this.generation,controller=new AbortController();this.pending=controller;this.loading=true;this.publish();
   const completed=[];
   try{
    for(let i=0;i<points.length-1;i++){
     const result=await this.calculate({waypoints:[points[i],points[i+1]],
      profile:this.plan.profile,avoidTolls:this.plan.avoidTolls,signal:controller.signal});
     if(generation!==this.generation)return;
     completed.push({...result,fromId:ids[i],toId:ids[i+1]});
    }
    if(generation!==this.generation)return;
    this.legs=completed;
   }catch(error){
    if(generation!==this.generation)return;
    if(!controller.signal.aborted)this.onError("Autoroute konnte nicht berechnet werden: "+String(error?.message||error));
   }finally{
    if(generation===this.generation){this.loading=false;this.pending=null;this.publish();}
   }
  }
  endpoint(kind,id){this.plan.setEndpoint(kind,id);void this.recalculate();}
  waypoint(id){if(this.plan.addWaypoint(id)){this.allVisibleActive=false;void this.recalculate();}else this.publish();}
  removeWaypoint(id){if(this.plan.removeWaypoint(id))void this.recalculate();}
  addVisible(ids){const n=this.plan.addVisible(ids);if(n)void this.recalculate();return n;}
  toggleVisible(ids){
   if(!this.plan.ready())return {active:false,count:0};
   if(this.allVisibleActive){
    this.allVisibleActive=false;this.plan.waypointIds=[];
    void this.recalculate();return {active:false,count:0};
   }
   const n=this.plan.addVisible(ids);
   if(!n){this.publish();return {active:false,count:0};}
   this.allVisibleActive=true;void this.recalculate();
   return {active:true,count:n};
  }
  reverse(){if(!this.plan.ready())return;this.plan.reverse();void this.recalculate();}
  options(options){this.plan.setOptions(options);void this.recalculate();}
 }
 const api=Object.freeze({CarRouteSession});
 root.Pin2MapCarRouteSession=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
