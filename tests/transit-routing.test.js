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
 assert.equal(assess(rail,query).critical.slack,3);
 const tram=journey([leg(0,"TRAM",-35,-20),leg(1,"SUBWAY",-15,0)]);
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
 const calls=[];
 const direct=journey([leg(0,"TRAM",-50,-20,{geometry:{coordinates:[[8,48],[9,48]]}})]);
 const later=journey([leg(0,"TRAM",0,13)]);
 const flags=[{lat:49,lng:8.25,radiusMeters:4000},{lat:49,lng:8.75,radiusMeters:4000}];
 const guided=journey([leg(0,"TRAM",-75,-15,{geometry:{coordinates:[[8,48],[8.25,49],[8.75,49],[9,48]]}})]);
 const search=new Search({stopNear:async flag=>String(flag.lng),calculate:async request=>{
  calls.push(request);return request.via.length?[guided]:[request.query.time===instant?direct:later,direct];
 }});
 const result=await search.search({waypoints:[{},{}],guides:flags,query:{time:instant,arriveBy:true},
  signal:new AbortController().signal});
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
