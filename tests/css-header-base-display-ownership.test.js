"use strict";
/* B36: floating header display is exclusively owned by its final important rule. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("base header does not duplicate effective display flex",()=>{
  assert.match(clean,/\.topbar\{position:absolute;z-index:1100;top:0;left:0;right:0;align-items:center;background:var\(--navy\);color:white;box-shadow:var\(--shadow\)\}/);
  assert.doesNotMatch(clean,/\.topbar\{position:absolute;z-index:1100;top:0;left:0;right:0;display:flex;/);
});
test("floating header still owns final flex display and direction",()=>{
  assert.match(clean,/\.topbar\{\s*position:absolute!important;z-index:1100;[\s\S]*?display:flex!important;flex-direction:row!important;/);
  assert.match(clean,/\.topbar\{\s*flex-wrap:nowrap;align-items:center;justify-content:stretch;\s*width:100%;min-width:0\s*\}/);
  assert.match(clean,/#app \.topbar\{\s*height:52px!important;\s*padding:4px 5px!important;/);
});
