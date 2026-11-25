"use strict";
/*
 * pin2map car-route provider adapters: no UI, maps, storage or application state.
 * The core RoutingService calls calculate({waypoints,profile,avoidTolls}).
 * Coordinates are {lat,lng} WGS84; resulting GeoJSON coordinates are [lng,lat].
 * Public demo hosts are externally operated, without availability guarantees.
 */
(function(root){
 const PROFILES=Object.freeze({FAST:"fast",COUNTRY:"country",SCENIC:"scenic",NO_HIGHWAYS:"no-highways"});
 const allowed=Object.freeze(Object.values(PROFILES));
 const URLS=Object.freeze({
  osrm:"https://router.project-osrm.org/route/v1/driving/",
  valhalla:"https://valhalla1.openstreetmap.de/route?json="
 });
 function point(p){
  if(!p||typeof p!=="object"||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||
    p.lat < -90||p.lat > 90||p.lng < -180||p.lng > 180)
   throw new RangeError("Routing point requires valid {lat,lng} WGS84 coordinates");
  return {lat:p.lat,lng:p.lng};
 }
 function decodePolyline6(encoded,precision=6){
  if(typeof encoded!=="string"||!encoded.length)throw new TypeError("Missing Valhalla polyline");
  let lat=0,lng=0,i=0;
  const coords=[];
  while(i<encoded.length){
   const delta=[];
   for(let c=0;c<2;c++){
    let shift=0,val=0,b;
    do{
     if(i>=encoded.length||shift>=35)throw new Error("Invalid Valhalla polyline6");
     b=encoded.charCodeAt(i++)-63;
     if(b<0||b>63)throw new Error("Invalid Valhalla polyline6");
     val+=(b&31)*Math.pow(2,shift);
     shift+=5;
    }while(b>=32);
    delta.push(val&1?-(Math.floor(val/2)+1):Math.floor(val/2));
   }
   lat+=delta[0];lng+=delta[1];
   const scale=10**precision;
   const x=lng/scale,y=lat/scale;
   if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>180||Math.abs(y)>90)
    throw new Error("Invalid Valhalla geometry coordinates");
   coords.push([x,y]);
  }
  if(coords.length<2)throw new Error("Valhalla returned too few geometry points");
  return coords;
 }
 function normalized(provider,profile,coords,distanceMeters,durationSeconds,details={}){
  if(!Array.isArray(coords)||coords.length<2||!coords.every(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite)))
   throw new Error("Routing response has invalid geometry");
  if(!Number.isFinite(distanceMeters)||distanceMeters<0||!Number.isFinite(durationSeconds)||durationSeconds<0)
   throw new Error("Routing response has invalid distance/duration");
  return {mode:"car",profile,provider,geometry:{type:"LineString",coordinates:coords.map(p=>p.slice(0,2))},
   distanceMeters,durationSeconds,...details};
 }
 async function jsonOrThrow(fetchImpl,url,options){
  let response;
  try{response=await fetchImpl(url,options)}
  catch(err){throw new Error("Routing network request failed: "+(err?.message||"unreachable"))}
  if(!response||typeof response.ok!=="boolean")throw new Error("Routing provider returned invalid response");
  if(!response.ok){
   let reason="";
   try{const body=await response.json();reason=String(body?.error||body?.message||body?.status_message||"").slice(0,180)}
   catch{}
   throw new Error("Routing provider HTTP "+response.status+(reason?": "+reason:""));
  }
  try{return await response.json()}
  catch{throw new Error("Routing provider returned invalid JSON")}
 }
 class CarRoutingProvider{
  constructor({fetchImpl,osrmBase=URLS.osrm,valhallaBase=URLS.valhalla}={}){
   if(typeof fetchImpl!=="function")throw new TypeError("Explicit fetch implementation required");
   this.fetchImpl=fetchImpl;
   this.osrmBase=osrmBase;
   this.valhallaBase=valhallaBase;
  }
  async calculate({waypoints,shapePoints=[],profile=PROFILES.FAST,avoidTolls=false,signal}={}){
   if(!allowed.includes(profile))throw new RangeError("Unknown car profile");
   if(!Array.isArray(waypoints)||waypoints.length<2||waypoints.length>25)
    throw new RangeError("Routing requires 2–25 ordered waypoints");
   if(!Array.isArray(shapePoints)||(shapePoints.length&&(waypoints.length!==2||shapePoints.length>23)))
    throw new RangeError("Shaping points require one hard route leg");
   const points=waypoints.map(point);
   if(shapePoints.length)points.splice(1,0,...shapePoints.map(point));
   if(typeof avoidTolls!=="boolean")throw new TypeError("avoidTolls must be boolean");
   if(profile===PROFILES.SCENIC&&avoidTolls)
    throw new RangeError("Toll exclusion with motorcycle-derived scenic profile is not yet validated");
   if(profile===PROFILES.FAST&&!avoidTolls){
    const coordText=points.map(p=>p.lng+","+p.lat).join(";");
    const url=this.osrmBase+coordText+"?overview=full&geometries=geojson&alternatives=false&steps=true"+
     (shapePoints.length?"&waypoints=0;"+(points.length-1):"");
    const data=await jsonOrThrow(this.fetchImpl,url,{mode:"cors",signal});
    const route=data?.routes?.[0];
    if(!route||route.geometry?.type!=="LineString")
     throw new Error("OSRM returned no usable route");
    return normalized("osrm",profile,route.geometry.coordinates,route.distance,route.duration,{avoidTolls:false,timeSections:route.legs?.flatMap(leg=>(leg.steps||[]).map(step=>({coordinates:step.geometry?.coordinates,seconds:step.duration,
      distanceMeters:step.distance,ferry:step.mode==="ferry",ferryName:step.mode==="ferry"?step.name:undefined})))});
   }
   // The selected soft country-road profile is a tentative parameter (0.35)
   // derived from the user's route-lab comparisons, not a universal guarantee.
   const costing=profile===PROFILES.SCENIC?"motorcycle":"auto";
   const options=profile===PROFILES.SCENIC?
    {use_curvature:0.85,use_trails:0,use_highways:0.5}:
    profile===PROFILES.COUNTRY?{use_highways:0.35}:
    profile===PROFILES.NO_HIGHWAYS?{exclude_highways:true}:{};
   if(avoidTolls)options.exclude_tolls=true;
   const payload={locations:points.map((p,i)=>({lat:p.lat,lon:p.lng,
    ...(shapePoints.length&&i>0&&i<points.length-1?{type:"through"}:{})})),
    costing,costing_options:{[costing]:options},directions_type:"maneuvers",units:"kilometers"};
   const url=this.valhallaBase+encodeURIComponent(JSON.stringify(payload));
   const data=await jsonOrThrow(this.fetchImpl,url,{
    mode:"cors",signal,headers:{"X-Client-Id":"pin2map-new-car-routing"}
   });
   return valhallaTrip(data?.trip,{profile,avoidTolls,mode:"car"});
  }
 }
 function valhallaTrip(trip,{profile,avoidTolls=false,mode}){
   if(!trip?.legs?.length||!trip?.summary)
    throw new Error("Valhalla returned no usable route");
   const coords=[],timeSections=[];
   for(const leg of trip.legs){
    const each=decodePolyline6(leg.shape);
    coords.push(...(coords.length?each.slice(1):each));
    // Maneuver types 28 and 29 mark boarding and returning to the road.
    let ferry=false,ferryName;
    for(const step of leg.maneuvers||[]){
     if(step.type===28){ferry=true;ferryName=step.street_names?.[0];}
     else if(step.type===29){ferry=false;ferryName=undefined;}
     timeSections.push({
      coordinates:each.slice(step.begin_shape_index,step.end_shape_index+1),
      seconds:step.time,distanceMeters:step.length*1000,ferry,ferryName
     });
    }
   }
   return {...normalized("valhalla",profile,coords,
    trip.summary.length*1000,trip.summary.time,{
     timeSections,avoidTolls,tollAvoidance:avoidTolls?"exclude-requested":"not-requested",
     motorcycleModel:profile===PROFILES.SCENIC,
     reportedToll:trip.summary.has_toll??null
    }),mode};
 }
 const api=Object.freeze({PROFILES,CarRoutingProvider,decodePolyline6,valhallaTrip,jsonOrThrow});
 root.Pin2MapCarRouting=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
