"use strict";
(function(root){
 const {jsonOrThrow,decodePolyline6}=root.Pin2MapCarRouting||
  (typeof module!=="undefined"?require("./car-routing-provider.js"):{});
 const {distance:groundDistanceMeters}=root.Pin2MapActiveCarRoute||
  (typeof module!=="undefined"?require("../../domain/active-car-route.js"):{});
 const {walking,paddedTransfer}=root.Pin2MapTransitJourney||
  (typeof module!=="undefined"?require("../../domain/transit-journey.js"):{});
 function serviceName(leg){
  return leg.displayName||leg.tripShortName||leg.routeShortName||leg.routeLongName||null;
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
 const validPoint=point=>point?.length===2&&point.every(Number.isFinite);
 const meters=(a,b)=>groundDistanceMeters(...[a,b].map(([lng,lat])=>({lat,lng})));
 function displayGeometry(leg,shape){
  if(walking(leg.mode))return {geometry:shape,geometryGaps:[]};
  const from=coordinate(leg.from),to=coordinate(leg.to);
  if(!shape)return {geometry:null,geometryGaps:[from,to].every(validPoint)?[[from,to]]:[]};
  let coordinates=shape.coordinates;
  const gaps=[];
  // Coarse rail shapes can begin with a detached sharp spike followed by a
  // multi-kilometre chord. Keep the remaining trace and show the gap as such.
  if(["RAIL","SUBURBAN","REGIONAL_RAIL","REGIONAL_FAST_RAIL","LONG_DISTANCE","HIGHSPEED_RAIL","NIGHT_RAIL","SUBWAY"].includes(leg.mode)&&
     coordinates.length>=3){
   const [a,b,c]=coordinates;
   const first=meters(a,b),next=meters(b,c),direct=meters(a,c);
   if(first>350&&next>2500&&direct*direct<first*first+next*next){
    gaps.push([a,c]);coordinates=coordinates.slice(2);
   }
  }
  for(const pair of [[from,shape.coordinates[0]],[shape.coordinates.at(-1),to]]){
   if(pair.every(validPoint)&&meters(...pair)>150)gaps.push(pair);
  }
  return {geometry:coordinates.length>=2?{...shape,coordinates}:null,geometryGaps:gaps};
 }
 const routedTransferFactor=1.67;
 function normalize(itinerary,transferFactor,additionalTransferTime){
  if(!itinerary?.legs?.length)return null;
  const legs=itinerary.legs.map((leg,index)=>{
   const start=Date.parse(leg.startTime),end=Date.parse(leg.endTime);
   const shape=geometry(leg);
   const points=shape?.coordinates.map(([lng,lat])=>({lat,lng}));
   const distance=points?points.slice(1).reduce((sum,point,i)=>sum+groundDistanceMeters(point,points[i]),0):
    Number.isFinite(leg.distance)&&leg.distance>0?leg.distance:null;
   return {index,mode:leg.mode,...displayGeometry(leg,shape),start,end,durationSeconds:(end-start)/1000,
    distanceMeters:distance??0,measured:distance!==null,tripId:leg.tripId,stayOnBoard:leg.interlineWithPreviousLeg,
    walkBaselineMinutes:walking(leg.mode)&&Number.isFinite(leg.duration)?
      Math.max(0,(leg.duration/60-additionalTransferTime)/transferFactor):undefined,
    cancelled:leg.cancelled,from:leg.from,to:leg.to,ferry:leg.mode==="FERRY",
    routeId:leg.routeId,directionId:leg.directionId,
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
   const transferFactor=query.moreTransferTime?paddedTransfer.factor:routedTransferFactor;
   const additionalTransferTime=query.moreTransferTime?paddedTransfer.additional:0;
   const plan=accessTime=>this.request("plan",{fromPlace:location(from),toPlace:location(to),
    time:new Date(query.time).toISOString(),arriveBy:String(query.arriveBy),searchWindow:(query.searchMinutes||60)*60,
    maxPreTransitTime:accessTime,maxPostTransitTime:accessTime,
    detailedLegs:true,detailedTransfers:true,directModes:"",
    transitModes:"RAIL,BUS,COACH,TRAM,FERRY,FUNICULAR,AERIAL_LIFT",
    language:"en",useRoutedTransfers:true,transferTimeFactor:transferFactor,
    ...(additionalTransferTime?{additionalTransferTime}:{}),
    ...(via.length?{via:via.join(",")}:{})},signal);
   const read=data=>{
    if(!Array.isArray(data.itineraries))throw new Error("Ungültige Fahrplanauskunft");
    return data.itineraries.map(item=>normalize(item,transferFactor,additionalTransferTime)).filter(Boolean);
   };
   const nearby=read(await plan(900));
   return nearby.length?nearby:read(await plan(1800));
  }
  async nextDeparture(leg,signal){
   if(!leg.from?.stopId||!leg.routeId||leg.directionId==null)return null;
   const after=Date.parse(leg.from.scheduledDeparture);
   const start=Number.isFinite(after)?after:leg.start;
   const data=await this.request("stoptimes",{stopId:leg.from.stopId,time:new Date(start).toISOString(),
    n:1,window:7200,mode:leg.mode,realtimeMode:"OFF",withAlerts:false},signal);
   const candidates=(data.stopTimes||[]).filter(event=>event.routeId===leg.routeId&&
    event.directionId===leg.directionId&&event.tripId&&event.tripId!==leg.tripId&&!event.cancelled&&!event.tripCancelled)
    .map(event=>({time:Date.parse(event.place?.scheduledDeparture||event.place?.departure),tripId:event.tripId}))
    .filter(event=>event.time>start&&event.time<=start+7200000)
    .sort((a,b)=>a.time-b.time);
   return candidates[0]||null;
  }
  async stopsNear(flag,radius,signal,modes){
   const lat=radius/111195,lng=lat/Math.max(.1,Math.cos(flag.lat*Math.PI/180));
   const stops=await this.request("map/stops",{min:(flag.lat-lat)+","+(flag.lng-lng),
    max:(flag.lat+lat)+","+(flag.lng+lng),grouped:true,...(modes?{modes}:{})},signal);
   return stops.filter(stop=>stop.stopId&&coordinate(stop).every(Number.isFinite))
    .map(stop=>({stop,distance:groundDistanceMeters(flag,{lat:stop.lat,lng:stop.lon})}))
    .filter(item=>item.distance<=radius)
    .sort((a,b)=>a.distance/(.25+(a.stop.importance||0))-b.distance/(.25+(b.stop.importance||0)))
    .map(item=>item.stop);
  }
  async stopNear(flag,signal){
   return (await this.stopsNear(flag,Math.max(1000,Math.min(25000,flag.radiusMeters||5000)),signal))[0]?.stopId;
  }
  async railAccess(pin,arrival,walk,signal){
   const [stop]=await this.stopsNear(pin,1300,signal,"RAIL");
   if(!stop)return null;
   const point={lat:stop.lat,lng:stop.lon};
   const origin={name:pin.name||"Adresse",lat:pin.lat,lon:pin.lng};
   const route=await walk({waypoints:arrival?[point,pin]:[pin,point],signal});
   if(!route.geometry||route.durationSeconds>1800||route.distanceMeters>2200)return null;
   return {point:{...point,stopId:stop.stopId},leg:{mode:"WALK",from:arrival?stop:origin,to:arrival?origin:stop,
    geometry:route.geometry,measured:true,durationSeconds:route.durationSeconds,distanceMeters:route.distanceMeters}};

  }
 }
 root.Pin2MapTransitRoutingProvider=TransitRoutingProvider;
 if(typeof module!=="undefined"&&module.exports)module.exports=TransitRoutingProvider;
})(typeof window!=="undefined"?window:globalThis);
