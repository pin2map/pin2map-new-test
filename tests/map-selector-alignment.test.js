"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("map selector and refresh use the same viewport-center coordinate",()=>{
 const css=read("styles.css");
 const refresh=css.match(/#refreshButton\.refresh-map-button\.p2m-icon-control\{[\s\S]*?\}/)?.[0];
 const map=css.match(/\/\* v265 – Basemap selection[\s\S]*?#app#app > #basemapButton\.basemap-map-button\.p2m-icon-control\{[\s\S]*?\}/)?.[0];
 assert.ok(refresh&&map,"both controls must define positioning");
 for(const rule of [refresh,map]){
  assert.match(rule,/top:35dvh!important/);
  assert.match(rule,/transform:translateY\(-50%\)!important/);
  assert.match(rule,/bottom:auto!important/);
 }
 assert.match(map,/position:fixed!important/);
});
test("map selector has medium-purple normal and blue expanded states",()=>{
 const css=read("styles.css");
 const rule=css.split("/* v265 – Basemap selection")[1];
 assert.ok(rule);
 assert.match(rule,/:not\(\[aria-expanded="true"\]\)/);
 assert.match(rule,/--p2m-map-control-bg:#8052b8/);
 assert.match(rule,/--p2m-map-control-ink:#fff/);
 assert.match(css,/\[aria-expanded="true"\][\s\S]*?--p2m-map-control-bg:#1764bf/);
});
test("map selector menu is below moved control and scrolls within small viewports",()=>{
 const rule=read("styles.css").split("/* v265 – Basemap selection")[1];
 assert.match(rule,/#basemapMenu\.basemap-menu\{/);
 assert.match(rule,/top:calc\(35dvh \+ var\(--p2m-map-circle-size\) \/ 2 \+ 8px\)!important/);
 assert.match(rule,/bottom:auto!important/);
 assert.match(rule,/overflow-y:auto/);
 assert.ok(read("index.html").includes('aria-controls="basemapMenu"'));
});
