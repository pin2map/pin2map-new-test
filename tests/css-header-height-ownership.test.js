"use strict";
/* Header height is owned by the actual floating capsule, not the old
 * layout token that used to reserve vertical space above the map.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("legacy header-height token and computed header heights stay retired",()=>{
  const uncommented=css.replace(/\/\*[\s\S]*?\*\//g,"");
  assert.doesNotMatch(uncommented,/--header-height\b/);
  assert.doesNotMatch(uncommented,/height:calc\(var\(--header-height\)/);
  assert.match(uncommented,/#app \.topbar\{\s*height:52px!important;/);
  assert.match(uncommented,/#app \.topbar \.search\{\s*height:42px!important;/);
  assert.match(uncommented,/#map\{inset:0;top:0!important;right:0;bottom:0;left:0\}/);
});
