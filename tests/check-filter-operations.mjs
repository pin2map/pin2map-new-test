import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const ops=require("../application/filter-operations.js");
const filter=require("../domain/pin-filter.js");
const project={
 layers:[{id:"private",visible:true},{id:"work",visible:true}],
 pins:[{id:"a",layerId:"private",name:"Cafe"},{id:"b",layerId:"work",name:"Cafe"}]
};
assert.deepEqual(filter.visiblePins(project.pins,project.layers).map(p=>p.id),["a","b"]);
assert.equal(ops.setLayerVisible(project,"work",false),true);
assert.deepEqual(filter.visiblePins(project.pins,project.layers).map(p=>p.id),["a"]);
const matching=ops.setQuery(filter,"cafe",["name"]);
assert.deepEqual(filter.visiblePins(project.pins,project.layers,matching).map(p=>p.id),["a"]);
assert.equal(ops.setLayerVisible(project,"missing",true),false);
assert.equal(ops.setLayerVisible(project,"work",true),true);
assert.deepEqual(filter.visiblePins(project.pins,project.layers,matching).map(p=>p.id),["a","b"]);
assert.equal(project.pins.length,2,"Changing a filter must never mutate pin data");
console.log("Filter operations: layer toggles, query composition, no data loss verified.");
