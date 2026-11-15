"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {CHOICES}=require("../ui/search-type-menu.js");
test("five search modes retain accessible icon and keyboard contracts",()=>{
  assert.deepEqual(CHOICES.map(x=>[x.id,x.label,x.shortcut]),[
    ["pin","Pin",null],["gps","GPS-Standort","p"],["area","Gebiet","g"],
    ["lake","See","s"],["river","Fluss","f"]]);
  assert.equal(CHOICES[0].icon,"map-pin");
  assert.equal(CHOICES[1].icon,"locate-fixed");
  for(const option of CHOICES.slice(2)){
    const filename=path.join(__dirname,"../assets",option.asset);
    assert.match(fs.readFileSync(filename,"utf8"),/^<svg[^>]+viewBox="0 0 24 24"/);
  }
});
test("all icons are available in offline shell and search controller does not own providers",()=>{
  const sw=fs.readFileSync(path.join(__dirname,"../sw.js"),"utf8");
  const source=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
  const icons=fs.readFileSync(path.join(__dirname,"../ui/lucide-icons.js"),"utf8");
  for(const name of ["region","lake","river"])assert.ok(sw.includes('./assets/'+name+'.svg'));
  assert.match(icons,/"map-pin":/);
  assert.match(icons,/"locate-fixed":/);
  assert.match(source,/this\.highlight\(null\);this\.position\(\)/);
  assert.match(source,/this\.input\.addEventListener\("focus"/);
  assert.match(source,/if\(key==="tab"&&inInput&&!e\.shiftKey\)/);
  assert.match(source,/if\(key==="enter"\)/);
  assert.match(source,/if\(inMenu\)/);
  assert.doesNotMatch(source,/\bfetch\(|\bindexedDB\b|\bL\./);
});
