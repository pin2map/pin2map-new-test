"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("search capsule sizing belongs to final specific #app owner",()=>{
  assert.match(css,/#app \.topbar\{\s*height:52px!important;/);
  assert.match(css,/#app \.topbar \.search\{\s*height:42px!important;/);
  assert.match(css,/#app \.topbar \.search input\{\s*height:40px!important;/);
  assert.doesNotMatch(css,/height:44px!important;padding:4px 5px!important;/);
  assert.doesNotMatch(css,/height:35px!important;border-radius:9px;margin:0!important/);
  assert.doesNotMatch(css,/max-width:100%;height:35px/);
});
test("search button margin and visual styling have separate owners",()=>{
  assert.match(css,/#app \.topbar \.search button\.p2m-icon-control\{\s*margin:0 4px 0 0!important;/);
  assert.match(css,/\.topbar \.search button\.p2m-icon-control\{\s*position:relative;\s*box-shadow:none;\s*border-color:transparent!important;\s*--p2m-button-bg:transparent;/);
  assert.match(css,/\.topbar \.search button\.p2m-icon-control::before\{[\s\S]*?border:1px solid #aebfce;[\s\S]*?background:#eef3f8;/);
  assert.doesNotMatch(css,/margin:0 1px 0 0;/);
});
