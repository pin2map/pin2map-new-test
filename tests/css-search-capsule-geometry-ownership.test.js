"use strict";
/* The current search capsule is 42px tall with a pill radius. Retired
 * 43px/38px heights and 10px/9px/8px corners must not compete with it.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("search capsule uses only the approved 42px height",()=>{
  const rules=[...clean.matchAll(/(?:^|\n)\s*(?:\.search|\.topbar \.search|#app \.topbar \.search)\{([^{}]*)\}/g)].map(m=>m[1]);
  assert.ok(rules.length>=6);
  const heights=rules.flatMap(rule=>[...rule.matchAll(/(?:^|;)\s*height:([^;}]+)/g)].map(m=>m[1]));
  assert.deepEqual(heights,["42px!important"]);
  assert.match(clean,/#app \.topbar \.search\{\s*height:42px!important;/);
});
test("search capsule has only the active pill radius",()=>{
  const rules=[...clean.matchAll(/(?:^|\n)\s*(?:\.search|\.topbar \.search|#app \.topbar \.search)\{([^{}]*)\}/g)].map(m=>m[1]);
  const radii=rules.flatMap(rule=>[...rule.matchAll(/(?:^|;)\s*border-radius:([^;}]+)/g)].map(m=>m[1]));
  assert.deepEqual(radii,["999px!important"]);
  assert.match(clean,/\.topbar \.search\{\s*background:#fff!important;border:1px solid #e0e4e8;\s*border-radius:999px!important;overflow:hidden;/);
});
