"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
test("topographic tile source pins one historically used working server; street stays independent",()=>{
  const source=fs.readFileSync(path.resolve(__dirname,"../map-adapter-leaflet.js"),"utf8");
  assert.match(source,/https:\/\/a\.tile\.opentopomap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.doesNotMatch(source,/\{s\}\.tile\.opentopomap\.org/);
  assert.match(source,/https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(source,/topo:\{url:.*maxZoom:17/);
  assert.match(source,/street:\{url:.*maxZoom:19/);
  assert.match(source,/opentopomap\.org/);
});
test("live Chromium test checks actual topographic tile image decode, not menu alone",()=>{
  const browser=fs.readFileSync(path.resolve(__dirname,"browser-smoke.cjs"),"utf8");
  assert.match(browser,/img\.src\.includes\("a\.tile\.opentopomap\.org\/"\)/);
  assert.match(browser,/img\.naturalWidth>0/);
});
