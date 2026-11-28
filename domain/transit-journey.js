"use strict";
(function(root){
 const walking=mode=>["WALK","FOOT"].includes(mode);
 const bus=mode=>["BUS","COACH"].includes(mode);
 const reserve=mode=>["HIGHSPEED_RAIL","LONG_DISTANCE","NIGHT_RAIL","COACH","FERRY"].includes(mode)?15:
  ["TRAM","SUBWAY","METRO"].includes(mode)?3:8;
 const formatter=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit"});
 const day=time=>formatter.format(new Date(time));
 const paddedTransfer={factor:2,additional:5};
 const localRail=mode=>["TRAM","SUBWAY","METRO"].includes(mode);
 const regionalRail=mode=>["SUBURBAN","REGIONAL_RAIL","REGIONAL_FAST_RAIL"].includes(mode);
 const longRail=mode=>["HIGHSPEED_RAIL","LONG_DISTANCE","NIGHT_RAIL"].includes(mode);
 function stuttgartTransfer(previous,next){
  const origin=previous.to,destination=next.from;
  return localRail(previous.mode)&&longRail(next.mode)&&(
   /klett.platz/i.test(origin?.name||"")||
   (Math.abs(origin?.lat-48.784)<.006&&Math.abs(origin?.lon-9.183)<.010&&
    Math.abs(destination?.lat-48.784)<.006&&Math.abs(destination?.lon-9.183)<.010));
 }
 function realisticWalk(previous,next,legs,referenceWalkMeters){
  const origin=previous.to,destination=next.from;
  const matchingPlace=origin?.stopId&&origin.stopId===destination?.stopId;
  const matchingPlatform=matchingPlace&&origin.track&&origin.track===destination.track;
  const reported=legs.reduce((sum,leg)=>sum+(leg.walkBaselineMinutes??leg.durationSeconds/60),0);
  const distance=legs.reduce((sum,leg)=>sum+leg.distanceMeters,0);
  const samePlatform=matchingPlatform&&reported===0;
  const stuttgart=stuttgartTransfer(previous,next);
  const minimum=stuttgart?20:longRail(next.mode)?12:samePlatform?2:5;
  const regional=regionalRail(previous.mode)&&regionalRail(next.mode);
  const shortLocal=Boolean(!stuttgart&&origin&&destination&&distance>0&&distance<=75&&
   legs.every(leg=>leg.measured)&&
   (regionalRail(next.mode)||localRail(next.mode)||next.mode==="BUS"));
  if(shortLocal)return {reported,distance,stuttgart,regional,shortLocal,minutes:Math.ceil(distance/50)+1};
  const planned=legs.reduce((sum,leg)=>sum+leg.durationSeconds/60,0);
  const minutes=regional?Math.max(minimum,planned,distance/60):
   Math.max(minimum,reported*paddedTransfer.factor,distance*20/(referenceWalkMeters||250));
  return {reported,distance,stuttgart,regional,minutes:Math.ceil(minutes)};
 }
 function transitTransfers(journey){
  const transfers=[];
  let previous;
  for(const leg of journey.legs){
   if(walking(leg.mode))continue;
   if(previous&&!leg.stayOnBoard&&(!leg.tripId||leg.tripId!==previous.tripId))
    transfers.push({leg,previous,available:(leg.start-previous.end)/60000});
   previous=leg;
  }
  return transfers;
 }
 function assess(journey,query){
  const transfers=[];
  let previous;
  for(const leg of journey.legs){
   if(walking(leg.mode))continue;
   if(previous&&!leg.stayOnBoard&&(!leg.tripId||leg.tripId!==previous.tripId)){
    const available=(leg.start-previous.end)/60000;
    const walk=realisticWalk(previous,leg,journey.legs.slice(previous.index+1,leg.index).filter(item=>walking(item.mode)),query.referenceWalkMeters);
    const slack=available-walk.minutes;
    const safetyReserve=walk.shortLocal?3:walk.regional?5:reserve(previous.mode);
    transfers.push({leg,previous,slack,available,walkMinutes:walk.minutes,reportedWalk:walk.reported,
     walkDistance:walk.distance,stuttgart:walk.stuttgart,
     reserve:safetyReserve,critical:slack<safetyReserve});
   }
   previous=leg;
  }
  const delta=(journey.end-query.time)/60000;
  const late=query.arriveBy?Math.abs(delta)>60:day(journey.end)!==day(query.time);
  const critical=transfers.find(item=>item.critical);
  const quality=late||critical?"red":query.arriveBy&&delta>0?"yellow":"green";
  const known=journey.legs.every(leg=>leg.measured);
  const busShare=known&&journey.distanceMeters>0?
   journey.legs.reduce((sum,leg)=>sum+(bus(leg.mode)?leg.distanceMeters:0),0)/journey.distanceMeters:null;
  return {quality,critical,transfers,late,busShare};
 }
 const greekLetters={α:"a",β:"v",γ:"g",δ:"d",ε:"e",ζ:"z",η:"i",θ:"th",ι:"i",κ:"k",
  λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",ς:"s",τ:"t",υ:"y",φ:"f",χ:"ch",ψ:"ps",ω:"o"};
 const greekPairs={αι:"ai",ει:"ei",οι:"oi",ου:"ou",μπ:"mp",ντ:"nt",γκ:"gk",γγ:"ng"};
 function readableLocalName(value){
  return String(value||"").replace(/\p{Script=Greek}[\p{Script=Greek}\p{Mark}]*/gu,word=>{
   const plain=word.normalize("NFD").replace(/\p{Mark}/gu,"");
   if(plain.toLowerCase()==="πατρα")return "Patras";
   return plain.replace(/αι|ει|οι|ου|μπ|ντ|γκ|γγ|[α-ω]/giu,part=>{
    const lower=part.toLowerCase(), latin=greekPairs[lower]||greekLetters[lower]||part;
    if(part===lower)return latin;
    return plain===plain.toUpperCase()&&plain.length>1?latin.toUpperCase():latin[0].toUpperCase()+latin.slice(1);
   });
  });
 }
 function dbUrl(from,to,local,arriveBy){
  if(!from||!to)return null;
  const place=pin=>"A=2@X="+Math.round(pin.lng*1e6)+"@Y="+Math.round(pin.lat*1e6)+"@U=91@";
  const params=new URLSearchParams({sts:"true",so:from.address||from.name,zo:to.address||to.name,
   soid:place(from),zoid:place(to),sot:"ADR",zot:"ADR",hd:local+":00",hza:arriveBy?"A":"D",ar:"false",s:"true",d:"false"});
  return "https://www.bahn.de/buchung/fahrplan/suche#"+params;
 }
 const api={assess,transitTransfers,walking,dbUrl,paddedTransfer,readableLocalName};
 root.Pin2MapTransitJourney=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
