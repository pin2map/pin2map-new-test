"use strict";
/* Route use case. No DOM, Leaflet, project storage or HTTP implementation.
 * Each real pin leg is calculated independently to preserve duration/distance
 * and a distinct color. Soft guide flags are deliberately NOT hard waypoints.
 */
(function(root){
 const {TIME_FACTORS,validTimeFactor,timeMarkers,splitFerryLegs}=root.Pin2MapActiveCarRoute||
  (typeof module!=="undefined"?require("../domain/active-car-route.js"):{});
 const {assignGuides,candidates,selectLeg}=root.Pin2MapRouteGuideCorridor||
  (typeof module!=="undefined"?require("../domain/route-guide-corridor.js"):{});
 const ACTIVE_PROFILES={bicycle:["everyday","gravel","mountain","road"],
  pedestrian:["normal","shortest","stroll","hike","accessible"]};
 // Keep at most three full itineraries, including every required pin in each.
 function combineLegs(choices){
  let routes=[{rank:0,legs:[],seconds:0}];
  for(const options of choices){
   routes=routes.flatMap(route=>options.map((leg,index)=>({
    rank:route.rank+index,legs:[...route.legs,leg],seconds:route.seconds+leg.durationSeconds
   }))).sort((a,b)=>a.rank-b.rank||a.seconds-b.seconds).slice(0,3);
  }
  return routes.map(route=>itinerary(route.legs));
 }
 function itinerary(legs){
  const ascents=legs.map(leg=>leg.ascentMeters);
  return {legs:splitFerryLegs(legs),
   ascentMeters:ascents.length&&ascents.every(Number.isFinite)?ascents.reduce((sum,m)=>sum+m,0):null,
   distanceMeters:legs.reduce((sum,leg)=>sum+leg.distanceMeters,0),
   durationSeconds:legs.reduce((sum,leg)=>sum+leg.durationSeconds,0)};
 }
 function distinctRoutes(routes){
  const seen=new Set();
  return routes.filter(route=>{
   const key=JSON.stringify(route.geometry.coordinates);
   if(seen.has(key))return false;
   seen.add(key);return true;
  });
 }
 class CarRouteSession {
  constructor({plan,calculate,getPin,onChange,onError,getGuides=()=>[],transitSearch=null,onGuideWarning=()=>{},timeFactors={}}){
   if(!plan||[calculate,getPin,onChange,onError].some(x=>typeof x!=="function"))throw new TypeError("Route session ports required");
   Object.assign(this,{plan,calculate,getPin,onChange,onError,getGuides,transitSearch,onGuideWarning});
   this.mode="car";this.generation=0;this.pending=null;this.variants=[];this.selectedVariant=0;this.failed=false;this.loading=false;this.allVisibleActive=false;
   this.transitQuery={time:Date.now(),arriveBy:false,vehicle:"all"};
   this.transitJourneys=[];this.transitRecovery=null;
   this.activeProfiles={bicycle:"everyday",pedestrian:"normal"};this.routeCache=new Map();
   this.factors={...TIME_FACTORS};this.timeProfile="standard";
   for(const key of Object.keys(TIME_FACTORS))if(validTimeFactor(timeFactors[key]))this.factors[key]=timeFactors[key];
  }
  snapshot(){
   const factor=this.mode==="car"?this.factors[this.timeProfile]:1;
   const transit=this.mode==="transit";
   const selected=(transit?this.transitJourneys:this.variants)[this.selectedVariant];
   const legs=(selected?.legs||[]).map(leg=>({...leg,durationSeconds:leg.durationSeconds*(leg.ferry?1:factor)}));
   const variants=this.variants.length>1?this.variants.map(({ascentMeters,distanceMeters,durationSeconds})=>
    ({ascentMeters,distanceMeters,durationSeconds})):[];
   const route=this.plan.snapshot();
   return {...route,waypointIds:transit?[]:route.waypointIds,mode:this.mode,
    transit:transit?{query:this.transitQuery,journeys:this.transitJourneys,recovery:this.transitRecovery}:null,activeProfile:this.activeProfiles[this.mode],
    ascentMeters:selected?.ascentMeters??null,variants,selectedVariant:this.selectedVariant,failed:this.failed,allVisibleActive:this.allVisibleActive,legs,loading:this.loading,
    timeProfile:this.timeProfile,timeMarkers:transit?[]:timeMarkers(legs),
    distanceMeters:legs.reduce((s,l)=>s+l.distanceMeters,0),
    durationSeconds:legs.reduce((s,l)=>s+l.durationSeconds,0)};
  }
  setTimeProfile(profile){if(Object.hasOwn(TIME_FACTORS,profile)){this.timeProfile=profile;this.publish();}}
  setTimeFactors(factors){
   for(const key of Object.keys(TIME_FACTORS))if(validTimeFactor(factors[key]))this.factors[key]=factors[key];
   this.publish();
  }
  setMode(mode){
   if(!["car","bicycle","pedestrian","transit"].includes(mode)||mode===this.mode)return;
   this.mode=mode;this.failed=false;void this.recalculate();
  }
  setTransitQuery(query){
   if(this.mode!=="transit"||!Number.isFinite(query.time))return;
   this.transitQuery={...query};void this.recalculate();
  }
  async checkTransitRecovery(){
   this.recoveryRequest?.abort();
   this.transitRecovery=null;
   const journey=this.transitJourneys[this.selectedVariant];
   if(!journey?.critical||!this.transitQuery.arriveBy)return;
   const controller=new AbortController();
   this.recoveryRequest=controller;
   try{
    const to=this.getPin(this.plan.targetId);
    const result=await this.transitSearch.recovery(journey,to,this.transitQuery,controller.signal);
    if(!controller.signal.aborted)this.transitRecovery=result;
   }catch{if(!controller.signal.aborted)this.transitRecovery={unknown:true};}
   if(!controller.signal.aborted)this.publish();
  }
  setActiveProfile(profile){
   if(!ACTIVE_PROFILES[this.mode]?.includes(profile)||profile===this.activeProfiles[this.mode])return;
   this.activeProfiles[this.mode]=profile;void this.recalculate();
  }
  async calculateLeg(request){
   if(request.mode==="car")return this.calculate(request);
   const coords=points=>points.map(({lat,lng})=>[lat,lng]);
   const key=JSON.stringify([request.mode,request.activeProfile,coords(request.waypoints),
    coords(request.shapePoints||[])]);
   const cached=this.routeCache.get(key);
   this.routeCache.delete(key);
   if(cached&&cached.expires>Date.now()){
    this.routeCache.set(key,cached);
    return cached.route;
   }
   const route=await this.calculate(request);
   if(!request.signal.aborted){
    this.routeCache.set(key,{route,expires:Date.now()+15*60*1000});
    if(this.routeCache.size>40)this.routeCache.delete(this.routeCache.keys().next().value);
   }
   return route;
  }
  selectVariant(index){
   const transit=this.mode==="transit";
   if(!Number.isInteger(index)||!(transit?this.transitJourneys:this.variants)[index]||index===this.selectedVariant)return;
   this.selectedVariant=index;
   if(transit)void this.checkTransitRecovery();
   this.publish();
  }
  pinMoved(id){
   if(this.plan.ids().includes(id))return this.recalculate();
  }
  setOrder(order){
   if(!["fixed","optimal"].includes(order)||this.plan.order===order)return;
   this.plan.order=order;void this.recalculate();
  }
  publish(){this.onChange(this.snapshot());}
  cancel(){this.generation++;this.pending?.abort();this.recoveryRequest?.abort();this.pending=null;this.loading=false;}
  clear(){this.cancel();this.plan.reset();this.variants=[];this.transitJourneys=[];this.transitRecovery=null;this.failed=false;this.selectedVariant=0;this.allVisibleActive=false;this.publish();}
  async recalculate(){
   this.cancel();this.variants=[];this.transitJourneys=[];this.transitRecovery=null;this.selectedVariant=0;
   const transit=this.mode==="transit";
   this.plan.updateOrder(this.getPin);
   const ids=transit&&this.plan.ready()?[this.plan.startId,this.plan.targetId]:this.plan.ids();
   if(!ids.length){this.failed=false;this.publish();return;}
   const points=ids.map(this.getPin);
   if(points.some(p=>!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))){
    this.failed=true;this.onError("Ein Routen-Pin ist nicht mehr vorhanden.");this.publish();return;
   }
   const generation=this.generation,controller=new AbortController();this.pending=controller;this.loading=true;this.publish();
   const completed=[],choices=[];
   const guides=this.getGuides();
   const requestFor=i=>({mode:this.mode,waypoints:[points[i],points[i+1]],
    profile:this.plan.profile,activeProfile:this.activeProfiles[this.mode],avoidTolls:this.plan.avoidTolls,signal:controller.signal});
   try{
    if(transit){
     const result=await this.transitSearch.search({waypoints:points,guides:guides.slice(0,2),
      query:this.transitQuery,signal:controller.signal});
     if(generation!==this.generation)return;
     this.transitJourneys=result.journeys;
     this.selectedVariant=result.selected;
     const selected=this.transitJourneys[this.selectedVariant];
     this.failed=false;
     if(selected&&guides.length>selected.guideCount)this.onGuideWarning(guides.length-selected.guideCount);
     void this.checkTransitRecovery();
     return;
    }
    for(let i=0;i<points.length-1;i++){
     const result=await this.calculateLeg(requestFor(i));
     if(generation!==this.generation)return;
     const {alternatives=[],...primary}=result;
     const label=route=>({...route,fromId:ids[i],toId:ids[i+1]});
     completed.push(label(primary));
     choices.push([completed[i],...alternatives.map(label)]);
    }
    if(generation!==this.generation)return;
    const assigned=assignGuides(completed,guides);
    for(let i=0;i<completed.length;i++){
     if(ids[i]===ids[i+1])continue;
     const alternatives=choices[i].slice(1);
     for(const shapePoints of candidates(assigned[i])){
      try{
       const probe=await this.calculateLeg({...requestFor(i),shapePoints});
       alternatives.push({...probe,fromId:ids[i],toId:ids[i+1]});
      }
      catch{/* An optional corridor probe can fail while the baseline remains usable. */}
      if(generation!==this.generation)return;
     }
     const preferred=selectLeg(completed[i],alternatives,assigned[i]);
     if(this.mode!=="car")choices[i]=distinctRoutes([preferred,...choices[i],...alternatives]).slice(0,3);
     completed[i]=preferred;
    }
    this.variants=this.mode==="car"?[itinerary(completed)]:combineLegs(choices);
    this.failed=false;
    if(guides.length){
     const missed=assignGuides(completed,guides).flat().filter(guide=>guide.meters>guide.radius).length;
     if(missed)this.onGuideWarning(missed);
    }
   }catch(error){
    if(generation!==this.generation)return;
    if(!controller.signal.aborted){this.failed=true;this.onError(({car:"Autoroute",bicycle:"Fahrradroute",pedestrian:"Fußroute",transit:"ÖPNV-Verbindung"}[this.mode])+" konnte nicht berechnet werden: "+String(error?.message||error));}
   }finally{
    if(generation===this.generation){this.loading=false;this.pending=null;this.publish();}
   }
  }
  endpoint(kind,id){this.plan.toggleEndpoint(kind,id);this.allVisibleActive=false;void this.recalculate();}
  waypoint(id){if(this.mode==="transit")return;if(this.plan.removeWaypoint(id)||this.plan.addWaypoint(id)){this.allVisibleActive=false;void this.recalculate();}else this.publish();}
  removeWaypoint(id){if(this.plan.removeWaypoint(id)){this.allVisibleActive=false;void this.recalculate();}}
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
