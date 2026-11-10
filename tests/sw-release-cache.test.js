"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const sw=fs.readFileSync(path.join(__dirname,"..","sw.js"),"utf8");
test("network-first app-shell downloads use release-specific URL, not tracked query or stale plain URL",()=>{
  assert.match(sw,/const releaseURL=input=>/);
  assert.match(sw,/url\.searchParams\.set\('__p2m_release',CACHE\)/);
  assert.match(sw,/new Request\(releaseURL\(url\),\{cache:'no-store'\}\)/);
  assert.match(sw,/fetch\(new Request\(releaseURL\(request\.url\),request\),\{cache:'no-store'\}\)/);
  assert.match(sw,/await cache\.put\(canonical\.href,response\.clone\(\)\)/);
  assert.match(sw,/await cache\.match\(canonical\.href\)/);
  assert.match(sw,/request\.mode==='navigate' \? await cache\.match\('\.\/index\.html'\)/);
  assert.match(sw,/if\(isOsmTile\(url\)\)/);
  assert.ok(sw.indexOf("if(isOsmTile(url))")<sw.indexOf("releaseURL(request.url)"),
    "OSM tiles must not receive cache-busting parameters");
});
