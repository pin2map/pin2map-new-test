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
  async earlierArrival(route,{waypoints,query,signal,calculate=this.calculate}){
   const transfer=route.critical;
   const station=transfer?.previous.to;
   if(!station?.stopId)return null;
   const deadline=transfer.leg.start-(transfer.walkMinutes+transfer.reserve)*minute;
   const legs=route.legs.slice(transfer.previous.index+1);
   const prefixes=await calculate({waypoints:[waypoints[0],{stopId:station.stopId}],signal,
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
  async laterConnection(route,{waypoints,query,signal,calculate=this.calculate}){
   const transfer=route.critical;
   const station=transfer?.leg.from;
   if(!station?.stopId)return null;
   const prefix=route.legs.slice(0,transfer.leg.index);
   const ready=Math.max(prefix.at(-1).end,transfer.previous.end+(transfer.walkMinutes+transfer.reserve)*minute);
   const options=await calculate({waypoints:[{stopId:station.stopId},waypoints[1]],signal,
    query:{...query,arriveBy:false,time:ready,searchMinutes:60,moreTransferTime:true}});
   const candidates=options.filter(option=>option.start>=ready&&option.legs.length).map(option=>{
    const legs=[...prefix,...option.legs].map((leg,index)=>({...leg,index}));
    return {...route,end:option.end,durationSeconds:(option.end-route.start)/1000,legs,
     distanceMeters:legs.reduce((sum,leg)=>sum+leg.distanceMeters,0)};
   });
   return candidates.sort((a,b)=>
    assess(a,query).transfers.filter(item=>item.critical).length-
    assess(b,query).transfers.filter(item=>item.critical).length||a.end-b.end)[0]||null;
  }
  async stationRoutes(waypoints,query,minutes,access,signal,calculate=this.calculate){
   const start=access[0],end=access[1];
   if(!start&&!end)return [];
   const delta=(query.arriveBy?-(end?.leg.durationSeconds||0):start?.leg.durationSeconds||0)*1000;
   const offsets=query.arriveBy?[0,60*minute]:[0];
   const results=await Promise.all(offsets.map(offset=>calculate({
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
  async search({waypoints,guides,query,signal,onProgress=()=>{}}){
   let requests=0,received=0,pending=0;
   const calculate=async request=>{
    signal.throwIfAborted();
    requests++;pending++;
    onProgress({phase:"request",requests,pending,received});
    try{
     const routes=await this.calculate(request);
     received+=routes.length;
     return routes;
    }finally{
     pending--;
     if(!signal.aborted)onProgress({phase:pending?"request":"review",requests,pending,received});
    }
   };
   const search=(time,via,searchMinutes,moreTransferTime=false)=>
    calculate({waypoints,query:{...query,time,searchMinutes,moreTransferTime},via,signal});
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
   let previousOptions=[];
   for(const minutes of query.arriveBy?[60]:[15,30,45,60,120]){
    const eligible=route=>query.arriveBy||(route.start>=query.time&&route.start<=query.time+minutes*minute);
    const direct=(await window([],minutes,false)).filter(eligible);
    let guided=[];
    if(guides.length&&!direct.some(item=>guideCount(item,guides)===guides.length)){
     if(!via){
      onProgress({phase:"stops",requests,received});
      via=[...new Set((await optional(()=>Promise.all(guides.map(flag=>this.stopNear(flag,signal))))).filter(Boolean))];
     }
     if(via.length)guided=(await optional(()=>window(via,minutes,false))).filter(eligible);
    }
    let initial=[...previousOptions.filter(eligible),...direct,...guided];
    let scored=score(initial,query,guides);
    if(this.railAccess&&!scored.some(item=>item.quality!=="red")){
     if(!access){
      onProgress({phase:"access",requests,received});
      access=await Promise.all(waypoints.map((pin,index)=>
       optional(()=>this.railAccess(pin,index===1,signal),null)));
     }
     const station=(await optional(()=>this.stationRoutes(waypoints,query,minutes,access,signal,calculate))).filter(eligible);
     initial=[...initial,...station];
     scored=score(initial,query,guides);
    }
    if(scored.some(item=>item.critical)&&!scored.some(item=>item.quality!=="red")){
     const padded=(await optional(()=>window([],minutes,true))).filter(eligible);
     scored=score([...initial,...padded],query,guides);
    }
    const repairs=[];
    if(!scored.some(item=>item.quality!=="red")){
     const candidates=scored.filter(item=>item.critical&&
      (item.critical.previous.to?.stopId||!query.arriveBy&&item.critical.leg.from?.stopId))
      .sort((a,b)=>query.arriveBy?Math.abs(a.end-query.time)-Math.abs(b.end-query.time):a.start-b.start);
     for(const candidate of candidates.slice(0,2)){
      const key=identity(candidate);
      if(queriedRepairs.has(key))continue;
      queriedRepairs.add(key);
      const fixed=await optional(()=>this.earlierArrival(candidate,{waypoints,query,signal,calculate}),null);
      if(fixed&&eligible(fixed))repairs.push(fixed);
      if(query.arriveBy||(fixed&&eligible(fixed)&&!assess(fixed,query).critical))continue;
      let option=fixed&&eligible(fixed)?fixed:candidate;
      for(let attempt=0;attempt<3;attempt++){
       const current=score([option],query,guides)[0];
       if(!current.critical)break;
       const next=await optional(()=>this.laterConnection(current,{waypoints,query,signal,calculate}),null);
       if(!next||identity(option)===identity(next))break;
       repairs.push(next);
       option=next;
      }
     }
    }
    scored=score([...scored,...repairs].filter(eligible),query,guides);
    previousOptions=scored;
    if(query.arriveBy)return this.results(scored,query);
    if(scored.some(item=>item.quality!=="red")){
     const all=minutes===120?[]:(await optional(()=>window([],120,false)))
      .filter(route=>route.start>=query.time&&route.start<=query.time+120*minute);
     return this.results(score([...scored,...all],query,guides),query);
    }
   }
   return this.results(previousOptions,query);
  }
  results(journeys,query){
   const quality={green:0,yellow:1,red:2};
   const timeCost=route=>query.arriveBy?
    Math.abs(route.end-query.time)+route.durationSeconds*1000/2:route.end-query.time;
   const accessTime=route=>[...new Set([route.legs[0],route.legs.at(-1)])]
    .filter(leg=>walking(leg.mode)).reduce((sum,leg)=>sum+leg.durationSeconds,0)*1000;
   // Keep the risk preference, but bound how much extra travel it can justify.
   const cost=route=>timeCost(route)+quality[route.quality]*15*minute+accessTime(route);
   const preferred=[...journeys].sort((a,b)=>b.guideCount-a.guideCount||cost(a)-cost(b)||
    quality[a.quality]-quality[b.quality]||a.durationSeconds-b.durationSeconds)[0];
   journeys.sort((a,b)=>a.start-b.start||a.end-b.end);
   return {journeys,selected:Math.max(0,journeys.indexOf(preferred))};
  }
  async continueJourney(journey,{index,delay,next,target,query,signal}){
   const transfer=journey.transfers.find(item=>item.leg.index===index);
   const leg=journey.legs[index];
   if(!leg||walking(leg.mode))return null;
   const from=transfer?.previous.to||leg.from;
   if(!from?.stopId)return null;
   const branch=transfer?transfer.previous.index+1:index;
   const prefix=journey.legs.slice(0,branch);
   const ready=prefix.at(-1)?.end??journey.start;
   const scheduled=Date.parse(leg.from?.scheduledDeparture);
   const departure=Math.max(ready,next?.time??(Number.isFinite(scheduled)?scheduled:leg.start)+delay*minute);
   const routes=await this.calculate({waypoints:[{stopId:from.stopId},target],signal,
    query:{time:departure,arriveBy:false,searchMinutes:120}});
   const options=routes.filter(route=>route.legs.length&&route.start>=departure);
   const picked=options.sort((a,b)=>a.end-b.end||b.start-a.start)[0];
   if(!picked)return null;
   const legs=[...prefix,...picked.legs].map((item,i)=>({...item,index:i}));
   const start=prefix.length?journey.start:picked.start;
   const revised={start,end:picked.end,durationSeconds:(picked.end-start)/1000,legs,
    distanceMeters:legs.reduce((sum,item)=>sum+item.distanceMeters,0)};
   return {branch,journey:{...revised,...assess(revised,query)}};
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
