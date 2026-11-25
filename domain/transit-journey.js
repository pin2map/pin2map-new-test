"use strict";
(function(root){
 const walking=mode=>["WALK","FOOT"].includes(mode);
 const bus=mode=>["BUS","COACH"].includes(mode);
 const reserve=mode=>["HIGHSPEED_RAIL","LONG_DISTANCE","NIGHT_RAIL","COACH","FERRY"].includes(mode)?15:
  ["TRAM","SUBWAY","METRO"].includes(mode)?3:8;
 const formatter=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit"});
 const day=time=>formatter.format(new Date(time));
 function assess(journey,query){
  const transfers=[];
  let previous;
  for(const leg of journey.legs){
   if(walking(leg.mode))continue;
   if(previous&&!leg.stayOnBoard&&(!leg.tripId||leg.tripId!==previous.tripId)){
    const slack=(leg.start-previous.end)/60000-journey.legs.slice(previous.index+1,leg.index)
     .reduce((sum,walk)=>sum+walk.durationSeconds/60,0);
    transfers.push({leg,slack,critical:slack<reserve(previous.mode)});
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
  return {quality,critical,late,busShare};
 }
 function dbUrl(from,to,local,arriveBy){
  if(!from||!to)return null;
  const place=pin=>"A=2@X="+Math.round(pin.lng*1e6)+"@Y="+Math.round(pin.lat*1e6)+"@U=91@";
  const params=new URLSearchParams({sts:"true",so:from.address||from.name,zo:to.address||to.name,
   soid:place(from),zoid:place(to),sot:"ADR",zot:"ADR",hd:local+":00",hza:arriveBy?"A":"D",ar:"false",s:"true",d:"false"});
  return "https://www.bahn.de/buchung/fahrplan/suche#"+params;
 }
 const api={assess,walking,dbUrl};
 root.Pin2MapTransitJourney=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
