"use strict";
(function(root){
 const {assess}=root.Pin2MapTransitJourney||
  (typeof module!=="undefined"?require("../domain/transit-journey.js"):{});
 const {assignGuides}=root.Pin2MapRouteGuideCorridor||
  (typeof module!=="undefined"?require("../domain/route-guide-corridor.js"):{});
 const hour=3600000;
 const identity=journey=>JSON.stringify(journey.legs.map(leg=>
  [leg.mode,leg.tripId,leg.start,leg.end,leg.from?.stopId,leg.to?.stopId]));
 function guideCount(journey,guides){
  return assignGuides(journey.legs,guides).flat().filter(guide=>guide.meters<=guide.radius).length;
 }
 class TransitRouteSearch{
  constructor({calculate,stopNear}){Object.assign(this,{calculate,stopNear});}
  async search({waypoints,guides,query,signal}){
   const search=(arriveBy,time,via)=>this.calculate({waypoints,query:{...query,arriveBy,time},via,signal});
   const window=async via=>{
    const primary=await search(query.arriveBy,query.time,via);
    if(!query.arriveBy)return primary;
    try{return [...primary,...await search(true,query.time+hour,via)];}
    catch(error){if(signal.aborted||!primary.length)throw error;return primary;}
   };
   const direct=await window([]);
   let guided=[];
   if(guides.length&&!direct.some(item=>guideCount(item,guides)===guides.length)){
    try{
     const stations=await Promise.all(guides.map(flag=>this.stopNear(flag,signal)));
     const via=[...new Set(stations.filter(Boolean))];
     if(via.length){
      guided=await window(via);
      if(!guided.length&&via.length===2)guided=await window(via.slice(0,1));
     }
    }catch(error){if(signal.aborted)throw error;}
   }
   const seen=new Set();
   const result=[...direct,...guided].filter(item=>{
    const key=identity(item);
    if(seen.has(key))return false;
    seen.add(key);return true;
   }).map(item=>({...item,...assess(item,query),guideCount:guideCount(item,guides)}))
    .sort((a,b)=>a.start-b.start||a.end-b.end);
   const quality={green:0,yellow:1,red:2};
   const preferred=[...result].sort((a,b)=>quality[a.quality]-quality[b.quality]||
    b.guideCount-a.guideCount||(query.arriveBy?Math.abs(a.end-query.time)-Math.abs(b.end-query.time):a.start-b.start))[0];
   return {journeys:result,selected:Math.max(0,result.indexOf(preferred))};
  }
  async recovery(journey,to,query,signal){
   const leg=journey.critical?.leg;
   if(!query.arriveBy||!leg?.from?.stopId)return null;
   const waypoints=[{stopId:leg.from.stopId},to];
   const options=await this.calculate({waypoints,query:{...query,arriveBy:false,time:leg.start+60000},signal});
   const next=options.sort((a,b)=>a.end-b.end)[0];
   return next?{end:next.end,late:next.end>query.time}:{unknown:true};
  }
 }
 root.Pin2MapTransitRouteSearch=TransitRouteSearch;
 if(typeof module!=="undefined"&&module.exports)module.exports=TransitRouteSearch;
})(typeof window!=="undefined"?window:globalThis);
