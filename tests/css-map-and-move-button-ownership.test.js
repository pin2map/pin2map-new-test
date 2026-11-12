"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"..","styles.css"),"utf8");
const block=(selector)=>{
  const at=css.indexOf(selector+"{");
  assert.ok(at>=0,"CSS selector missing: "+selector);
  return css.slice(at+selector.length+1,css.indexOf("}",at));
};
test("move pin size comes exclusively from the shared 32px pin action contract",()=>{
  const move=block("#movePin.p2m-icon-control");
  for(const key of ["width","height","min-width","min-height","flex","padding","border-radius"]){
    assert.ok(!move.includes(key+":"),"stale movePin size: "+key);
  }
  assert.ok(move.includes("background:#fff!important;color:var(--p2m-button-ink)!important;"));
  assert.ok(!css.includes("--p2m-button-size:44px;"));
  assert.ok(block("#pinPanel button:is(#movePin,#closePin,#showPinLayer,#cancelPin,#pinLayerTrigger,#pinUrlButton,#pinWikipedia,#pinWeather,#pinUrlCancel,#pinUrlSave,#pinUrlOpen)").includes("width:var(--p2m-pin-dialog-action-size)!important;"));
});
test("refresh retains position and unique white visual surface but not local size overrides",()=>{
  const refresh=block("#refreshButton.refresh-map-button.p2m-icon-control");
  for(const key of ["width","height","min-width","min-height","max-width","max-height","padding","border-radius"]){
    assert.ok(!refresh.includes(key+":"),"stale refresh size: "+key);
  }
  assert.ok(refresh.includes("top:35%!important;top:35dvh!important;"));
  assert.ok(refresh.includes("background:#fff!important;"));
  assert.ok(refresh.includes("border:1px solid var(--p2m-button-border)!important;"));
  assert.ok(refresh.includes("color:var(--p2m-button-ink)!important;"));
  assert.ok(css.includes("#app button:is(#settingsButton,#refreshButton,#layersButton,#labelsToggle,#basemapButton)"));
});
