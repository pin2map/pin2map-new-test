"use strict";
/* B31: remove the redundant old mobile display, not the effective flex owner. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("floating header keeps its final important flex display owner",()=>{
  assert.match(clean,/\.topbar\{[\s\S]*?display:flex!important;flex-direction:row!important/);
  assert.doesNotMatch(clean,/@media\(max-width:630px\)\{\s*\.topbar\{\s*display:flex;\s*\}/);
});
test("responsive search and map control rules remain intact",()=>{
  assert.match(clean, /\.topbar \.search\{width:0!important;min-width:0;flex:1 1 auto;max-width:none;margin:0!important\}/);
  assert.doesNotMatch(clean, /@media\(max-width:630px\)\{\s*\.topbar \.search\{min-width:0\}/);
  assert.match(clean,/\.leaflet-top\.leaflet-left\{top:8px;left:6px\}/);
  assert.match(clean,/\.pin-zoom-button\{width:40px;height:40px;font-size:25px!important\}/);
});
