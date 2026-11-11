"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

function mount(){
  const records=[],removed=[],panes={};
  const map={
    getCenter:()=>({lat:48,lng:9}),getZoom:()=>6,
    removeLayer(layer){removed.push(layer);},
    getPane:id=>panes[id]||null,
    createPane(id){return panes[id]={style:{}};}
  };
  const L={
    tileLayer(url,options){
      const item={url,options,style:{},getContainer(){return {style:this.style};},
        addTo(target){assert.equal(target,map);records.push(this);return this;}};
      return item;
    }
  };
  const window={L};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../map-adapter-leaflet.js"),"utf8"),
    {window});
  return {adapter:new window.Pin2MapLeafletAdapter(map),records,removed,panes};
}
test("five historical background sources live only in the Leaflet adapter",()=>{
  const x=mount();
  const cases=[
    ["international","World_Street_Map",19],
    ["street","tile.openstreetmap.org",19],
    ["topo","a.tile.opentopomap.org",17],
    ["satellite","World_Imagery",19],
    ["humanitarian","tile.openstreetmap.fr/hot",19]
  ];
  for(const [id,host,maxZoom] of cases){
    x.adapter.setBasemap(id);
    assert.match(x.adapter.basemapLayer.url,new RegExp(host.replaceAll(".","\\.")));
    assert.equal(x.adapter.basemapLayer.options.maxZoom,maxZoom);
    assert.ok(x.adapter.basemapLayer.options.attribution);
  }
  assert.equal(x.removed.length,4);
  assert.throws(()=>x.adapter.setBasemap("invalid"),/Unknown basemap/);
});
test("historical Esri hillshade compositing, draw order, and clean off/on transitions",()=>{
  const x=mount();
  x.adapter.setBasemap("street",{esriRelief:true});
  const base=x.adapter.basemapLayer,relief=x.adapter.reliefOverlay,pane=x.panes.p2mEsriReliefPane;
  assert.equal(base.style.filter,"saturate(0.68) contrast(0.94) brightness(1.04)");
  assert.match(relief.url,/Elevation\\/World_Hillshade/);
  assert.equal(relief.options.pane,"p2mEsriReliefPane");
  assert.equal(relief.options.minZoom,1);
  assert.equal(relief.options.maxNativeZoom,15);
  assert.equal(relief.options.maxZoom,19);
  assert.equal(relief.options.opacity,1);
  assert.equal(pane.style.zIndex,"250");
  assert.equal(pane.style.pointerEvents,"none");
  assert.equal(pane.style.mixBlendMode,"multiply");
  x.adapter.setBasemap("satellite",{esriRelief:true});
  assert.ok(x.removed.includes(base));
  assert.ok(x.removed.includes(relief));
  assert.notEqual(x.adapter.reliefOverlay,relief);
  x.adapter.setBasemap("topo",{esriRelief:false});
  assert.equal(x.adapter.reliefOverlay,null);
  assert.equal(x.adapter.basemapLayer.style.filter,undefined);
});
test("UI exposes all five choices and an independently persisted overlay setting",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
  const domain=fs.readFileSync(path.join(__dirname,"../domain/project-model.js"),"utf8");
  for(const id of ["international","street","topo","satellite","humanitarian"])
    assert.match(html,new RegExp('data-basemap="'+id+'"'));
  assert.match(html,/id="esriReliefToggle"/);
  assert.match(app,/onReliefChange:enabled/);
  assert.match(app,/state\\.esriRelief=enabled;setTileLayer\\(\\);save\\(\\)/);
  assert.match(domain,/esriRelief:false/);
});
