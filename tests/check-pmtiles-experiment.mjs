import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const html=readFileSync(new URL("../pmtiles-experiment-1.html",import.meta.url),"utf8");
const source=readFileSync(new URL("../pmtiles-experiment-1.js",import.meta.url),"utf8");
assert.match(html,/pmtiles-experiment-1\.js/);
assert.match(html,/pmtiles@4\.5\.0\/dist\/pmtiles\.js/);
assert.match(source,/maplibregl\.addProtocol\("pmtiles",protocol\.tile\)/);
assert.match(source,/pmtiles:\/\//);
assert.match(source,/protomaps\(vector\)ODbL_firenze\.pmtiles/);
assert.doesNotMatch(source,/indexedDB|serviceWorker|localStorage/);
assert.match(source,/"source-layer":"water"/);
assert.match(source,/"source-layer":"roads"/);
const code=source.replace(/^import .*;$/gm,"");
new vm.Script(code);
const events=[],handlers={};
const fakeMapLibre={
 addProtocol(name,fn){events.push(["protocol",name,fn]);},
 Map:class{
  constructor(opts){events.push(["map",opts]);}
  on(type,fn){handlers[type]=fn;}
  zoomIn(){}
  zoomOut(){}
  jumpTo(){}
 }
};
const element={textContent:"",classList:{toggle(){ }},addEventListener(_name,fn){this.fn=fn;}};
const sandbox={
 window:{pmtiles:{Protocol:class{constructor(){this.tile=()=>{};}}}},
 maplibregl:fakeMapLibre,
 document:{getElementById(id){return id==="status"?element:{addEventListener(){}};}}
};
vm.runInNewContext(code,sandbox);
assert.equal(events[0][0],"protocol");
assert.equal(events[0][1],"pmtiles");
assert.equal(events[1][0],"map");
assert.equal(events[1][1].style.sources.example_source.type,"vector");
assert.ok(events[1][1].style.sources.example_source.url.startsWith("pmtiles://"));
assert.equal(events[1][1].style.layers.length,4);
assert.deepEqual(Array.from(events[1][1].style.layers,l=>l["source-layer"]),["water","buildings","roads","pois"]);
console.log("PMTiles isolated protocol and vector style checks passed.");
