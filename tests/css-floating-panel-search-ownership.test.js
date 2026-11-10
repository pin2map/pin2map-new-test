"use strict";
/* Search results and panels must keep their active floating anchor rather
 * than recovering earlier below-header offsets from the legacy base layer.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("panel has only the active vertical anchor",()=>{
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
  assert.equal((clean.match(/\.panel\{[^{}]*top:/g)||[]).length,1);
  assert.match(clean,/\.panel\{top:calc\(56px \+ env\(safe-area-inset-top,0px\)\)!important\}/);
  assert.match(clean,/\.panel\{right:8px\}/);
  assert.match(clean,/\.panel\{max-height:calc\(100dvh - 125px\)\}/);
});
test("search result anchors are exactly one general and one narrow rule",()=>{
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
  assert.equal((clean.match(/\.search-results\{[^{}]*top:/g)||[]).length,2);
  assert.match(clean,/\.search-results\{\s*top:calc\(53px \+ env\(safe-area-inset-top,0px\)\)!important;/);
  assert.match(clean,/\.search-results\{top:calc\(51px \+ env\(safe-area-inset-top,0px\)\)!important\}/);
  assert.match(clean,/\.search-results\{max-height:42dvh\}/);
});
