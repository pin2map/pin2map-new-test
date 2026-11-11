"use strict";
/* B33: remove only the redundant isolated .topbar minimum width. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("old standalone topbar minimum width remains removed",()=>{
  assert.doesNotMatch(clean,/(?:^|\n)\.topbar\{min-width:0\}/);
  assert.match(clean,/\.search\{flex:1 1 0;min-width:0;max-width:min\(520px,100%\)\}/);
});
test("effective header min-width, dimensions and flex rules survive",()=>{
  assert.match(clean,/\.topbar\{\s*flex-wrap:nowrap;align-items:center;justify-content:stretch;\s*width:100%;min-width:0\s*\}/);
  assert.match(clean,/\.topbar\{\s*position:absolute!important;z-index:1100;[\s\S]*?display:flex!important;flex-direction:row!important;/);
  assert.match(clean,/#app \.topbar\{\s*height:52px!important;\s*padding:4px 5px!important;/);
});
