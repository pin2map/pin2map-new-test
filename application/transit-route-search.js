"use strict";
(function(root){
 const {walking,transitTransfers}=root.Pin2MapTransitJourney||
  (typeof module!=="undefined"?require("../domain/transit-journey.js"):{});
 const {assignGuides}=root.Pin2MapRouteGuideCorridor||
  (typeof module!=="undefined"?require("../domain/route-guide-corridor.js"):{});
 const minute=60000;
 const sameStop=(a,b)=>Boolean(a?.stopId&&a.stopId===b?.stopId);
 const samePlatform=(a,b)=>sameStop(a,b)&&(!a.track&&!b.track||Boolean(a.track&&a.track===b.track));
 function joinTransfer(before,after,oldWalk){
  const incoming=before.at(-1),outgoing=after[0];
  if(!incoming||!outgoing||incoming.end>outgoing.start)return null;
  // A provider-supplied path touching the preserved endpoint already joins the parts.
  if(walking(outgoing.mode)&&samePlatform(incoming.to,outgoing.from)||
     walking(incoming.mode)&&samePlatform(incoming.to,outgoing.from))return [];
  if(oldWalk.length&&samePlatform(incoming.to,oldWalk[0].from)&&
     samePlatform(oldWalk.at(-1).to,outgoing.from)){
   const offset=incoming.end-oldWalk[0].start;
   if(oldWalk.at(-1).end+offset<=outgoing.start)
    return oldWalk.map(leg=>({...leg,start:leg.start+offset,end:leg.end+offset}));
  }
  return [{mode:"WALK",from:incoming.to,to:outgoing.from,start:incoming.end,end:outgoing.start,
   durationSeconds:(outgoing.start-incoming.end)/1000,distanceMeters:0,measured:false,unknownTransfer:true}];
 }
 class TransitRouteSearch{
  constructor({calculate,stopNear}){Object.assign(this,{calculate,stopNear});}
  async search({waypoints,guides=[],query,signal,onProgress=()=>{}}){
   const request={waypoints,query:{...query,searchMinutes:120,itineraryLimit:3},signal};
   let routes,requests=1;
   onProgress({phase:"request",requests});
   routes=await this.calculate(request);
   if(guides.length&&!routes.slice(0,3).some(route=>this.guideCount(route,guides)===guides.length)){
    try{
     onProgress({phase:"stops",requests,received:routes.length});
     const via=[...new Set((await Promise.all(guides.map(flag=>this.stopNear(flag,signal)))).filter(Boolean))];
     if(via.length){
      onProgress({phase:"request",requests:++requests,received:routes.length});
      const guided=await this.calculate({...request,via});
      if(guided.length)routes=guided;
     }
    }catch(error){if(signal.aborted)throw error;}
   }
   onProgress({phase:"review",requests,received:routes.length});
   return {selected:0,journeys:routes.slice(0,3).map(route=>({...route,transfers:transitTransfers(route),
    guideCount:this.guideCount(route,guides)}))};
  }
  guideCount(route,guides){
   return assignGuides(route.legs,guides).flat().filter(guide=>guide.meters<=guide.radius).length;
  }
  async continueJourney(journey,{index,delay,target,origin,query,signal}){
   const leg=journey.legs[index];
   if(!leg||walking(leg.mode))return null;
   const transfer=journey.transfers.find(item=>item.leg.index===index);
   const backwards=query.arriveBy;
   const stop=backwards?leg.from:transfer?.previous.to;
   if(!stop?.stopId)return null;
   const branch=transfer?transfer.previous.index+1:index;
   const originalWalk=journey.legs.slice(branch,index);
   const retained=backwards?journey.legs.slice(index):journey.legs.slice(0,branch);
   const scheduled=Date.parse(leg.from?.scheduledDeparture);
   const planned=Number.isFinite(scheduled)?scheduled:leg.start;
   const deadline=backwards?Math.min(planned,leg.start)-delay*minute:
    Math.max(retained.at(-1).end,planned+delay*minute);
   const routes=await this.calculate({waypoints:backwards?[origin,{stopId:stop.stopId}]:[{stopId:stop.stopId},target],
    signal,query:{time:deadline,arriveBy:backwards,searchMinutes:120,itineraryLimit:3}});
   for(const route of routes){
    if(!route.legs.length||(backwards?route.end>deadline:route.start<deadline))continue;
    const before=backwards?route.legs:retained;
    const after=backwards?retained:route.legs;
    const transition=joinTransfer(before,after,originalWalk);
    if(!transition)continue;
    const legs=[...before,...transition,...after].map((item,i)=>({...item,index:i}));
    const start=legs[0].start,end=legs.at(-1).end;
    const revised={start,end,legs,durationSeconds:(end-start)/1000,
     distanceMeters:legs.reduce((sum,item)=>sum+item.distanceMeters,0)};
    return {branch:backwards?0:branch,journey:{...revised,transfers:transitTransfers(revised)}};
   }
   return null;
  }
 }
 root.Pin2MapTransitRouteSearch=TransitRouteSearch;
 if(typeof module!=="undefined"&&module.exports)module.exports=TransitRouteSearch;
})(typeof window!=="undefined"?window:globalThis);
