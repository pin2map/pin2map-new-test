"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {ActiveCarRoute}=require("../domain/active-car-route.js");
const {CarRouteSession}=require("../application/car-route-session.js");
const {routeUrl}=require("../application/apple-maps-links.js");

test("Car route DOM/map modules expose actual constructors through the same APIs used by app.js",()=>{
 const app=require("node:fs").readFileSync(require("node:path").join(__dirname,"..","app.js"),"utf8");
 const map=require("../ui/car-route-map-view.js");
 const panel=require("../ui/car-route-panel.js");
 assert.equal(typeof map.CarRouteMapView,"function");
 assert.equal(typeof panel.CarRoutePanel,"function");
 assert.match(app,/new window\.Pin2MapCarRouteMapView\.CarRouteMapView\(/);
 assert.match(app,/new window\.Pin2MapCarRoutePanel\.CarRoutePanel\(/);
});
test("Auto: start, goal and exactly visited pin waypoints; same pin roundtrip allowed",()=>{
 const plan=new ActiveCarRoute();
 plan.setEndpoint("start","a");assert.equal(plan.ready(),false);
 plan.setEndpoint("target","a");assert.equal(plan.ready(),true);
 assert.deepEqual(plan.ids(),["a","a"]);
 assert.equal(plan.addWaypoint("a"),false);
 plan.setEndpoint("target","c");
 assert.equal(plan.addWaypoint("b"),true);assert.equal(plan.addWaypoint("b"),false);
 assert.deepEqual(plan.ids(),["a","b","c"]);
 plan.reverse();assert.deepEqual(plan.ids(),["c","b","a"]);
 plan.setOptions({profile:"country",avoidTolls:true});
 assert.equal(plan.snapshot().avoidTolls,true);
 assert.throws(()=>plan.setOptions({profile:"scenic"}),/noch nicht kombinierbar/);
 plan.reset();assert.equal(plan.ready(),false);
});
test("Auto: multi visible pins and fixed order; controls never create fictional pins",()=>{
 const plan=new ActiveCarRoute();
 plan.setEndpoint("start","a");plan.setEndpoint("target","z");
 assert.equal(plan.addVisible(["a","c","b","b","z"]),2);
 assert.deepEqual(plan.ids(),["a","c","b","z"]);
 assert.equal(plan.removeWaypoint("c"),true);
 assert.deepEqual(plan.ids(),["a","b","z"]);
});
test("ALL toggles exactly the selected hard pins on and back off, without map or route-provider access",()=>{
 const plan=new ActiveCarRoute();plan.setEndpoint("start","a");plan.setEndpoint("target","z");
 const session=new CarRouteSession({plan,getPin:id=>({id,lat:50,lng:10}),
  calculate:async()=>({geometry:{type:"LineString",coordinates:[[10,50],[11,51]]},distanceMeters:100,durationSeconds:50}),
  onChange:()=>{},onError:()=>{}});
 assert.deepEqual(session.toggleVisible(["a","b","c","z"]),{active:true,count:2});
 assert.deepEqual(session.snapshot().waypointIds,["b","c"]);
 assert.equal(session.snapshot().allVisibleActive,true);
 assert.deepEqual(session.toggleVisible([]),{active:false,count:0});
 assert.deepEqual(session.snapshot().waypointIds,[]);
 assert.equal(session.snapshot().allVisibleActive,false);
 session.clear();
 assert.equal(session.snapshot().ready,false);
});
test("Auto: sequential legs keep original distance and time, route colors may vary",async()=>{
 const pin=id=>({id,lat:50,lng:10,name:id});
 const plan=new ActiveCarRoute();const published=[],calls=[];
 const session=new CarRouteSession({plan,getPin:pin,
  calculate:async ({waypoints})=>{calls.push(waypoints.map(p=>p.id));
   return {geometry:{type:"LineString",coordinates:[[10,50],[11,51]]},distanceMeters:1000,durationSeconds:300};},
  onChange:state=>published.push(state),onError:error=>assert.fail(error)});
 plan.setEndpoint("start","a");plan.setEndpoint("target","c");plan.addWaypoint("b");
 await session.recalculate();
 assert.deepEqual(calls,[["a","b"],["b","c"]]);
 const view=session.snapshot();assert.equal(view.distanceMeters,2000);
 assert.equal(view.durationSeconds,600);assert.deepEqual(view.legs.map(x=>x.fromId),["a","b"]);
 assert.equal(view.loading,false);assert.equal(published.at(-1).ready,true);
});
test("Auto: older async response cannot replace newer itinerary",async()=>{
 const plan=new ActiveCarRoute();plan.setEndpoint("start","a");plan.setEndpoint("target","b");
 let resolveOne;const pending=new Promise(resolve=>{resolveOne=resolve;});
 const snapshots=[];
 let n=0;const session=new CarRouteSession({plan,getPin:id=>({id,lat:50,lng:10}),
  calculate:()=>++n===1?pending:Promise.resolve({geometry:{type:"LineString",coordinates:[[10,50],[11,51]]},distanceMeters:300,durationSeconds:60}),
  onChange:s=>snapshots.push(s),onError:err=>assert.fail(err)});
 const first=session.recalculate();const second=session.recalculate();
 await second;resolveOne({geometry:{type:"LineString",coordinates:[[10,50],[11,51]]},distanceMeters:999,durationSeconds:999});await first;
 assert.equal(session.snapshot().distanceMeters,300);
 assert.equal(session.snapshot().durationSeconds,60);
});
test("Apple route URL sends valid start/target, no hidden waypoint loss",()=>{
 const url=routeUrl({lat:53.1,lng:12.2},{lat:48.8,lng:9.2});
 const q=new URL(url);assert.equal(q.searchParams.get("saddr"),"53.100000,12.200000");
 assert.equal(q.searchParams.get("daddr"),"48.800000,9.200000");
 assert.equal(q.searchParams.get("dirflg"),"d");
});

test("Pin route buttons toggle each role independently including roundtrip and ALL",()=>{
 const plan=new ActiveCarRoute(),session=new CarRouteSession({plan,getPin:id=>({id,lat:50,lng:10}),calculate:async()=>({distanceMeters:1,durationSeconds:1}),onChange:()=>{},onError:err=>assert.fail(err)});
 session.endpoint("start","a");session.endpoint("start","a");assert.equal(plan.startId,null);
 session.endpoint("start","a");session.endpoint("target","a");session.endpoint("target","a");assert.equal(plan.startId,"a");assert.equal(plan.targetId,null);
 session.waypoint("b");session.waypoint("c");session.waypoint("b");assert.deepEqual(plan.waypointIds,["c"]);
 session.endpoint("target","z");session.toggleVisible(["b"]);assert.equal(session.snapshot().allVisibleActive,true);session.waypoint("b");assert.equal(session.snapshot().allVisibleActive,false);
 session.endpoint("start","a");assert.equal(plan.startId,null);assert.equal(plan.targetId,"z");assert.equal(session.snapshot().ready,false);assert.deepEqual(session.snapshot().legs,[]);session.clear();
});

test("OPT changes the visit sequence and FIX restores insertion order with fixed endpoints",()=>{
 const plan=new ActiveCarRoute();
 plan.setEndpoint("start","a");plan.setEndpoint("target","z");
 plan.addVisible(["c","b"]);
 const longitudes={a:0,b:1,c:2,z:3};
 const session=new CarRouteSession({plan,getPin:id=>({id,lat:0,lng:longitudes[id]}),
  calculate:async()=>({distanceMeters:1,durationSeconds:1}),onChange:()=>{},onError:assert.fail});
 session.setOrder("optimal");
 assert.deepEqual(session.snapshot().ids,["a","b","c","z"]);
 session.setOrder("fixed");
 assert.deepEqual(session.snapshot().ids,["a","c","b","z"]);
});

test("elapsed marks use section durations and a changed time profile does not recalculate the route",async()=>{
 const plan=new ActiveCarRoute();
 plan.setEndpoint("start","a");plan.setEndpoint("target","z");
 const geometry={type:"LineString",coordinates:[[0,0],[1,0],[3,0]]};
 let calls=0;
 const session=new CarRouteSession({plan,getPin:id=>({id,lat:0,lng:0}),
  calculate:async()=>{calls++;return {geometry,distanceMeters:1000,durationSeconds:3600,
   timeSections:[{coordinates:[[0,0],[1,0]],seconds:1800},{coordinates:[[1,0],[3,0]],seconds:1800}]};},
  onChange:()=>{},onError:assert.fail});
 await session.recalculate();
 assert.deepEqual(session.snapshot().timeMarkers,[{lat:0,lng:1,hour:null},{lat:0,lng:3,hour:1}]);
 session.setTimeProfile("quick");
 assert.equal(session.snapshot().durationSeconds,3420);
 assert.equal(session.snapshot().timeMarkers.length,1);
 assert.equal(session.snapshot().legs[0].geometry,geometry);
 assert.equal(calls,1);
});

test("route fit selects a continuous map area clear of visible controls",()=>{
 const {freeRouteRect}=require("../ui/car-route-map-view.js");
 // DOMRect edge properties can be inherited rather than enumerable.
 const map=Object.create({left:0,top:0,right:390,bottom:844});
 const search={left:60,top:0,right:330,bottom:57};
 const panel={left:11,top:536,right:379,bottom:826};
 const open=freeRouteRect(map,[search,panel],100,200);
 const closed=freeRouteRect(map,[search],100,200);
 assert.deepEqual(open,{left:0,top:57,right:390,bottom:536});
 assert.deepEqual(closed,{left:0,top:57,right:390,bottom:844});
});

test("route fit keeps a centered corridor when fixed controls occupy one side",()=>{
 const {freeRouteRect}=require("../ui/car-route-map-view.js");
 const map={left:0,top:0,right:400,bottom:600};
 const control={left:0,top:0,right:60,bottom:600};
 assert.deepEqual(freeRouteRect(map,[control],100,200),{left:60,top:0,right:340,bottom:600});
});

test("direction flags can select an acceptable corridor without adding an itinerary leg",async()=>{
 const plan=new ActiveCarRoute();
 plan.setEndpoint("start","a");plan.setEndpoint("target","z");
 const pins={a:{lat:48,lng:9},z:{lat:49,lng:10}};
 const flag={lat:48.5,lng:9.8,radiusMeters:6000};
 const coords=[[9,48],[10,49]];
 const route=(coordinates,durationSeconds,distanceMeters)=>({
  geometry:{type:"LineString",coordinates},durationSeconds,distanceMeters
 });
 const baseline=route(coords,5400,140000);
 const calls=[];
 const session=new CarRouteSession({plan,getPin:id=>pins[id],getGuides:()=>[flag],
  calculate:async request=>{
   calls.push(request);
   if(!request.shapePoints)return baseline;
   const shape=request.shapePoints[0];
   return route([coords[0],[shape.lng,shape.lat],coords[1]],6000,150000);
  },onChange:()=>{},onError:assert.fail,onGuideWarning:assert.fail});
 await session.recalculate();
 assert.equal(calls.length,3);
 assert.deepEqual(calls.map(call=>call.waypoints),Array(3).fill([pins.a,pins.z]));
 assert.ok(calls.slice(1).every(call=>call.shapePoints[0].lng!==flag.lng));
 const result=session.snapshot();
 assert.deepEqual(result.ids,["a","z"]);
 assert.equal(result.legs.length,1);
 assert.equal(result.legs[0].durationSeconds,6000);
});

test("wide flags need no reroute and a flag that requires too much detour preserves the baseline",()=>{
 const {assignGuides,candidates,selectLeg}=require("../domain/route-guide-corridor.js");
 const route=(coordinates,durationSeconds)=>({geometry:{coordinates},durationSeconds,distanceMeters:100000});
 const baseline=route([[9,48],[10,48]],3600);
 const flag={lat:48.10,lng:9.5,radiusMeters:15000};
 assert.deepEqual(candidates(assignGuides([baseline],[flag])[0]),[]);
 flag.radiusMeters=4000;
 const assigned=assignGuides([baseline],[flag])[0];
 assert.equal(candidates(assigned).length,2);
 const nearby=route([[9,48],[9.5,48.09],[10,48]],3800);
 const excessive=route(nearby.geometry.coordinates,20000);
 assert.equal(selectLeg(baseline,[excessive],assigned),baseline);
 assert.equal(selectLeg(baseline,[excessive,nearby],assigned),nearby);
});

test("removing a flag or an older route calculation cannot replace the current baseline",async()=>{
 const plan=new ActiveCarRoute();
 plan.setEndpoint("start","a");plan.setEndpoint("target","z");
 let flags=[{lat:48.5,lng:9.8,radiusMeters:6000}],finishProbe,beginProbe;
 const pending=new Promise(resolve=>{finishProbe=resolve;});
 const begun=new Promise(resolve=>{beginProbe=resolve;});
 const pins={a:{lat:48,lng:9},z:{lat:49,lng:10}};
 const geometry={coordinates:[[9,48],[10,49]]};
 const baseline={geometry,durationSeconds:5400,distanceMeters:140000};
 const session=new CarRouteSession({plan,getPin:id=>pins[id],getGuides:()=>flags,
  calculate:request=>{if(!request.shapePoints)return Promise.resolve(baseline);beginProbe();return pending;},
  onChange:()=>{},onError:assert.fail});
 const old=session.recalculate();
 await begun;
 flags=[];
 await session.recalculate();
 finishProbe({...baseline,durationSeconds:6000,geometry:{coordinates:[[9,48],[9.8,48.5],[10,49]]}});
 await old;
 assert.equal(session.snapshot().legs[0].geometry,geometry);
});

test("ferries form their own stages and restart the driving clock after each crossing",async()=>{
 const plan=new ActiveCarRoute();
 plan.setEndpoint("start","a");plan.setEndpoint("target","z");
 const stages=[false,true,false,true,false];
 const coords=Array.from({length:6},(_,i)=>[9+i/10,48]);
 const sessions=[];
 const session=new CarRouteSession({plan,getPin:id=>({id,lat:48,lng:id==="a"?9:9.5}),
  calculate:async()=>({geometry:{type:"LineString",coordinates:coords},distanceMeters:50000,
   durationSeconds:12600,timeSections:stages.map((ferry,i)=>({ferry,seconds:ferry?900:3600,
    distanceMeters:10000,coordinates:coords.slice(i,i+2)}))}),
  onChange:snapshot=>sessions.push(snapshot),onError:assert.fail});
 await session.recalculate();
 const {legs,timeMarkers}=sessions.at(-1);
 assert.deepEqual(legs.map(leg=>leg.ferry),stages);
 assert.deepEqual(legs.map(leg=>leg.durationSeconds),[3600,900,3600,900,3600]);
 assert.deepEqual(timeMarkers.map(marker=>marker.hour),[null,1,null,1,null,1]);
 assert.equal(legs[0].fromId,"a");
 assert.equal(legs[4].toId,"z");
 assert.deepEqual(legs.map(leg=>leg.geometry.coordinates),stages.map((_,i)=>coords.slice(i,i+2)));
 session.setTimeProfile("slow");
 assert.deepEqual(session.snapshot().legs.map(leg=>leg.durationSeconds),[4680,900,4680,900,4680]);
});

test("a longer route that approaches a distant direction flag can win outside its radius",()=>{
 const {assignGuides,selectLeg}=require("../domain/route-guide-corridor.js");
 const baseline={mode:"bicycle",multiLaneMeters:0,geometry:{coordinates:[[9,48],[10,48]]},
  durationSeconds:3600,distanceMeters:80000};
 const closer={...baseline,geometry:{coordinates:[[9,48],[9.5,48.22],[10,48]]},
  durationSeconds:5600,distanceMeters:120000};
 const guides=assignGuides([baseline],[{lat:48.30,lng:9.5,radiusMeters:4000}])[0];
 assert.equal(selectLeg(baseline,[closer],guides),closer);
 assert.equal(selectLeg(baseline,[{...closer,multiLaneMeters:300}],guides),baseline);
});
