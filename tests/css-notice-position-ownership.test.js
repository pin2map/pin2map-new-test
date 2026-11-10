"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("notice vertical placement is owned by the floating UI rule",()=>{
  const uncommented=css.replace(/\/\*[\s\S]*?\*\//g,"");
  assert.match(uncommented,/\.notice\{top:calc\(56px \+ env\(safe-area-inset-top,0px\)\)!important\}/);
  assert.equal((uncommented.match(/\.notice\{[^{}]*top:/g)||[]).length,1,
    "the notice should have one vertical owner");
  assert.match(uncommented,/\.notice\{position:absolute;z-index:1400;left:12px;/);
  assert.match(uncommented,/\.notice\{max-width:calc\(100% - 24px\)\}/);
  assert.doesNotMatch(uncommented,/\.notice\{top:calc\(var\(--header-height\)/);
});
