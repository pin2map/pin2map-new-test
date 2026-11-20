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

test("Escape dismisses the chooser while its magnifier trigger holds focus",()=>{
 const src=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 assert.match(src,/e\.target!==this\.button/);
 assert.match(src,/if\(this\.searchMode\)this\.finishAndFocus\(\)/);
});

test("Escape closes stored-object search but restores focus to its cleared input",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 assert.match(source,/if\(this\.searchMode\)this\.finishAndFocus\(\)/);
 assert.match(source,/this\.exitSearchMode\(\);\s*this\.onExit\(\);\s*this\.suppressOpenOnFocus=true;\s*this\.input\.focus/);
 assert.match(source,/if\(this\.suppressOpenOnFocus\)/);
 assert.match(source,/this\.makeCheck\("hidden","Ausgeblendete",true\)/);
 const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
 assert.match(css,/grid-template-columns:repeat\(4,max-content\)/);
});

test("creation chooser preserves the same single-column design on keyboard and every device",()=>{
 const js=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
 assert.match(css,/#app \.search-creation-choices\{display:flex;flex-direction:column/);
 assert.doesNotMatch(css,/keyboard-constrained \.search-creation-choices\s*\{/);
 assert.doesNotMatch(css,/keyboard-constrained \.search-type-choice\s*\{/);
 assert.doesNotMatch(js,/search-creation-scroll-hint|Weitere Optionen/);
});
test("approved search dialog uses actual viewport height, including iPhone keyboard",()=>{
 const {SearchTypeMenu}=require("../ui/search-type-menu.js");
 const app={left:0,top:0,right:390,bottom:844,width:390,height:844};
 const form={left:40,top:68,bottom:112,width:310,height:44};
 const layout=(height,offsetTop=0,anchor=form)=>SearchTypeMenu.chooserLayout({
  form:anchor,app,visualViewport:{offsetLeft:0,offsetTop,width:390,height},
  innerHeight:844,menuWidth:340,contentHeight:364});
 const full=layout(800);
 assert.equal(full.maxHeight,364,"show full seven-row dialog when it fits");
 assert.equal(full.top,121,"keep the approved placement beneath search");
 const keyboard=layout(420);
 assert.equal(keyboard.keyboard,true);
 assert.equal(keyboard.top,121);
 assert.equal(keyboard.maxHeight,291,"use the entire space above the keyboard");
 assert.ok(keyboard.maxHeight>44);
 const shifted=layout(420,40);
 assert.equal(shifted.maxHeight,331,"account for visualViewport.offsetTop");
 const horizontallyShifted=SearchTypeMenu.chooserLayout({form,app,
  visualViewport:{offsetLeft:20,offsetTop:0,width:350,height:420},
  innerHeight:844,menuWidth:340,contentHeight:364});
 assert.ok(horizontallyShifted.left>=28,
  "keep the menu inside the visible horizontal viewport");
 assert.ok(horizontallyShifted.left+340<=20+350-8,
  "menu must not extend beyond the shifted viewport");
 const cramped=layout(420,0,{left:40,top:310,bottom:354,width:310,height:44});
 assert.equal(cramped.top,363,"never move chooser above the search field");
 assert.equal(cramped.maxHeight,49,"honestly report actual remaining space");
 assert.ok(cramped.top+cramped.maxHeight<=412);
});
test("visible place results retain Escape before the object chooser can consume it",()=>{
 const code=fs.readFileSync(path.join(__dirname,"../ui/search-type-menu.js"),"utf8");
 assert.match(code,/const placeResults=this\.el\("searchResults"\)/);
 assert.match(code,/if\(!this\.searchMode&&placeResults&&!placeResults\.classList\.contains\("hidden"\)\)return/);
});
