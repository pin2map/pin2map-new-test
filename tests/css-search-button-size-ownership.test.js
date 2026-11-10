"use strict";
/* Search action has a 42px tappable element, but an independent 30px visible
 * outline. Keep the 18px magnifier unchanged; never conflate these sizes.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
test("search action has independent tap size, ring size and unchanged magnifier",()=>{
  for(const token of ["--p2m-search-tap-size","--p2m-search-ring-size","--p2m-search-icon-size"]){
    assert.equal((clean.match(new RegExp(token+"\\s*:","g"))||[]).length,1,token);
  }
  assert.match(clean,/:root\{\s*--p2m-search-tap-size:42px;\s*--p2m-search-ring-size:30px;\s*--p2m-search-icon-size:18px;/);
  assert.match(clean,/#app #searchButton\.p2m-icon-control\{\s*--p2m-button-size:var\(--p2m-search-tap-size\);\s*--p2m-icon-size:var\(--p2m-search-icon-size\);\s*flex:0 0 var\(--p2m-search-tap-size\);\s*\}/);
  assert.doesNotMatch(clean,/#app button:is\([^)]*#searchButton/);
  assert.match(clean,/#app button:is\(#settingsButton,#refreshButton,#layersButton,#labelsToggle,#basemapButton\),/);
  assert.match(html,/id="searchButton"/);
});
test("only the pseudo-element draws the small outer circle",()=>{
  assert.match(clean,/\.topbar \.search button\.p2m-icon-control\{\s*position:relative;\s*box-shadow:none;\s*border-color:transparent!important;\s*--p2m-button-bg:transparent;/);
  assert.match(clean,/\.topbar \.search button\.p2m-icon-control::before\{[\s\S]*?top:50%;left:50%;\s*transform:translate\(-50%,-50%\);\s*box-sizing:border-box;[\s\S]*?width:var\(--p2m-search-ring-size\);[\s\S]*?height:var\(--p2m-search-ring-size\);[\s\S]*?border:1px solid #aebfce;[\s\S]*?pointer-events:none;/);
  assert.match(clean,/\.topbar \.search button\.p2m-icon-control \.p2m-lucide\{\s*position:relative;\s*z-index:1;/);
});
test("no historical fixed submit button flex or height competes",()=>{
  const rules=[...clean.matchAll(/(?:^|\n)\s*(?:\.search button|\.topbar \.search button)\{([^{}]*)\}/g)].map(m=>m[1]);
  assert.ok(rules.length>=2);
  for(const rule of rules)assert.doesNotMatch(rule,/(?:^|;)\s*(?:flex|flex-basis|height)\s*:/);
});
