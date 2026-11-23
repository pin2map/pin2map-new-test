"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {RouteGuideSession}=require("../application/route-guide-session.js");
test("Soft guide flags remain separate from hard pins, persist through injected repository port and can be deleted",()=>{
 let stored=[],n=0,refresh=0;
 const guide=new RouteGuideSession({getGuides:()=>stored,setGuides:items=>{stored=items;},makeId:()=>"g"+(++n),onChange:()=>refresh++});
 const first=guide.add({lat:46.52,lng:6.63});
 assert.deepEqual(first,{id:"g1",lat:46.52,lng:6.63});
 assert.deepEqual(guide.list(),[first]);
 const next=guide.add({lat:47.3,lng:8.5});
 assert.equal(guide.list().length,2);
 assert.equal(guide.remove(first.id),true);
 assert.deepEqual(stored,[next]);
 assert.equal(guide.remove(first.id),false);
 assert.equal(refresh,3);
 assert.throws(()=>guide.add({lat:200,lng:20}),RangeError);
});
