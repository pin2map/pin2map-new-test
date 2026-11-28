"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {assess,dbUrl}=require("../domain/transit-journey.js");
const Search=require("../application/transit-route-search.js");
const Provider=require("../adapters/routing/transit-routing-provider.js");
const instant=Date.parse("2026-11-25T10:00:00Z");
const minutes=n=>instant+n*60000;
const leg=(index,mode,from,to,extra={})=>({index,mode,start:minutes(from),end:minutes(to),
 durationSeconds:(to-from)*60,measured:true,distanceMeters:1000,tripId:"trip"+index,...extra});
const journey=(legs,end=legs.at(-1).end)=>({start:legs[0].start,end,legs,distanceMeters:legs.length*1000});
test("critical rail transfer stays red, tight tram transfer uses its own reserve",()=>{
 const query={arriveBy:true,time:instant};
 const rail=journey([leg(0,"LONG_DISTANCE",-75,-35),leg(1,"WALK",-35,-33),leg(2,"LONG_DISTANCE",-30,0)]);
 assert.equal(assess(rail,query).quality,"red");
 assert.equal(assess(rail,query).critical.available,5);
 assert.equal(assess(rail,query).critical.reportedWalk,2);
 assert.ok(assess(rail,query).critical.slack<0);
 const platform={stopId:"station:one",track:"1"};
 const tram=journey([leg(0,"TRAM",-35,-20,{to:platform}),leg(1,"SUBWAY",-15,0,{from:platform})]);
 assert.equal(assess(tram,query).quality,"green");
 assert.equal(assess({...tram,end:minutes(60)},query).quality,"yellow");
 assert.equal(assess({...tram,end:minutes(61)},query).quality,"red");
 assert.equal(assess({...tram,end:minutes(-61)},query).quality,"red");
 const through=journey([leg(0,"LONG_DISTANCE",-35,-20),leg(1,"LONG_DISTANCE",-20,0,{stayOnBoard:true})]);
 assert.equal(assess(through,query).quality,"green");
});
test("bus distance and unknown shapes are distinct from estimated risks",()=>{
 const query={arriveBy:false,time:instant};
 const route=journey([leg(0,"BUS",0,10),leg(1,"TRAM",25,35)]);
 assert.equal(assess(route,query).busShare,.5);
 route.legs[1].measured=false;
 assert.equal(assess(route,query).busShare,null);
 assert.equal(assess({...route,end:minutes(1440)},query).quality,"red");
});
test("MOTIS adapter normalizes ferry and detailed leg data and preserves DB local time",async()=>{
 const format=time=>new Date(time).toISOString();
 const provider=new Provider({fetchImpl:async url=>{
  const query=new URL(url).searchParams;
  assert.equal(query.get("directModes"),"");assert.match(query.get("transitModes"),/FERRY/);
  assert.equal(query.get("via"),"a,b");
  return {ok:true,json:async()=>({itineraries:[{startTime:format(instant),endTime:format(minutes(15)),
   legs:[{mode:"FERRY",startTime:format(instant),endTime:format(minutes(15)),legGeometry:{points:"???_pR",precision:6}}]}]})};
 }});
 const result=await provider.calculate({waypoints:[{lat:48,lng:9},{lat:49,lng:10}],
  query:{time:instant,arriveBy:true},via:["a","b"]});
 assert.equal(result[0].legs[0].ferry,true);
 assert.ok(result[0].distanceMeters>1000);
 const hash=new URLSearchParams(new URL(dbUrl({name:"A",lat:48,lng:9},{name:"B",lat:49,lng:10},
  "2026-11-25T15:10",true)).hash.slice(1));
 assert.equal(hash.get("hd"),"2026-11-25T15:10:00");assert.equal(hash.get("hza"),"A");
});

test("Stuttgart station is calibrated to 20 minutes and a two-minute platform change is critical",()=>{
 const query={arriveBy:true,time:instant};
 const platform={stopId:"track8",name:"Stuttgart Hauptbahnhof",track:"8"};
 const u=leg(0,"SUBWAY",-60,-40,{to:{name:"Hauptbahnhof (A.-Klett-Platz)"}});
 const walk=leg(1,"WALK",-40,-36,{distanceMeters:245});
 const train=leg(2,"LONG_DISTANCE",-34,0,{from:platform});
 const risk=assess(journey([u,walk,train]),query).critical;
 assert.deepEqual([risk.available,risk.reportedWalk,risk.walkMinutes,risk.slack],[6,4,20,-14]);
 const tram=journey([leg(0,"TRAM",-30,-20,{to:platform}),
  leg(1,"TRAM",-18,0,{from:{...platform,track:"4"}})]);
 assert.equal(assess(tram,query).quality,"red");
});
test("normalizer preserves public service number and removes added transfer time from the walking baseline",async()=>{
 const format=time=>new Date(time).toISOString();
 const provider=new Provider({fetchImpl:async url=>{
  const params=new URL(url).searchParams;
  assert.equal(params.get("transferTimeFactor"),"2");
  assert.equal(params.get("additionalTransferTime"),"5");
  const walk={mode:"WALK",startTime:format(instant),endTime:format(minutes(13)),duration:780};
  const train={mode:"LONG_DISTANCE",startTime:format(minutes(15)),endTime:format(minutes(38)),
   category:{shortName:"ICE"},displayName:"ICE 9590",tripShortName:"9590",routeShortName:"82",headsign:"Paris Est",agencyName:"DB"};
  return {ok:true,json:async()=>({itineraries:[{startTime:walk.startTime,endTime:train.endTime,legs:[walk,train]}]})};
 }});
 const [result]=await provider.calculate({waypoints:[{lat:48,lng:9},{lat:49,lng:10}],
  query:{time:instant,arriveBy:false,moreTransferTime:true}});
 assert.equal(result.legs[0].walkBaselineMinutes,4);
 assert.equal(result.legs[1].line,"ICE 9590");
 assert.equal(result.legs[1].operator,"DB");
});

test("nearby access is tried first, broader access is a fallback and the response has no count cap",async()=>{
 const access=[];
 const provider=new Provider({fetchImpl:async url=>{
  const params=new URL(url).searchParams;
  assert.equal(params.has("maxItineraries"),false);
  assert.equal(params.get("useRoutedTransfers"),"true");
  assert.equal(params.get("transferTimeFactor"),"1.67");
  assert.equal(params.get("maxPreTransitTime"),params.get("maxPostTransitTime"));
  access.push(params.get("maxPreTransitTime"));
  const startTime=new Date(instant).toISOString(),endTime=new Date(minutes(20)).toISOString();
  return {ok:true,json:async()=>({itineraries:access.length===1?[]:
   Array.from({length:15},()=>({startTime,endTime,legs:[{mode:"BUS",startTime,endTime}]}))})};
 }});
 const routes=await provider.calculate({waypoints:[{lat:48,lng:9},{lat:49,lng:10}],query:{time:instant,arriveBy:false}});
 assert.deepEqual(access,["900","1800"]);
 assert.equal(routes.length,15);
});

test("Latin fallback makes Greek stop labels readable",()=>{
 const {readableLocalName}=require("../domain/transit-journey.js");
 assert.equal(readableLocalName("Πάτρα / Άγιος Ανδρέας"),"Patras / Agios Andreas");
 assert.equal(readableLocalName("München Hbf"),"München Hbf");
});

test("a coarse rail spike is replaced by a dashed display gap without changing the timetable",async()=>{
 const points=[[8.84,47.759],[8.834,47.769],[8.92,47.742],[8.97,47.737]];
 const encode=points=>{
  let prior=[0,0];
  return points.map(([lng,lat])=>[lat,lng].map((value,index)=>{
   const scaled=Math.round(value*1e6),delta=scaled-prior[index];prior[index]=scaled;
   let bits=delta<0?~(delta<<1):delta<<1,result="";
   while(bits>=32){result+=String.fromCharCode((bits&31)+95);bits>>=5;}
   return result+String.fromCharCode(bits+63);
  }).join("")).join("");
 };
 const startTime=new Date(instant).toISOString(),endTime=new Date(minutes(9)).toISOString();
 const provider=new Provider({fetchImpl:async()=>({ok:true,json:async()=>({itineraries:[
  {startTime,endTime,legs:[{mode:"SUBURBAN",displayName:"S6",startTime,endTime,
   legGeometry:{precision:6,points:encode(points)}}]}
 ]})})});
 const [route]=await provider.calculate({waypoints:[{lat:48,lng:9},{lat:49,lng:10}],query:{time:instant}});
 const [leg]=route.legs;
 assert.deepEqual(leg.geometry.coordinates,points.slice(2));
 assert.deepEqual(leg.geometryGaps,[[points[0],points[2]]]);
 assert.equal(leg.durationSeconds,540);
});

test("walking transit stages fit the usable screen with fractional zoom and a red dotted line",()=>{
 const {CarRouteMapView,TRANSIT_WALK_COLOR}=require("../ui/car-route-map-view.js");
 const calls=[];
 const view=new CarRouteMapView({mapPort:{
  createLine:(_points,style)=>{calls.push(style);return {};},
  onRouteLine:()=>{},projectAtZoom:({lat,lng})=>({x:lng,y:lat}),
  fitBounds:(_points,options)=>calls.push(options)
 },onLineClick:()=>{},getLayout:()=>({map:{left:0,top:0,right:900,bottom:600},obstacles:[]})});
 view.render({mode:"transit",legs:[{mode:"WALK",geometry:{coordinates:[[8,47],[8.001,47.001]]}}]});
 assert.equal(view.fit(0),true);
 assert.equal(calls[0].color,TRANSIT_WALK_COLOR);
 assert.equal(calls[0].dashArray,"1 9");
 assert.equal(calls[1].maxZoom,19);
 assert.equal(calls[1].fractionalZoom,true);
});

test("a ten-minute regional rail connection can cover the planned walk and reserve",()=>{
 const start={name:"Radolfzell Bahnhof",stopId:"radolfzell",track:"6"};
 const end={...start,track:"1"};
 const first=leg(0,"SUBURBAN",0,10,{to:start});
 const walk=leg(1,"WALK",10,13,{from:start,to:end,distanceMeters:90});
 const onward=leg(2,"SUBURBAN",20,30,{from:end});
 const query={time:instant,arriveBy:false};
 const result=assess(journey([first,walk,onward]),query);
 assert.equal(result.quality,"green");
 assert.deepEqual(result.transfers.map(({available,walkMinutes,reserve})=>[available,walkMinutes,reserve]),[[10,5,5]]);
 assert.equal(assess(journey([first,walk,{...onward,start:minutes(17)}]),query).quality,"red");
});

test("measured short walks cover local departures without marking good transfers critical",()=>{
 const query={time:instant,arriveBy:false};
 const from={stopId:"track3",track:"3"},to={stopId:"track2",track:"2"};
 for(const [distance,available,walk] of [[52,7,3],[14,9,2]]){
  const previous=leg(0,"LONG_DISTANCE",0,30,{to:from});
  const foot=leg(1,"WALK",30,33,{distanceMeters:distance});
  const onward=leg(2,"SUBURBAN",30+available,45,{from:to});
  const route=assess(journey([previous,foot,onward]),query);
  assert.deepEqual(route.transfers.map(item=>[item.walkMinutes,item.reserve,item.critical]),[[walk,3,false]]);
  const tight=assess(journey([previous,foot,{...onward,start:minutes(32)}]),query);
  assert.equal(tight.critical.available,2);
  assert.equal(assess(journey([previous,{...foot,measured:false},onward]),query).quality,"red");
 }
});

test("regular search asks for three provider proposals and keeps their order and times",async()=>{
 const proposals=[240,3075,223,241].map(end=>journey([leg(0,"BUS",0,end)]));
 const calls=[];
 const search=new Search({calculate:async request=>{calls.push(request);return proposals;}});
 const signal=new AbortController().signal;
 for(const arriveBy of [false,true]){
  const result=await search.search({waypoints:[{},{}],query:{time:instant,arriveBy},signal});
  assert.equal(result.selected,0);
  assert.deepEqual(result.journeys.map(route=>route.end),proposals.slice(0,3).map(route=>route.end));
  assert.deepEqual(calls.at(-1).query,{time:instant,arriveBy,searchMinutes:120,itineraryLimit:3});
 }
 assert.equal(calls.length,2);
});

test("partial plans preserve the existing side and represent the boundary walk",async()=>{
 const a={stopId:"a",track:"1"},b={stopId:"b",track:"2"};
 const original=journey([
  leg(0,"BUS",0,26,{to:a}),leg(1,"WALK",26,28,{from:a,to:b}),
  leg(2,"TRAM",30,45,{from:b})]);
 original.transfers=require("../domain/transit-journey.js").transitTransfers(original);
 const origin={lat:48,lng:9},target={lat:49,lng:9};
 const search=new Search({calculate:async ({waypoints,query})=>{
  assert.equal(query.itineraryLimit,3);
  if(query.arriveBy){
   assert.deepEqual(waypoints,[origin,{stopId:"b"}]);
   assert.equal(query.time,minutes(10));
   return [journey([leg(0,"BUS",-30,9,{to:{stopId:"other"}})])];
  }
  assert.deepEqual(waypoints,[{stopId:"a"},target]);
  assert.equal(query.time,minutes(50));
  return [journey([leg(0,"BUS",50,65,{from:b})])];
 }});
 const forward=await search.continueJourney(original,{index:2,delay:20,origin,target,query:{arriveBy:false}});
 assert.deepEqual(forward.journey.legs[0],original.legs[0]);
 assert.deepEqual(forward.journey.legs[1],original.legs[1]);
 const backward=await search.continueJourney(original,{index:2,delay:20,origin,target,query:{arriveBy:true}});
 assert.deepEqual(backward.journey.legs.at(-1),original.legs[2]);
 assert.equal(backward.journey.legs[1].unknownTransfer,true);
 assert.equal(backward.journey.end,original.end);
});
