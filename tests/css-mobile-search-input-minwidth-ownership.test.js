"use strict";
/* B35: old mobile input minimum width is redundant; current input geometry remains. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("old mobile-only search input minimum width stays removed",()=>{
  assert.doesNotMatch(clean,/@media\(max-width:630px\)\{\s*\.search\{width:100%;max-width:none;margin:0;min-width:0\}\s*\.search input\{min-width:0\}/);
  assert.match(clean,/@media\(max-width:630px\)\{\s*\.search\{width:100%;max-width:none;margin:0;min-width:0\}\s*\.search-results\{max-height:42dvh\}/);
});
test("effective input flex, width, typography and padding still apply",()=>{
  assert.match(clean,/\.search input\{flex:1 1 0;width:0;min-width:0;text-overflow:ellipsis\}/);
  assert.match(clean,/\.topbar \.search input\{font-size:16px!important;padding:5px 8px!important;min-width:0;max-width:100%\}/);
  assert.match(clean,/#app \.topbar \.search\{\s*height:42px!important;/);
});
