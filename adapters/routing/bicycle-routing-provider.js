"use strict";
/* Valhalla costing determines access and ranks active-travel alternatives.
 * Elevation enrichment is optional and never decides route availability. */
(function(root){
 const {valhallaTrip,jsonOrThrow}=root.Pin2MapCarRouting||
  (typeof module!=="undefined"?require("./car-routing-provider.js"):{});
 const BICYCLES=Object.freeze({everyday:"Hybrid",gravel:"Cross",mountain:"Mountain",road:"Road"});
 const CHARACTERS=Object.freeze({balanced:{},cycleways:{use_roads:0},flat:{use_hills:0}});
 const FOOT_PROFILES=Object.freeze({
  normal:{},shortest:{shortest:true},stroll:{walkway_factor:.55,walking_speed:4.2},
  hike:{max_hiking_difficulty:3,walkway_factor:.65,walking_speed:4},
  accessible:{type:"wheelchair",use_hills:0}
 });
 function costingOptions(mode,profile,character){
  if(mode==="bicycle")return {
   bicycle_type:BICYCLES[profile]||BICYCLES.everyday,...CHARACTERS[character]
  };
  return {walkway_factor:.75,sidewalk_factor:.9,...FOOT_PROFILES[profile]};
 }
 function ascentMeters(edges){
  let ascent=0,previousHeight,known=false;
  for(const edge of edges||[]){
   if(edge.use==="ferry"){previousHeight=undefined;continue;}
   const height=edge.mean_elevation;
   const hasHeight=Number.isFinite(height)&&height>-1000;
   if(hasHeight&&Number.isFinite(edge.weighted_grade)&&Number.isFinite(edge.length)){
    ascent+=Math.max(0,edge.weighted_grade)*edge.length*10;
    known=true;
   }else if(hasHeight&&previousHeight!==undefined){
    ascent+=Math.max(0,height-previousHeight);
    known=true;
   }
   previousHeight=hasHeight?height:undefined;
  }
  return known?ascent:null;
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
  async estimateAscent(trip,options,signal){
   try{
    const timeout=AbortSignal.timeout?.(5500);
    const pending=signal&&timeout&&AbortSignal.any?AbortSignal.any([signal,timeout]):signal||timeout;
    const traces=await Promise.all(trip.legs.map(leg=>this.request("trace_attributes",{
     encoded_polyline:leg.shape,shape_match:"edge_walk",...options,
     filters:{action:"include",attributes:["edge.use","edge.length","edge.weighted_grade","edge.mean_elevation"]}
    },pending)));
    return ascentMeters(traces.flatMap(trace=>trace.edges||[]));
   }catch(error){
    if(signal?.aborted)throw error;
    return null;
   }
  }
  async calculate({waypoints,shapePoints=[],activeProfile,character,signal}={}){
   const mode=this.mode,bicycle=mode==="bicycle";
   const profile=activeProfile||(bicycle?"everyday":"normal");
   const points=[waypoints[0],...shapePoints,waypoints[1]];
   const options={costing:mode,costing_options:{[mode]:costingOptions(mode,profile,character)}};
   const data=await this.request("route",{
    locations:points.map((p,i)=>({lat:p.lat,lon:p.lng,...(i&&i<points.length-1?{type:"through"}:{})})),
    ...options,directions_type:"maneuvers",units:"kilometers",alternates:shapePoints.length?0:2
   },signal);
   const best=valhallaTrip(data?.trip,{mode,profile});
   const candidates=[{route:best,trip:data.trip}];
   const seen=new Set([JSON.stringify(best.geometry.coordinates)]);
   for(const entry of data?.alternates||[]){
    let route;
    try{route=valhallaTrip(entry.trip,{mode,profile});}
    catch{continue;}
    const key=JSON.stringify(route.geometry.coordinates);
    if(seen.has(key))continue;
    seen.add(key);
    candidates.push({route,trip:entry.trip});
    if(candidates.length===3)break;
   }
   const [primary,...alternatives]=await Promise.all(candidates.map(async({route,trip})=>({
    ...route,ascentMeters:bicycle?await this.estimateAscent(trip,options,signal):null
   })));
   return {...primary,alternatives};
  }
 }
 class BicycleRoutingProvider extends ValhallaActiveTravelProvider{
  constructor(options){super({...options,mode:"bicycle"});}
 }
 class PedestrianRoutingProvider extends ValhallaActiveTravelProvider{
  constructor(options){super({...options,mode:"pedestrian"});}
 }
 const api=Object.freeze({BicycleRoutingProvider,PedestrianRoutingProvider,ascentMeters,costingOptions});
 root.Pin2MapBicycleRouting=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
