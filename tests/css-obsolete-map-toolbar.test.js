"use strict";
/* The retired independent toolbar must not compete with Leaflet controls.
 * The current map uses Leaflet zoom/fit and standalone overlay buttons.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
test("obsolete map-controls toolbar has no CSS or DOM ownership",()=>{
  const uncommented=css.replace(/\/\*[\s\S]*?\*\//g,"");
  assert.doesNotMatch(uncommented,/\.map-controls\b/);
  assert.doesNotMatch(html,/class=["'][^"']*\bmap-controls\b/);
  assert.match(html,/id="map"/);
  assert.match(uncommented,/\.pin-zoom-buttons\{/);
  assert.match(uncommented,/#app #basemapButton\.basemap-map-button\.p2m-icon-control\{/);
});
