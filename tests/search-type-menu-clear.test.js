"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {SearchTypeMenu}=require("../ui/search-type-menu.js");
function setup(){
 const events=[],listeners=[];
 const chooser=Object.create(SearchTypeMenu.prototype);
 chooser.clear={addEventListener:(name,callback,capture)=>listeners.push({name,callback,capture})};
 chooser.searchMode=false;chooser.clearBound=false;
 chooser.onClearStart=()=>events.push("reset-search-and-body-mode");
 chooser.onClearFinish=()=>events.push("update-clear");
 chooser.returnToStandardChoices=()=>events.push("return-to-creation");
 chooser.bindClearButton();chooser.bindClearButton();
 const fire=()=>{const e={preventDefault:()=>events.push("prevent-default"),
  stopImmediatePropagation:()=>events.push("stop-propagation")};
  listeners[0].callback(e);};
 return {chooser,events,listeners,fire};
}
test("clear binding captures once and leaves ordinary place-search clear untouched",()=>{
 const f=setup();assert.equal(f.listeners.length,1);
 assert.equal(f.listeners[0].name,"click");assert.equal(f.listeners[0].capture,true);
 f.fire();assert.deepEqual(f.events,[]);
});
test("search-mode clear preserves exact reset, exit and refresh ordering",()=>{
 const f=setup();f.chooser.searchMode=true;f.fire();
 assert.deepEqual(f.events,["prevent-default","stop-propagation",
  "reset-search-and-body-mode","return-to-creation","update-clear"]);
});
test("injected UI owner is connected to the existing composition and offline worker",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
 const app=read("app.js"),menu=read("ui/search-type-menu.js");
 assert.match(app,/onClearStart:()=>{/);
 assert.match(app,/onClearFinish:()=>searchForm\.updateClear\(\)/);
 assert.match(menu,/this\.clear\.addEventListener\("click"/);
 assert.match(menu,/this\.onClearStart\(\);/);
 assert.match(menu,/this\.returnToStandardChoices\(\);/);
 assert.match(menu,/this\.onClearFinish\(\);/);
 assert.doesNotMatch(app,/\$\("searchClear"\)\.addEventListener\("click"/);
 assert.match(read("sw.js"),/".\/ui\/search-type-menu\.js"/);
});
