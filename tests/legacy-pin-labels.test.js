"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

test("legacy pin labels are safe, right-anchored permanent Leaflet tooltips",()=>{
  const doc={createElement(tag){
    assert.equal(tag,"span");
    return {textContent:""};
  }};
  const context={window:{L:{}},document:doc};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../map-adapter-leaflet.js"),"utf8"),context);
  const adapter=new context.window.Pin2MapLeafletAdapter({getCenter:()=>({lat:0,lng:0})});
  let tooltip=null,options=null,unbinds=0,updates=0;
  const marker={
    getTooltip:()=>tooltip,
    bindTooltip(content,opts){tooltip={content};options=opts;return this;},
    setTooltipContent(content){tooltip.content=content;updates++;return this;},
    unbindTooltip(){tooltip=null;unbinds++;return this;}
  };
  adapter.setMarkerLabel(marker,'<img src=x onerror=alert(1)>');
  assert.equal(tooltip.content.textContent,'<img src=x onerror=alert(1)>');
  assert.equal(options.permanent,true);
  assert.equal(options.direction,"right");
  assert.deepEqual(Array.from(options.offset),[28,-18]);
  assert.equal(options.className,"address-label");
  assert.equal(options.interactive,false);
  adapter.setMarkerLabel(marker,"New name");
  assert.equal(updates,1);
  assert.equal(tooltip.content.textContent,"New name");
  adapter.setMarkerLabel(marker,"");
  assert.equal(unbinds,1);
  assert.equal(marker.getTooltip(),null);
  adapter.setMarkerLabel(marker,"");
  assert.equal(unbinds,1);
});
test("legacy label CSS matches predecessor without adding important overrides",()=>{
  const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
  const rule=css.match(/#map \.leaflet-tooltip\.address-label\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule,"Missing Leaflet tooltip owner");
  for(const declaration of [
    "background:rgba(255,255,255,.94)","border:1px solid #777",
    "border-radius:5px","color:#111","font-weight:600",
    "padding:3px 6px","white-space:nowrap","pointer-events:none"
  ])assert.ok(rule.includes(declaration),declaration);
  assert.ok(!rule.includes("!important"));
});
