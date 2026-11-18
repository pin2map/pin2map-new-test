"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
test("one design token owns map-control diameter",()=>{
  assert.equal((css.match(/--p2m-map-circle-size:42px/g)||[]).length,1);
  assert.match(css,/:root\{\s*--p2m-map-circle-size:42px;\s*--p2m-map-control-bg:/);
});
test("bottom zoom buttons use the shared safe-area/attribution baseline",()=>{
  assert.match(css,/#map \.leaflet-bottom\.leaflet-left \.pin-zoom-buttons\{\s*margin:0 0 0 10px!important;\s*\}/);
  assert.match(css,/#map \.leaflet-bottom\.leaflet-left \.pin-zoom-buttons\{\s*margin-bottom:var\(--p2m-bottom-control-baseline\)!important;/);
  assert.doesNotMatch(css,/margin-bottom:calc\(9px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
});
test("v265 map selector uses Refresh centerline instead of the bottom-control baseline",()=>{
  const map=css.match(/#app #basemapButton\.basemap-map-button\.p2m-icon-control\{[\s\S]*?\}/)?.[0];
  const refresh=css.match(/#refreshButton\.refresh-map-button\.p2m-icon-control\{[\s\S]*?\}/)?.[0];
  assert.ok(map&&refresh);
  for(const rule of [map,refresh]){
    assert.match(rule,/top:35dvh!important/);
    assert.match(rule,/bottom:auto!important/);
    assert.match(rule,/transform:translateY\(-50%\)!important/);
  }
  assert.match(css,/#app #basemapMenu\.basemap-menu\{\s*bottom:auto!important;/);
  assert.doesNotMatch(css,/bottom:calc\(var\(--p2m-bottom-control-baseline\) \+ 50px\)!important/);
});
