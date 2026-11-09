import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const model=require("../domain/project-model.js");
const p=model.defaultProject();
assert.equal(p.layers[0].id,"private");
assert.ok(p.layers.some(layer=>layer.id==="private"));
assert.notEqual(p.layers,model.defaultProject().layers,"Each default project must be independent");
assert.deepEqual(p.pins,[]);
assert.equal(model.cleanText("  abc  "),"abc");
assert.equal(model.cleanText("x".repeat(150)).length,120);
assert.deepEqual(model.position(48.7758,9.1829),{lat:48.7758,lng:9.1829});
assert.deepEqual(model.pointToGeoJSON({lat:48.7758,lng:9.1829}),{
 type:"Point",coordinates:[9.1829,48.7758]
});
assert.deepEqual(model.pointFromGeoJSON({type:"Point",coordinates:[9.1829,48.7758]}),{
 lat:48.7758,lng:9.1829
});
assert.throws(()=>model.position(94,5),RangeError);
assert.throws(()=>model.position(2,190),RangeError);
assert.throws(()=>model.pointFromGeoJSON({type:"LineString",coordinates:[]}),TypeError);
assert.equal(model.validatePinLayer({layerId:"private"},p.layers),true);
assert.equal(model.validatePinLayer({layerId:["private","layer-1"]},p.layers),false);
assert.equal(model.validatePinLayer({layerId:"missing"},p.layers),false);
console.log("Pure project-model tests passed");
