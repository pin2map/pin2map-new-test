import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const builder=read("scripts/assemble-offline-lab.py");
const app=read("pmtiles-persistent-lab-v1.js");
const html=read("pmtiles-persistent-lab-v1.html");
const store=read("pmtiles-persistent-store-v1.js");
assert.match(builder,/OUTPUT = Path\("output"\)/);
for(const url of [
 "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs",
 "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
 "https://protomaps.github.io/basemaps-assets/sprites/v4/light"
])assert.ok(builder.includes(url),"builder must replace CDN URL: "+url);
assert.match(builder,/\.\/vendor\/maplibre-gl\.mjs/);
assert.match(builder,/\.\/assets\/fonts\/\{fontstack\}\/\{range\}\.pbf/);
assert.match(builder,/\.\/assets\/sprites\/v4\/light/);
assert.match(builder,/serviceWorker\.register\("\.\/offline-stuttgart-sw\.js"/);
assert.match(builder,/scope:"\.\/"/);
assert.match(builder,/url\.origin!==self\.location\.origin/);
assert.match(builder,/CACHE|RESOURCES/);
assert.match(builder,/cache\.addAll\(RESOURCES\)/);
assert.match(builder,/event\.request\.mode==="navigate"/);
assert.match(builder,/cache\.match\("\.\/index\.html"\)/);
assert.match(builder,/location\.pathname\.includes\("\/offline-stuttgart-lab\/"\)/);
assert.match(builder,/version_hash = hashlib\.sha256\(\)/);
assert.match(builder,/json\.dumps\(cache_version\)/);
assert.match(builder,/mapArchiveIncluded":False/);
assert.match(builder,/packaged-not-deployed-not-device-tested/);
assert.match(app,/Pin2MapPMTilesLabStore/);
assert.match(store,/pin2map-pmtiles-persistent-lab-v1/);
assert.match(html,/pmtiles-persistent-store-v1\.js/);
console.log("Isolated PMTiles offline package assembly contracts passed.");
