"use strict";
/* Valhalla supplies alternatives. We validate their matched network edges
 * before displaying any geometry in the bicycle mode. */
(function(root){
 const {valhallaTrip,jsonOrThrow}=root.Pin2MapCarRouting||
  (typeof module!=="undefined"?require("./car-routing-provider.js"):{});
 const smallRoads=new Set(["tertiary","unclassified","residential","service_other"]);
 const separatePaths=new Set(["cycleway","path","footway","pedestrian","bridleway","track","steps",
  "sidewalk","pedestrian_crossing","ferry"]);
 const fields=["use","road_class","lane_count","traversability","cycle_lane","length",
  "weighted_grade","mean_elevation","max_upward_grade","max_downward_grade"];
 function edgeStats(edges){
  if(!Array.isArray(edges)||!edges.length)return null;
  let ascent=0,steepness=0,total=0,cycleDistance=0,previousHeight,knownGrade=0;
  for(const edge of edges){
   const {use,road_class:roadClass,lane_count:lanes,traversability}=edge;
   const path=separatePaths.has(use);
   const length=Number(edge.length);
   if(!use||!Number.isFinite(length)||length<0||use==="steps")return null;
   if(!path&&(!smallRoads.has(roadClass)||use==="ramp"||
    !Number.isInteger(lanes)||lanes<1||lanes>(traversability==="both"?2:1)))return null;
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
  return {ascentMeters:knownGrade?ascent:null,maxGrade:knownGrade?steepness:null,cycleShare:cycleDistance/total};
 }
 const score=value=>Number.isFinite(value)?value:Infinity;
 function compareBicycleRoutes(a,b){
  return score(a.ascentMeters)-score(b.ascentMeters)||score(a.maxGrade)-score(b.maxGrade)||
   b.cycleShare-a.cycleShare||a.durationSeconds-b.durationSeconds;
 }
 class BicycleRoutingProvider{
  constructor({fetchImpl,base="https://valhalla1.openstreetmap.de/"}){
   this.fetch=fetchImpl;this.base=base;
  }
  request(path,data,signal){
   return jsonOrThrow(this.fetch,new URL(path,this.base).toString(),{
    method:"POST",mode:"cors",signal,headers:{"Content-Type":"application/json","X-Client-Id":"pin2map-new-bicycle-routing"},
    body:JSON.stringify(data)
   });
  }
  async calculate({waypoints,shapePoints=[],signal}={}){
   const points=[waypoints[0],...shapePoints,waypoints[1]];
   const request={locations:points.map((p,i)=>({lat:p.lat,lon:p.lng,...(i&&i<points.length-1?{type:"through"}:{})})),
    costing:"bicycle",costing_options:{bicycle:{bicycle_type:"Hybrid",use_roads:0,use_hills:0}},
    directions_type:"maneuvers",units:"kilometers",alternates:shapePoints.length?0:2};
   const data=await this.request("route",request,signal);
   const accepted=[];
   let verificationFailed=false;
   for(const trip of [data?.trip,...(data?.alternates||[]).map(option=>option.trip)].filter(Boolean)){
    try{
     const route=valhallaTrip(trip,{mode:"bicycle",profile:"cycle"});
     const edges=[];
     for(const leg of trip.legs){
      const result=await this.request("trace_attributes",{
       encoded_polyline:leg.shape,shape_match:"edge_walk",costing:"bicycle",
       filters:{action:"include",attributes:fields.map(field=>"edge."+field)}
      },signal);
      if(!Array.isArray(result.edges)||!result.edges.length)throw new Error("Keine prüfbaren Straßenattribute");
      edges.push(...result.edges);
     }
     const stats=edgeStats(edges);
     if(stats)accepted.push({...route,...stats});
    }catch(error){
     if(signal?.aborted)throw error;
     verificationFailed=true;
    }
   }
   if(!accepted.length)throw new Error(verificationFailed?
    "Fahrradroute konnte nicht vollständig auf Straßen und Fahrspuren geprüft werden.":
    "Keine geprüfte Fahrradroute ohne große oder mehrspurige Straßen gefunden.");
   return accepted.sort(compareBicycleRoutes)[0];
  }
 }
 const api=Object.freeze({BicycleRoutingProvider,edgeStats,compareBicycleRoutes});
 root.Pin2MapBicycleRouting=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
