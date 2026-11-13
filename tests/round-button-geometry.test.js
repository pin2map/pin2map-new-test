"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
test("all circular icon controls share an unsquashable square geometry contract",()=>{
  const block=css.match(/button\.p2m-icon-control\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(block,"common round-button owner exists");
  for(const property of [
    "box-sizing:border-box","flex-shrink:0","aspect-ratio:1",
    "width:var(--p2m-button-size)","height:var(--p2m-button-size)",
    "min-width:var(--p2m-button-size)","min-height:var(--p2m-button-size)",
    "max-width:var(--p2m-button-size)","max-height:var(--p2m-button-size)",
    "border-radius:50%"
  ])assert.ok(block.includes(property),"missing common circle invariant: "+property);
  const row=css.match(/#app \.favorite-row \.favorite-icon\{([^}]+)\}/)?.[1];
  assert.ok(row);
  for(const p of ["box-sizing:border-box","flex:0 0 36px",
    "width:36px","height:36px","min-width:36px","min-height:36px",
    "max-width:36px","max-height:36px","aspect-ratio:1","border-radius:50%"])
    assert.ok(row.includes(p),"missing favorite row circle invariant: "+p);
});
test("favorites overlay must win the z-index race against its opener",()=>{
  const panel=css.match(/#app \.favorites-panel\{([\s\S]*?)\n\}/)?.[1];
  const opener=[...css.matchAll(/#app #favoritesButton\.favorites-map-button\.p2m-icon-control\[aria-expanded="true"\]\{([^}]+)\}/g)].map(m=>m[1]).find(block=>block.includes("z-index:"));
  assert.ok(panel&&opener);
  const p=Number(panel.match(/z-index:(\d+)/)?.[1]);
  const b=Number(opener.match(/z-index:(\d+)/)?.[1]);
  assert.ok(p>b,`favorites panel ${p} must paint above star ${b}`);
});
