"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
test("all locally loaded application scripts are mandatory PWA offline shell assets",()=>{
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  const sw=fs.readFileSync(path.join(root,"sw.js"),"utf8");
  const scripts=[...html.matchAll(/<script\s+defer\s+src="\.\/([^"]+)"/g)]
    .map(match=>match[1]);
  const match=sw.match(/const CORE=\[([\s\S]*?)\];/);
  assert.ok(match,"Service worker CORE list must exist");
  const assets=[...match[1].matchAll(/["']\.\/([^"']+)["']/g)].map(m=>m[1]);
  assert.ok(scripts.length>=15,"The modular application must load its own modules");
  for(const script of scripts){
    assert.ok(fs.existsSync(path.join(root,script)),`Missing module file: ${script}`);
    assert.ok(assets.includes(script),`Not available on a cold offline launch: ${script}`);
  }
  assert.ok(assets.includes("index.html"),"Offline HTML fallback missing");
  assert.ok(assets.includes("styles.css"),"Offline CSS missing");
  assert.ok(assets.includes("app.js"),"App entrypoint missing");
});
