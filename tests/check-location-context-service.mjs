import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {KINDS,LocationContextService}=require("../application/location-context-service.js");
const svc=new LocationContextService();
for(const kind of Object.values(KINDS)){
 assert.equal(svc.isAvailable(kind),false);
 await assert.rejects(()=>svc.load(kind,{lat:1,lng:2}),/No context provider/);
}
assert.throws(()=>svc.register("photography",{load:()=>null}),RangeError);
assert.throws(()=>svc.register(KINDS.WEATHER,{}),TypeError);
let captured;
svc.register(KINDS.ELEVATION,{async load(req){captured=req;return {height:123};}});
assert.deepEqual(await svc.load(KINDS.ELEVATION,{lat:48,lng:9}),{height:123});
assert.deepEqual(captured,{lat:48,lng:9});
assert.equal(svc.isAvailable(KINDS.DAYLENGTH),false);
console.log("Location context: weather/elevation/sun/daylength/timezone independent and unconfigured by default.");
