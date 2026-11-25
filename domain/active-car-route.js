"use strict";
(function(root){
 const validId=id=>typeof id==="string"&&id.length>0;
 const coord=point=>point&&Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&Math.abs(point.lat)<=90&&Math.abs(point.lng)<=180;
 const TIME_FACTORS=Object.freeze({standard:1,slow:1.30,quick:0.95});
 const validTimeFactor=value=>Number.isFinite(value)&&value>=0.1&&value<=5;
 const radians=Math.PI/180;
 function distance(a,b){
  const lat=(b.lat-a.lat)*radians,lng=(b.lng-a.lng)*radians;
  const h=Math.sin(lat/2)**2+Math.cos(a.lat*radians)*Math.cos(b.lat*radians)*Math.sin(lng/2)**2;
  return 12742000*Math.asin(Math.sqrt(Math.min(1,h)));
 }
 function optimizeStops(ids,points){
  const cost=(a,b)=>distance(points.get(a),points.get(b));
  const length=order=>order.slice(1).reduce((sum,id,index)=>sum+cost(order[index],id),0);
  const waiting=ids.slice(1,-1),nearest=[ids[0]];
  while(waiting.length){
   const from=nearest.at(-1);
   const next=waiting.reduce((best,id)=>cost(from,id)<cost(from,best)?id:best);
   nearest.push(next);waiting.splice(waiting.indexOf(next),1);
  }
  nearest.push(ids.at(-1));
  const order=(length(nearest)<length(ids)?nearest:ids).slice();
  for(let pass=0;pass<order.length;pass++){
   let bestGain=0.1,first,last;
   for(let a=1;a<order.length-2;a++)for(let b=a+1;b<order.length-1;b++){
    const gain=cost(order[a-1],order[a])+cost(order[b],order[b+1])-
      cost(order[a-1],order[b])-cost(order[a],order[b+1]);
    if(gain>bestGain){bestGain=gain;first=a;last=b;}
   }
   if(first===undefined)break;
   order.splice(first,last-first+1,...order.slice(first,last+1).reverse());
  }
  return order;
 }
 function splitFerryLegs(legs){
  return legs.flatMap(leg=>{
   const sections=(leg.timeSections||[]).filter(section=>section.coordinates?.length>=2&&
    Number.isFinite(section.seconds)&&section.seconds>=0&&
    Number.isFinite(section.distanceMeters)&&section.distanceMeters>=0);
   if(!sections.some(section=>section.ferry))return [leg];
   const groups=[];
   for(const section of sections){
    const ferry=Boolean(section.ferry);
    let group=groups.at(-1);
    if(!group||group.ferry!==ferry){
     group={ferry,ferryName:section.ferryName,seconds:0,distance:0,coordinates:[],sections:[]};
     groups.push(group);
    }
    const last=group.coordinates.at(-1), first=section.coordinates[0];
    const start=last&&last[0]===first[0]&&last[1]===first[1]?1:0;
    for(let i=start;i<section.coordinates.length;i++)group.coordinates.push(section.coordinates[i]);
    group.seconds+=section.seconds;group.distance+=section.distanceMeters;
    group.sections.push(section);
   }
   return groups.map((group,index)=>({
    ...leg,ferry:group.ferry,ferryName:group.ferryName,
    fromId:index===0?leg.fromId:null,toId:index===groups.length-1?leg.toId:null,
    distanceMeters:group.distance,durationSeconds:group.seconds,timeSections:group.sections,
    geometry:{type:"LineString",coordinates:group.coordinates}
   }));
  });
 }
 function timeMarkers(legs){
  const marks=[];
  let elapsed=0,next=1800;
  for(const leg of legs){
   if(leg.ferry){elapsed=0;next=1800;}
   const sections=(leg.timeSections||[]).filter(s=>s.seconds>0&&s.coordinates?.length>=2);
   const seconds=sections.reduce((sum,s)=>sum+s.seconds,0);
   const pieces=seconds>0?sections:[{seconds:leg.durationSeconds,coordinates:leg.geometry?.coordinates}];
   for(const piece of pieces){
    const duration=seconds>0?leg.durationSeconds*piece.seconds/seconds:leg.durationSeconds;
    if(!(duration>0))continue;
    if(!piece.coordinates||piece.coordinates.length<2){
     elapsed+=duration;
     while(next<=elapsed)next+=1800;
     continue;
    }
    const points=piece.coordinates.map(([lng,lat])=>({lat,lng}));
    const lengths=points.slice(1).map((point,index)=>distance(points[index],point));
    const total=lengths.reduce((sum,length)=>sum+length,0);
    for(;next<=elapsed+duration+1e-7;next+=1800){
     let remaining=total*Math.min(1,(next-elapsed)/duration);
     let i=0;
     while(i<lengths.length-1&&remaining>lengths[i])remaining-=lengths[i++];
     const a=points[i],b=points[i+1],fraction=lengths[i]?remaining/lengths[i]:0;
     marks.push({lat:a.lat+(b.lat-a.lat)*fraction,lng:a.lng+(b.lng-a.lng)*fraction,
      hour:next%3600===0?next/3600:null});
    }
    elapsed+=duration;
   }
   if(leg.ferry){elapsed=0;next=1800;}
  }
  return marks;
 }
 class ActiveCarRoute {
  constructor(){this.reset();}
  reset(){this.startId=null;this.targetId=null;this.waypointIds=[];this.profile="fast";this.avoidTolls=false;this.order="fixed";this.optimizedIds=[];}
  setEndpoint(kind,id){
   if(!["start","target"].includes(kind)||!validId(id))throw new TypeError("Invalid route endpoint");
   this[kind+"Id"]=id;
   this.waypointIds=this.waypointIds.filter(value=>value!==id);
   return this.snapshot();
  }
  toggleEndpoint(kind,id){
   if(!["start","target"].includes(kind)||!validId(id))throw new TypeError("Invalid route endpoint");
   if(this[kind+"Id"]===id){this[kind+"Id"]=null;return this.snapshot();}
   return this.setEndpoint(kind,id);
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
   if(!["fast","country","scenic","no-highways"].includes(profile)||typeof avoidTolls!=="boolean")throw new RangeError("Unknown car route option");
   if(profile==="scenic"&&avoidTolls)throw new RangeError("Interessant und Ohne Maut sind noch nicht kombinierbar");
   this.profile=profile;this.avoidTolls=avoidTolls;
  }
  updateOrder(getPin){
   this.optimizedIds=[];
   if(this.order!=="optimal"||!this.startId||!this.targetId||this.waypointIds.length<2)return;
   const ids=[this.startId,...this.waypointIds,this.targetId];
   const points=new Map(ids.map(id=>[id,getPin(id)]));
   if([...points.values()].every(coord))this.optimizedIds=optimizeStops(ids,points).slice(1,-1);
  }
  orderedWaypoints(){return this.order==="optimal"&&this.optimizedIds.length?this.optimizedIds:this.waypointIds;}
  ids(){return this.startId&&this.targetId?[this.startId,...this.orderedWaypoints(),this.targetId]:[];}
  ready(){return this.ids().length>=2;}
  snapshot(){return {startId:this.startId,targetId:this.targetId,waypointIds:[...this.orderedWaypoints()],
   profile:this.profile,avoidTolls:this.avoidTolls,order:this.order,ready:this.ready(),ids:this.ids()};}
 }
 const api=Object.freeze({ActiveCarRoute,coord,distance,TIME_FACTORS,validTimeFactor,timeMarkers,splitFerryLegs});
 root.Pin2MapActiveCarRoute=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
