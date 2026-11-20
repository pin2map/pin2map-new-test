"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {CHOICES}=require("../ui/search-type-menu.js");
test("seven search modes retain accessible icon and keyboard contracts",()=>{
  assert.deepEqual(CHOICES.map(x=>[x.id,x.label,x.shortcut]),[
    ["pin","Pin","p"],["gps","GPS-Location","l"],["area","Gebiet","g"],
    ["lake","See","s"],["river","Fluss","f"],["plate","Kennzeichen","k"],
    ["objects","Suchen","u"]]);
  assert.equal(CHOICES[0].icon,"map-pin");
  assert.equal(CHOICES[1].icon,"locate-fixed");
  assert.equal(CHOICES[5].icon,"car");
  assert.equal(CHOICES[6].icon,"map-pin-search");
  for(const option of CHOICES.filter(o=>o.asset)){
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
  assert.match(icons,/"car":/);
  assert.match(icons,/"map-pin-search":/);
  assert.match(icons,/"calendar-days":/);
  assert.match(source,/const shortcutIndex=choice\.label\.toLowerCase\(\)\.indexOf\(choice\.shortcut\)/);
  assert.match(source,/this\.highlight\(null\);this\.position\(\)/);
  assert.match(source,/this\.input\.addEventListener\("focus"/);
  assert.match(source,/if\(key==="tab"&&inInput&&!e\.shiftKey\)/);
  assert.match(source,/if\(key==="enter"\)/);
  assert.match(source,/if\(inMenu\)/);
  assert.doesNotMatch(source,/\bfetch\(|\bindexedDB\b|\bL\./);
});

test("shortcuts are distinct, visible in the corresponding labels and use canonical car icon",()=>{
 const shortcuts=CHOICES.map(x=>x.shortcut);
 assert.equal(new Set(shortcuts).size,7);
 for(const choice of CHOICES)
   assert.ok(choice.label.toLowerCase().includes(choice.shortcut),
     "Missing visible shortcut in "+choice.label);
 const icons=require("../ui/lucide-icons.js");
 assert.ok(CHOICES.some(x=>x.icon==="car"));
 const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
 assert.match(css,/#app \.search-type-choice strong\{[^}]*text-decoration:underline/);
 assert.match(css,/#app #searchClear\.search-clear span::before/);
 assert.match(css,/transform:translate\(-50%,-50%\) rotate\(45deg\)/);
});
