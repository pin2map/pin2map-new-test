"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
const rule=selector=>{
  const start=css.indexOf(selector+"{");
  assert.ok(start>=0,"missing CSS block: "+selector);
  return css.slice(start+selector.length+1,css.indexOf("}",start));
};
test("pin editor shared selector owns all compact action dimensions",()=>{
  const body=rule("#pinPanel button:is(#movePin,#deletePin,#closePin,#showPinLayer)");
  for(const key of ["width","height","min-width","min-height","max-width","max-height"]){
    assert.ok(body.includes(key+":var(--p2m-pin-dialog-action-size)!important;"),key);
  }
  assert.ok(body.includes("flex:0 0 var(--p2m-pin-dialog-action-size)!important;"));
});
test("specific Delete and OK rules only preserve semantic button styling",()=>{
  const names=[".pin-panel .pin-editor-head #deletePin.p2m-icon-control",
    ".pin-panel .pin-actions #closePin.pin-ok-button"];
  for(const selector of names){
    const body=rule(selector);
    for(const key of ["width","height","min-width","min-height","max-width","max-height","flex","padding","border-radius"]){
      assert.ok(!body.includes(key+":"),"duplicate size override: "+selector+" "+key);
    }
  }
  assert.ok(rule(names[0]).includes("background:#bc2837!important;color:#fff!important"));
  assert.ok(rule(names[1]).includes("background:#c9eecb!important;color:#245b30!important"));
});
