"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("layers and info controls have only the current corner-position contract",()=>{
  assert.ok(css.includes("--p2m-top-corner-inset:12px"),"shared corner inset must exist");
  assert.ok(css.includes("--p2m-bottom-control-baseline:max("),"bottom baseline must exist");
  assert.ok(css.includes("#app #layersButton.layers-bottom-button{\n  left:auto!important;\n  right:var(--p2m-top-corner-inset)!important;"),"layers button belongs at top-right");
  assert.ok(css.includes("#app #labelsToggle.labels-toggle{\n  left:auto!important;\n  right:var(--p2m-top-corner-inset)!important;"),"info button belongs above map selector");
  assert.ok(!css.includes("Keep Layers centered and anchor Info immediately to its left"),"obsolete bottom-center arrangement must not return");
  assert.ok(!css.includes("left:calc(50% - var(--p2m-map-circle-size) / 2 - 8px - var(--p2m-map-circle-size))"),"obsolete info position must not return");
  assert.ok(!/#app #layersButton\.layers-bottom-button\s*,\s*#app #labelsToggle\.labels-toggle\s*\{\s*bottom:calc\(9px/.test(css),"obsolete mobile joint baseline must not return");
});
