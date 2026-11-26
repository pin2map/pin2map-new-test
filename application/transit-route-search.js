"use strict";
(function(root){
 const {assess,walking}=root.Pin2MapTransitJourney||
  (typeof module!=="undefined"?require("../domain/transit-journey.js"):{});
 const {assignGuides}=root.Pin2MapRouteGuideCorridor||
  (typeof module!=="undefined"?require("../domain/route-guide-corridor.js"):{});
 const minute=60000;
 const identity=journey=>JSON.stringify(journey.legs.map(leg=>
  [leg.mode,leg.tripId,leg.start,leg.end,leg.from?.stopId,leg.to?.stopId]));
 function guideCount(journey,guides){
  return assignGuides(journey.legs,guides).flat().filter(guide=>guide.meters<=guide.radius).length;
 }
 function score(routes,query,guides){
  const unique=new Map(routes.map(route=>[identity(route),route]));
  const distances=[...unique.values()].flatMap(route=>assess(route,query).transfers)
   .filter(item=>item.stuttgart&&item.walkDistance>=50).map(item=>item.walkDistance).sort((a,b)=>a-b);
  const referenceWalkMeters=distances[Math.floor(distances.length/2)];
  return [...unique.values()].map(route=>({...route,...assess(route,{...query,referenceWalkMeters}),
   guideCount:guideCount(route,guides)}));
 }
 class TransitRouteSearch{
  constructor({calculate,stopNear,railAccess}){Object.assign(this,{calculate,stopNear,railAccess});}
  async earlierArrival(route,{waypoints,query,signal}){
   const transfer=route.critical;
   const station=transfer?.previous.to;
   if(!station?.stopId)return null;
   const deadline=transfer.leg.start-(transfer.walkMinutes+transfer.reserve)*minute;
   const legs=route.legs.slice(transfer.previous.index+1);
   const prefixes=await this.calculate({waypoints:[waypoints[0],{stopId:station.stopId}],signal,
    query:{...query,arriveBy:true,time:deadline,searchMinutes:30,moreTransferTime:false}});
   const prefix=prefixes.filter(option=>option.end<=deadline&&option.legs.at(-1)?.to?.stopId===station.stopId)
    .sort((a,b)=>b.start-a.start)[0];
   if(!prefix)return null;
   const combined=[...prefix.legs,...legs.map(leg=>walking(leg.mode)&&leg.index<transfer.leg.index?{
    ...leg,start:leg.start+prefix.end-transfer.previous.end,end:leg.end+prefix.end-transfer.previous.end
   }:leg)].map((leg,index)=>({...leg,index}));
   return {...route,start:prefix.start,durationSeconds:(route.end-prefix.start)/1000,
    distanceMeters:combined.reduce((sum,leg)=>sum+leg.distanceMeters,0),legs:combined};
  }
  async stationRoutes(waypoints,query,minutes,access,signal){
   const start=access[0],end=access[1];
   if(!start&&!end)return [];
   const delta=(query.arriveBy?-(end?.leg.durationSeconds||0):start?.leg.durationSeconds||0)*1000;
   const offsets=query.arriveBy?[0,60*minute]:[0];
   const results=await Promise.all(offsets.map(offset=>this.calculate({
    waypoints:[start?.point||waypoints[0],end?.point||waypoints[1]],signal,
    query:{...query,time:query.time+delta+offset,searchMinutes:minutes}
   })));
   return results.flat().map(route=>{
    const depart=route.start-(start?.leg.durationSeconds||0)*1000;
    const arrive=route.end+(end?.leg.durationSeconds||0)*1000;
    const before=start?[{...start.leg,start:depart,end:route.start}]:[];
    const after=end?[{...end.leg,start:route.end,end:arrive}]:[];
    const legs=[...before,...route.legs,...after].map((leg,index)=>({...leg,index}));
    return {...route,start:depart,end:arrive,legs,durationSeconds:(arrive-depart)/1000,
     distanceMeters:legs.reduce((sum,leg)=>sum+leg.distanceMeters,0)};
   });
  }
  async search({waypoints,guides,query,signal}){
   const search=(time,via,searchMinutes,moreTransferTime=false)=>
    this.calculate({waypoints,query:{...query,time,searchMinutes,moreTransferTime},via,signal});
   const window=async(via,minutes,padded)=>{
    const primary=await search(query.time,via,minutes,padded);
    if(!query.arriveBy)return primary;
    try{return [...primary,...await search(query.time+60*minute,via,minutes,padded)];}
    catch(error){if(signal.aborted||!primary.length)throw error;return primary;}
   };
   let via,access;
   const optional=async (task,fallback=[])=>{
    try{return await task();}
    catch(error){if(signal.aborted)throw error;return fallback;}
   };
   const queriedRepairs=new Set();
   for(const minutes of query.arriveBy?[60]:[15,30,45,60,120]){
    const eligible=route=>query.arriveBy||(route.start>=query.time&&route.start<=query.time+minutes*minute);
    const direct=(await window([],minutes,false)).filter(eligible);
    let guided=[];
    if(guides.length&&!direct.some(item=>guideCount(item,guides)===guides.length)){
     if(!via)via=[...new Set((await optional(()=>Promise.all(guides.map(flag=>this.stopNear(flag,signal))))).filter(Boolean))];
     if(via.length)guided=(await optional(()=>window(via,minutes,false))).filter(eligible);
    }
    let initial=[...direct,...guided];
    let scored=score(initial,query,guides);
    if(this.railAccess&&!scored.some(item=>item.quality!=="red")){
     if(!access)access=await Promise.all(waypoints.map((pin,index)=>
      optional(()=>this.railAccess(pin,index===1,signal),null)));
     const station=(await optional(()=>this.stationRoutes(waypoints,query,minutes,access,signal))).filter(eligible);
     initial=[...initial,...station];
     scored=score(initial,query,guides);
    }
    if(scored.some(item=>item.critical)&&!scored.some(item=>item.quality!=="red")){
     const padded=(await optional(()=>window([],minutes,true))).filter(eligible);
     scored=score([...initial,...padded],query,guides);
    }
    const repairs=[];
    if(!scored.some(item=>item.quality!=="red")){
     const candidates=scored.filter(item=>item.critical&&item.critical.previous.to?.stopId)
      .sort((a,b)=>query.arriveBy?Math.abs(a.end-query.time)-Math.abs(b.end-query.time):a.start-b.start);
     for(const candidate of candidates.slice(0,2)){
      const key=identity(candidate);
      if(queriedRepairs.has(key))continue;
      queriedRepairs.add(key);
      const fixed=await optional(()=>this.earlierArrival(candidate,{waypoints,query,signal}),null);
      if(fixed)repairs.push(fixed);
     }
    }
    scored=score([...scored,...repairs].filter(eligible),query,guides);
    const quality={green:0,yellow:1,red:2};
    const preferred=[...scored].sort((a,b)=>quality[a.quality]-quality[b.quality]||
     b.guideCount-a.guideCount||(query.arriveBy?Math.abs(a.end-query.time)-Math.abs(b.end-query.time):a.start-b.start)||
     a.end-b.end)[0];
    if(query.arriveBy){
     scored.sort((a,b)=>a.start-b.start||a.end-b.end);
     return {journeys:scored,selected:Math.max(0,scored.indexOf(preferred))};
    }
    if(preferred&&preferred.quality!=="red")return {journeys:[preferred],selected:0};
   }
   return {journeys:[],selected:0};
  }
  async recovery(journey,to,query,signal){
   const leg=journey.critical?.leg;
   if(!query.arriveBy||!leg?.from?.stopId)return null;
   const waypoints=[{stopId:leg.from.stopId},to];
   const options=await this.calculate({waypoints,query:{...query,arriveBy:false,time:leg.start+minute},signal});
   const next=options.sort((a,b)=>a.end-b.end)[0];
   return next?{end:next.end,late:next.end>query.time}:{unknown:true};
  }
 }
 root.Pin2MapTransitRouteSearch=TransitRouteSearch;
 if(typeof module!=="undefined"&&module.exports)module.exports=TransitRouteSearch;
})(typeof window!=="undefined"?window:globalThis);
