"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const cp=require("node:child_process");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const get=p=>fs.readFileSync(path.join(root,p),"utf8");
const index=get("index.html"),app=get("app.js"),sw=get("sw.js"),
      vector=get("vector-detection.js"),css=get("styles.css");
test("baseline only loads Leaflet, not MapLibre/OpenFreeMap",()=>{
  assert.doesNotMatch(index,/src=["'][^"']*maplibre|href=["'][^"']*maplibre/i);
  assert.doesNotMatch(sw.match(/const CORE=\[[^\]]+\]/)?.[0]||"",/vector-detection|maplibre|openfreemap/i);
  assert.match(app,/allowVectorDetection:\s*false/);
  assert.match(app,/basemap:\s*"street"/);
});
test("optional map and on-demand detector use one renderer",()=>{
  assert.match(app,/import\("\.\/vector-detection\.js"\)/);
  assert.match(vector,/getGL\(\)/);
  assert.match(vector,/if\(this\.map\)return/);
  assert.match(vector,/async display\(/);
  assert.match(vector,/container\.prepend\(this\.root\)/);
  assert.match(vector,/hide\(\)/);
  assert.match(vector,/this\.map\?\.remove\(\)/);
  assert.equal((vector.match(/new gl\.Map\(/g)||[]).length,1);
});
test("feature is explicitly optional and can return to raster",()=>{
  assert.match(index,/id="allowVectorDetection"/);
  assert.match(index,/value="vector"/);
  assert.match(index,/id="vectorLanguage"/);
  assert.match(app,/state\.allowVectorDetection=e\.target\.checked;save\(\)/);
  assert.match(app,/if\(!state\.allowVectorDetection\)stopVector\(\)/);
  assert.match(app,/vectorDetector\?\.hide\(\)/);
  assert.match(app,/setTileLayer\(\);save\(\);vectorMetric\(\)/);
  assert.match(css,/vector-detection-surface\.is-visible/);
});
test("raster pin editing remains Leaflet-controlled",()=>{
  assert.match(app,/map=L\.map\("map"/);
  assert.match(app,/L\.marker\(/);
  assert.match(app,/function addPin\(/);
  assert.match(app,/function renderMarkers\(/);
  assert.match(app,/function renderLayers\(/);
  assert.match(app,/function previewMove\(/);
});
test("Nominatim polygon is opt-in, not automatic",()=>{
  assert.match(app,/btn\.onclick=\(\)=>lookupVectorPolygon/);
  assert.match(app,/if\(!state\.allowGeocode\)/);
  assert.match(app,/polygon_geojson","1"/);
  assert.match(app,/polygon_threshold","0\.001"/);
  assert.match(app,/L\.geoJSON\(/);
});
test("UI diagnostics export and honest traffic accounting exist",()=>{
  assert.match(index,/id="vectorPerformanceExport"/);
  assert.match(app,/vectorPerformanceExport"\)\.onclick=exportVectorPerformance/);
  assert.match(app,/ResourceTiming across origins can return 0/);
  assert.match(app,/transferSize>0/);
});
test("syntax of app and service worker is valid",()=>{
  for(const file of ["app.js","sw.js"]){
    const run=cp.spawnSync(process.execPath,["--check",path.join(root,file)],{encoding:"utf8"});
    assert.equal(run.status,0,run.stderr);
  }
  const run=cp.spawnSync(process.execPath,["--input-type=module","--check"],{input:vector,encoding:"utf8"});
  assert.equal(run.status,0,run.stderr);
});
test("DOM IDs unique",()=>{
  const ids=[...index.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
});

test("Leaflet 256px and MapLibre 512px world scales align",async()=>{
  const module=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(vector));
  for(const zoom of [3,7,10,12,14,18]){
    const converted=module.leafletToMapLibreZoom(zoom);
    assert.equal(converted,zoom-1);
    assert.equal(256*2**zoom,512*2**converted);
  }
});
test("background hit testing loads required map CSS",()=>{
  assert.match(app,/await loadVectorCss\(\);[\s\S]{0,200}if\(serial!==vectorSerial/);
  assert.match(vector,/host\.prepend\(root\)/);
  assert.match(css,/#map>\.vector-detection-surface\{/);
  assert.match(css,/opacity:0!important/);
  assert.match(vector,/diagnostic=\{rawFeatures:/);
  assert.match(app,/diagnostic:result\.diagnostic/);
});
test("vector diagnostic counts use real ResourceTiming hostname matching",()=>{
  assert.match(app,/tiles\\.openfreemap\\.org/);
  assert.doesNotMatch(app,/tiles\\\\.openfreemap\\\\.org/);
});

test("visible vector map is not gated by background recognition setting",()=>{
  const fn=app.slice(app.indexOf("async function selectBasemap("),app.indexOf("const vectorStats="));
  assert.doesNotMatch(fn,/if\(serial!==vectorSerial\|\|!state\.allowVectorDetection\)return/);
  assert.match(fn,/await vectorDetector\.display\(/);
});
test("administrative geometry is an explicit Nominatim reverse request",()=>{
  assert.match(app,/async function reverseAdministrative\(/);
  assert.match(app,/zoom",String\(zoom\)/);
  assert.match(app,/polygon_geojson","1"/);
  assert.match(app,/b\.onclick=\(\)=>reverseAdministrative\(/);
  assert.match(app,/administrativeCache\.get\(key\)/);
  assert.match(app,/if\(!state\.allowGeocode\)/);
});

test("visible vector polygon is drawn in MapLibre, raster polygon in Leaflet",()=>{
  assert.match(app,/function renderActivePolygon\(\)/);
  assert.match(app,/if\(vectorEnabledView\(\)\&\&vectorDetector\?\.map\)/);
  assert.match(app,/vectorDetector\.setPolygonOverlay\(activePolygonGeometry\)/);
  assert.match(app,/vectorDetector\?\.clearPolygonOverlay\(\)/);
  assert.match(app,/function showPolygonGeometry\(geometry\)/);
  assert.match(app,/showPolygonGeometry\(geometry\)/);
  assert.match(vector,/setPolygonOverlay\(geometry\)/);
  assert.match(vector,/type:"geojson",data/);
  assert.match(vector,/id:ids\.fill,type:"fill"/);
  assert.match(vector,/id:ids\.line,type:"line"/);
  // Raster mask must not coexist with visible vector mask.
  assert.match(app,/removePolygonFromLeaflet\(\);\s*if\(vectorEnabledView/);
});
test("vector rendering of a mask adds no new network-dependent geometry request",()=>{
  const fn=vector.slice(vector.indexOf("setPolygonOverlay(geometry)"),vector.indexOf("clearPolygonOverlay()"));
  assert.doesNotMatch(fn,/fetch\(|XMLHttpRequest|new Worker/);
});
