"use strict";
/* Search button glyph uses its own Lucide icon-size token. Historic text
 * font sizes must not fight the remaining active button typography rule.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("old search button font sizes do not return",()=>{
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
  const rules=[...clean.matchAll(/(?:^|\n)\s*(?:\.search button|\.topbar \.search button)\{([^{}]*)\}/g)].map(m=>m[1]);
  assert.ok(rules.length>=2);
  const sizes=rules.flatMap(rule=>[...rule.matchAll(/(?:^|;)\s*font-size:([^;}]+)/g)].map(m=>m[1]));
  assert.deepEqual(sizes,["20px!important"]);
  assert.match(clean,/#app #searchButton\.p2m-icon-control\{\s*--p2m-button-size:var\(--p2m-search-tap-size\);\s*--p2m-icon-size:var\(--p2m-search-icon-size\);/);
  assert.match(clean,/--p2m-search-icon-size:18px;/);
});
