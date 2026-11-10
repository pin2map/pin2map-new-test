"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("mobile header width and sides have one token-based owner",()=>{
  assert.equal((css.match(/--p2m-top-search-clearance:60px;/g)||[]).length,1);
  assert.match(css,/@media\(max-width:630px\)\{\s*:root\{\s*--p2m-top-corner-inset:10px;\s*--p2m-top-corner-offset:10px;\s*\}\s*#app \.topbar\{\s*left:var\(--p2m-top-search-clearance\)!important;\s*right:var\(--p2m-top-search-clearance\)!important;\s*width:calc\(100% - 2 \* var\(--p2m-top-search-clearance\)\)!important;/);
  assert.doesNotMatch(css,/left:60px!important;right:8px!important/);
  assert.doesNotMatch(css,/width:calc\(100% - 68px\)!important/);
});
