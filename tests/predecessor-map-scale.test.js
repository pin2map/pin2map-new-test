"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const get=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
test("predecessor native scale is renderer-owned and mounted exactly once",()=>{
  const adapter=get("map-adapter-leaflet.js"),app=get("app.js");
  assert.match(adapter,/addScaleControl\(\)/);
  assert.match(adapter,/window\.L\.control\.scale\(\{/);
  assert.match(adapter,/position:"bottomleft",metric:true,imperial:false,maxWidth:160/);
  assert.match(adapter,/if\(this\.scaleControl\)return this\.scaleControl/);
  assert.equal((app.match(/mapAdapter\.addScaleControl\(\)/g)||[]).length,1);
  assert.doesNotMatch(app,/\bL\.control\.scale\(/);
  assert.doesNotMatch(get("domain/project-model.js"),/scaleControl/);
  assert.doesNotMatch(get("adapters/storage/indexeddb-project-store.js"),/scaleControl/);
});
test("predecessor scale visual contract uses one scoped CSS owner and hides during pin editing",()=>{
  const css=get("styles.css"),start=css.indexOf("/* Predecessor map scale:");
  const added=css.slice(start,css.indexOf("/* Single-pin deletion is anchored",start));
  assert.match(added,/#map \.leaflet-control-scale\{/);
  assert.match(added,/position:fixed;left:50%;top:max\(76px/);
  assert.match(added,/max-width:600px/);
  assert.match(added,/background:rgba\(255,255,255,\.92\)/);
  assert.match(added,/color:#111;border-color:#111;border-top:0;font-weight:600/);
  assert.doesNotMatch(added,/!important/);
  assert.match(css,/body\.pin-open \.leaflet-control-container \.leaflet-control:not\(\.leaflet-control-attribution\)/);
});
