"use strict";
/* Transitional CSS debt guard: prevents inadvertent growth while the old
   monolithic stylesheet is migrated component by component. The budget must
   only be lowered after successful verified cleanups. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const IMPORTANT_BUDGET=382; // v60: 402 original -> 382 after Layers cleanup
test("legacy CSS important debt must not grow during controlled migration",()=>{
  const count=(css.match(/!important\b/g)||[]).length;
  assert.ok(count<=IMPORTANT_BUDGET,
    "CSS !important debt grew to "+count+" from budget "+IMPORTANT_BUDGET+
    "; update the existing owning rule instead of appending overrides");
});
test("obsolete bottom-center Layers layout must stay removed",()=>{
  assert.doesNotMatch(css,/Bottom-center layer picker, as in predecessor app/);
  assert.doesNotMatch(css,/Keep Layers centered and anchor Info immediately to its left/);
});
