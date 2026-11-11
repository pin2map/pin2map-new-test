"use strict";
/* B37: obsolete original search input width must not compete with flex geometry. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("base search input retains its border/background without old 100 percent width",()=>{
  assert.match(clean,/\.search input\{min-width:0;border:0;outline:0;background:white\}/);
  assert.doesNotMatch(clean,/\.search input\{width:100%;min-width:0;/);
});
test("later flex/width and iOS typography contracts remain",()=>{
  assert.match(clean,/\.search input\{flex:1 1 0;width:0;min-width:0;text-overflow:ellipsis\}/);
  assert.match(clean,/\.topbar \.search input\{width:0;flex:1 1 auto;min-width:0;line-height:22px\}/);
  assert.match(clean,/\.topbar \.search input\{font-size:16px!important;padding:5px 8px!important;min-width:0;max-width:100%\}/);
});
