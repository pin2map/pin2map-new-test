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
test("arrival combines both windows, retains red routes and probes up to two ordered via stops",async()=>{
 const calls=[],progress=[];
 const direct=journey([leg(0,"TRAM",-50,-20,{geometry:{coordinates:[[8,48],[9,48]]}})]);
 const later=journey([leg(0,"TRAM",0,13)]);
 const flags=[{lat:49,lng:8.25,radiusMeters:4000},{lat:49,lng:8.75,radiusMeters:4000}];
 const guided=journey([leg(0,"TRAM",-75,-15,{geometry:{coordinates:[[8,48],[8.25,49],[8.75,49],[9,48]]}})]);
 const search=new Search({stopNear:async flag=>String(flag.lng),calculate:async request=>{
  calls.push(request);return request.via.length?[guided]:[request.query.time===instant?direct:later,direct];
 }});
 const result=await search.search({waypoints:[{},{}],guides:flags,query:{time:instant,arriveBy:true},
  signal:new AbortController().signal,onProgress:value=>progress.push(value)});
 assert.deepEqual(progress[0],{phase:"request",requests:1,pending:1,received:0});
 assert.deepEqual(progress[1],{phase:"review",requests:1,pending:0,received:2});
 assert.ok(progress.some(value=>value.phase==="stops"&&value.received===4));
 assert.deepEqual(progress.at(-1),{phase:"review",requests:4,pending:0,received:6});
 assert.equal(result.journeys.length,3);
 assert.equal(result.journeys[result.selected].guideCount,2);
 assert.ok(result.journeys.some(item=>item.quality==="yellow"));
 assert.deepEqual(calls.at(-1).via,["8.25","8.75"]);
});
test("missed-connection recovery asks for a new through journey after the missed departure",async()=>{
 const output=journey([leg(0,"LONG_DISTANCE",9,100)]);
 const connection=leg(1,"LONG_DISTANCE",-5,0,{from:{stopId:"test:station"}});
 const search=new Search({calculate:async ({waypoints,query})=>{
  assert.equal(waypoints[0].stopId,"test:station");assert.equal(query.time,minutes(-4));assert.equal(query.arriveBy,false);
  return [output];
 }});
 assert.deepEqual(await search.recovery({critical:{leg:connection}},{lat:49,lng:9},{time:instant,arriveBy:true}),
  {end:minutes(100),late:true});
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
test("when transfers are tight the search adds buffered itineraries and retains the original",async()=>{
 const route=journey([leg(0,"LONG_DISTANCE",-60,-42),leg(1,"LONG_DISTANCE",-40,0)]);
 const safer=journey([leg(0,"LONG_DISTANCE",-80,-70),leg(1,"LONG_DISTANCE",-40,0)]);
 const input=[];
 const search=new Search({calculate:async request=>{
  input.push(request.query.moreTransferTime);return [request.query.moreTransferTime?safer:route];
 }});
 const result=await search.search({waypoints:[{},{}],guides:[],query:{time:minutes(-90),arriveBy:false},
  signal:new AbortController().signal});
 assert.deepEqual(input,[false,false,true,false]);
 assert.equal(result.journeys.length,2);
 assert.equal(result.journeys[result.selected].start,safer.start);
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

test("departure widens to two hours and never offers departures outside the window",async()=>{
 const windows=[];
 const search=new Search({calculate:async ({query})=>{
  windows.push(query.searchMinutes);return [journey([leg(0,"TRAM",121,130)])];
 }});
 const out=await search.search({waypoints:[{},{}],guides:[],query:{arriveBy:false,time:instant},
  signal:new AbortController().signal});
 assert.deepEqual(windows,[15,30,45,60,120]);
 assert.deepEqual(out.journeys,[]);
});
test("an earlier feeder to the same station makes room for the modeled transfer without moving later walks",async()=>{
 const station={name:"Hauptbahnhof (A.-Klett-Platz)",stopId:"klett"};
 const early=journey([leg(0,"SUBWAY",5,25,{to:station})]);
 const original=journey([leg(0,"SUBWAY",14,46,{to:station}),leg(1,"WALK",46,50,{distanceMeters:250}),
  leg(2,"LONG_DISTANCE",52,90),leg(3,"WALK",90,94)]);
 const search=new Search({calculate:async ({waypoints,query})=>{
  if(waypoints[1].stopId==="klett"){
   assert.equal(query.time,minutes(29));assert.equal(query.arriveBy,true);
   return [early];
  }
  return [original];
 }});
 const result=await search.search({waypoints:[{},{}],guides:[],query:{time:instant,arriveBy:false},
  signal:new AbortController().signal});
 const route=result.journeys[result.selected];
 assert.equal(route.start,minutes(5));
 assert.equal(route.legs[2].start,minutes(52));
 assert.equal(route.legs[3].start,minutes(90));
 assert.equal(route.critical,undefined);
});
test("fallback includes the actual address walk when setting the station deadline and door-to-door times",async()=>{
 const station={stopId:"Wahlwies",lat:47.8,lng:9};
 const providers=[];
 const route=journey([leg(0,"REGIONAL_RAIL",-60,-11)]);
 const search=new Search({
  railAccess:async(pin,arrival)=>arrival?{point:station,leg:{mode:"WALK",distanceMeters:524,durationSeconds:480}}:null,
  calculate:async ({waypoints,query})=>{
   providers.push([waypoints[1],query.time]);return waypoints[1]===station?[route]:[];
  }
 });
 const result=await search.search({waypoints:[{},{}],guides:[],query:{time:instant,arriveBy:true},
  signal:new AbortController().signal});
 assert.ok(providers.some(([point,time])=>point===station&&time===minutes(-8)));
 assert.equal(result.journeys[0].end,minutes(-3));
 assert.equal(result.journeys[0].legs.at(-1).distanceMeters,524);
});
test("departure keeps a valid feeder and replaces an impossible onward connection with a later real service",async()=>{
 const transfer={name:"Nenzingen",stopId:"nenzingen",track:"4"};
 const first=leg(0,"REGIONAL_RAIL",4,16);
 const walk=leg(1,"WALK",16,21,{distanceMeters:45,to:transfer});
 const missed=leg(2,"BUS",21,60,{from:transfer});
 const problem=journey([first,walk,missed]);
 const later=journey([leg(0,"BUS",42,78,{from:transfer,tripId:"actual later bus"})]);
 const search=new Search({calculate:async ({waypoints,query})=>{
  if(waypoints[0].stopId==="nenzingen"){
   assert.equal(query.time,minutes(34));assert.equal(query.arriveBy,false);
   return [later];
  }
  return [problem];
 }});
 const result=await search.search({waypoints:[{},{}],guides:[],query:{time:instant,arriveBy:false},
  signal:new AbortController().signal});
 const fixed=result.journeys[result.selected];
 assert.equal(fixed.start,minutes(4));
 assert.equal(fixed.legs[2].tripId,"actual later bus");
 assert.equal(fixed.end,minutes(78));
 assert.equal(fixed.critical,undefined);
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

test("a much longer safe trip remains selectable without displacing a nearby connection",()=>{
 const search=new Search({});
 const near={...journey([leg(0,"BUS",5,10)]),quality:"red",guideCount:0};
 const distant={...journey([leg(0,"BUS",5,100)]),quality:"green",guideCount:0};
 const result=search.results([near,distant],{time:instant,arriveBy:false});
 assert.equal(result.journeys.length,2);
 assert.equal(result.journeys[result.selected],near);
});

test("a small gain against the arrival target does not justify a much longer trip",()=>{
 const search=new Search({});
 const short={...journey([leg(0,"BUS",-120,-25)]),quality:"green",guideCount:0};
 const long={...journey([leg(0,"BUS",-300,0)]),quality:"green",guideCount:0};
 const result=search.results([short,long],{time:instant,arriveBy:true});
 assert.equal(result.journeys[result.selected],short);
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

test("next departure is scheduled, distinct and belongs to the same line and direction",async()=>{
 const base=leg(0,"SUBURBAN",28,35,{routeId:"s62",directionId:"1",
  from:{stopId:"singen",scheduledDeparture:new Date(minutes(28)).toISOString()}});
 const event=(id,routeId,directionId,t,extra={})=>({
  tripId:id,routeId,directionId,place:{scheduledDeparture:new Date(minutes(t)).toISOString()},...extra
 });
 const provider=new Provider({fetchImpl:async url=>{
  const request=new URL(url);
  assert.equal(request.pathname,"/api/v6/stoptimes");
  assert.equal(request.searchParams.get("stopId"),"singen");
  assert.equal(request.searchParams.get("realtimeMode"),"OFF");
  return {ok:true,json:async()=>({stopTimes:[
   event("trip0","s62","1",30),event("wrong-line","s61","1",31),
   event("wrong-direction","s62","0",32),event("cancelled","s62","1",35,{cancelled:true}),
   event("later","s62","1",58),event("next","s62","1",42)
  ]})};
 }});
 assert.deepEqual(await provider.nextDeparture(base,new AbortController().signal),{time:minutes(42),tripId:"next"});
});

test("continuation retains the inbound leg and chooses a free route from the transfer stop",async()=>{
 const original=journey([
  leg(0,"LONG_DISTANCE",0,26,{to:{stopId:"singen",track:"1"}}),
  leg(1,"WALK",26,27),leg(2,"SUBURBAN",28,35,{from:{stopId:"platform-s62"},routeId:"s62"})
 ]);
 const query={time:instant,arriveBy:false};
 Object.assign(original,assess(original,query));
 const requests=[],target={lat:47.83,lng:9.02};
 const search=new Search({calculate:async request=>{
  requests.push(request);
  const first=(request.query.time-instant)/60000;
  return [journey([leg(0,"BUS",first+2,first+60,{tripId:"bus"})])];
 }});
 for(const [options,earliest] of [[{delay:20},48],[{next:{time:minutes(42),tripId:"next-s62"}},42]]){
  const result=await search.continueJourney(original,{index:2,...options,target,query});
  assert.deepEqual(requests.at(-1).waypoints,[{stopId:"singen"},target]);
  assert.deepEqual(requests.at(-1).query,{time:minutes(earliest),arriveBy:false,searchMinutes:120});
  assert.equal(result.branch,1);
  assert.deepEqual(result.journey.legs[0],original.legs[0]);
  assert.equal(result.journey.legs[1].tripId,"bus");
  assert.equal(result.journey.legs[1].index,1);
  assert.equal(original.legs.length,3);
 }
});
