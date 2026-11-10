"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
test("layer list has only four-column desktop and phone grids",()=>{
  assert.match(css,/\.layer-row\{grid-template-columns:25px 20px minmax\(0,1fr\) 30px\}/);
  assert.match(css,/@media\(max-width:630px\)\{\.layer-row\{grid-template-columns:23px 15px minmax\(0,1fr\) 28px\}\}/);
  assert.doesNotMatch(css,/\.layer-row\{grid-template-columns:25px 20px minmax\(0,1fr\) auto 30px\}/);
  assert.match(css,/\.layer-row \.layer-delete\{width:28px;height:28px;display:grid;place-items:center;/);
});
