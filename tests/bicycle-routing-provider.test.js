"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {BicycleRoutingProvider,PedestrianRoutingProvider,ascentMeters,costingOptions}=
 require("../adapters/routing/bicycle-routing-provider.js");
const waypoints=[{lat:0,lng:0},{lat:0,lng:.01}];
const trip={summary:{length:1.2,time:240},legs:[{shape:"???_pR",maneuvers:[]}]};
const alternate={summary:{length:1.4,time:260},legs:[{shape:"???a_pR",maneuvers:[]}]};
const response=body=>({ok:true,json:async()=>body});

test("all four bike types and the three characters map to Valhalla costing",()=>{
 for(const [profile,type] of Object.entries({everyday:"Hybrid",gravel:"Cross",mountain:"Mountain",road:"Road"}))
  assert.deepEqual(costingOptions("bicycle",profile,"balanced"),{bicycle_type:type});
 assert.equal(costingOptions("bicycle","gravel","cycleways").use_roads,0);
 assert.equal(costingOptions("bicycle","road","flat").use_hills,0);
});

test("returns distinct bike alternatives even on major multilane roads and with incomplete elevation",async()=>{
 const calls=[];
 const provider=new BicycleRoutingProvider({fetchImpl:async(url,opts)=>{
  const path=new URL(url).pathname,body=JSON.parse(opts.body);
  calls.push([path,body]);
  if(path==="/route")return response({trip,alternates:[{trip},{trip:alternate}]});
  if(body.encoded_polyline===alternate.legs[0].shape)throw new Error("Height unavailable");
  return response({edges:[{use:"road",road_class:"primary",lane_count:4,length:1,weighted_grade:4,mean_elevation:220}]});
 }});
 const route=await provider.calculate({waypoints,activeProfile:"gravel",character:"flat"});
 assert.equal(route.mode,"bicycle");
 assert.equal(route.profile,"gravel");
 assert.equal(route.ascentMeters,40);
 assert.equal(route.alternatives.length,1);
 assert.equal(route.alternatives[0].distanceMeters,1400);
 assert.equal(route.alternatives[0].ascentMeters,null);
 assert.equal(calls[0][1].alternates,2);
 assert.deepEqual(calls[0][1].costing_options.bicycle,{bicycle_type:"Cross",use_hills:0});
 await provider.calculate({waypoints,shapePoints:[{lat:.001,lng:.005}]});
 const guided=calls.findLast(([path])=>path==="/route")[1];
 assert.equal(guided.locations[1].type,"through");
 assert.equal(guided.alternates,0);
});

test("missing elevation stays unknown and ferry elevation is not added",()=>{
 assert.equal(ascentMeters([{use:"road",length:2,weighted_grade:0}]),null);
 assert.equal(ascentMeters([{use:"footway",mean_elevation:12},{use:"ferry",mean_elevation:34},
  {use:"road",mean_elevation:65},{use:"road",mean_elevation:67}]),2);
});

test("walking options use Valhalla profiles and retain routing alternatives and guides",async()=>{
 assert.equal(costingOptions("pedestrian","shortest").shortest,true);
 assert.ok(costingOptions("pedestrian","stroll").walkway_factor<costingOptions("pedestrian","normal").walkway_factor);
 assert.equal(costingOptions("pedestrian","hike").max_hiking_difficulty,3);
 assert.equal(costingOptions("pedestrian","accessible").type,"wheelchair");
 const requests=[];
 const provider=new PedestrianRoutingProvider({fetchImpl:async(url,options)=>{
  const body=JSON.parse(options.body);requests.push(body);
  assert.equal(new URL(url).pathname,"/route");
  return response(body.alternates?{trip,alternates:[{trip:alternate}]}:{trip});
 }});
 const selected=await provider.calculate({waypoints,activeProfile:"accessible"});
 assert.equal(selected.mode,"pedestrian");
 assert.equal(selected.alternatives.length,1);
 assert.equal(requests[0].costing_options.pedestrian.type,"wheelchair");
 await provider.calculate({waypoints,shapePoints:[{lat:.001,lng:.005}]});
 assert.equal(requests[1].locations[1].type,"through");
});
