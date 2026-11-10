"use strict";
/* Search submit button dimensions are defined by the same shared 42px
 * map-control contract as the other circular map buttons. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
test("search control owns no competing fixed flex-basis or height",()=>{
  const rules=[...css.matchAll(/(?:^|\n)\s*(?:\.search button|\.topbar \.search button)\{([^{}]*)\}/g)].map(m=>m[1]);
  assert.ok(rules.length>=2,"Search button rules missing");
  for(const rule of rules){
    assert.doesNotMatch(rule,/(?:^|;)\s*(?:flex|flex-basis|height)\s*:/,
      "Search button sizing must use the shared control contract");
  }
  assert.match(css,/#app button:is\(#searchButton,#settingsButton,#refreshButton,#layersButton,#labelsToggle,#basemapButton\),\s*#app button\.pin-zoom-button\.p2m-icon-control\{[\s\S]*?width:var\(--p2m-map-circle-size\)!important;[\s\S]*?height:var\(--p2m-map-circle-size\)!important;[\s\S]*?flex:0 0 var\(--p2m-map-circle-size\)!important;/);
  assert.match(html,/id="searchButton"/);
});
