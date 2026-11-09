"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const model=require("../domain/project-model.js");
const layers=require("../application/layer-operations.js");
test("new layer names and duplicate names",()=>{
 const state=model.defaultProject();
 assert.equal(layers.nextName(state),"Ebene 2");
 assert.throws(()=>layers.create(state,{id:"a",name:" privat ",cleanText:model.cleanText,colors:model.DEFAULT_COLORS}),/Duplicate/);
 const created=layers.create(state,{id:"a",name:"Reisen",cleanText:model.cleanText,colors:model.DEFAULT_COLORS});
 assert.equal(created.visible,true);
 assert.throws(()=>layers.create(state,{id:"b",name:"REISEN",cleanText:model.cleanText,colors:model.DEFAULT_COLORS}),/Duplicate/);
 assert.equal(state.layers.length,3);
});
test("private layer is never deleted and private pins require confirmation",()=>{
 const state=model.defaultProject();
 assert.equal(layers.deletionInfo(state,"private","private").allowed,false);
 assert.equal(layers.deleteLayerOrPins(state,"private","private"),null);
 state.pins.push({id:"p",layerId:"private"});
 assert.deepEqual(layers.deleteLayerOrPins(state,"private","private").removedPinIds,["p"]);
 assert.ok(layers.find(state,"private"));assert.equal(state.pins.length,0);
});
test("deleting another layer removes only assigned pins",()=>{
 const state=model.defaultProject();
 state.pins.push({id:"a",layerId:"layer-1"},{id:"b",layerId:"private"});
 const result=layers.deleteLayerOrPins(state,"layer-1","private");
 assert.deepEqual(result.removedPinIds,["a"]);
 assert.equal(state.pins.length,1);assert.equal(state.pins[0].id,"b");
 assert.equal(layers.find(state,"layer-1"),null);
});
