"use strict";
(function(root){
 const validId=id=>typeof id==="string"&&id.length>0;
 const coord=point=>point&&Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&Math.abs(point.lat)<=90&&Math.abs(point.lng)<=180;
 class ActiveCarRoute {
  constructor(){this.reset();}
  reset(){this.startId=null;this.targetId=null;this.waypointIds=[];this.profile="fast";this.avoidTolls=false;this.order="fixed";}
  setEndpoint(kind,id){
   if(!["start","target"].includes(kind)||!validId(id))throw new TypeError("Invalid route endpoint");
   this[kind+"Id"]=id;
   this.waypointIds=this.waypointIds.filter(value=>value!==id);
   return this.snapshot();
  }
  addWaypoint(id){
   if(!validId(id))throw new TypeError("Invalid waypoint");
   if(id===this.startId||id===this.targetId||this.waypointIds.includes(id))return false;
   this.waypointIds.push(id);return true;
  }
  addVisible(ids){
   if(!Array.isArray(ids))throw new TypeError("Pin IDs required");
   return ids.reduce((n,id)=>n+(this.addWaypoint(id)?1:0),0);
  }
  removeWaypoint(id){const before=this.waypointIds.length;this.waypointIds=this.waypointIds.filter(x=>x!==id);return this.waypointIds.length!==before;}
  reverse(){const from=this.startId;this.startId=this.targetId;this.targetId=from;this.waypointIds.reverse();return this.snapshot();}
  setOptions({profile=this.profile,avoidTolls=this.avoidTolls}={}){
   if(!["fast","country","scenic"].includes(profile)||typeof avoidTolls!=="boolean")throw new RangeError("Unknown car route option");
   if(profile==="scenic"&&avoidTolls)throw new RangeError("Interessant und Ohne Maut sind noch nicht kombinierbar");
   this.profile=profile;this.avoidTolls=avoidTolls;
  }
  ids(){return this.startId&&this.targetId?[this.startId,...this.waypointIds,this.targetId]:[];}
  ready(){return this.ids().length>=2;}
  snapshot(){return {startId:this.startId,targetId:this.targetId,waypointIds:[...this.waypointIds],
   profile:this.profile,avoidTolls:this.avoidTolls,order:this.order,ready:this.ready(),ids:this.ids()};}
 }
 const api=Object.freeze({ActiveCarRoute,coord});
 root.Pin2MapActiveCarRoute=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
