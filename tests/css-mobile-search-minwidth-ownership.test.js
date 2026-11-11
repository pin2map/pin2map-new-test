"use strict";
/* B34: effective minimum width belongs to the shared floating search rule. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("mobile-only duplicate search minimum width stays removed",()=>{
  assert.doesNotMatch(clean,/@media\(max-width:630px\)\{\s*\.topbar \.search\{min-width:0\}/);
  assert.match(clean,/\.topbar \.search\{width:0!important;min-width:0;flex:1 1 auto;max-width:none;margin:0!important\}/);
});
test("mobile zoom and Leaflet rules remain scoped and search geometry persists",()=>{
  assert.match(clean,/@media\(max-width:630px\)\{\s*\.leaflet-top\.leaflet-left\{top:8px;left:6px\}/);
  assert.match(clean,/\.pin-zoom-button\{width:40px;height:40px;font-size:25px!important\}/);
  assert.match(clean,/#app \.topbar \.search\{\s*height:42px!important/);
});
