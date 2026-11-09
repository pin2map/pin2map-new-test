import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const ops=require("../application/layer-operations.js");
const project={
 layers:[{id:"private",name:"Privat",color:"#000",visible:true},{id:"a",name:"Ebene 1",color:"#111",visible:true}],
 pins:[{id:"p",layerId:"private"},{id:"q",layerId:"a"}]
};
assert.equal(ops.find(project,"a").name,"Ebene 1");
assert.equal(ops.nextName(project),"Ebene 2");
assert.throws(()=>ops.create(project,{id:"a",name:"Neu",cleanText:s=>s.trim(),colors:["#333"]}),/Duplicate/);
assert.throws(()=>ops.create(project,{id:"b",name:" Ebene 1 ",cleanText:s=>s.trim(),colors:["#333"]}),/Duplicate layer name/);
const b=ops.create(project,{id:"b",name:" Ebene 2 ",cleanText:s=>s.trim(),colors:["#333"]});
assert.equal(b.name,"Ebene 2");
assert.equal(ops.deletionInfo(project,"private","private").allowed,true);
assert.equal(ops.deleteLayerOrPins(project,"private","private").removedPinIds[0],"p");
assert.equal(ops.find(project,"private").id,"private","Private layer must remain");
assert.equal(ops.deleteLayerOrPins(project,"private","private"),null,"Cannot remove empty private layer");
assert.deepEqual(ops.deleteLayerOrPins(project,"a","private").removedPinIds,["q"]);
assert.equal(ops.find(project,"a"),null);
assert.deepEqual(project.pins,[]);
console.log("Layer operations: uniqueness, default naming, private-layer preservation and deletion pass.");
