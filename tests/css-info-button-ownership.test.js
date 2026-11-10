"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("Info button local styling does not compete with map and bottom-corner contracts",()=>{
  const selector=".labels-toggle{";
  const i=css.indexOf(selector);
  assert.ok(i>=0,"Info rule missing");
  const rule=css.slice(i+selector.length,css.indexOf("}",i));
  assert.match(rule,/position:absolute;z-index:1100;/);
  assert.match(rule,/font-weight:700;/);
  for(const prop of ["left","right","top","bottom","width","height","padding","border","border-radius","background","color","font-size","font-family","box-shadow"]){
    assert.doesNotMatch(rule,new RegExp("(?:^|[;\\s])"+prop+"\\s*:"),"stale Info visual property "+prop);
  }
  assert.match(css,/#app #labelsToggle\.labels-toggle\{[\s\S]*?bottom:calc\(var\(--p2m-bottom-control-baseline\) \+ var\(--p2m-map-circle-size\) \+ 8px\)!important;/);
  assert.match(css,/:is\(#app > button, #app #map \.leaflet-control button\)\{[\s\S]*?width:var\(--p2m-map-circle-size\)!important;/);
});
