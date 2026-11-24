"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {CarRoutingProvider,PROFILES,decodePolyline6}=require("../adapters/routing/car-routing-provider.js");
const {RoutingService,MODES}=require("../application/routing-service.js");
const geo=[[9.0,48.0],[9.1,48.1]];
const encode=pts=>{let lat=0,lng=0,out="";for(const [x,y] of pts){const next=[Math.round(y*1e6),Math.round(x*1e6)];for(let i=0;i<2;i++){let d=next[i]-(i===0?lat:lng);const v=d<0?(-d*2-1):(d*2);let n=v;while(n>=32){out+=String.fromCharCode((32|(n&31))+63);n=Math.floor(n/32)}out+=String.fromCharCode(n+63)}lat=next[0];lng=next[1]}return out};
const fakePolyline=encode(geo);
const osrm={routes:[{geometry:{type:"LineString",coordinates:geo},distance:10000,duration:780}]};
const valhalla={trip:{summary:{length:10.5,time:840,has_toll:false},legs:[{shape:fakePolyline}]}};
const points=[{lat:48,lng:9},{lat:48.1,lng:9.1}];
function client(){const calls=[];const prov=new CarRoutingProvider({fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes("router.project-osrm.org")?osrm:valhalla}}});return {calls,prov}}
test("OSRM fast is default and does not accidentally alter route via toll/highway option",async()=>{
 const {calls,prov}=client();const out=await prov.calculate({waypoints:points});
 assert.equal(out.provider,"osrm");assert.equal(out.profile,"fast");
 assert.deepEqual(out.geometry.coordinates,geo);
 assert.equal(out.distanceMeters,10000);assert.equal(out.durationSeconds,780);
 assert.match(calls[0].url,/alternatives=false/);
});
test("country profile calls Valhalla auto use_highways 0.35",async()=>{
 const {calls,prov}=client();const out=await prov.calculate({waypoints:points,profile:PROFILES.COUNTRY});
 assert.equal(out.provider,"valhalla");assert.equal(out.motorcycleModel,false);
 const payload=JSON.parse(decodeURIComponent(calls[0].url.split("?json=")[1]));
 assert.equal(payload.costing,"auto");assert.deepEqual(payload.costing_options.auto,{use_highways:0.35});
 assert.deepEqual(out.geometry.coordinates,geo);
});
test("scenic profile is motorcycle beta and does not silently claim car safety",async()=>{
 const {calls,prov}=client();
 const out=await prov.calculate({waypoints:points,profile:PROFILES.SCENIC});
 const p=JSON.parse(decodeURIComponent(calls[0].url.split("?json=")[1]));
 assert.equal(p.costing,"motorcycle");assert.equal(p.costing_options.motorcycle.use_curvature,0.85);
 assert.equal(p.costing_options.motorcycle.use_trails,0);
 assert.equal(out.motorcycleModel,true);
});
test("toll exclusion uses Valhalla auto even for fast route; no silent fallback",async()=>{
 const {calls,prov}=client();
 const out=await prov.calculate({waypoints:points,avoidTolls:true});
 const p=JSON.parse(decodeURIComponent(calls[0].url.split("?json=")[1]));
 assert.equal(p.costing,"auto");assert.equal(p.costing_options.auto.exclude_tolls,true);
 assert.equal(out.tollAvoidance,"exclude-requested");
 assert.equal(out.reportedToll,false);
 assert.equal(calls.length,1);
});
test("country and toll exclusion compose without dropping either preference",async()=>{
 const {calls,prov}=client();await prov.calculate({waypoints:points,profile:"country",avoidTolls:true});
 const p=JSON.parse(decodeURIComponent(calls[0].url.split("?json=")[1]));
 assert.deepEqual(p.costing_options.auto,{use_highways:0.35,exclude_tolls:true});
});
test("rejects invalid coordinates and invalid combination before fetching",async()=>{
 const {calls,prov}=client();
 await assert.rejects(()=>prov.calculate({waypoints:[points[0],{lat:100,lng:9}]}),RangeError);
 await assert.rejects(()=>prov.calculate({waypoints:points,profile:"anything"}),RangeError);
 await assert.rejects(()=>prov.calculate({waypoints:points,profile:"scenic",avoidTolls:true}),RangeError);
 await assert.rejects(()=>prov.calculate({waypoints:[points[0]]}),RangeError);
 assert.equal(calls.length,0);
});
test("provider HTTP failures and empty geometries are never masked",async()=>{
 const noRoute=new CarRoutingProvider({fetchImpl:async()=>({ok:false,status:400,json:async()=>({error:"No path could be found for input"})})});
 await assert.rejects(()=>noRoute.calculate({waypoints:points,avoidTolls:true}),/HTTP 400: No path/);
 const empty=new CarRoutingProvider({fetchImpl:async()=>({ok:true,json:async()=>({routes:[]})})});
 await assert.rejects(()=>empty.calculate({waypoints:points}),/no usable route/);
});
test("normalized car adapter plugs into reserved coordinator with no UI dependency",async()=>{
 const {prov}=client();const service=new RoutingService().register(MODES.CAR,prov);
 const out=await service.calculate({mode:MODES.CAR,waypoints:points,profile:"fast"});
 assert.equal(out.mode,"car");assert.equal(out.geometry.type,"LineString");
 assert.equal(service.isAvailable(MODES.BICYCLE),false);
});
test("polyline6 decoder rejects truncation and round trips coordinates",()=>{
 assert.deepEqual(decodePolyline6(fakePolyline),geo);
 assert.throws(()=>decodePolyline6(""),/Missing/);
 assert.throws(()=>decodePolyline6("?"),/Invalid/);
});

test("No-highways profile requests Valhalla exclusion and retains the separate toll option",async()=>{
 const {calls,prov}=client();
 await prov.calculate({waypoints:points,profile:PROFILES.NO_HIGHWAYS,avoidTolls:true});
 const request=JSON.parse(decodeURIComponent(calls[0].url.split("?json=")[1]));
 assert.equal(request.costing,"auto");
 assert.deepEqual(request.costing_options.auto,{exclude_highways:true,exclude_tolls:true});
});

test("corridor shape points are distinct from stop indices for OSRM and through locations for Valhalla",async()=>{
 const {calls,prov}=client();
 const shapePoints=[{lat:48.02,lng:9.06}];
 await prov.calculate({waypoints:points,shapePoints});
 const osrmUrl=new URL(calls[0].url);
 assert.match(osrmUrl.pathname,/9,48;9.06,48.02;9.1,48.1$/);
 assert.equal(osrmUrl.searchParams.get("waypoints"),"0;2");
 await prov.calculate({waypoints:points,shapePoints,profile:PROFILES.COUNTRY});
 const payload=JSON.parse(new URL(calls[1].url).searchParams.get("json"));
 assert.deepEqual(payload.locations,[{lat:48,lon:9},{lat:48.02,lon:9.06,type:"through"},{lat:48.1,lon:9.1}]);
});

test("OSRM ferry mode and Valhalla ferry-enter and exit produce separate timing sections",async()=>{
 const coords=[[9,48],[9.01,48],[9.02,48],[9.03,48],[9.04,48]];
 const steps=coords.slice(1).map((_,i)=>({distance:450,duration:120,
  mode:i===1||i===2?"ferry":"driving",name:"Testfähre",geometry:{coordinates:coords.slice(i,i+2)}}));
 const maneuvers=[3,28,8,29].map((type,i)=>({type,begin_shape_index:i,end_shape_index:i+1,time:120,length:.45,
  street_names:["Testfähre"]}));
 const data={routes:[{geometry:{type:"LineString",coordinates:coords},distance:1800,duration:480,legs:[{steps}]}],
  trip:{summary:{length:1.8,time:480},legs:[{shape:encode(coords),maneuvers}]}};
 const provider=new CarRoutingProvider({fetchImpl:async()=>({ok:true,json:async()=>data})});
 for(const profile of [PROFILES.FAST,PROFILES.COUNTRY]){
  const {timeSections}=await provider.calculate({waypoints:points,profile});
  assert.deepEqual(timeSections.map(section=>section.ferry),[false,true,true,false]);
  assert.equal(timeSections[1].ferryName,"Testfähre");
  assert.equal(timeSections[1].distanceMeters,450);
 }
});
