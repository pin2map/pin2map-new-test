"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const f=require("../application/map-favorites.js");
const view=n=>({center:{lat:50+n/100,lng:10},zoom:8+n});
const layers=()=>[{id:"private",visible:true},{id:"layer-1",visible:false}];
test("A-O trial capacity is fifteen, while 26-place A-Z storage model remains unchanged",()=>{
  const project={layers:layers(),favorites:[]};
  assert.equal(f.CAPACITY,26);
  assert.equal(f.ACTIVE_CAPACITY,15);
  for(let i=0;i<15;i++)assert.equal(
    f.append(project,view(i),project.layers,"2026-11-13T11:00:00.000Z","Hamburg","topo"),
    String.fromCharCode(65+i));
  assert.equal(f.items(project).at(-1).letter,"O");
  assert.equal(f.append(project,view(15),project.layers,"now","Boston","street"),null);
  assert.equal(project.favorites.length,15);
  assert.equal(project.favorites[0].name,"Hamburg");
  assert.equal(project.favorites[0].basemap,"topo");
  // The lückenlos index policy still applies when deleting from a full list.
  assert.equal(f.remove(project,2),true);
  assert.equal(f.items(project)[2].letter,"C");
  assert.equal(f.items(project)[2].name,"Hamburg");
  assert.equal(f.append(project,view(15),project.layers,"now","Boston","street"),"O");
});
test("deletion compacts letters and full replacement discards old record",()=>{
  const project={layers:layers(),favorites:[]};
  for(let i=0;i<5;i++)f.append(project,view(i),project.layers,"old");
  assert.equal(f.remove(project,2),true);
  assert.deepEqual(f.items(project).map(x=>x.letter),["A","B","C","D"]);
  assert.deepEqual(f.items(project)[2].viewport,view(3));
  assert.equal(f.replace(project,2,view(18),[{id:"private",visible:false}],"new"),true);
  assert.deepEqual(f.items(project)[2].viewport,view(18));
  assert.deepEqual(f.items(project)[2].layers,[{id:"private",visible:false}]);
  assert.equal(f.items(project)[2].savedAt,"new");
});
test("favorite applies only saved layer IDs; new layers keep current visibility",()=>{
  const project={layers:layers(),favorites:[]};
  f.append(project,view(0),project.layers,"then");
  project.layers=[{id:"private",visible:false},{id:"new",visible:true}];
  assert.deepEqual(f.apply(project,0),view(0));
  assert.equal(project.layers[0].visible,true);
  assert.equal(project.layers[1].visible,true);
});
test("favorites are project data but not browser-local history records",()=>{
  const project={layers:layers(),favorites:[]};
  f.append(project,view(0),project.layers,"now");
  assert.equal(project.favorites.length,1);
  assert.equal(JSON.stringify(project).includes("localMapViewHistory"),false);
});

test("rename changes only name, replacing discards previous name and basemap",()=>{
  const project={layers:layers(),favorites:[]};
  f.append(project,view(0),project.layers,"old","Near A","topo");
  assert.equal(f.rename(project,0,"  Berlin  "),true);
  assert.equal(project.favorites[0].name,"Berlin");
  assert.equal(project.favorites[0].savedAt,"old");
  assert.equal(project.favorites[0].basemap,"topo");
  assert.equal(f.replace(project,0,view(1),project.layers,"new","Munich","satellite"),true);
  assert.equal(project.favorites[0].name,"Munich");
  assert.equal(project.favorites[0].basemap,"satellite");
  assert.equal(project.favorites[0].savedAt,"new");
});
test("legacy saved favorites without name and basemap remain readable",()=>{
  const project={layers:layers(),favorites:[{viewport:view(0),layers:[],savedAt:"old"}]};
  assert.equal(f.items(project).length,1);
  assert.deepEqual(f.apply(project,0),view(0));
  assert.equal(project.favorites[0].basemap,undefined);
});
