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

test("merge is validated and retains all objects and protected layers",()=>{
 const state=model.defaultProject();
 state.layers.push({id:"a",name:"A"},{id:"b",name:"B"});
 state.pins=[{id:"p",layerId:"a"},{id:"q",layerId:"private"}];
 state.areas=[{id:"lake",kind:"lake",layerId:"a"}];
 state.rivers=[{id:"river",layerId:"a"}];
 assert.equal(layers.merge(state,["a","b"],"private"),false);
 assert.equal(layers.merge(state,["a","a"],"a"),false);
 assert.deepEqual(layers.merge(state,["a","b"],"b"),
  {targetId:"b",sourceIds:["a"],moved:{pins:1,areas:1,rivers:1}});
 assert.deepEqual(state.layers.map(x=>x.id),["private","layer-1","b"]);
 assert.equal(state.pins[0].layerId,"b");assert.equal(state.pins[1].layerId,"private");
 assert.equal(state.areas[0].layerId,"b");assert.equal(state.rivers[0].layerId,"b");
});

test("Private may be a merge source but survives even after its contents move",()=>{
 const state=model.defaultProject();
 state.pins.push({id:"p",layerId:"private"});
 state.areas.push({id:"lake",kind:"lake",layerId:"private"});
 state.rivers.push({id:"river",layerId:"private"});
 const result=layers.merge(state,["private","layer-1"],"layer-1");
 assert.deepEqual(result,{targetId:"layer-1",sourceIds:["private"],
  moved:{pins:1,areas:1,rivers:1}});
 assert.deepEqual(state.layers.map(l=>l.id),["private","layer-1"]);
 assert.deepEqual(state.pins.map(p=>p.layerId),["layer-1"]);
 assert.equal(state.areas[0].layerId,"layer-1");
 assert.equal(state.rivers[0].layerId,"layer-1");
 assert.equal(layers.merge(state,["private","layer-1"],"private"),false);
});
test("Layer reordering preserves Private in first position",()=>{
 const state=model.defaultProject();
 state.layers.push({id:"a"},{id:"b"});
 assert.equal(layers.reorder(state,"private","b"),false);
 assert.equal(layers.reorder(state,"a","private"),false);
 assert.equal(layers.reorder(state,"b","layer-1"),true);
 assert.deepEqual(state.layers.map(l=>l.id),["private","b","layer-1","a"]);
});
