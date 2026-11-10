"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
test("removed two-row search header grid may not be reintroduced",()=>{
  assert.doesNotMatch(css,/grid-template-rows:\s*35px\s+43px/);
  assert.doesNotMatch(css,/#layersButton\s*\{\s*grid-column:\s*2\s*;\s*grid-row:\s*1/);
  assert.doesNotMatch(css,/#settingsButton\s*\{\s*grid-column:\s*3\s*;\s*grid-row:\s*1/);
  assert.doesNotMatch(css,/\.topbar\s*\.search\s*\{[^{}]*grid-row\s*:/);
  assert.match(css,/#app \.topbar\s*\{\s*left:var\(--p2m-top-search-clearance\)!important;/);
  assert.match(css,/#app #layersButton\.layers-bottom-button\s*\{\s*left:auto!important;\s*right:var\(--p2m-top-corner-inset\)!important;/);
});
