import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {MODES,RoutingService}=require("../application/routing-service.js");
const routing=new RoutingService();
for(const mode of [MODES.CAR,MODES.PEDESTRIAN,MODES.BICYCLE,MODES.TRANSIT]){
 assert.equal(routing.isAvailable(mode),false);
 await assert.rejects(()=>routing.calculate({mode}),/No routing provider/);
}
assert.throws(()=>routing.register("aircraft",{calculate:()=>null}),RangeError);
assert.throws(()=>routing.register(MODES.CAR,{}),TypeError);
const received=[];
routing.register(MODES.CAR,{async calculate(req){received.push(req);return {id:"route-1"};}});
routing.register(MODES.PEDESTRIAN,{async calculate(){return {id:"walk"};}});
routing.register(MODES.BICYCLE,{async calculate(){return {id:"cycle"};}});
routing.register(MODES.TRANSIT,{async calculate(){return {id:"public-transit"};}});
assert.equal(routing.isAvailable(MODES.CAR),true);
assert.deepEqual(await routing.calculate({mode:MODES.CAR,waypoints:[1,2]}),{id:"route-1"});
assert.deepEqual(received,[{waypoints:[1,2]}]);
assert.deepEqual(await routing.calculate({mode:MODES.TRANSIT}),{id:"public-transit"});
assert.deepEqual(await routing.calculate({mode:MODES.PEDESTRIAN}),{id:"walk"});
assert.deepEqual(await routing.calculate({mode:MODES.BICYCLE}),{id:"cycle"});
await assert.rejects(()=>routing.calculate({mode:"unknown"}),RangeError);
console.log("Routing coordinator: separate mode providers, no implicit provider, explicit error paths.");
