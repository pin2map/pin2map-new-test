"use strict";
(function(root){
 const {jsonOrThrow,decodePolyline6}=root.Pin2MapCarRouting||
  (typeof module!=="undefined"?require("./car-routing-provider.js"):{});
 const {distance:groundDistanceMeters}=root.Pin2MapActiveCarRoute||
  (typeof module!=="undefined"?require("../../domain/active-car-route.js"):{});
 const {walking,paddedTransfer}=root.Pin2MapTransitJourney||
  (typeof module!=="undefined"?require("../../domain/transit-journey.js"):{});
 function serviceName(leg){
  const line=leg.routeShortName||leg.routeLongName;
  const trip=leg.tripShortName;
  const label=leg.displayName;
  if(label&&(!line||label.includes(line))&&(!trip||label.includes(trip)))return label;
  if(line&&trip&&!line.includes(trip)){
   const category=leg.category?.shortName||leg.category?.name;
   const train=["HIGHSPEED_RAIL","LONG_DISTANCE","NIGHT_RAIL"].includes(leg.mode);
   if(train&&category)return trip.startsWith(category)?trip:category+" "+trip;
  }
  return line||label||trip||null;
 }
 const location=point=>point.stopId||point.lat+","+point.lng;
 const coordinate=place=>[place?.lon,place?.lat];
 function geometry(leg){
  const shape=leg.legGeometry;
  if(!shape?.points||![6,7].includes(shape.precision??6))return null;
  try{
   const coordinates=decodePolyline6(shape.points,shape.precision??6);
   return {type:"LineString",coordinates};
  }catch{return null;}
 }
 function normalize(itinerary,padded){
  if(!itinerary?.legs?.length)return null;
  const legs=itinerary.legs.map((leg,index)=>{
   const start=Date.parse(leg.startTime),end=Date.parse(leg.endTime);
   const shape=geometry(leg);
   const points=shape?.coordinates.map(([lng,lat])=>({lat,lng}));
   const distance=points?points.slice(1).reduce((sum,point,i)=>sum+groundDistanceMeters(point,points[i]),0):
    Number.isFinite(leg.distance)&&leg.distance>0?leg.distance:null;
   return {index,mode:leg.mode,geometry:shape,start,end,durationSeconds:(end-start)/1000,
    distanceMeters:distance??0,measured:distance!==null,tripId:leg.tripId,stayOnBoard:leg.interlineWithPreviousLeg,
    walkBaselineMinutes:walking(leg.mode)&&padded&&Number.isFinite(leg.duration)?
      Math.max(0,(leg.duration/60-paddedTransfer.additional)/paddedTransfer.factor):undefined,
    cancelled:leg.cancelled,from:leg.from,to:leg.to,ferry:leg.mode==="FERRY",
    line:serviceName(leg),headsign:leg.headsign||leg.tripTo?.name,operator:leg.agencyName};
  });
  if(legs.some(leg=>!Number.isFinite(leg.start)||!Number.isFinite(leg.end)||leg.end<leg.start||leg.cancelled))return null;
  const start=Date.parse(itinerary.startTime),end=Date.parse(itinerary.endTime);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return null;
  return {start,end,legs,durationSeconds:(end-start)/1000,transfers:itinerary.transfers,
   distanceMeters:legs.reduce((sum,leg)=>sum+leg.distanceMeters,0)};
 }
 class TransitRoutingProvider{
  constructor({fetchImpl,base="https://api.transitous.org/api/v6/"}){this.fetch=fetchImpl;this.base=base;}
  request(path,params,signal){
   const url=new URL(path,this.base);url.search=new URLSearchParams(params);
   return jsonOrThrow(this.fetch,url.href,{signal,headers:{Accept:"application/json"}});
  }
  async calculate({waypoints,query,via=[],signal}){
   const [from,to]=waypoints;
   const data=await this.request("plan",{fromPlace:location(from),toPlace:location(to),
    time:new Date(query.time).toISOString(),arriveBy:String(query.arriveBy),searchWindow:3600,
    numItineraries:5,maxItineraries:12,detailedLegs:true,detailedTransfers:true,directModes:"",
    transitModes:({all:"RAIL,BUS,COACH,TRAM,FERRY,FUNICULAR,AERIAL_LIFT",rail:"RAIL",bus:"BUS,COACH"})[query.vehicle||"all"],
    ...(query.moreTransferTime?{transferTimeFactor:paddedTransfer.factor,additionalTransferTime:paddedTransfer.additional}:{}),
    ...(via.length?{via:via.join(",")}:{})},signal);
   if(!Array.isArray(data.itineraries))throw new Error("Ungültige Fahrplanauskunft");
   return data.itineraries.map(item=>normalize(item,query.moreTransferTime)).filter(Boolean);
  }
  async stopNear(flag,signal){
   const radius=Math.max(1000,Math.min(25000,flag.radiusMeters||5000));
   const lat=radius/111195,lng=lat/Math.max(.1,Math.cos(flag.lat*Math.PI/180));
   const stops=await this.request("map/stops",{min:(flag.lat-lat)+","+(flag.lng-lng),
    max:(flag.lat+lat)+","+(flag.lng+lng),grouped:true},signal);
   return stops.filter(stop=>stop.stopId&&coordinate(stop).every(Number.isFinite))
    .map(stop=>({stop,distance:groundDistanceMeters(flag,{lat:stop.lat,lng:stop.lon})}))
    .filter(item=>item.distance<=radius)
    .sort((a,b)=>a.distance/(.25+(a.stop.importance||0))-b.distance/(.25+(b.stop.importance||0)))[0]?.stop.stopId;
  }
 }
 root.Pin2MapTransitRoutingProvider=TransitRoutingProvider;
 if(typeof module!=="undefined"&&module.exports)module.exports=TransitRoutingProvider;
})(typeof window!=="undefined"?window:globalThis);
