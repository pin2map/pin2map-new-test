"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {CHOICES}=require("../ui/search-type-menu.js");
test("seven menu actions retain accessible icon and keyboard contracts",()=>{
  assert.deepEqual(CHOICES.map(x=>[x.id,x.label,x.shortcut]),[
    ["pin","Pin","p"],["gps","GPS-Location","l"],["area","Gebiet","g"],
    ["lake","See","e"],["river","Fluss","f"],["plate","Kennzeichen","k"],["objects","Markierungen Suchen","s"]]);
  assert.equal(CHOICES[0].icon,"map-pin");
  assert.equal(CHOICES[1].icon,"locate-fixed");
  assert.equal(CHOICES[5].icon,"car");
  assert.equal(CHOICES[6].icon,"scan-search");
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
  assert.match(source,/choice\.label\.toLowerCase\(\)\.indexOf\(choice\.shortcut\)/);
  assert.match(source,/this\.highlight\(null\)/);
  assert.match(source,/this\.input\.addEventListener\("focus"/);
  assert.match(source,/if\(key==="tab"&&inInput&&!e\.shiftKey\)/);
  assert.match(source,/key==="enter"/);
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

test("dedicated marker search and hardware Find use the search input",()=>{
 const src=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 assert.match(src,/choice\.id==="objects"/);
 assert.match(src,/this\.enterSearchMode\(\);this\.execute\(\)/);
 assert.match(src,/event\.metaKey\|\|event\.ctrlKey/);
 assert.match(src,/this\.input\.addEventListener\("pointerdown"/);
 assert.match(src,/this\.returnToCreation\(\)/);
});

test("Escape dismisses the chooser without the removed magnifier",()=>{
 const src=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 assert.match(src,/e\.target!==this\.clear/);
 assert.match(src,/if\(this\.searchMode\)this\.finishAndFocus\(\)/);
});

test("Escape closes stored-object search but restores focus to its cleared input",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 assert.match(source,/if\(this\.searchMode\)this\.finishAndFocus\(\)/);
 assert.match(source,/this\.exitSearchMode\(\);\s*this\.onExit\(\);\s*this\.suppressOpenOnFocus=true;\s*this\.input\.focus/);
 assert.match(source,/if\(this\.suppressOpenOnFocus\)/);
 assert.match(source,/\["hidden","Ausgeblendete Objekte"\]/);
 const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
 assert.match(css,/grid-template-columns:max-content max-content minmax\(0,1fr\)/);
});

test("creation chooser preserves the same single-column design on keyboard and every device",()=>{
 const js=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
 assert.match(css,/#app \.search-creation-choices\{display:flex;flex:0 0 auto;flex-direction:column/);
 assert.doesNotMatch(css,/keyboard-constrained \.search-creation-choices\s*\{/);
 assert.doesNotMatch(css,/keyboard-constrained \.search-type-choice\s*\{/);
 assert.doesNotMatch(js,/search-creation-scroll-hint|Weitere Optionen/);
});
test("single fixed viewport geometry fills free space without keyboard-state branches",()=>{
 const {SearchTypeMenu}=require("../ui/search-type-menu.js");
 const form={left:40,top:68,bottom:112,width:310,height:44};
 const layout=(viewport)=>SearchTypeMenu.chooserLayout({
  form,visualViewport:viewport,innerWidth:390,innerHeight:844,menuWidth:340});
 assert.deepEqual(layout(null),{left:25,top:121,maxHeight:715});
 assert.deepEqual(layout({offsetLeft:0,offsetTop:0,width:390,height:570}),
  {left:25,top:121,maxHeight:441},
  "iPhone keyboard with plenty of map visible must show the whole chooser");
 assert.deepEqual(layout({offsetLeft:0,offsetTop:0,width:390,height:420}),
  {left:25,top:121,maxHeight:291},
  "only genuine viewport shortage may require internal scrolling");
 assert.deepEqual(layout({offsetLeft:0,offsetTop:40,width:390,height:420}),
  {left:25,top:121,maxHeight:331});
 const shifted=layout({offsetLeft:20,offsetTop:0,width:350,height:420});
 assert.ok(shifted.left>=28&&shifted.left+340<=370,
  "dialog must stay within horizontally displaced visible viewport");
 const cramped=SearchTypeMenu.chooserLayout({
  form:{left:40,top:310,bottom:354,width:310,height:44},
  visualViewport:{offsetLeft:0,offsetTop:0,width:390,height:420},
  innerWidth:390,innerHeight:844,menuWidth:340});
 assert.equal(cramped.top,363,"always position below the field");
 assert.equal(cramped.maxHeight,49,"never invent available space");
 const js=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
 assert.doesNotMatch(js,/keyboard-constrained|viewportConstrained|contentHeight:this\\.menu\\.scrollHeight/);
 assert.match(css,/#app \.search-type-menu\{[\s\S]*?position:fixed;/);
 assert.doesNotMatch(css,/#searchTypeMenu.*keyboard-constrained/);
});
test("the approved search options have exactly three fields and independent GPX action",()=>{
 const ui=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.match(html,/placeholder="Suchen\\/Finden"/);
 assert.doesNotMatch(html,/id="searchButton"/);
 assert.doesNotMatch(ui,/object-search-kind|object-search-exit|Mit Track|Mit Link/);
 for(const label of ["Notizen","URLs","Ausgeblendete Objekte","Suche erweitern auf","Alle Pins mit GPX"])
  assert.ok(ui.includes(label));
 assert.match(ui,/returnToStandardChoices\\(\\)/);
});
test("visible place results retain Escape before the object chooser can consume it",()=>{
 const code=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 assert.match(code,/const placeResults=this\.el\("searchResults"\)/);
 assert.match(code,/if\(!this\.searchMode&&placeResults&&!placeResults\.classList\.contains\("hidden"\)\)return/);
});
