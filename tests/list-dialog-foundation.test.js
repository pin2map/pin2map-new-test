"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const palette=require("../application/layer-palette.js");
const operations=require("../application/layer-operations.js");
const Core=require("../ui/list-dialog-core.js");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("palette has exactly twelve immutable-position defaults and three independent signal colors",()=>{
 assert.deepEqual(palette.DEFAULT_STANDARD,[
 "#2563EB","#FFCBA4","#2AA198","#FF6F61","#8FD3FF","#D9A441",
 "#4F8A66","#7ED957","#C8A2FF","#FFE234","#9B5DE5","#FF8C32"]);
 assert.deepEqual(palette.DEFAULT_SIGNALS,{red:"#F5222D",yellow:"#FFC400",green:"#19BD39"});
 const p={layers:[{id:"private",name:"Privat",color:"#808080",visible:true}]};
 assert.equal(palette.colors(p).standard.length,12);
 palette.setColor(p,"standard",0,"#abcdef");
 palette.setColor(p,"signals","red","#ff0001");
 assert.equal(palette.colors(p).standard[0],"#ABCDEF");
 assert.equal(palette.colors(p).signals.red,"#FF0001");
 assert.equal(palette.colors({layers:p.layers}).standard[0],"#2563EB",
  "Personal palette must not modify defaults");
 assert.throws(()=>palette.setColor(p,"standard",12,"#123456"));
 assert.throws(()=>palette.setColor(p,"signals","yellow","not-a-color"));
});
test("new layer color follows saved allocation index even after deletion or manual recolor",()=>{
 const p={layers:[{id:"private",name:"Privat",color:"#808080",visible:true}]};
 let index=palette.nextLayerColorIndex(p);
 assert.equal(index,0);
 const first={id:"layer-1",name:"Ebene 1",color:"#2563EB",visible:true};
 p.layers.push(first);palette.recordLayer(p,first,index);
 first.color="#FF6F61";
 p.layers=p.layers.filter(l=>l.id!=="layer-1");
 assert.equal(palette.nextLayerColorIndex(p),1,
  "Do not rewind on deletion or infer slot from manually changed display color");
 const next={id:"layer-2",name:"Ebene 2",color:"#FFCBA4",visible:true};
 p.layers.push(next);palette.recordLayer(p,next,1);
 assert.equal(palette.nextLayerColorIndex(p),2);
 assert.equal(palette.nextLayerNumber(p),3);
});
test("safe layer deletion removes pins and geometry, preserves other layers and rejects private removal",()=>{
 const p={layers:[{id:"private",name:"Privat",color:"#808080"},{id:"a",name:"A",color:"#2563EB"}],
 pins:[{id:"p1",layerId:"a"},{id:"p2",layerId:"private"}],
 areas:[{id:"g1",layerId:"a",kind:"lake"}],
 rivers:[{id:"r1",layerId:"a"}]};
 assert.equal(operations.removeEntireLayer(p,"private"),false);
 assert.equal(p.areas.length,1);
 assert.equal(operations.renameAndColor(p,"private","New","#2563EB",x=>x,palette.hex),false);
 assert.ok(operations.renameAndColor(p,"a","B","#FFCBA4",x=>x,palette.hex));
 assert.equal(p.layers[1].name,"B");
 assert.equal(operations.deleteContents(p,"a"),true);
 assert.deepEqual(p.pins.map(x=>x.id),["p2"]);
 assert.equal(p.areas.length,0);assert.equal(p.rivers.length,0);
 assert.equal(p.layers.length,2);
 assert.equal(operations.removeEntireLayer(p,"a"),true);
 assert.deepEqual(p.layers.map(x=>x.id),["private"]);
});
test("Favorites and Layers both derive all UI behavior from one shared list core",()=>{
 const fav=read("ui/map-favorites-panel.js"),layers=read("ui/layer-view.js");
 assert.match(fav,/class MapFavoritesPanel extends Core/);
 assert.match(layers,/class LayerView extends Core/);
 assert.doesNotMatch(fav,/keepEditorVisible\(\)\{/);
 assert.doesNotMatch(layers,/keepEditorVisible\(\)\{/);
 assert.doesNotMatch(fav,/addEventListener\("input",\(\)=>\{/);
 assert.match(read("ui/list-dialog-core.js"),/bindFilter\(\)/);
 assert.match(read("ui/list-dialog-core.js"),/actionEditor\(/);
 assert.match(read("ui/list-dialog-core.js"),/finishRender\(/);
 assert.match(read("ui/list-dialog-core.js"),/visualViewport/);
});
test("filter resets without hiding default entries or losing user focus",()=>{
 const names=[{name:"Arbeit",date:"11.11.2026"},{name:"Bahnhöfe",date:"12.11.2026"}];
 assert.deepEqual(Core.search(names,"Bahn",x=>x.name).map(x=>x.index),[1]);
 assert.equal(Core.search(names,"",x=>x.name).length,2);
});
