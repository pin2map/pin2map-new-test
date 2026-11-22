"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const create=require("../ui/geometry-search-controller.js");
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function fixture(overrides={}){
 const calls=[],listeners=[],state={allowGeocode:true},input={focus:()=>calls.push("focus")};
 const element=id=>id==="searchInput"?input:({
   textContent:"",classList:{toggle:(...args)=>calls.push(["busy-class",...args])},
   style:{},getBoundingClientRect:()=>({left:20,top:20,bottom:45})});
 const ports={
   getElement:element,getState:()=>state,getMap:()=>({getViewport:()=>({center:{lat:50,lng:8}})}),
   areaFinder:{find:async()=>[],hierarchyAt:async()=>({rows:[],countryCode:"DE"}),
     findContaining:async()=>null},
   riverFinder:{find:async()=>[],resolve:async()=>null},
   riverGeometry:{resolve:()=>({name:"river",chains:[]})},
   plateSearch:{find:()=>[],resolve:async()=>({kind:"choices",choices:[]})},
   cancelPlace:()=>calls.push("cancelPlace"),
   hideResults:()=>calls.push("hide"),
   showResults:(rows,options)=>calls.push(["show",rows,options]),
   message:msg=>calls.push(["message",msg]),
   clearObjectPreview:()=>calls.push("clearPreview"),
   showObjectPreview:entry=>calls.push(["preview",entry]),
   showNotice:msg=>calls.push(["notice",msg]),
   ...overrides
 };
 const controller=create(ports);
 return {controller,calls,state,ports};
}
test("cancel aborts an old area request and ignores its late successful result",async()=>{
 const first=deferred(),signals=[];
 const f=fixture({areaFinder:{find:(q,{signal})=>{signals.push(signal);return first.promise;}}});
 const pending=f.controller.findGeometry("area","Harz");
 assert.equal(signals.length,1);
 f.controller.cancelGeometrySearch();
 assert.equal(signals[0].aborted,true);
 first.resolve([{name:"old",geojson:{type:"Polygon",coordinates:[]}}]);
 await pending;
 assert.ok(!f.calls.some(c=>Array.isArray(c)&&c[0]==="show"));
});
test("new area query wins over delayed previous query regardless of completion order",async()=>{
 const x=deferred(),y=deferred();
 const f=fixture({areaFinder:{find:q=>q==="old"?x.promise:y.promise}});
 const old=f.controller.findGeometry("area","old");
 const current=f.controller.findGeometry("lake","new");
 y.resolve([{name:"new lake"}]);await current;
 x.resolve([{name:"old area"}]);await old;
 const shows=f.calls.filter(c=>Array.isArray(c)&&c[0]==="show");
 assert.equal(shows.length,1);
 assert.equal(shows[0][1][0].name,"new lake");
 assert.equal(shows[0][1][0].__featureType,"lake");
});
test("partial hierarchy from cancelled request cannot overwrite point or visible results",async()=>{
 const q=deferred();let onPartial;
 const f=fixture({areaFinder:{hierarchyAt:(_p,opts)=>{onPartial=opts.onPartial;return q.promise;}}});
 const result=f.controller.findAreaAt({lat:50,lng:8});
 onPartial({countryCode:"DE",rows:[{name:"A"}]});
 assert.equal(f.controller.getAreaHierarchyPoint().lat,50);
 const before=f.calls.filter(c=>Array.isArray(c)&&c[0]==="show").length;
 f.controller.cancelGeometrySearch();
 onPartial({countryCode:"XX",rows:[{name:"stale"}]});
 q.resolve({countryCode:"XX",rows:[{name:"stale"}]});
 await result;
 assert.equal(f.calls.filter(c=>Array.isArray(c)&&c[0]==="show").length,before);
});
test("river relation preference and async resolution keep existing behavior",async()=>{
 const f=fixture({
   riverFinder:{
     find:async()=>[{osmType:"way",nameScore:10,tags:{name:"Alt"}},
       {osmType:"relation",nameScore:100,tags:{name:"Fluss"}}],
     resolve:async()=>({data:{},match:{}})
   },
   riverGeometry:{resolve:()=>({name:"Fluss",chains:[[[50,8],[51,9]]]})}
 });
 await f.controller.findGeometry("river","Fluss");
 const previews=f.calls.filter(x=>Array.isArray(x)&&x[0]==="preview");
 assert.equal(previews.length,1);
 assert.equal(previews[0][1].kind,"river");
 assert.equal(previews[0][1].label,"Fluss");
});
test("plate lookup uses local catalog without network and requires permission for geometry",async()=>{
 let resolved=0;const f=fixture({plateSearch:{
   find:()=>[{code:"AB"}],resolve:async()=>{resolved++;return {kind:"choices",choices:[]};}
 }});
 f.controller.findPlateCode("AB");
 assert.equal(f.calls.filter(c=>Array.isArray(c)&&c[0]==="show").length,1);
 f.state.allowGeocode=false;
 await f.controller.choosePlateResult({code:"AB"});
 assert.equal(resolved,0);
 assert.ok(f.calls.some(x=>Array.isArray(x)&&x[0]==="message"&&x[1].includes("Nominatim")));
});
