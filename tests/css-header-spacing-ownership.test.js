"use strict";
/* Floating header spacing is controlled by its final gap and capsule padding,
 * not several old desktop/mobile layout stages. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("header has just one gap and padding owner across desktop and mobile",()=>{
  const rules=[...clean.matchAll(/(?:^|\n)\s*(?:\.topbar|#app \.topbar)\{([^{}]*)\}/g)].map(m=>m[1]);
  assert.ok(rules.length>=5);
  const values=property=>rules.flatMap(rule=>
    [...rule.matchAll(new RegExp("(?:^|;)\\s*"+property+":([^;}]+)","g"))].map(x=>x[1]));
  assert.deepEqual(values("gap"),["4px!important"]);
  assert.deepEqual(values("padding"),["4px 5px!important"]);
  assert.match(clean,/#app \.topbar\{\s*height:52px!important;\s*padding:4px 5px!important;/);
});
test("mobile panel rules retain their media query after old header spacing is removed",()=>{
  assert.match(clean,/@media\(max-width:630px\)\{\s*\.panel\{right:8px\}/);
  assert.match(clean,/@media\(max-width:630px\)\{\s*:root\{[\s\S]*?#app \.topbar\{\s*left:var\(--p2m-top-search-clearance\)!important;/);
});
