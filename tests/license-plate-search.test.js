"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
require("../domain/license-plate-data-dach.js");
require("../domain/license-plate-data-europe.js");
require("../domain/license-plate-data-central.js");
require("../domain/license-plate-data-east.js");
require("../domain/license-plate-data-verified-de.js");
require("../domain/license-plate-jurisdiction-kinds.js");
require("../domain/license-plate-geo-hints.js");
require("../domain/license-plate-jurisdictions-de-secondary.js");
require("../domain/license-plate-jurisdictions-official-regions.js");
require("../domain/license-plate-jurisdictions-at.js");
require("../domain/license-plate-jurisdictions.js");
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
 await assert.rejects(svc.resolve(de),/Weder eindeutige Verwaltungsgrenze/);
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
   assert.ok(["current","historic","unknown"].includes(r.status));
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
   assert.equal(item.status,"current","Officially documented code must not say unknown: "+code);
   assert.equal(item.source,code==="GU"?"at-official-2026":"official-2026");
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
 // A COUNTY has no implicit reference town: only reviewed city hints qualify.
 const entry=cat.lookup("67").find(x=>x.country==="FR");
 const svc=new Resolver({catalog:cat,areaFinder:{find:async()=>[]}});
 await assert.rejects(svc.resolve(entry),/noch kein geprüfter Ersatzort/);
});

test("KN belongs to Landkreis Konstanz rather than the eponymous city",()=>{
 const entry=cat.lookup("KN").find(r=>r.country==="DE");
 assert.ok(entry);
 assert.equal(entry.name,"Landkreis Konstanz");
 assert.equal(entry.query,"Landkreis Konstanz");
 assert.equal(entry.admin,"county");
 assert.equal(entry.registrationArea,"Landkreis Konstanz");
 assert.equal(entry.namesakePlace,"Konstanz");
 assert.equal(entry.referencePlace,"Konstanz");
 assert.equal(entry.jurisdictionVerified,true);
 assert.equal(entry.source,"landkreis-konstanz-2026");
 assert.equal(entry.status,"current");
 assert.equal(entry.label,"🇩🇪 KN (Landkreis Konstanz)");
 assert.match(entry.sourceUrl,/lrakn.de/);
});
test("KN selects only a county, never a same-named city or municipality",async()=>{
 const entry=cat.lookup("KN").find(r=>r.country==="DE");
 const city={name:"Konstanz",osm_type:"relation",osm_id:111,
   geojson:poly,address:{country_code:"de"},addresstype:"city",type:"administrative"};
 const municipality={name:"Konstanz",osm_type:"relation",osm_id:112,
   geojson:poly,address:{country_code:"de"},addresstype:"municipality",type:"administrative"};
 const county={name:"Landkreis Konstanz",osm_type:"relation",osm_id:222,
   geojson:poly,address:{country_code:"de"},addresstype:"county",type:"administrative"};
 const svc=new Resolver({catalog:cat,areaFinder:{
   find:async query=>{assert.equal(query,"Landkreis Konstanz");return [city,municipality,county];},
   findPlace:async()=>{throw Error("Unique county must not trigger a place lookup");}
 }});
 const r=await svc.resolve(entry);
 assert.equal(r.kind,"area");
 assert.equal(r.osmId,222);
 assert.equal(r.label,"🇩🇪 KN (Landkreis Konstanz)");
 assert.equal(r.geojson,poly);
});
test("KN never substitutes a city polygon if the county is absent",async()=>{
 const entry=cat.lookup("KN").find(r=>r.country==="DE");
 const city={name:"Konstanz",osm_type:"relation",osm_id:111,
   geojson:poly,address:{country_code:"de"},addresstype:"city"};
 const svc=new Resolver({catalog:cat,areaFinder:{
   find:async()=>[city],
   findPlace:async()=>[{name:"Konstanz",lat:"47.66",lon:"9.17",
     addresstype:"city",address:{country_code:"de"}}]
 }});
 const result=await svc.resolve(entry);
 assert.equal(result.kind,"point");
 assert.equal(result.referencePlace,"Konstanz");
 assert.match(result.choiceDetail,/kein vollständiges Zulassungsgebiet/);
 assert.equal(result.geojson,undefined);
});

test("Austrian official 2026 jurisdiction tables cover 98 codes plus historic WU",()=>{
 const groups=globalThis.Pin2MapAustriaJurisdictionGroups;
 const codes=Object.values(groups).flatMap(s=>s.split(" "));
 assert.equal(codes.length,98);
 assert.equal(new Set(codes).size,codes.length);
 for(const code of codes){
   const row=cat.lookup(code).find(r=>r.country==="AT");
   assert.ok(row,"Missing Austrian code "+code);
   assert.equal(row.jurisdictionVerified,true,"Missing jurisdiction "+code);
   assert.equal(row.source,"at-official-2026");
   assert.equal(row.status,"current");
   assert.ok(row.sourceUrl.startsWith("https://www.oesterreich.gv.at/"));
 }
 const historic=cat.lookup("WU").find(r=>r.country==="AT");
 assert.equal(historic?.status,"historic");
 assert.equal(historic.geometryPolicy,"unmapped-historic");
 for(const [code,kind] of [["AM","county"],["B","county"],
   ["GU","county"],["KR","county"],["SL","county"],
   ["K","city"],["W","city"],["KS","city"],["S","city"],
   ["KG","city"],["BA","county"]]){
   assert.equal(cat.lookup(code).find(r=>r.country==="AT")?.admin,kind,code);
 }
 assert.equal(cat.lookup("BA").some(r=>r.country==="AT"),true);
 assert.equal(cat.lookup("KG").some(r=>r.country==="AT"),true);
});
test("Multi-municipality Austrian zones never silently become city polygons",async()=>{
 const entry=cat.lookup("E").find(r=>r.country==="AT");
 const provider={
   find:async()=>{throw Error("A composite Austrian jurisdiction MUST NOT query a city polygon");},
   findPlace:async()=>[{name:"Eisenstadt",lat:47.84,lon:16.52,
     addresstype:"city",address:{country_code:"at"}}]
 };
 assert.equal(entry.geometryPolicy,"reference-only");
 assert.match(entry.name,/Rust/);
 const resolved=await new Resolver({catalog:cat,areaFinder:provider}).resolve(entry);
 assert.equal(resolved.kind,"point");
 assert.match(resolved.choiceDetail,/kein vollständiges Zulassungsgebiet/);
 const former=cat.lookup("WU").find(r=>r.country==="AT");
 await assert.rejects(new Resolver({catalog:cat,areaFinder:provider}).resolve(former),
   /Historischer Zulassungsbezirk/);
});
test("Polish legal Powiat classification does not fabricate a county proper name",()=>{
 const augustow=cat.lookup("BAU").find(r=>r.country==="PL");
 assert.ok(augustow);
 assert.equal(augustow.admin,"county");
 assert.equal(augustow.adminRuleVerified,true);
 assert.equal(augustow.jurisdictionVerified,false);
 assert.match(augustow.label,/Powiat/);
 assert.equal(augustow.query,"Augustów");
 const urban=cat.lookup("BI").find(r=>r.country==="PL");
 assert.equal(urban.admin,"city");
 assert.equal(urban.adminRuleVerified,true);
 for(const cityCode of ["GA","GSP","SK","SD","SJJ","SRS","SJZ","ZS","ZSW"]){
   const city=cat.lookup(cityCode).find(r=>r.country==="PL");
   assert.ok(city,cityCode+" must be in the Polish catalog");
   assert.equal(city.admin,"city",cityCode+" is a city with powiat rights");
   assert.equal(city.adminRuleVerified,true);
 }
 const district=cat.lookup("BIA").find(r=>r.country==="PL");
 assert.equal(district.admin,"county");
 assert.equal(district.adminRuleVerified,true);
 const region=cat.lookup("D").find(r=>r.country==="PL");
 assert.equal(region.admin,"state");
});
test("Polish powiat candidate excludes a same-named city geometry",async()=>{
 const entry=cat.lookup("BAU").find(r=>r.country==="PL");
 const county={name:"Augustów",osm_id:222,osm_type:"relation",
   addresstype:"county",geojson:poly,address:{country_code:"pl"}};
 const city={name:"Augustów",osm_id:111,osm_type:"relation",
   addresstype:"city",geojson:poly,address:{country_code:"pl"}};
 const result=await new Resolver({catalog:cat,areaFinder:{
   find:async()=>[city,county],
   findPlace:async()=>{throw Error("Area is unique");}
 }}).resolve(entry);
 assert.equal(result.kind,"area");
 assert.equal(result.osmId,222);
});
test("German shared prefixes demand an explicit city-or-county choice",async()=>{
 for(const [code,label] of [["KA","Karlsruhe"],["HN","Heilbronn"],
   ["UL","Ulm"],["WÜ","Würzburg"],["BA","Bamberg"],["A","Augsburg"]]){
   const entry=cat.lookup(code).find(r=>r.country==="DE");
   assert.ok(entry,"Missing "+code);
   assert.equal(entry.jurisdictionVerified,true);
   assert.equal(entry.areaOptions.length,2);
   assert.match(entry.name,/Stadt/);
 }
 const entry=cat.lookup("KA").find(r=>r.country==="DE");
 const calls=[];
 const svc=new Resolver({catalog:cat,areaFinder:{find:async query=>{
   calls.push(query);
   return query==="Karlsruhe"?[{
     name:"Karlsruhe",osm_type:"relation",osm_id:11,geojson:poly,
     addresstype:"city",address:{country_code:"de"}
   }]:[{
     name:"Landkreis Karlsruhe",osm_type:"relation",osm_id:22,geojson:poly,
     addresstype:"county",address:{country_code:"de"}
   }];
 }}});
 const out=await svc.resolve(entry);
 assert.equal(out.kind,"choices");
 assert.deepEqual(out.choices.map(x=>x.osmId),[11,22]);
 assert.deepEqual(out.choices.map(x=>x.label),[
   "🇩🇪 KA (Stadt Karlsruhe)","🇩🇪 KA (Landkreis Karlsruhe)"
 ]);
 assert.deepEqual(calls,["Karlsruhe","Landkreis Karlsruhe"]);
});
test("Shared prefix with only one resolved region still asks which area is available",async()=>{
 const entry=cat.lookup("KA").find(r=>r.country==="DE");
 const svc=new Resolver({catalog:cat,areaFinder:{find:async query=>
   query==="Karlsruhe"?[{
     name:"Karlsruhe",osm_type:"relation",osm_id:11,geojson:poly,
     addresstype:"city",address:{country_code:"de"}
   }]:[]
 }});
 const out=await svc.resolve(entry);
 assert.equal(out.kind,"choices");
 assert.equal(out.choices.length,1);
 assert.equal(out.choices[0].label,"🇩🇪 KA (Stadt Karlsruhe)");
});

test("TT and ÜB are present, RV refers to Ravensburg, FN to Bodenseekreis",()=>{
 const expected=[
  ["TT","Bodenseekreis","Tettnang"],
  ["FN","Bodenseekreis","Friedrichshafen"],
  ["RV","Landkreis Ravensburg","Ravensburg"]
 ];
 for(const [code,area,namesake] of expected){
  const row=cat.lookup(code).find(r=>r.country==="DE");
  assert.ok(row,code+" missing");
  assert.equal(row.registrationArea,area);
  assert.equal(row.namesakePlace,namesake);
  assert.equal(row.jurisdictionVerified,true);
  assert.equal(row.admin,"county");
  assert.equal(row.status,"current");
 }
 const ueb=cat.lookup("ÜB").find(r=>r.country==="DE");
 assert.ok(ueb,"ÜB must retain umlaut code");
 assert.equal(ueb.namesakePlace,"Überlingen");
 assert.equal(ueb.areaOptions.length,3);
 assert.deepEqual(ueb.areaOptions.map(x=>x.areaName),[
   "Bodenseekreis","Landkreis Ravensburg","Landkreis Sigmaringen"
 ]);
});
test("ÜB gives three distinct districts and never silently chooses Überlingen",async()=>{
 const entry=cat.lookup("ÜB").find(r=>r.country==="DE");
 let queried=[];
 const svc=new Resolver({catalog:cat,areaFinder:{find:async query=>{
  queried.push(query);
  const id={"Bodenseekreis":101,"Landkreis Ravensburg":202,
     "Landkreis Sigmaringen":303}[query];
  return [{name:query,osm_type:"relation",osm_id:id,
    geojson:poly,addresstype:"county",address:{country_code:"de"}}];
 }}});
 const result=await svc.resolve(entry);
 assert.equal(result.kind,"choices");
 assert.deepEqual(queried,[
  "Bodenseekreis","Landkreis Ravensburg","Landkreis Sigmaringen"
 ]);
 assert.deepEqual(result.choices.map(x=>x.osmId),[101,202,303]);
 assert.ok(result.choices.every(x=>x.label.includes("ÜB")));
 assert.ok(result.choices.every(x=>!x.label.includes("Überlingen")));
});

test("German secondary source provides county scopes without claiming governmental verification",()=>{
 const cases=[["AB","Stadt Aschaffenburg","Landkreis Aschaffenburg"],
  ["AA","Ostalbkreis"],["BK","Rems-Murr-Kreis","Landkreis Schwäbisch Hall","Landkreis Börde"]];
 for(const [code,...regions] of cases){
  const e=cat.lookup(code).find(r=>r.country==="DE");
  assert.ok(e,code);
  assert.equal(e.jurisdictionVerified,false);
  assert.equal(e.jurisdictionEvidence,"secondary");
  assert.equal(e.jurisdictionClassified,true);
  if(regions.length>1)assert.deepEqual(e.areaOptions.map(o=>o.areaName),regions);
  else assert.equal(e.name,regions[0]);
 }
 assert.equal(cat.lookup("KN").find(x=>x.country==="DE").jurisdictionVerified,true);
 assert.equal(cat.lookup("TT").find(x=>x.country==="DE").jurisdictionVerified,true);
 assert.equal(cat.lookup("NAU").find(x=>x.country==="DE").source,"official-2026");
});
test("official multi-municipality regions never become city area polygons",async()=>{
 for(const [country,code] of [["HR","ZG"],["SI","LJ"],["RS","BG"],["ME","AN"]]){
  const e=cat.lookup(code).find(x=>x.country===country);
  assert.ok(e,country+" "+code);
  assert.equal(e.geometryPolicy,"reference-only");
  assert.equal(e.admin,"county");
  assert.equal(e.source,"official-scope-"+country.toLowerCase());
  assert.ok(e.sourceUrl.startsWith("https://"));
  assert.match(e.name,/Zulassungsregion/);
  const svc=new Resolver({catalog:cat,areaFinder:{
   find:async()=>{throw Error("No city polygon may pretend to cover a registration region");},
   findPlace:async()=>[{name:e.referencePlace,lat:"45.1",lon:"15.2",
     addresstype:"city",address:{country_code:country.toLowerCase()}}]
  }});
  const result=await svc.resolve(e);
  assert.equal(result.kind,"point");
  assert.equal(result.geojson,undefined);
  assert.match(result.choiceDetail,/kein vollständiges Zulassungsgebiet/);
 }
});
test("foreign community city codes without proven scope are reference-only",()=>{
 for(const [cc,code] of [["MK","SK"],["BY","7"],["UA","AA"]]){
  const e=cat.lookup(code).find(x=>x.country===cc);
  assert.ok(e,cc+" "+code);
  assert.equal(e.jurisdictionVerified,false);
  assert.equal(e.geometryPolicy,"reference-only");
 }
});
test("Munich M is shared by city and Landkreis, not restricted to namesake city",()=>{
 const e=cat.lookup("M").find(x=>x.country==="DE");
 assert.ok(e);assert.equal(e.jurisdictionEvidence,"secondary");
 assert.deepEqual(e.areaOptions.map(x=>x.areaName),[
   "Stadt München","Landkreis München"
 ]);
});
