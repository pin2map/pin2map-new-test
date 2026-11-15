"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"..","sw.js"),"utf8");
function harness({offline=false,failAsset=null}={}){
 const handlers={},stores=new Map(),fetched=[];
 let skipped=0,claimed=0;
 const origin="https://example.test",scope=origin+"/preview/";
 const key=request=>typeof request==="string"?new URL(request,scope).href:request.url;
 const cache=name=>{
  if(!stores.has(name)){
   const entries=new Map();
   stores.set(name,{entries,
    async match(request){return entries.get(key(request));},
    async put(request,response){entries.set(key(request),response.clone());},
    async delete(request){return entries.delete(key(request));}
   });
  }
  return stores.get(name);
 };
 const caches={open:async name=>cache(name),keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)};
 const worker={location:{origin},registration:{scope},
  addEventListener(type,fn){handlers[type]=fn;},
  async skipWaiting(){skipped++;},clients:{async claim(){claimed++;}}
 };
 const fetch=async request=>{
  const url=key(request);fetched.push(url);
  if(offline)throw Error("offline");
  if(failAsset&&url.includes(failAsset))throw Error("asset failed");
  return new Response("asset:"+url,{status:200});
 };
 vm.runInNewContext(source,{self:worker,caches,fetch,Request,Response,URL,Date,Promise,console,setTimeout,clearTimeout},{filename:"sw.js"});
 const dispatch=(type,request)=>{
  let pending;
  handlers[type]({request,waitUntil(p){pending=Promise.resolve(p);},respondWith(p){pending=Promise.resolve(p);}});
  return pending;
 };
 return {dispatch,cache,stores,fetched,worker,get skipped(){return skipped;},get claimed(){return claimed;}};
}
const workerVersion=source.match(/const CACHE='([^']+)'/)?.[1];
assert.match(workerVersion||"",/^pin2map-new-v\d+$/);
test("incomplete offline-shell installation must not activate a new worker",async()=>{
 const h=harness({failAsset:"styles.css"});
 await assert.rejects(h.dispatch("install"),/asset failed/);
 assert.equal(h.skipped,0);
});
test("successful installation caches app shell before activation",async()=>{
 const h=harness();await h.dispatch("install");
 assert.equal(h.skipped,1);
 for(const name of ["./app.js","./index.html","./styles.css"]){
  assert.ok(await h.cache(workerVersion).match(name),name+" must be cached at install");
 }
});
test("activation removes old app shells but preserves previously viewed OSM tiles and metadata",async()=>{
 const h=harness();
 await h.cache("pin2map-new-v1").put("./old.js",new Response("old"));
 await h.cache(workerVersion).put("./app.js",new Response("current"));
 const url="https://tile.openstreetmap.org/1/1/1.png";
 await h.cache("pin2map-viewed-osm-tiles-v1").put(url,new Response("saved tile"));
 await h.cache("pin2map-viewed-osm-tile-metadata-v1").put("./metadata",new Response("metadata"));
 await h.dispatch("activate");
 assert.equal(h.claimed,1);
 assert.equal(h.stores.has("pin2map-new-v1"),false);
 for(const name of [workerVersion,"pin2map-viewed-osm-tiles-v1","pin2map-viewed-osm-tile-metadata-v1"]){
  assert.ok(h.stores.has(name),name+" must survive update");
 }
});
test("offline reuses previously viewed tile even without freshness metadata",async()=>{
 const h=harness({offline:true});
 const url="https://tile.openstreetmap.org/1/1/1.png";
 await h.cache("pin2map-viewed-osm-tiles-v1").put(url,new Response("saved tile"));
 const result=await h.dispatch("fetch",new Request(url));
 assert.equal(await result.text(),"saved tile");
 assert.ok(await h.cache("pin2map-viewed-osm-tiles-v1").match(url));
});
test("offline app-shell request reuses canonical cached script",async()=>{
 const h=harness({offline:true});
 const url="https://example.test/preview/app.js";
 await h.cache(workerVersion).put(url,new Response("saved app"));
 const result=await h.dispatch("fetch",new Request(url));
 assert.equal(await result.text(),"saved app");
});
