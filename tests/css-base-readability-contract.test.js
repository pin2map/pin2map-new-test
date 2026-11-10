"use strict";
/* The historic, single 4.7k-character CSS line was separated into rules
 * without changing selector order, declarations, priority or media scope.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("legacy base has manageable lines, not a single minified rule chain",()=>{
  const base=css.split("/* Mobile layout")[0];
  const lines=base.trim().split("\n");
  assert.ok(lines.length>=60,"Expected distinct base stylesheet rules");
  for(const line of lines){
    assert.ok(line.length<=300,"Base stylesheet line grew too long");
  }
  assert.match(base,/^:root\{font-family:/);
  assert.match(base,/^\.hidden\{display:none!important\}$/m);
  assert.match(base,/^@media\(max-width:630px\)\{\.topbar\{/m);
  assert.match(base,/^\}$/m);
});
