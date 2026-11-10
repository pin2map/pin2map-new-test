"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
test("standalone map buttons share exactly one authoritative 42px size contract",()=>{
  assert.match(css,/#app button:is\(#settingsButton,#refreshButton,#layersButton,#labelsToggle,#basemapButton\),\s*#app button\.pin-zoom-button\.p2m-icon-control\{\s*--p2m-button-size:var\(--p2m-map-circle-size\)!important;/);
  assert.match(css,/:is\(#app > button, #app #map \.leaflet-control button\)\{\s*--p2m-button-size:var\(--p2m-map-circle-size\)!important;/);
  assert.equal((css.match(/--p2m-map-circle-size:42px/g)||[]).length,1);
  for(const stale of [
    "--p2m-button-size:33px;",
    "--p2m-button-size:35px;",
    "--p2m-button-size:46px;",
    "--p2m-button-size:40px;",
    "flex:0 0 33px!important",
    "flex:0 0 35px!important"
  ])assert.ok(!css.includes(stale),"obsolete map button value remains: "+stale);
});
test("dialog button sizes remain scoped to dialog actions",()=>{
  assert.match(css,/--p2m-pin-dialog-action-size:32px/);
  assert.match(css,/button\.close\.p2m-icon-control,button\.layer-delete\.p2m-icon-control,/);
});
