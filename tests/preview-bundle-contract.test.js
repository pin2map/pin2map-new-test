"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {execFileSync,spawnSync}=require("node:child_process");
const ROOT=path.resolve(__dirname,"..");
const command=path.join(ROOT,"scripts/preview-bundle.py");
const workflow=fs.readFileSync(path.join(ROOT,".github/workflows/preview-pages.yml"),"utf8");
const sw=fs.readFileSync(path.join(ROOT,"sw.js"),"utf8");
const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
function manifest(){
 const match=sw.match(/const CORE=(\[[\s\S]*?\]);/);
 assert.ok(match,"Canonical CORE list must be accessible");
 return JSON.parse(match[1]).filter(x=>x!=="./").map(x=>x.slice(2));
}
test("HTML script and style assets are represented in the canonical offline shell",()=>{
 const required=[...html.matchAll(/(?:src|href)="\.\/([^"?]+)"/g)].map(x=>x[1]);
 const assets=manifest();
 assert.equal(new Set(assets).size,assets.length);
 for(const name of required)assert.ok(assets.includes(name),"Missing in service worker CORE: "+name);
 for(const item of assets)assert.ok(fs.statSync(path.join(ROOT,item)).isFile(),item);
 assert.ok(assets.includes("manifest.webmanifest"));
});
test("Defer script order matches the offline shell and has no duplicate module",()=>{
 const htmlModules=[...html.matchAll(/<script[^>]+src="\.\/([^"]+\.js)"/g)].map(m=>m[1]);
 const coreModules=manifest().filter(p=>p.endsWith(".js"));
 assert.deepEqual(coreModules,htmlModules,
   "The same modules must load and cache in the same order; no second manually maintained list");
});
test("Preview workflow uses fail-closed allowlist, not entire repository rsync",()=>{
 assert.match(workflow,/python3 preview-source\/scripts\/preview-bundle\.py preview-source site-root\/preview/);
 assert.doesNotMatch(workflow,/rsync -a/);
 assert.match(workflow,/Assert Preview allowlist excludes historical experiments/);
});
test("Build publishes only app-shell assets and no historical experiments",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"p2m-preview-"));
 try{
  const dst=path.join(tmp,"preview");
  execFileSync("python3",[command,ROOT,dst],{stdio:"pipe"});
  const actual=[];
  function crawl(dir){
   for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const abs=path.join(dir,entry.name);
    if(entry.isDirectory())crawl(abs);
    else actual.push(path.relative(dst,abs).replaceAll(path.sep,"/"));
   }
  }
  crawl(dst);
  assert.deepEqual(actual.sort(),[...manifest(),"sw.js"].sort());
  assert.ok(!actual.some(x=>/maplibre|pmtiles|diagnostics|\.github|docs\//.test(x)));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test("Preview packager refuses nonempty target to avoid accidentally deleting stable data",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"p2m-preview-"));
 try{
  fs.writeFileSync(path.join(tmp,"user-data"),"must not touch");
  const run=spawnSync("python3",[command,ROOT,tmp],{encoding:"utf8"});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/empty directory/);
  assert.equal(fs.readFileSync(path.join(tmp,"user-data"),"utf8"),"must not touch");
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
