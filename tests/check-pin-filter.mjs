import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const filter=require("../domain/pin-filter.js");
const layers=[
 {id:"private",visible:true},{id:"research",visible:false},{id:"other",visible:true}
];
const pins=[
 {id:"1",layerId:"private",name:"Café Morgen"},
 {id:"2",layerId:"research",name:"Café Morgen"},
 {id:"3",layerId:"other",name:"Bahnhof"},
 {id:"4",layerId:"missing",name:"Café Morgen"},
 {id:"5",layerId:"private",name:"Schloss"}
];
assert.deepEqual(filter.visiblePins(pins,layers).map(p=>p.id),["1","3","5"]);
const optIn=filter.createFilter({matches:pin=>pin.id==="1"||pin.id==="2"});
assert.deepEqual(filter.visiblePins(pins,layers,optIn).map(p=>p.id),["1"],
 "An injected future criterion cannot expose hidden-layer pins");
assert.deepEqual(filter.visiblePins(pins,layers,filter.createFilter({matches:()=>false})),[]);
assert.deepEqual(filter.countByLayer(pins,layers),{private:2,research:1,other:1});
assert.equal(filter.isVisible(pins[3],layers),false);
assert.throws(()=>filter.createFilter({matches:"name"}),TypeError);
assert.throws(()=>filter.visiblePins(null,layers),TypeError);
console.log("Pin filtering: unchanged layer behavior and neutral future predicate port verified.");
