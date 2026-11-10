"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const Feedback=require("../ui/map-control-feedback.js");

test("binding common map-control rule inherits automatically; search and dialogs excluded",()=>{
  const css=read("styles.css"),html=read("index.html"),map=read("map-adapter-leaflet.js");
  assert.ok(css.includes("--p2m-map-control-bg:#f1f3f6"));
  assert.ok(css.includes("--p2m-map-control-border:#b7c5d4"));
  assert.ok(css.includes("--p2m-map-control-shadow:0 2px 8px #12253a36"));
  assert.ok(css.includes("--p2m-map-control-pressed:#c9e1ff"));
  const rule=css.slice(css.lastIndexOf(":is(#app > button, #app #map .leaflet-control button){"));
  assert.ok(rule.includes("background:var(--p2m-map-control-bg)!important"));
  assert.ok(rule.includes("box-shadow:var(--p2m-map-control-shadow)!important"));
  assert.ok(rule.includes("border:1px solid var(--p2m-map-control-border)!important"));
  assert.ok(rule.includes("width:var(--p2m-map-circle-size)!important"));
  assert.ok(rule.includes("height:var(--p2m-map-circle-size)!important"));
  assert.ok(rule.includes("border-radius:50%!important"));
  assert.ok(rule.includes(":is(:hover,:focus,:focus-visible,[aria-expanded=\"true\"],[aria-pressed=\"true\"],.is-off)"));
  assert.ok(rule.includes(":is(:active,.p2m-map-tap-flash)"));
  assert.ok(!rule.includes("#searchButton"),"Scoped rule must not style search button");
  assert.ok(!rule.includes("#pinPanel"),"Scoped rule must not style dialog buttons");
  const head=html.split('<header class="topbar">')[1].split("</header>")[0];
  assert.ok(head.includes('id="searchButton"'));
  const outside=html.split("</header>")[1].split('<aside id="layersPanel"')[0];
  for(const id of ["settingsButton","refreshButton","layersButton","labelsToggle","basemapButton"]){
    assert.ok(outside.includes('id="'+id+'"'),"map overlay outside header: "+id);
  }
  assert.ok(map.includes('L.DomUtil.create("button","pin-zoom-button",holder)'));
});
test("click flash works for future map buttons, but ignores search, dialogs and disabled",()=>{
  let handle,timeout,callback;
  const doc={addEventListener(type,fn,capture){assert.equal(type,"click");assert.equal(capture,true);handle=fn;}};
  Feedback.install(doc,(fn,ms)=>{callback=fn;timeout=ms;});
  assert.equal(Feedback.SELECTOR,"#app > button, #app #map .leaflet-control button");
  const cls=new Set();
  const target={disabled:false,classList:{add:k=>cls.add(k),remove:k=>cls.delete(k)},matches:s=>s===Feedback.SELECTOR};
  handle({target:{closest:()=>target}});
  assert.equal(cls.has("p2m-map-tap-flash"),true);
  assert.equal(timeout,220);
  callback();
  assert.equal(cls.has("p2m-map-tap-flash"),false);
  const excluded={...target,matches:()=>false};
  handle({target:{closest:()=>excluded}});
  assert.equal(cls.size,0);
  target.disabled=true;handle({target:{closest:()=>target}});
  assert.equal(cls.size,0);
});
