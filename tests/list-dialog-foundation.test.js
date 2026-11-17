"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const palette=require("../application/layer-palette.js");
const operations=require("../application/layer-operations.js");
const Core=require("../ui/list-dialog-core.js");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("palette has exactly nine predecessor defaults and three independent signal colors",()=>{
 assert.deepEqual(palette.DEFAULT_STANDARD,[
 "#FF0000","#1E90FF","#32CD32","#FFD700","#FF8C00",
 "#8A2BE2","#8A7431","#008B8B","#8B4513"]);
 assert.deepEqual(palette.DEFAULT_SIGNALS,{red:"#F5222D",yellow:"#FFC400",green:"#19BD39"});
 const p={layers:[{id:"private",name:"Privat",color:"#808080",visible:true}]};
 assert.equal(palette.colors(p).standard.length,9);
 palette.setColor(p,"standard",0,"#abcdef");
 palette.setColor(p,"signals","red","#ff0001");
 assert.equal(palette.colors(p).standard[0],"#ABCDEF");
 assert.equal(palette.colors(p).signals.red,"#FF0001");
 assert.equal(palette.colors({layers:p.layers}).standard[0],"#FF0000",
  "Personal palette must not modify defaults");
 assert.throws(()=>palette.setColor(p,"standard",9,"#123456"));
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

test("central list reordering is reusable by Layers, Favorites and future Filters",()=>{
 const core=read("ui/list-dialog-core.js");
 const layer=read("ui/layer-view.js"),favorite=read("ui/map-favorites-panel.js");
 assert.match(core,/wireReorder\(/);
 assert.match(core,/pointerdown/);assert.match(core,/list-reorder-insert/);
 assert.match(layer,/this\.wireReorder\(/);
 assert.match(favorite,/this\.wireReorder\(/);
 assert.match(read("styles.css"),/list-reorder-active/);
});

test("Layers merge owns the helper slot and only the footer confirms or cancels",()=>{
 const html=read("index.html"),layer=read("ui/layer-view.js"),app=read("app.js");
 const p=html.slice(html.indexOf('id="layersPanel"'),html.indexOf('id="settingsPanel"'));
 const helper=p.slice(p.indexOf('id="layersHelpers"'),p.indexOf('id="layersList"'));
 const header=p.slice(p.indexOf('class="favorites-head"'),p.indexOf('id="layersHelpers"'));
 assert.equal((p.match(/id="layersUnite"/g)||[]).length,1);
 assert.ok(helper.indexOf('id="layersVisibilityCycle"')<helper.indexOf('id="layersUnite"'));
 assert.ok(helper.indexOf('id="layersUnite"')<helper.indexOf('class="layer-reorder-help"'));
 assert.doesNotMatch(header,/id="layersUnite"/);
 assert.match(header,/id="layersSearchClear"/);
 assert.match(helper,/1 Sek\. halten und an neue Pos\. verschieben\./);
 assert.match(helper,/Markieren zum Zusammenführen/);
 assert.match(app,/layerView\.footerAction\(\)/);
 assert.match(app,/layerView\.footerCancel\(\)/);
 assert.match(layer,/confirmMerge\(\)/);
 assert.match(layer,/this\.mergeMode\?"Zusammenführen":"\+ Ebene hinzufügen"/);
 assert.doesNotMatch(layer,/banner\.append\(this\.labeledButton/);
});

test("v232 saved twelve-color defaults migrate to nine predecessor colors without recoloring layers",()=>{
 const old=["#2563EB","#FFCBA4","#2AA198","#FF6F61","#8FD3FF",
  "#D9A441","#4F8A66","#7ED957","#C8A2FF","#FFE234","#9B5DE5","#FF8C32"];
 const legacy={layers:[{id:"private",color:"#808080"},{id:"a",color:old[5]}],
  colorSettings:{standard:[...old],signals:{red:"#F5222D",yellow:"#FFC400",green:"#19BD39"}}};
 assert.deepEqual(palette.colors(legacy).standard,palette.DEFAULT_STANDARD);
 assert.equal(legacy.layers[1].color,old[5],"Existing layer color is never changed by palette migration");
 legacy.colorSettings.standard[3]="#123456";
 assert.equal(palette.colors(legacy).standard[3],"#123456",
  "User customizations stay intact when legacy defaults are migrated");
 palette.setColor(legacy,"standard",0,"#abcdef");
 assert.equal(legacy.colorSettings.standard.length,9);
 assert.equal(legacy.layers[0].color,"#808080");
});
test("new nine-color allocation cycles after the ninth slot",()=>{
 const state={layers:[{id:"private",color:"#808080"}],layerAllocation:{paletteIndex:8}};
 assert.equal(palette.nextLayerColorIndex(state),0);
 state.layerAllocation.paletteIndex=11;
 assert.equal(palette.nextLayerColorIndex(state),3,
  "An older 12-color allocation index normalizes to the nine-color cycle");
});

test("new layer editor starts blank; merge control stays visible but disabled until two are marked",()=>{
 const html=read("index.html"),layer=read("ui/layer-view.js");
 assert.match(layer,/const creating=mode==="new",name=creating\?"":layer\.name/);
 assert.match(layer,/holdMs:1000/);
 assert.match(layer,/unite\.disabled=!shown\|\|this\.mergeMode/);
 assert.match(html,/id="layersUnite"[^>]*disabled/);
 assert.match(html,/1 Sek\. halten und an neue Pos\. verschieben\./);
 assert.match(html,/Markieren zum Zusammenführen\./);
 assert.doesNotMatch(html,/id="layersUnite"[^>]*class="hidden"/);
 const css=read("styles.css");
 assert.match(css,/\.layer-eye\.is-invisible svg/);
 assert.equal((css.match(/grid-template-columns:repeat\(9,minmax\(0,1fr\)\)/g)||[]).length>=2,true);
});

test("saved v236 nine-color defaults migrate pink slot to screenshot ochre, leaving existing pins alone",()=>{
 const prior=["#FF0000","#1E90FF","#32CD32","#FFD700","#FF8C00",
  "#8A2BE2","#FF1493","#008B8B","#8B4513"];
 const saved={layers:[{id:"private",color:"#808080"},{id:"existing",color:"#FF1493"}],
  colorSettings:{standard:prior.slice()}};
 assert.equal(palette.colors(saved).standard[6],"#8A7431");
 assert.equal(saved.layers[1].color,"#FF1493",
  "Previously created layers must not be recolored automatically");
 saved.colorSettings.standard[6]="#C34567";
 assert.equal(palette.colors(saved).standard[6],"#C34567",
  "A customized seventh slot is not overwritten");
});
test("temporary pink preview pins blink without animating Leaflet's hitbox",()=>{
 const css=read("styles.css"),adapter=read("map-adapter-leaflet.js");
 assert.match(adapter,/className:"pin-icon p2m-temporary-pin"/);
 assert.match(adapter,/style="color:#e64294"/);
 assert.match(css,/#map \.leaflet-marker-icon\.pin-icon\.p2m-temporary-pin \.pin-marker-shape\s*\{/);
 assert.match(css,/animation:p2m-temporary-pin-blink 1\.3s ease-in-out infinite/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)\s*\{[\s\S]*?#map \.leaflet-marker-icon\.pin-icon\.p2m-temporary-pin \.pin-marker-shape\s*\{\s*animation:none/);
 assert.doesNotMatch(css,/#map \.leaflet-marker-icon\.pin-icon\.p2m-temporary-pin\s*\{[^}]*animation:/,
  "The interactive 52x56 Leaflet marker must not animate");
});
