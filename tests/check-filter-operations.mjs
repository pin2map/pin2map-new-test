import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const ops=require("../application/filter-operations.js");
const filter=require("../domain/pin-filter.js");
const project={
 layers:[{id:"private",visible:true},{id:"work",visible:true}],
 pins:[{id:"a",layerId:"private"},{id:"b",layerId:"work"}]
};
assert.deepEqual(filter.visiblePins(project.pins,project.layers).map(p=>p.id),["a","b"]);
assert.equal(ops.setLayerVisible(project,"work",false),true);
assert.deepEqual(filter.visiblePins(project.pins,project.layers).map(p=>p.id),["a"]);
const futureCriterion=filter.createFilter({matches:pin=>pin.id==="b"});
assert.deepEqual(filter.visiblePins(project.pins,project.layers,futureCriterion).map(p=>p.id),[]);
assert.equal(ops.setLayerVisible(project,"missing",true),false);
assert.equal(ops.setLayerVisible(project,"work",true),true);
assert.deepEqual(filter.visiblePins(project.pins,project.layers,futureCriterion).map(p=>p.id),["b"]);
assert.equal(project.pins.length,2,"Changing filters must never mutate pin data");
console.log("Layer filter operations: visibility and generic future criterion composition pass.");
