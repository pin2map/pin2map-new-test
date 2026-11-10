"use strict";
/* Older responsive padding values were superseded by the more specific
 * search-capsule contract. Do not revive those conflicting declarations.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("search input padding belongs only to the 5px/8px current owner",()=>{
  const rules=[...clean.matchAll(/(?:^|\n)\s*(?:\.search input|\.topbar \.search input)\{([^{}]*)\}/g)].map(m=>m[1]);
  assert.ok(rules.length>=5);
  const values=rules.flatMap(rule=>[...rule.matchAll(/(?:^|;)\s*padding:([^;}]+)/g)].map(m=>m[1]));
  assert.deepEqual(values,["5px 8px!important"]);
  assert.match(clean,/\.topbar \.search input\{font-size:16px!important;padding:5px 8px!important;/);
});
test("search action padding belongs only to the zero-padding current owner",()=>{
  const rules=[...clean.matchAll(/(?:^|\n)\s*(?:\.search button|\.topbar \.search button)\{([^{}]*)\}/g)].map(m=>m[1]);
  assert.ok(rules.length>=2);
  const values=rules.flatMap(rule=>[...rule.matchAll(/(?:^|;)\s*padding:([^;}]+)/g)].map(m=>m[1]));
  assert.deepEqual(values,["0!important"]);
  assert.match(clean,/\.topbar \.search button\{padding:0!important;font-size:20px!important\}/);
});
