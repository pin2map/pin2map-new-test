"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const g=require("../domain/river-geometry.js");
const f=require("../domain/project-features.js");
test("predecessor joins endpoint-connected segments regardless of reversal",()=>{
  assert.deepEqual(g.join([[[0,0],[0,1]],[[0,2],[0,1]],[[0,2],[0,3]]]),
    [[[0,0],[0,1],[0,2],[0,3]]]);
});
test("river relation prefers main_stream and resolves OSM full.json nodes",()=>{
  const full={elements:[
    {type:"node",id:1,lat:2,lon:3},{type:"node",id:2,lat:2,lon:4},
    {type:"node",id:3,lat:2,lon:5},{type:"node",id:4,lat:3,lon:5},
    {type:"way",id:9,nodes:[1,2]},{type:"way",id:10,nodes:[2,3]},
    {type:"way",id:11,nodes:[3,4]},
    {type:"relation",id:42,tags:{type:"waterway",name:"Beispiel"},
      members:[{type:"way",ref:9,role:"main_stream"},
               {type:"way",ref:10,role:"main_stream"},
               {type:"way",ref:11,role:"side_stream"}]}
  ]};
  const resolved=g.resolve(full,{osmType:"relation",id:42});
  assert.equal(resolved.segmentCount,2);
  assert.equal(resolved.name,"Beispiel");
  assert.equal(resolved.chains.length,1);
  assert.deepEqual(resolved.chains[0],[[2,3],[2,4],[2,5]]);
});
test("all new features always start in private layer",()=>{
  const project={layers:[{id:"private"},{id:"other"}],pins:[]};
  const area=f.createArea(project,{id:"a",name:"See",kind:"lake",
    geometry:{type:"Polygon",coordinates:[[[10,50],[11,50],[10,51],[10,50]]]}});
  const river=f.createRiver(project,{id:"r",name:"Fluss",chains:[[[50,10],[50,11]]]});
  assert.equal(area.layerId,"private");
  assert.equal(river.layerId,"private");
  assert.equal(project.pins.length,0);
  assert.equal(f.change(project,"area","a",{layerId:"other"}).layerId,"other");
  assert.equal(f.remove(project,"river","r"),true);
  assert.equal(project.rivers.length,0);
});
