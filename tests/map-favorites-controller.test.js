"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Controller=require("../ui/map-favorites-controller.js");
const favorites=require("../application/map-favorites.js");

function fixture(){
  const calls=[];
  const nodes=new Map();
  const doc={listeners:new Map(),createTextNode:text=>({text}),
    addEventListener(type,handler){this.listeners.set(type,handler);},
    removeEventListener(type,handler){if(this.listeners.get(type)===handler)this.listeners.delete(type);}
  };
  const element=id=>{
    if(!nodes.has(id))nodes.set(id,{
      id,disabled:false,textContent:"",
      listeners:new Map(),children:[],
      addEventListener(type,fn){this.listeners.set(type,fn);},
      removeEventListener(type,fn){if(this.listeners.get(type)===fn)this.listeners.delete(type);},
      replaceChildren(...children){this.children=children;}
    });
    return nodes.get(id);
  };
  let project={layers:[{id:"private",visible:true},{id:"other",visible:false}],
    pins:[],favorites:[],basemap:"street"};
  let viewport={center:{lat:50,lng:10},zoom:8},size={x:400,y:200};
  const points=new Map();
  let search="";
  class Panel{
    constructor(options){this.options=options;this.open=false;this.values=[];calls.push("panel:new");}
    render(values){if(values)this.values=values;calls.push("panel:render");}
    toggle(values){this.open?this.close():this.show(values);}
    show(values){this.values=values;this.open=true;this.options.onOpen();calls.push("panel:show");}
    close(){this.open=false;calls.push("panel:close");}
    start(mode){calls.push("panel:start:"+mode);}
  }
  const controller=new Controller({
    document:doc,getElement:element,icons:{mount:()=>calls.push("icon:mount"),svg:()=>({icon:"plus"})},
    Panel,favorites,getProject:()=>project,getVisiblePins:()=>project.pins,
    mapPort:{
      getSize:()=>size,getViewport:()=>viewport,project:pin=>points.get(pin.id),
      setView:(view,options)=>{calls.push("map:setView");viewport=view;assert.deepEqual(options,{animate:false});}
    },
    onSave:()=>calls.push("save"),
    onRenderProject:()=>calls.push("render-project"),
    onStopSatellite:()=>calls.push("satellite:stop"),
    onSetBasemap:()=>calls.push("basemap:set"),
    onFlushHistory:()=>calls.push("history:flush"),
    onPersistViewport:()=>calls.push("viewport:save"),
    onBeforeOpen:()=>calls.push("close-other-overlays"),
    getSearch:()=>search,onSearchChange:value=>{search=value;},
    now:()=>new Date("2026-11-22T12:00:00.000Z")
  });
  return {controller,calls,element,doc,points,
    get project(){return project;},setProject:p=>project=p,
    setViewport:value=>viewport=value,setSize:value=>size=value,
    get viewport(){return viewport;},get search(){return search;}};
}
test("name suggestion uses only visible projected pins and stable date fallback",()=>{
  const x=fixture();
  assert.equal(x.controller.suggestedName(),"Unbekannt 2026-11-22");
  x.project.pins=[{id:"out",name:"Outside"},{id:"near",name:"  Near  "},
    {id:"far",name:"Far"}];
  x.points.set("out",{x:410,y:50});x.points.set("near",{x:204,y:101});
  x.points.set("far",{x:10,y:10});
  assert.equal(x.controller.suggestedName(),"Near");
  x.project.pins=[x.project.pins[0]];
  assert.equal(x.controller.suggestedName(),"Unbekannt 2026-11-22");
});
test("panel owns interactions; exact button and outside/Escape behavior preserved",()=>{
  const x=fixture();
  const p=x.controller.bind();
  assert.equal(x.controller.bind(),p,"binding must be idempotent");
  assert.equal(x.element("favoritesAdd").children[1].text,"Ansicht hinzufügen");
  x.element("favoritesButton").listeners.get("click")();
  assert.equal(p.open,true);
  assert.deepEqual(x.calls.slice(-2),["close-other-overlays","panel:show"]);
  x.element("favoritesButton").listeners.get("click")();
  assert.equal(p.open,false);
  x.element("favoritesButton").listeners.get("click")();
  x.doc.listeners.get("pointerdown")({target:{closest:()=>false}});
  assert.equal(p.open,false,"outside click closes open panel");
  x.element("favoritesButton").listeners.get("click")();
  let prevented=false;
  x.doc.listeners.get("keydown")({key:"Escape",preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(p.open,false);
  const before=x.calls.length;
  x.element("favoritesAdd").disabled=true;
  x.element("favoritesAdd").listeners.get("click")();
  assert.equal(x.calls.length,before,"disabled add never opens editor");
  x.element("favoritesAdd").disabled=false;
  x.element("favoritesAdd").listeners.get("click")();
  assert.equal(x.calls.at(-1),"panel:start:new");
});
test("add, replace, rename, reorder and deletion retain application semantics",()=>{
  const x=fixture(),p=x.controller.bind();
  x.calls.length=0;
  p.options.onAdd("Berlin");
  assert.equal(x.project.favorites[0].name,"Berlin");
  assert.equal(x.project.favorites[0].basemap,"street");
  assert.equal(x.project.favorites[0].savedAt,"2026-11-22T12:00:00.000Z");
  assert.deepEqual(x.calls,["save","panel:render"]);
  x.calls.length=0;p.options.onRename(0,"Hamburg");
  assert.equal(x.project.favorites[0].name,"Hamburg");
  assert.deepEqual(x.calls,["save","panel:render"]);
  x.setViewport({center:{lat:48,lng:11},zoom:12});
  x.project.basemap="topo";
  p.options.onReplace(0,"Munich");
  assert.equal(x.project.favorites[0].name,"Munich");
  assert.equal(x.project.favorites[0].basemap,"topo");
  p.options.onAdd("Second");
  p.options.onReorder(0,1);
  assert.deepEqual(x.project.favorites.map(f=>f.name),["Second","Munich"]);
  p.options.onRemove(0);
  assert.deepEqual(x.project.favorites.map(f=>f.name),["Munich"]);
  p.options.onRemoveAll();
  assert.equal(x.project.favorites.length,0);
  const before=x.calls.length;p.options.onRemoveAll();
  assert.equal(x.calls.length,before,"empty deletion remains a no-op");
});
test("opening a favorite applies remembered layers/basemap then flushes view history before viewport change",()=>{
  const x=fixture(),p=x.controller.bind();
  p.options.onAdd("Stored");
  const original=x.project.favorites[0].viewport;
  x.project.layers[0].visible=false;
  x.project.basemap="satellite";
  x.calls.length=0;
  p.options.onChoose(0);
  assert.equal(x.project.layers[0].visible,true);
  assert.equal(x.project.basemap,"street");
  assert.deepEqual(x.viewport,original);
  assert.deepEqual(x.calls,["satellite:stop","basemap:set","save",
    "render-project","panel:close","history:flush","map:setView","viewport:save"]);
  x.calls.length=0;
  p.options.onChoose(10);
  assert.deepEqual(x.calls,[],"invalid favorite index has no side effects");
});
test("new layers retain visibility and missing/invalid basemap never changes current map type",()=>{
  const x=fixture(),p=x.controller.bind();
  p.options.onAdd("Stored");
  x.project.favorites[0].basemap="future-map";
  x.project.layers.push({id:"later",visible:true});
  x.project.layers[0].visible=false;
  x.calls.length=0;
  p.options.onChoose(0);
  assert.equal(x.project.layers[0].visible,true);
  assert.equal(x.project.layers[2].visible,true);
  assert.equal(x.project.basemap,"street");
  assert.ok(!x.calls.includes("basemap:set"));
  assert.ok(!x.calls.includes("satellite:stop"));
});
test("full capacity blocks add without saving or changing existing favorite records",()=>{
  const x=fixture(),p=x.controller.bind();
  for(let i=0;i<100;i++)favorites.append(x.project,
    {center:{lat:50,lng:10},zoom:8},x.project.layers,"old","Stored "+i);
  x.calls.length=0;p.options.onAdd("101");
  assert.equal(x.project.favorites.length,100);
  assert.equal(x.element("favoritesMessage").textContent,
    "Maximale Anzahl von 500 Favoriten erreicht.");
  assert.ok(!x.calls.includes("save"));
  assert.ok(!x.calls.includes("panel:render"));
});
test("controller source is bundled before app and never owns persistence or Leaflet",()=>{
  const fs=require("node:fs"),path=require("node:path");
  const root=path.resolve(__dirname,"..");
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  const sw=fs.readFileSync(path.join(root,"sw.js"),"utf8");
  const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
  const ui=fs.readFileSync(path.join(root,"ui/map-favorites-controller.js"),"utf8");
  assert.ok(html.indexOf('src="./ui/map-favorites-controller.js"')<
    html.indexOf('src="./app.js"'));
  assert.match(sw,/"\.\/ui\/map-favorites-controller\.js"/);
  assert.match(app,/favoritesPanel=favoritesController\.bind\(\)/);
  assert.doesNotMatch(ui,/\b(?:localStorage|indexedDB|Leaflet|maplibregl)\b|\bL\./);
});
