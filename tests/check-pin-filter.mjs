import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const filter=require("../domain/pin-filter.js");
const layers=[
 {id:"private",visible:true},{id:"research",visible:false},{id:"other",visible:true}
];
const pins=[
 {id:"1",layerId:"private",name:"Café Morgen",description:"Blick auf den Park"},
 {id:"2",layerId:"research",name:"Café Morgen",description:"Später prüfen"},
 {id:"3",layerId:"other",name:"Bahnhof",notes:"CAFE im Erdgeschoss"},
 {id:"4",layerId:"missing",name:"Café Morgen"},
 {id:"5",layerId:"private",name:"Schloss",description:"Historische Anlage"}
];
assert.deepEqual(filter.visiblePins(pins,layers).map(p=>p.id),["1","3","5"]);
const cafe=filter.createFilter({query:"  CAFÉ  "});
assert.deepEqual(filter.visiblePins(pins,layers,cafe).map(p=>p.id),["1"],
 "Hidden layers must not reappear on content match");
const note=filter.createFilter({query:"cafe",fields:["notes"]});
assert.deepEqual(filter.visiblePins(pins,layers,note).map(p=>p.id),["3"]);
assert.deepEqual(filter.visiblePins(pins,layers,filter.createFilter({query:"bahnhof",fields:["name"]})).map(p=>p.id),["3"]);
assert.deepEqual(filter.visiblePins(pins,layers,filter.createFilter({query:"nichts"})),[]);
assert.deepEqual(filter.countByLayer(pins,layers),{private:2,research:1,other:1},
 "Layer counts describe all assigned pins, including hidden ones");
assert.equal(filter.isVisible(pins[3],layers),false);
assert.throws(()=>filter.createFilter({fields:["secret"]}),TypeError);
assert.throws(()=>filter.visiblePins(null,layers),TypeError);
console.log("Pin filtering: layer visibility AND future text fields verified.");
