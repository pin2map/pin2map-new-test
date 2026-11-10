"use strict";
/* Legacy regular declarations must not compete with the established 16px
 * search input size. Keeping 16px prevents iOS input-focus zoom.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("search input font size is owned only by the active important rules",()=>{
  const source=css.replace(/\/\*[\s\S]*?\*\//g,"");
  const blocks=[...source.matchAll(/(?:^|\n)\s*(?:\.search input|\.topbar \.search input)\{([^{}]*)\}/g)].map(m=>m[1]);
  assert.ok(blocks.length>=5,"Search typography rules missing");
  const sizes=blocks.flatMap(block=>[...block.matchAll(/(?:^|;)\s*font-size:([^;}]*)/g)].map(x=>x[1]));
  assert.ok(sizes.length>=2);
  assert.ok(sizes.every(value=>value==="16px!important"),"Old search text sizes resurfaced");
  assert.match(source,/\.topbar \.search input\{font-size:16px!important;padding:5px 8px!important;/);
  assert.match(source,/@media\(max-width:630px\)\{[\s\S]*?\.topbar \.search input\{font-size:16px!important\}/);
});
