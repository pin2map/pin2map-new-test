import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {GeographicInformationService}=require("../application/geographic-information-service.js");
const {WatercourseService}=require("../application/watercourse-service.js");
const geo=new GeographicInformationService();
assert.equal(geo.has("weather"),false);
await assert.rejects(()=>geo.lookup("weather",{lat:48,lng:9}),/not configured/);
assert.throws(()=>geo.register("",{lookup:async()=>{}}),TypeError);
assert.throws(()=>geo.register("elevation",{}),TypeError);
let geoReq=null;
geo.register("weather",{lookup:async req=>(geoReq=req,{temperature:15})});
geo.register("daylight",{lookup:async()=>({sunrise:"07:00",sunset:"17:00"})});
assert.equal(geo.has("weather"),true);
assert.deepEqual(await geo.lookup("weather",{lat:48,lng:9}),{temperature:15});
assert.deepEqual(geoReq,{lat:48,lng:9});
assert.deepEqual(await geo.lookup("daylight",{}),{sunrise:"07:00",sunset:"17:00"});
const missing=new WatercourseService();
await assert.rejects(()=>missing.find({name:"Neckar"}),/not configured/);
await assert.rejects(()=>missing.resolve({id:"42"}),/not configured/);
const calls=[];
const rivers=new WatercourseService({
 finder:{async find(q){calls.push(["find",q]);return [{id:"river-1",name:q.name}]}},
 resolver:{async resolve(candidate){calls.push(["resolve",candidate]);return {type:"MultiLineString",coordinates:[]}}}
});
assert.deepEqual(await rivers.find({name:"Neckar"}),[{id:"river-1",name:"Neckar"}]);
assert.deepEqual(await rivers.resolve({id:"river-1"}),{type:"MultiLineString",coordinates:[]});
assert.equal(calls.length,2);
console.log("Optional geographic information and watercourse service boundaries pass.");
