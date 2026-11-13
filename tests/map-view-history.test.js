"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {MapViewHistory,LIMIT}=require("../application/map-view-history.js");
const view=n=>({center:{lat:10+n/100,lng:20+n/100},zoom:6+n%8});
test("exactly twenty backwards and forwards steps, no more",()=>{
  const h=new MapViewHistory();
  h.load(null,view(0));
  for(let i=1;i<=25;i++)h.push(view(i));
  assert.equal(h.entries.length,21);
  for(let i=0;i<LIMIT;i++)assert.ok(h.undo());
  assert.equal(h.canUndo(),false);
  assert.deepEqual(h.current(),view(5));
  for(let i=0;i<LIMIT;i++)assert.ok(h.redo());
  assert.equal(h.canRedo(),false);
  assert.deepEqual(h.current(),view(25));
});
test("new navigation from an undone position discards only the redo branch",()=>{
  const h=new MapViewHistory();h.load(null,view(0));
  h.push(view(1));h.push(view(2));h.push(view(3));
  assert.deepEqual(h.undo(),view(2));
  assert.deepEqual(h.undo(),view(1));
  h.push(view(10));
  assert.equal(h.canRedo(),false);
  assert.deepEqual(h.undo(),view(1));
  assert.deepEqual(h.redo(),view(10));
});
test("history survives serialization and reload including its current pointer",()=>{
  const h=new MapViewHistory();
  h.load(null,view(0));
  h.push(view(1));h.push(view(2));h.undo();
  const copy=new MapViewHistory();
  assert.deepEqual(copy.load(JSON.parse(JSON.stringify(h.serialize())),view(10)),view(1));
  assert.deepEqual(copy.redo(),view(2));
});
test("identical viewport changes never create fake history entries",()=>{
  const h=new MapViewHistory();h.load(null,view(0));
  assert.equal(h.push(view(0)),false);
  assert.equal(h.entries.length,1);
  assert.equal(h.canUndo(),false);
});
