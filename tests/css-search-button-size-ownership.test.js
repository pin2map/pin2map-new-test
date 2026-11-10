"use strict";
/* Nested search action is intentionally smaller than standalone map controls:
 * a documented sizing exception, not a new trailing !important override.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
test("search button has exactly one 36px sizing owner distinct from map controls",()=>{
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
  assert.equal((clean.match(/--p2m-search-button-size\s*:/g)||[]).length,1);
  assert.match(clean,/:root\{--p2m-search-button-size:36px\}/);
  assert.match(clean,/#app #searchButton\.p2m-icon-control\{\s*--p2m-button-size:var\(--p2m-search-button-size\);\s*flex:0 0 var\(--p2m-search-button-size\);\s*\}/);
  assert.doesNotMatch(clean,/#app button:is\([^)]*#searchButton/);
  assert.match(clean,/#app button:is\(#settingsButton,#refreshButton,#layersButton,#labelsToggle,#basemapButton\),/);
  assert.match(html,/id="searchButton"/);
});
test("no older fixed search submit dimensions remain",()=>{
  const rules=[...css.matchAll(/(?:^|\n)\s*(?:\.search button|\.topbar \.search button)\{([^{}]*)\}/g)].map(m=>m[1]);
  assert.ok(rules.length>=2);
  for(const rule of rules){
    assert.doesNotMatch(rule,/(?:^|;)\s*(?:flex|flex-basis|height)\s*:/);
  }
});
