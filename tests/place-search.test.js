"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const domain=require("../domain/place-search.js");
const SearchService=require("../application/place-search-service.js");
const Nominatim=require("../adapters/geocoding/nominatim-geocoder.js");

test("place labels and cache keys are pure and retain historic display rules",()=>{
  const item={address:{city:"Stuttgart",state:"Baden-Württemberg",country:"Deutschland"},lat:"48.77",lon:"9.18"};
  assert.equal(domain.title(item),"Stuttgart");
  assert.equal(domain.detail(item),"");
  assert.equal(domain.kind({addresstype:"city",class:"place",osm_type:"node"}).label,"Stadt · Ortsmittelpunkt");
  assert.equal(domain.kind({addresstype:"city",class:"boundary",osm_type:"relation"}).label,"Stadt · Gebiet");
  assert.equal(domain.cacheKey("  STUTTGART   Mitte "),"stuttgart mitte");
});
test("expired and malformed cache entries disappear; recent entries survive",()=>{
  const now=100_000_000,ttl=24*3600000;
  const cache={fresh:{time:now-10,results:[]},expired:{time:now-ttl,results:[]},
    future:{time:now+100,results:[]},invalid:{time:now,results:null}};
  assert.deepEqual(Object.keys(domain.cleanCache(cache,now)),["fresh"]);
});
test("geocoder constructs identical provider query and validates results",async()=>{
  let request;
  const geocoder=new Nominatim({language:"de",fetchImpl:async(url,options)=>{
    request={url:new URL(url),options};
    return {ok:true,json:async()=>[{lat:"48.77",lon:"9.18"},{lat:"bad",lon:"9"},{lat:"0",lon:"0"}]};
  }});
  const signal=new AbortController().signal;
  const result=await geocoder.search("Stuttgart & Umgebung",{signal});
  assert.equal(request.url.searchParams.get("q"),"Stuttgart & Umgebung");
  assert.equal(request.url.searchParams.get("addressdetails"),"1");
  assert.equal(request.url.searchParams.get("limit"),"8");
  assert.equal(request.options.signal,signal);
  assert.equal(result.length,2);
});
test("cached search works while provider is disabled; first network call writes cache",async()=>{
  let time=200_000_000,calls=0,saves=0,starts=0,ends=0;
  const geocoder={search:async()=>{calls++;return [{lat:"48",lon:"9"}];}};
  const search=new SearchService({geocoder,domain,now:()=>time});
  const state={geoCache:{}};
  assert.equal((await search.search("Stuttgart",{state,allowed:false})).kind,"disabled");
  const fetched=await search.search("Stuttgart",{state,allowed:true,
    onStart:()=>starts++,onFinish:()=>ends++,onCacheWrite:()=>saves++});
  assert.equal(fetched.kind,"results");
  assert.equal(fetched.fromCache,false);
  const cached=await search.search(" STUTTGART ",{state,allowed:false});
  assert.equal(cached.fromCache,true);
  assert.equal(calls,1);assert.equal(saves,1);assert.equal(starts,1);assert.equal(ends,1);
});
test("browser-local throttle preserves rate limit between different queries",async()=>{
  let time=200_000_000,calls=0;
  const search=new SearchService({geocoder:{search:async()=>{calls++;return [];}},domain,now:()=>time});
  const state={geoCache:{}};
  assert.equal((await search.search("one",{state,allowed:true})).kind,"results");
  assert.equal((await search.search("two",{state,allowed:true})).kind,"throttled");
  time+=1100;
  assert.equal((await search.search("two",{state,allowed:true})).kind,"results");
  assert.equal(calls,2);
});
test("latest search wins and a late previous result cannot overwrite the cache",async()=>{
  let time=200_000_000,resolveFirst,wasAborted=false;
  const geocoder={search:(query,{signal})=>{
    if(query==="old")return new Promise(resolve=>{
      resolveFirst=resolve;signal.addEventListener("abort",()=>{wasAborted=true;});
    });
    return Promise.resolve([{lat:"1",lon:"2"}]);
  }};
  const search=new SearchService({geocoder,domain,now:()=>time});
  const state={geoCache:{}};
  const old=search.search("old",{state,allowed:true});
  time+=1100;
  const next=await search.search("new",{state,allowed:true});
  resolveFirst([{lat:"3",lon:"4"}]);
  const former=await old;
  assert.equal(wasAborted,true);
  assert.equal(former.kind,"stale");
  assert.equal(next.kind,"results");
  assert.equal(state.geoCache.old,undefined);
  assert.deepEqual(state.geoCache.new.results,[{lat:"1",lon:"2"}]);
});
test("errors are reported without caching invalid provider results",async()=>{
  const search=new SearchService({geocoder:{search:async()=>{throw new Error("Offline");}},domain,now:()=>200_000_000});
  const state={geoCache:{}};
  assert.equal((await search.search("failed",{state,allowed:true})).kind,"error");
  assert.deepEqual(state.geoCache,{});
});

test("legacy pin result names, full addresses, type symbols, and duplicate coordinates",()=>{
  const rows=[
    {name:"Stuttgart",display_name:"Stuttgart, Baden-Württemberg, Deutschland",
      addresstype:"city",class:"place",osm_type:"node",lat:"48.77777",lon:"9.11111"},
    {name:"Stuttgart",display_name:"Stuttgart, Baden-Württemberg, Deutschland",
      addresstype:"city",class:"boundary",osm_type:"relation",lat:"48.88888",lon:"9.22222"},
    {name:"Berlin",display_name:"Berlin, Deutschland",addresstype:"city",class:"place",osm_type:"node",lat:"52.5",lon:"13.4"}
  ];
  assert.equal(domain.title(rows[0]),"Stuttgart");
  assert.equal(domain.detail(rows[0]),"Stuttgart, Baden-Württemberg, Deutschland");
  assert.deepEqual(domain.kind(rows[0]),{label:"Stadt · Ortsmittelpunkt",symbol:"●"});
  assert.deepEqual(domain.kind(rows[1]),{label:"Stadt · Gebiet",symbol:"▧"});
  assert.deepEqual(domain.duplicateCoordinates(rows),[
    "Position: 48.77777, 9.11111","Position: 48.88888, 9.22222",""
  ]);
});
test("explicit service cancel invalidates outstanding results",async()=>{
  let resolveOld,aborted=false;
  const service=new SearchService({
    geocoder:{search:(_,{signal})=>new Promise(resolve=>{
      resolveOld=resolve;signal.addEventListener("abort",()=>aborted=true);
    })},
    domain,now:()=>200000000
  });
  const state={geoCache:{}},pending=service.search("Alt",{state,allowed:true});
  service.cancel();
  resolveOld([{lat:"48",lon:"9"}]);
  assert.equal((await pending).kind,"stale");
  assert.equal(aborted,true);
  assert.equal(state.geoCache.alt,undefined);
});
