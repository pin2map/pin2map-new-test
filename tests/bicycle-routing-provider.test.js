"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {BicycleRoutingProvider,edgeStats}=require("../adapters/routing/bicycle-routing-provider.js");
const points=[{lat:0,lng:0},{lat:0,lng:.01}];
const trip={summary:{length:1.2,time:240},legs:[{shape:"???_pR",maneuvers:[]}]};
const road={use:"road",road_class:"residential",lane_count:2,traversability:"both",length:1,
 weighted_grade:4,max_upward_grade:7,max_downward_grade:0};

test("rejects major roads, multiple lanes in one direction, ramps and unknown road lanes",()=>{
 for(const edge of [
  {...road,road_class:"primary"},
  {...road,lane_count:3},
  {...road,traversability:"forward"},
  {...road,use:"ramp"},
  {...road,lane_count:undefined},
  {...road,road_class:"unknown"}
 ])assert.equal(edgeStats([edge]),null);
 assert.equal(edgeStats([road]).ascentMeters,40);
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

test("refuses unverified routes and does not silently return an unsafe candidate",async()=>{
 const provider=new BicycleRoutingProvider({fetchImpl:async url=>({ok:true,json:async()=>
  new URL(url).pathname==="/route"?{trip}:{edges:[{...road,lane_count:4}]}})});
 await assert.rejects(()=>provider.calculate({waypoints:points}),/Keine geprüfte Fahrradroute/);
 const unverified=new BicycleRoutingProvider({fetchImpl:async url=>({ok:true,json:async()=>
  new URL(url).pathname==="/route"?{trip}:{} })});
 await assert.rejects(()=>unverified.calculate({waypoints:points}),/nicht vollständig/);
});
