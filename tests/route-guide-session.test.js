"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {RouteGuideSession}=require("../application/route-guide-session.js");
test("Soft guide flags remain separate from hard pins, persist through injected repository port and can be deleted",()=>{
 let stored=[],n=0,refresh=0;
 const guide=new RouteGuideSession({getGuides:()=>stored,setGuides:items=>{stored=items;},makeId:()=>"g"+(++n),onChange:()=>refresh++});
 const first=guide.add({lat:46.52,lng:6.63,radiusMeters:25000});
 assert.deepEqual(first,{id:"g1",lat:46.52,lng:6.63,radiusMeters:25000});
 assert.deepEqual(guide.list(),[first]);
 const next=guide.add({lat:47.3,lng:8.5});
 assert.equal(guide.list().length,2);
 assert.equal(guide.remove(first.id),true);
 assert.deepEqual(stored,[next]);
 assert.equal(guide.remove(first.id),false);
 assert.equal(refresh,3);
 assert.throws(()=>guide.add({lat:200,lng:20}),RangeError);
});

test("Map scale sets the radius and legacy flags receive a stable default",()=>{
 const {radiusForScale}=require("../domain/route-guide-corridor.js");
 assert.equal(radiusForScale(40000),40000);
 assert.equal(radiusForScale(800),800);
 assert.equal(radiusForScale(2),350);
 assert.equal(radiusForScale(90000),80000);
 const guide=new RouteGuideSession({getGuides:()=>[{id:"old",lat:48,lng:9}],
  setGuides:()=>{},makeId:()=>"next",onChange:()=>{}});
 assert.equal(guide.list()[0].radiusMeters,10000);
});

test("Pin flag uses the regular silhouette with existing yellow fills and flag symbol",()=>{
 const {guideAppearance,appearance}=require("../ui/pin-marker-view.js");
 const html=guideAppearance();
 const body=markup=>markup.match(/<path d="([^"]+)"/)[1];
 assert.equal(body(html),body(appearance({pin:{},color:"#123456"}).html));
 assert.match(html,/fill="#fff8d6" stroke="#edb92b"/);
 assert.match(html,/data-route-icon="flag-triangle-right"/);
});
