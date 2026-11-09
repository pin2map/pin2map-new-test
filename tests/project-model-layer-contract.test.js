"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const model=require("../domain/project-model.js");

test("pin layer membership is exactly one existing layer",()=>{
  const project=model.defaultProject();
  assert.equal(model.validatePinLayer({layerId:"private"},project.layers),true);
  assert.equal(model.validatePinLayer({layerId:"layer-1"},project.layers),true);
  assert.equal(model.validatePinLayer({layerId:["private","layer-1"]},project.layers),false);
  assert.equal(model.validatePinLayer({layerId:[]},project.layers),false);
  assert.equal(model.validatePinLayer({layerId:"missing"},project.layers),false);
  assert.equal(model.validatePinLayer({layerId:""},project.layers),false);
  assert.equal(model.validatePinLayer({layerId:null},project.layers),false);
  assert.throws(()=>model.validatePinLayer(null,project.layers),TypeError);
  assert.throws(()=>model.validatePinLayer({layerId:"private"},null),TypeError);
});
