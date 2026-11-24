"use strict";
/* Valhalla supplies alternatives. We validate their matched network edges
 * before ranking bicycle and pedestrian routes. */
(function(root){
 const {valhallaTrip,jsonOrThrow}=root.Pin2MapCarRouting||
  (typeof module!=="undefined"?require("./car-routing-provider.js"):{});
 const smallRoads=new Set(["tertiary","unclassified","residential","service_other"]);
 const separatePaths=new Set(["cycleway","path","footway","pedestrian","bridleway","track","steps",
  "sidewalk","pedestrian_crossing","ferry"]);
 const fields=["use","road_class","lane_count","traversability","cycle_lane","length",
  "weighted_grade","mean_elevation","max_upward_grade","max_downward_grade"];
 const walkingPaths=new Set(["footway","pedestrian","path","sidewalk","pedestrian_crossing","steps"]);
 function edgeStats(edges,mode="bicycle"){
  if(!Array.isArray(edges)||!edges.length)return null;
  let ascent=0,steepness=0,total=0,cycleDistance=0,walkingDistance=0,multiLaneDistance=0,previousHeight,knownGrade=0;
  for(const edge of edges){
   const {use,road_class:roadClass,lane_count:lanes,traversability}=edge;
   const path=separatePaths.has(use);
   const length=Number(edge.length);
   if(!use||!Number.isFinite(length)||length<0)return null;
   if(mode==="bicycle"){
    if(use==="steps"||(!path&&(!smallRoads.has(roadClass)||use==="ramp"||
     !Number.isInteger(lanes)||lanes<1)))return null;
    if(!path&&lanes>(traversability==="both"?2:1))multiLaneDistance+=length;
   }
   if(walkingPaths.has(use))walkingDistance+=length;
   total+=length;
   if(use==="cycleway"||edge.cycle_lane==="separated")cycleDistance+=length;
   if(use==="ferry"){previousHeight=undefined;continue;}
   const elevation=edge.mean_elevation;
   const hasElevation=Number.isFinite(elevation)&&elevation>-1000;
   if(Number.isFinite(edge.weighted_grade)){
    ascent+=Math.max(0,edge.weighted_grade)*length*10;
    knownGrade+=length;
   }else if(hasElevation&&previousHeight!==undefined){
    ascent+=Math.max(0,elevation-previousHeight);
    knownGrade+=length;
   }
   previousHeight=hasElevation?elevation:undefined;
   steepness=Math.max(steepness,edge.max_upward_grade||0,Math.abs(edge.max_downward_grade||0));
  }
  if(!total)return null;
  return {ascentMeters:knownGrade?ascent:null,maxGrade:knownGrade?steepness:null,cycleShare:cycleDistance/total,walkingDistanceMeters:walkingDistance*1000,multiLaneMeters:multiLaneDistance*1000};
 }
 const score=value=>Number.isFinite(value)?value:Infinity;
 function compareBicycleRoutes(a,b){
  return (a.multiLaneMeters||0)-(b.multiLaneMeters||0)||score(a.ascentMeters)-score(b.ascentMeters)||score(a.maxGrade)-score(b.maxGrade)||
   b.cycleShare-a.cycleShare||a.durationSeconds-b.durationSeconds;
 }
 // Time spent on footpaths is discounted by a quarter in the comparison.
 // This favors dedicated paths without overriding a large detour.
 function compareWalkingRoutes(a,b){
  const cost=route=>route.durationSeconds*(1-.25*Math.min(1,route.walkingDistanceMeters/route.distanceMeters));
  return cost(a)-cost(b)||a.durationSeconds-b.durationSeconds;
 }
 class ValhallaActiveTravelProvider{
  constructor({fetchImpl,base="https://valhalla1.openstreetmap.de/",mode}){
   this.fetch=fetchImpl;this.base=base;this.mode=mode;
  }
  request(path,data,signal){
   return jsonOrThrow(this.fetch,new URL(path,this.base).toString(),{
    method:"POST",mode:"cors",signal,headers:{"Content-Type":"application/json","X-Client-Id":"pin2map-new-active-travel-routing"},
    body:JSON.stringify(data)
   });
  }
  async calculate({waypoints,shapePoints=[],signal}={}){
   const mode=this.mode;
   const bicycle=mode==="bicycle";
   const points=[waypoints[0],...shapePoints,waypoints[1]];
   const request={locations:points.map((p,i)=>({lat:p.lat,lon:p.lng,...(i&&i<points.length-1?{type:"through"}:{})})),
    costing:mode,costing_options:{[mode]:bicycle?{bicycle_type:"Hybrid",use_roads:0,use_hills:0}:
     {walkway_factor:.75,sidewalk_factor:.9,alley_factor:1.05}},
    directions_type:"maneuvers",units:"kilometers",alternates:shapePoints.length?0:2};
   const data=await this.request("route",request,signal);
   const accepted=[];
   let verificationFailed=false;
   for(const trip of [data?.trip,...(data?.alternates||[]).map(option=>option.trip)].filter(Boolean)){
    try{
     const route=valhallaTrip(trip,{mode,profile:bicycle?"cycle":"walk"});
     const edges=[];
     for(const leg of trip.legs){
      const result=await this.request("trace_attributes",{
       encoded_polyline:leg.shape,shape_match:"edge_walk",costing:mode,
       filters:{action:"include",attributes:fields.map(field=>"edge."+field)}
      },signal);
      if(!Array.isArray(result.edges)||!result.edges.length)throw new Error("Keine prüfbaren Straßenattribute");
      edges.push(...result.edges);
     }
     const stats=edgeStats(edges,mode);
     if(stats)accepted.push({...route,...stats});
    }catch(error){
     if(signal?.aborted)throw error;
     verificationFailed=true;
    }
   }
   if(!accepted.length)throw new Error(verificationFailed?
    "Route konnte nicht vollständig anhand der Wegdaten geprüft werden.":
    bicycle?"Keine geprüfte Fahrradroute ohne große Straßen gefunden.":"Keine geprüfte Fußroute gefunden.");
   return accepted.sort(bicycle?compareBicycleRoutes:compareWalkingRoutes)[0];
  }
 }
 class BicycleRoutingProvider extends ValhallaActiveTravelProvider{
  constructor(options){super({...options,mode:"bicycle"});}
 }
 class PedestrianRoutingProvider extends ValhallaActiveTravelProvider{
  constructor(options){super({...options,mode:"pedestrian"});}
 }
 const api=Object.freeze({BicycleRoutingProvider,PedestrianRoutingProvider,edgeStats,compareBicycleRoutes});
 root.Pin2MapBicycleRouting=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
