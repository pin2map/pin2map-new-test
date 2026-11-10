"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
test("panel uses current floating top offset instead of older header offsets",()=>{
  assert.match(css,/\.panel\{top:calc\(56px \+ env\(safe-area-inset-top,0px\)\)!important\}/);
  assert.doesNotMatch(css,/\.panel\{top:calc\(99px \+ env/);
  assert.doesNotMatch(css,/\.panel\{top:calc\(var\(--header-height\)/);
  assert.match(css,/\.panel\{max-height:calc\(100dvh - 125px\)\}/);
  assert.match(css,/#app #layersPanel\{\s*left:auto!important;\s*right:var\(--p2m-top-corner-inset\)!important;/);
});
