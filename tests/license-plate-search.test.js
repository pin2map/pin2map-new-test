"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
require("../domain/license-plate-data-dach.js");
require("../domain/license-plate-geo-hints.js");
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
 const multiple=await svc.resolve(de);
 assert.equal(multiple.kind,"choices");
 assert.equal(multiple.choices.length,2);
 assert.ok(multiple.choices.every(x=>x.kind==="area"));
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

test("six difficult codes retain explicit, country-specific area and fallback hints",()=>{
 const rows=[
   ["NAU","DE","Nauen","Nauen","city"],
   ["HVL","DE","Landkreis Havelland","Rathenow","county"],
   ["LRO","DE","Landkreis Rostock","Güstrow","county"],
   ["BÜS","DE","Büsingen am Hochrhein","Büsingen am Hochrhein","city"],
   ["FRI","DE","Landkreis Friesland","Jever","county"],
   ["GU","AT","Bezirk Graz-Umgebung","Gratkorn","county"]
 ];
 for(const [code,country,query,place,admin] of rows){
   const item=cat.lookup(code).find(x=>x.country===country);
   assert.ok(item,"Missing "+country+" "+code);
   assert.equal(item.query,query);
   assert.equal(item.referencePlace,place);
   assert.equal(item.admin,admin);
 }
});
test("no matching polygon uses a validated reference town, not an invented area",async()=>{
 const entry=cat.lookup("HVL").find(x=>x.country==="DE");
 const svc=new Resolver({catalog:cat,areaFinder:{
   find:async()=>[],
   findPlace:async(query,{countryCode})=>{
     assert.equal(query,"Rathenow");assert.equal(countryCode,"DE");
     return [{name:"Rathenow",lat:"52.60",lon:"12.33",
       addresstype:"town",address:{country_code:"de"}}];
   }
 }});
 const result=await svc.resolve(entry);
 assert.equal(result.kind,"point");
 assert.deepEqual(result.point,{lat:52.6,lng:12.33});
 assert.match(result.choiceDetail,/kein vollständiges Zulassungsgebiet/);
 assert.equal(result.geojson,undefined);
});
test("non-German codes use identical polygon selection and point fallback logic",async()=>{
 const entry=cat.lookup("GU").find(x=>x.country==="AT");
 const svc=new Resolver({catalog:cat,areaFinder:{
   find:async()=>[],
   findPlace:async()=>[{name:"Gratkorn",lat:47.13,lon:15.34,
     addresstype:"town",address:{country_code:"at"}}]
 }});
 const result=await svc.resolve(entry);
 assert.equal(result.kind,"point");
 assert.equal(result.country,"AT");
 assert.equal(result.referencePlace,"Gratkorn");
});
test("multiple administrative polygons remain selectable alongside labelled reference town",async()=>{
 const entry=cat.lookup("FRI").find(x=>x.country==="DE");
 const geo={type:"Polygon",coordinates:[[[7,53],[8,53],[8,54],[7,54],[7,53]]]};
 const svc=new Resolver({catalog:cat,areaFinder:{
   find:async()=>[1,2].map(id=>({name:"Friesland",osm_type:"relation",osm_id:id,
     geojson:geo,addresstype:"county",address:{country_code:"de"},
     display_name:id===1?"Friesland, Deutschland":"Friesland, Niedersachsen, Deutschland"})),
   findPlace:async()=>[{name:"Jever",lat:53.57,lon:7.90,addresstype:"town",
     address:{country_code:"de"}}]
 }});
 const resolved=await svc.resolve(entry);
 assert.equal(resolved.kind,"choices");
 assert.deepEqual(resolved.choices.map(x=>x.kind),["area","area","point"]);
});
test("wrong country reference places and unknown coordinates cannot be suggested",async()=>{
 const entry=cat.lookup("HVL").find(x=>x.country==="DE");
 const svc=new Resolver({catalog:cat,areaFinder:{
   find:async()=>[],
   findPlace:async()=>[{name:"Rathenow",lat:52,lon:12,
     address:{country_code:"fr"}}]
 }});
 // The injected provider does not promise country filtering; enforce it in
 // resolver as well, preventing accidental cross-border fallback.
 await assert.rejects(svc.resolve(entry),/Weder eindeutige/);
});

test("historic NAU can offer separately verified city and county polygons",async()=>{
 const entry=cat.lookup("NAU").find(x=>x.country==="DE");
 const town={type:"Polygon",coordinates:[[[12,52],[13,52],[13,53],[12,53],[12,52]]]};
 const county={type:"Polygon",coordinates:[[[11,52],[14,52],[14,54],[11,54],[11,52]]]};
 const queries=[];
 const svc=new Resolver({catalog:cat,areaFinder:{
   find:async(query)=>{
     queries.push(query);
     if(query==="Nauen")return [{name:"Nauen",osm_type:"relation",osm_id:1,
       addresstype:"city",geojson:town,address:{country_code:"de"}}];
     if(query==="Landkreis Havelland")return [{name:"Havelland",osm_type:"relation",
       osm_id:2,addresstype:"county",geojson:county,address:{country_code:"de"}}];
     return [];
   },
   findPlace:async()=>[{name:"Nauen",lat:52.6,lon:12.9,
     address:{country_code:"de"},addresstype:"town"}]
 }});
 const result=await svc.resolve(entry);
 assert.equal(result.kind,"choices");
 assert.deepEqual(result.choices.map(c=>c.kind),["area","area","point"]);
 assert.deepEqual(queries,["Nauen","Landkreis Havelland"]);
 assert.match(result.choices[1].choiceTitle,/heutiger Landkreis/);
});
test("without known safe reference places the resolver never fabricates a point",async()=>{
 const entry=cat.lookup("B").find(x=>x.country==="DE");
 const svc=new Resolver({catalog:cat,areaFinder:{find:async()=>[]}});
 await assert.rejects(svc.resolve(entry),/noch kein geprüfter Ersatzort/);
});
