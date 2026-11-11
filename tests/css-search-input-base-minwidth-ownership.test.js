"use strict";
/* B38: initial input does not duplicate the final minimum-width contract. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("base search input has no unnecessary minimum width",()=>{
  assert.match(clean,/\.search input\{border:0;outline:0;background:white\}/);
  assert.doesNotMatch(clean,/\.search input\{min-width:0;border:0;/);
});
test("effective minimum width, flexible search field and search capsule stay intact",()=>{
  assert.match(clean,/\.search input\{flex:1 1 0;width:0;min-width:0;text-overflow:ellipsis\}/);
  assert.match(clean,/\.topbar \.search input\{font-size:16px!important;padding:5px 8px!important;min-width:0;max-width:100%\}/);
  assert.match(clean,/#app \.topbar \.search\{\s*height:42px!important;/);
});
