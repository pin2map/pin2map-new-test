"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
const view=fs.readFileSync(path.join(__dirname,"..","ui","search-results.js"),"utf8");
test("framed result chooser keeps scrollable items and dynamic bottom-button boundary",()=>{
  assert.match(css,/\.search-results\{max-height:42dvh\}/);
  assert.match(css,/\.results-items\{[^{}]*overflow-y:auto/);
  assert.match(css,/\.results-footer\{[^{}]*flex:0 0 auto/);
  assert.doesNotMatch(css,/\.search-results\{[^{}]*top:calc\(/);
  assert.match(view,/const sheetTop=box\.bottom-origin\+8/);
  assert.match(view,/const bottomEdge=this\.bottomControl\?\.getBoundingClientRect\?\.\(\)\.bottom/);
  assert.match(view,/this\.container\.style\.maxHeight=/);
});
