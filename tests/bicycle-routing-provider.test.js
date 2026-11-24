"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {BicycleRoutingProvider,PedestrianRoutingProvider,edgeStats}=require("../adapters/routing/bicycle-routing-provider.js");
const points=[{lat:0,lng:0},{lat:0,lng:.01}];
const trip={summary:{length:1.2,time:240},legs:[{shape:"???_pR",maneuvers:[]}]};
const road={use:"road",road_class:"residential",lane_count:2,traversability:"both",length:1,
 weighted_grade:4,max_upward_grade:7,max_downward_grade:0};

test("rejects major roads, ramps and unknown road lanes, but measures additional lanes",()=>{
 for(const edge of [
  {...road,road_class:"primary"},
  {...road,use:"ramp"},
  {...road,lane_count:undefined},
  {...road,road_class:"unknown"}
 ])assert.equal(edgeStats([edge]),null);
 assert.equal(edgeStats([road]).ascentMeters,40);
 assert.equal(edgeStats([{...road,lane_count:3}]).multiLaneMeters,1000);
 assert.equal(edgeStats([{...road,traversability:"forward"}]).multiLaneMeters,1000);
 assert.equal(edgeStats([{...road,use:"cycleway",lane_count:undefined,road_class:"primary"}]).cycleShare,1);
});

test("uses the least climbing eligible alternative and keeps guide points as through locations",async()=>{
 const calls=[];
 const traces=[[{...road,road_class:"primary"}],[road],[{...road,use:"cycleway",weighted_grade:1}],[road]];
 const provider=new BicycleRoutingProvider({fetchImpl:async(url,opts)=>{
  const path=new URL(url).pathname,payload=JSON.parse(opts.body);
  calls.push([path,payload]);
  return {ok:true,json:async()=>path==="/route"?{trip,alternates:payload.alternates?
   [{trip},{trip}]:[]}:{edges:traces.shift()}};
 }});
 const route=await provider.calculate({waypoints:points});
 assert.equal(route.mode,"bicycle");
 assert.equal(route.ascentMeters,10);
 assert.equal(route.cycleShare,1);
 assert.equal(calls[0][1].alternates,2);
 assert.equal(calls[0][1].costing_options.bicycle.use_roads,0);
 assert.equal(calls[0][1].costing_options.bicycle.use_hills,0);
 await provider.calculate({waypoints:points,shapePoints:[{lat:.001,lng:.005}]});
 const guided=calls.findLast(([path])=>path==="/route")[1];
 assert.equal(guided.locations[1].type,"through");
 assert.equal(guided.alternates,0);
});

test("uses verified multilane segments only when avoiding them is unavailable",async()=>{
 const provider=new BicycleRoutingProvider({fetchImpl:async url=>({ok:true,json:async()=>
  new URL(url).pathname==="/route"?{trip}:{edges:[{...road,lane_count:4}]}})});
 assert.equal((await provider.calculate({waypoints:points})).multiLaneMeters,1000);
 const traces=[[{...road,lane_count:4,weighted_grade:0}],[road]];
 const alternatives=new BicycleRoutingProvider({fetchImpl:async url=>({ok:true,json:async()=>
  new URL(url).pathname==="/route"?{trip,alternates:[{trip}]}:{edges:traces.shift()}})});
 assert.equal((await alternatives.calculate({waypoints:points})).multiLaneMeters,0);
});

test("refuses unverified bicycle routes",async()=>{
 const unverified=new BicycleRoutingProvider({fetchImpl:async url=>({ok:true,json:async()=>
  new URL(url).pathname==="/route"?{trip}:{} })});
 await assert.rejects(()=>unverified.calculate({waypoints:points}),/nicht vollständig/);
});

test("walking prefers a modest detour on footpaths and uses soft guide points",async()=>{
 const footTrip={...trip,summary:{length:1.3,time:275}};
 const requests=[];
 const traces=[[road],[{use:"footway",length:1.3}],[{use:"steps",length:1.3}]];
 const provider=new PedestrianRoutingProvider({fetchImpl:async(url,options)=>{
  const body=JSON.parse(options.body);
  requests.push(body);
  return {ok:true,json:async()=>new URL(url).pathname==="/route"?
   {trip,alternates:body.alternates?[{trip:footTrip}]:[]}:{edges:traces.shift()}};
 }});
 const selected=await provider.calculate({waypoints:points});
 assert.equal(selected.mode,"pedestrian");
 assert.equal(selected.durationSeconds,275);
 assert.equal(requests[0].costing,"pedestrian");
 assert.ok(requests[0].costing_options.pedestrian.walkway_factor<1);
 await provider.calculate({waypoints:points,shapePoints:[{lat:.001,lng:.005}]});
 assert.equal(requests[3].locations[1].type,"through");
});
