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
