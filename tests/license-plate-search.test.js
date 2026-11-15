"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const cat=require("../domain/license-plate-catalog.js");
const Resolver=require("../application/license-plate-search.js");
const poly={type:"Polygon",coordinates:[[[13.1,52.3],[13.7,52.3],[13.7,52.7],[13.1,52.7],[13.1,52.3]]]};
test("German and Romanian B are distinguishable; historic B remains explicit",()=>{
 const rows=cat.lookup(" b ");
 assert.ok(rows.some(x=>x.country==="DE"&&x.name==="Berlin"));
 assert.ok(rows.some(x=>x.country==="RO"&&x.name==="Bukarest"));
 assert.ok(rows.some(x=>x.country==="ES"&&x.status==="historic"));
 assert.deepEqual(cat.lookup("!"),[]);
 assert.deepEqual(cat.lookup("xyz-invalid"),[]);
});
test("number 67 gives France and Turkey; Italian and French records are included",()=>{
 assert.deepEqual(cat.lookup("67").map(x=>x.country).sort(),["FR","TR"]);
 assert.equal(cat.lookup("MI")[0].country,"IT");
 assert.equal(cat.lookup("75")[0].country,"FR");
 assert.equal(cat.lookup("BA")[0].status,"historic");
 assert.equal(cat.records.some(x=>x.country==="CH"),true);
});
test("no boundary can be supplied for another country or ambiguous result",async()=>{
 const de=cat.lookup("B").find(x=>x.country==="DE");
 const areaFinder={find:async()=>[{name:"Berlin",geojson:poly,
   address:{country_code:"ro"},addresstype:"city"}]};
 const svc=new Resolver({catalog:cat,areaFinder});
 await assert.rejects(svc.resolve(de),/Keine eindeutige/);
 areaFinder.find=async()=>[1,2].map(id=>({name:"Berlin",osm_id:id,
   geojson:poly,address:{country_code:"de"},addresstype:"city"}));
 await assert.rejects(svc.resolve(de),/Mehrere mögliche/);
});
test("resolved boundaries are cached in memory and do not mutate project",async()=>{
 const de=cat.lookup("B").find(x=>x.country==="DE");
 let calls=0;
 const svc=new Resolver({catalog:cat,areaFinder:{find:async()=>{
   calls++;return [{osm_type:"relation",osm_id:123,geojson:poly,
     address:{country_code:"de"},addresstype:"city"}];
 }}});
 const a=await svc.resolve(de),b=await svc.resolve(de);
 assert.equal(a,b);assert.equal(calls,1);
 assert.equal(a.label,"🇩🇪 B (Berlin)");
 assert.equal(a.geojson,poly);
 assert.equal(cat.records.length>40,true);
});
test("catalog has unique country/code pairs and explicit ISO country code",()=>{
 const ids=cat.records.map(r=>r.country+"|"+r.code);
 assert.equal(new Set(ids).size,ids.length);
 for(const r of cat.records){
   assert.match(r.country,/^[A-Z]{2}$/);
   assert.ok(["city","county","state"].includes(r.admin));
   assert.ok(["current","historic"].includes(r.status));
 }
});
