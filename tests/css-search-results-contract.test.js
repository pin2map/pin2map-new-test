"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
test("search result list keeps its mobile scroll limit and current floating anchor",()=>{
  assert.match(css,/\.search-results\{max-height:42dvh\}/);
  assert.match(css,/\.search-results\{\s*top:calc\(53px \+ env\(safe-area-inset-top,0px\)\)!important;/);
  assert.match(css,/\.search-results\{top:calc\(51px \+ env\(safe-area-inset-top,0px\)\)!important\}/);
  assert.doesNotMatch(css,/\.search-results\{top:calc\(91px \+ env/);
  assert.doesNotMatch(css,/\.search-results\{top:calc\(var\(--header-height\)/);
});
