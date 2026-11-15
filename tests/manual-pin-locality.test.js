"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const domain=require("../domain/place-search.js");
const Geocoder=require("../adapters/geocoding/nominatim-geocoder.js");
const ManualPinLocality=require("../application/manual-pin-locality.js");
test("Knudsker is selected from the actual locality, not the closest road",()=>{
 const result={name:"Snorrebakken",addresstype:"road",
  address:{road:"Snorrebakken",hamlet:"Knudsker",municipality:"Rønne",
   county:"Bornholm",country:"Denmark"}};
 assert.equal(domain.nearbyLocalityName(result,{mapZoom:17}),"Knudsker");
});
test("prioritize the main city even when a suburb, district, or nearby village is present",()=>{
 for(const [city,district] of [
  ["Gütersloh","Bad Westernkotten"],
  ["Lippstadt","Overhagen"],
  ["Brilon","Gudenhagen"],
  ["Wetzlar","Altstadt"],
  ["Köln","Altstadt-Nord"],
  ["Paderborn","Schloß Neuhaus"]
 ]){
  const result={name:district,addresstype:"suburb",
   address:{city,suburb:district,quarter:district,village:district}};
  for(const mapZoom of [8,11,13,15,17,19])
   assert.equal(domain.nearbyLocalityName(result,{mapZoom}),city,
    city+" must win over "+district+" at map zoom "+mapZoom);
 }
});
test("map zoom selects city-level or village-level reverse detail without asking for suburbs",()=>{
 for(const level of [5,10,12,13,14])
  assert.equal(domain.reversePlaceZoom(level),10);
 for(const level of [15,16,17,19])
  assert.equal(domain.reversePlaceZoom(level),13);
 assert.equal(domain.nearbyLocalityName({address:{suburb:"Overhagen"}}),"");
 assert.equal(domain.nearbyLocalityName({address:{town:"Lippstadt",suburb:"Overhagen"}}),"Lippstadt");
});
test("at a detailed scale standalone hamlets may still be named",()=>{
 const result={address:{hamlet:"Knudsker",municipality:"Rønne"}};
 assert.equal(domain.nearbyLocalityName(result,{mapZoom:17}),"Knudsker");
 assert.equal(domain.nearbyLocalityName(result,{mapZoom:10}),"Rønne");
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
test("reverse uses requested city detail, address layer, German and coordinates",async()=>{
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
 assert.equal(url.searchParams.get("zoom"),"10");
 assert.equal(url.searchParams.get("layer"),"address");
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
test("manual preview receives an in-place Knudsker label without persistence",async()=>{
 const updates=[];
 const service=new ManualPinLocality({
  geocoder:{reverse:async()=>({address:{road:"Snorrebakken",hamlet:"Knudsker",
    county:"Bornholm"}})},
  pickName:domain.nearbyLocalityName,allowed:()=>true,
  onName:entry=>updates.push(entry.label)
 });
 const entry={kind:"point",point:{lat:55.1,lng:14.8},label:"Neuer Pin",name:""};
 service.setCurrent(entry);
 await service.resolve(entry);
 assert.equal(entry.name,"Knudsker");
 assert.equal(entry.label,"Knudsker");
 assert.deepEqual(updates,["Knudsker"]);
});
test("consent disabled and already named pins issue no reverse requests",async()=>{
 let calls=0,allowed=false;
 const service=new ManualPinLocality({
  geocoder:{reverse:async()=>{calls++;return {address:{village:"Knudsker"}}}},
  pickName:domain.nearbyLocalityName,allowed:()=>allowed,onName:()=>{}
 });
 const entry={point:{lat:55.1,lng:14.8},name:"",label:"Neuer Pin"};
 service.setCurrent(entry);await service.resolve(entry);
 allowed=true;entry.name="GPS position";await service.resolve(entry);
 assert.equal(calls,0);
 assert.equal(entry.label,"Neuer Pin");
});
test("late reply cannot rename a replaced or removed preview",async()=>{
 let finish;
 let seenSignal;
 const service=new ManualPinLocality({
  geocoder:{reverse:async(_p,{signal})=>{
   seenSignal=signal;
   return new Promise(resolve=>finish=resolve);
  }},
  pickName:domain.nearbyLocalityName,allowed:()=>true,onName:()=>{throw Error("Stale update");}
 });
 const a={point:{lat:55.1,lng:14.8},name:"",label:"Neuer Pin"};
 service.setCurrent(a);const first=service.resolve(a);
 await Promise.resolve();
 const b={point:{lat:55.2,lng:14.9},name:"",label:"Neuer Pin"};
 service.setCurrent(b);
 assert.equal(seenSignal.aborted,true);
 finish({address:{village:"Knudsker"}});
 await first;
 assert.equal(a.label,"Neuer Pin");
 assert.equal(b.label,"Neuer Pin");
 service.invalidate();
});
test("fallback keeps original name when provider has no settlement",async()=>{
 const entry={point:{lat:55.1,lng:14.8},name:"",label:"Neuer Pin"};
 const service=new ManualPinLocality({
  geocoder:{reverse:async()=>({address:{road:"Main",county:"County"}})},
  pickName:domain.nearbyLocalityName,allowed:()=>true,onName:()=>{throw Error("No update expected")}
 });
 service.setCurrent(entry);await service.resolve(entry);
 assert.equal(entry.label,"Neuer Pin");
});
test("app passes manual unnamed pin to naming service with cleanup on save",()=>{
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 assert.match(app,/allowed:\(\)=>state\.allowGeocode/);
 assert.match(app,/detailZoom:placeDomain\.reversePlaceZoom/);
 assert.match(app,/const mapZoom=mapAdapter\.getViewport\(\)\.zoom/);
 assert.match(app,/if\(!name\)void manualPinLocality\.resolve\(entry\)/);
 assert.match(app,/manualPinLocality\.setCurrent\(entry\)/);
 assert.match(app,/function clearObjectPreview\(\)\{[\s\S]*?manualPinLocality\.invalidate\(\)/);
 assert.match(app,/mapAdapter\.updateTemporaryPinLabel\(entry\)/);
 assert.match(app,/const name=entry\.referencePlace\?/);
});
