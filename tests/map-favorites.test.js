"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const f=require("../application/map-favorites.js");
const view=n=>({center:{lat:50+n/100,lng:10},zoom:8+n});
const layers=()=>[{id:"private",visible:true},{id:"layer-1",visible:false}];
test("100 favorites accepted; 101st rejected; deleting one frees a slot",()=>{
  const project={layers:layers(),favorites:[]};
  assert.equal(f.CAPACITY,100);
  assert.equal(f.ACTIVE_CAPACITY,100);
  for(let i=0;i<100;i++)assert.ok(
    f.append(project,view(i%12),project.layers,"2026-11-13T11:00:00.000Z",
      "Favorite "+i,"topo"));
  assert.equal(project.favorites.length,100);
  assert.equal(f.append(project,view(1),project.layers,"now","extra"),null);
  assert.equal(project.favorites[99].name,"Favorite 99");
  assert.equal(f.remove(project,49),true);
  assert.equal(project.favorites[49].name,"Favorite 50");
  assert.ok(f.append(project,view(4),project.layers,"now","new slot"));
  assert.equal(project.favorites[99].name,"new slot");
  assert.equal(project.favorites.length,100);
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

test("clear-all is explicit, destroys only saved favorites, preserves all other project data",()=>{
  const project={
    layers:layers(),pins:[{id:"p1",lat:50,lng:10,name:"Kiruna"}],
    viewport:{lat:50,lng:10,zoom:7},
    favorites:[],other:"unchanged"
  };
  for(let i=0;i<25;i++)f.append(project,view(i%12),project.layers,"now","Test "+i);
  const snapshot=JSON.stringify({...project,favorites:[]});
  assert.equal(f.removeAll(project),true);
  assert.equal(project.favorites.length,0);
  assert.equal(JSON.stringify(project),snapshot);
  assert.equal(f.removeAll(project),false,"clear-all on empty list is a no-op");
  assert.equal(f.append(project,view(1),project.layers,"now","Fresh"),"A",
    "adding after a clear starts the list afresh");
});
test("legacy project with over 100 favorites is not silently truncated",()=>{
  const project={layers:layers(),favorites:Array.from({length:101},(_,i)=>({
    ...f.capture(view(i%12),projectLayers(),"now","Preserved "+i)
  }))};
  function projectLayers(){return layers();}
  assert.equal(f.items(project).length,101);
  assert.equal(f.append(project,view(0),layers(),"now","not allowed"),null);
  assert.equal(project.favorites[100].name,"Preserved 100");
  assert.equal(f.removeAll(project),true);
  assert.equal(project.favorites.length,0);
});
