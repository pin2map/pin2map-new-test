"use strict";
/* B32: only the final floating-header contract owns display and direction. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("older one-row header retains wrapping and alignment without duplicate flex display/direction",()=>{
  assert.match(clean,/\.topbar\{\s*flex-wrap:nowrap;align-items:center;justify-content:stretch;\s*width:100%;min-width:0\s*\}/);
  assert.doesNotMatch(clean,/\.topbar\{\s*display:flex;flex-direction:row;flex-wrap:nowrap/);
});
test("final floating header remains the effective flex owner",()=>{
  assert.match(clean,/\.topbar\{\s*position:absolute!important;z-index:1100;[\s\S]*?display:flex!important;flex-direction:row!important;/);
  assert.match(clean,/#app \.topbar\{\s*height:52px!important;\s*padding:4px 5px!important;/);
});
