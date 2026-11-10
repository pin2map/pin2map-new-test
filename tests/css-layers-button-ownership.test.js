"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
test("Layers icon owns only local typography and uses the shared map-control dimensions",()=>{
  const selector=".layers-bottom-button";
  const begin=css.indexOf(selector+"{");
  assert.ok(begin>=0,"Layers visual selector missing");
  const rule=css.slice(begin+selector.length+1,css.indexOf("}",begin));
  for(const key of ["width","height","min-width","min-height","max-width","max-height","line-height","padding","border","background","color","box-shadow","border-radius"]){
    assert.doesNotMatch(rule,new RegExp("(?:^|[;\\s])"+key+"\\s*:"),"stale styling for "+key);
  }
  assert.match(rule,/font-size:25px;text-align:center/);
  assert.doesNotMatch(css,/\.layers-bottom-button\{width:44px;height:44px;line-height:44px\}/);
  assert.match(css,/:is\(#app > button, #app #map \.leaflet-control button\)\{[\s\S]*?width:var\(--p2m-map-circle-size\)!important;/);
  assert.match(css,/#app #layersButton\.layers-bottom-button\{[\s\S]*?right:var\(--p2m-top-corner-inset\)!important;/);
});
