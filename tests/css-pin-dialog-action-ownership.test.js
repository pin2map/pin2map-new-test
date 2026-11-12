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
  const body=rule("#pinPanel button:is(#movePin,#closePin,#showPinLayer,#cancelPin,#pinLayerTrigger,#pinUrlButton,#pinWikipedia,#pinWeather,#pinUrlCancel,#pinUrlSave,#pinUrlOpen)");
  for(const key of ["width","height","min-width","min-height","max-width","max-height"]){
    assert.ok(body.includes(key+":var(--p2m-pin-dialog-action-size)!important;"),key);
  }
  assert.ok(body.includes("flex:0 0 var(--p2m-pin-dialog-action-size)!important;"));
});
test("delete action remains available and the footer OK is size-token driven",()=>{
  const del=rule("#pinPanel .pin-meta-row #deletePin.p2m-icon-control");
  const ok=rule("#pinPanel .pin-actions #closePin.pin-ok-button");
  assert.ok(del.includes("background:#fcecee!important;color:#ad3042!important"));
  assert.ok(ok.includes("background:#c9eecb!important;color:#245b30!important"));
  const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
  assert.ok(html.includes('<div class="pin-meta-row">')&&html.includes('id="deletePin"'));
  assert.match(html,/id="cancelPin"[^>]*data-pin-icon="x"/);
});
