"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const domain=require("../domain/place-search.js");
const Geocoder=require("../adapters/geocoding/nominatim-geocoder.js");
test("Knudsker is selected from the actual locality, not the closest road",()=>{
 const result={name:"Snorrebakken",addresstype:"road",
  address:{road:"Snorrebakken",hamlet:"Knudsker",municipality:"Rønne",
   county:"Bornholm",country:"Denmark"}};
 assert.equal(domain.nearbyLocalityName(result),"Knudsker");
});
test("prefer a village/suburb over higher administrative geography",()=>{
 assert.equal(domain.nearbyLocalityName({address:{suburb:"Knudsker",
  city:"Rønne",county:"Bornholm"}}),"Knudsker");
 assert.equal(domain.nearbyLocalityName({address:{village:"Example village",
  city:"Example city"}}),"Example village");
});
test("do not use road, building, county, country, feature title, or blank names",()=>{
 for(const result of [
  {name:"A shop",addresstype:"shop",address:{road:"Main Street",county:"County"}},
  {name:"Main Street",addresstype:"road",address:{road:"Main Street"}},
  {name:"County",addresstype:"county",address:{county:"County"}},
  {},null,{name:"",addresstype:"village",address:{}}
 ])assert.equal(domain.nearbyLocalityName(result),"");
});
test("locality-only reverse result can provide a place name",()=>{
 assert.equal(domain.nearbyLocalityName({name:"Knudsker",
  addresstype:"village",address:{}}),"Knudsker");
});
test("reverse uses zoom 14, address details, German language and coordinates",async()=>{
 let url,signal;
 const geocoder=new Geocoder({fetchImpl:async(input,options)=>{
  url=new URL(input);signal=options.signal;
  return {ok:true,json:async()=>({address:{hamlet:"Knudsker"}})};
 }});
 const abort=new AbortController();
 const result=await geocoder.reverse({lat:55.1001,lng:14.8002},{signal:abort.signal});
 assert.equal(url.pathname,"/reverse");
 assert.equal(url.searchParams.get("lat"),"55.1001");
 assert.equal(url.searchParams.get("lon"),"14.8002");
 assert.equal(url.searchParams.get("zoom"),"14");
 assert.equal(url.searchParams.get("addressdetails"),"1");
 assert.equal(url.searchParams.get("accept-language"),"de");
 assert.equal(signal,abort.signal);
 assert.equal(domain.nearbyLocalityName(result),"Knudsker");
});
test("malformed coordinates are rejected without network access",async()=>{
 let calls=0;
 const geocoder=new Geocoder({fetchImpl:async()=>{calls++;}});
 for(const point of [{lat:100,lng:14},{lat:55,lng:500},{lat:NaN,lng:14}]){
  await assert.rejects(geocoder.reverse(point),/Invalid reverse geocoding coordinate/);
 }
 assert.equal(calls,0);
});
test("manual reverse request only starts for unnamed map pins with geocoding consent",()=>{
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 assert.match(app,/if\(!state\.allowGeocode\|\|entry!==activePreviewEntry\)return/);
 assert.match(app,/if\(!name\)void nameManualPin\(entry\)/);
 assert.match(app,/activePreviewEntry!==entry\)return/);
 assert.match(app,/cancelManualNameLookup\(\);\s*activePreviewEntry=null/);
 assert.match(app,/mapAdapter\.updateTemporaryPinLabel\(entry\)/);
 assert.match(app,/const name=entry\.referencePlace\?/);
});
