"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
test("top corner settings uses one positioning contract",()=>{
  assert.match(css,/#app #settingsButton\.settings-map-button\.p2m-icon-control\{\s*z-index:1100;\s*\}/);
  assert.match(css,/#app #settingsButton\.settings-map-button\.p2m-icon-control,\s*#app #layersButton\.layers-bottom-button\{\s*position:absolute!important;\s*top:calc\(var\(--p2m-top-corner-offset\)/);
  assert.match(css,/#app #settingsButton\.settings-map-button\.p2m-icon-control\{\s*left:var\(--p2m-top-corner-inset\)!important;/);
  assert.doesNotMatch(css,/left:12px!important;right:auto!important;\s*top:calc\(12px \+ env\(safe-area-inset-top,0px\)\)!important/);
  assert.doesNotMatch(css,/left:10px!important;top:calc\(10px \+ env\(safe-area-inset-top,0px\)\)!important/);
});
test("map selection popup uses bottom baseline token",()=>{
  assert.match(css,/#app #basemapMenu\.basemap-menu\{\s*bottom:calc\(var\(--p2m-bottom-control-baseline\) \+ 50px\)!important;/);
  assert.doesNotMatch(css,/bottom:calc\(60px \+ env\(safe-area-inset-bottom,0px\)\)/);
  assert.doesNotMatch(css,/bottom:calc\(59px \+ env\(safe-area-inset-bottom,0px\)\)/);
});
