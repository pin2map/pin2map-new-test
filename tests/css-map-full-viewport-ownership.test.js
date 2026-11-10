"use strict";
/* Map top offset belongs to the full-viewport rule, not retired header
 * heights. The overlaid search capsule must not reduce the map canvas.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("map geometry is not shortened by historical header offsets",()=>{
  const uncommented=css.replace(/\/\*[\s\S]*?\*\//g,"");
  assert.match(uncommented,/#map\{position:absolute;inset:0\}/);
  assert.match(uncommented,/#map\{inset:0;top:0!important;right:0;bottom:0;left:0\}/);
  assert.doesNotMatch(uncommented,/#map\s*\{\s*top:(?!0!important)/);
  assert.doesNotMatch(uncommented,/#map\{position:absolute;inset:0;top:/);
});
