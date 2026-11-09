import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const base=path.resolve(process.argv[2]||"output");
const read=(name)=>fs.readFileSync(path.join(base,name),"utf8");
const html=read("index.html");
const js=read("pmtiles-persistent-lab-v1.js");
const sw=read("offline-stuttgart-sw.js");
const register=read("offline-register.js");
const manifest=JSON.parse(read("manifest.json"));
assert.equal(manifest.mapArchiveIncluded,false);
assert.equal(manifest.status,"packaged-not-deployed-not-device-tested");
const resourcesMatch=sw.match(/const RESOURCES=(\[[^;]*\]);/);
assert.ok(resourcesMatch,"SW asset list missing");
const resources=JSON.parse(resourcesMatch[1]);
assert.equal(new Set(resources).size,resources.length,"duplicate cache entries");
for(const asset of resources){
 assert.ok(asset.startsWith("./")&&!asset.includes(".."),"unsafe asset path "+asset);
 const abs=path.resolve(base,asset);
 assert.ok(abs.startsWith(base+path.sep),"asset path escapes output");
 assert.ok(fs.statSync(abs).isFile()&&fs.statSync(abs).size>0,"missing asset "+asset);
}
for(const entry of [
 "./index.html",
 "./pmtiles-persistent-lab-v1.js",
 "./pmtiles-persistent-store-v1.js",
 "./offline-register.js",
 "./vendor/maplibre-gl.mjs",
 "./vendor/maplibre-gl.css",
 "./vendor/pmtiles.js",
 "./vendor/basemaps.js",
 "./assets/sprites/v4/light.json",
 "./assets/sprites/v4/light.png",
 "./assets/sprites/v4/light@2x.json",
 "./assets/sprites/v4/light@2x.png",
 "./assets/fonts/Noto Sans Regular/0-255.pbf",
 "./assets/fonts/Noto Sans Medium/0-255.pbf",
 "./assets/fonts/OFL.txt",
 "./assets/UPSTREAM-CREDITS.md"
])assert.ok(resources.includes(entry),"required resource omitted from SW cache: "+entry);
assert.match(sw,/event\.request\.mode==="navigate"/);
assert.match(sw,/cache\.match\("\.\/index\.html"\)/);
assert.match(sw,/url\.origin!==self\.location\.origin/);
assert.match(register,/location\.pathname\.includes\("\/offline-stuttgart-lab\/"\)/);
assert.match(register,/scope:"\.\/"/);
for(const source of [html,js]){
 assert.doesNotMatch(source,/https:\/\/(?:unpkg\.com|protomaps\.github\.io)/);
}
assert.match(html,/\.\/vendor\/maplibre-gl\.css/);
assert.match(js,/\.\/vendor\/maplibre-gl\.mjs/);
assert.match(js,/\.\/assets\/fonts\/\{fontstack\}\/\{range\}\.pbf/);
assert.match(js,/\.\/assets\/sprites\/v4\/light/);
for(const [rel,info] of Object.entries(manifest.resources)){
 const bytes=fs.readFileSync(path.join(base,rel));
 assert.equal(bytes.length,info.bytes,"manifest size mismatch "+rel);
 assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),info.sha256,"manifest digest mismatch "+rel);
}
console.log("Offline PMTiles package: paths, licences, cache coverage and SHA-256 verified ("+resources.length+" cached files).");
