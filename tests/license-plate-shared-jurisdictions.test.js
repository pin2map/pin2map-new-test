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
const catalog=require("../domain/license-plate-catalog.js");
const Resolver=require("../application/license-plate-search.js");
const area=type=>({name:type==="city"?"Coburg":"Landkreis Coburg",
 osm_type:"relation",osm_id:type==="city"?111:222,
 geojson:{type:"Polygon",coordinates:[[[10,50],[11,50],[11,51],[10,51],[10,50]]]},
 addresstype:type,address:{country_code:"de"}});
test("CO uses official independent Stadt and Landkreis jurisdictions",()=>{
 const e=catalog.lookup("CO").find(x=>x.country==="DE");
 assert.ok(e);assert.equal(e.jurisdictionVerified,true);
 assert.deepEqual(e.areaOptions.map(o=>[o.areaName,o.query,o.admin]),[
  ["Stadt Coburg","Coburg","city"],["Landkreis Coburg","Landkreis Coburg","county"]]);
 assert.equal(e.referencePlace,"Coburg");
 assert.match(e.sourceUrl,/landkreis-coburg\.de/);
});
test("CO queries both boundaries and requires explicit choice",async()=>{
 const e=catalog.lookup("CO").find(x=>x.country==="DE"),queries=[];
 const svc=new Resolver({catalog,areaFinder:{find:async query=>{
  queries.push(query);return [area(query==="Coburg"?"city":"county")];
 }}});
 const result=await svc.resolve(e);
 assert.equal(result.kind,"choices");
 assert.deepEqual(queries,["Coburg","Landkreis Coburg"]);
 assert.deepEqual(result.choices.map(x=>x.label),[
  "🇩🇪 CO (Stadt Coburg)","🇩🇪 CO (Landkreis Coburg)"]);
});
test("CO without polygons uses reviewed reference point, not invented city area",async()=>{
 const e=catalog.lookup("CO").find(x=>x.country==="DE"),calls=[];
 const svc=new Resolver({catalog,areaFinder:{
  find:async query=>{calls.push(query);return [];},
  findPlace:async(query,{countryCode})=>{
   assert.equal(query,"Coburg");assert.equal(countryCode,"DE");
   return [{name:"Coburg",lat:"50.26",lon:"10.96",
    addresstype:"city",address:{country_code:"de"}}];
  }
 }});
 const result=await svc.resolve(e);
 assert.deepEqual(calls,["Coburg","Landkreis Coburg"]);
 assert.equal(result.kind,"point");
 assert.equal(result.geojson,undefined);
 assert.deepEqual(result.point,{lat:50.26,lng:10.96});
 assert.match(result.choiceDetail,/kein vollständiges Zulassungsgebiet/);
});
test("CO never uses an unverified reference from the wrong country",async()=>{
 const e=catalog.lookup("CO").find(x=>x.country==="DE");
 const svc=new Resolver({catalog,areaFinder:{
  find:async()=>[],
  findPlace:async()=>[{name:"Coburg",lat:50.26,lon:10.96,
   address:{country_code:"at"}}]
 }});
 await assert.rejects(svc.resolve(e),/kein geprüfter Ersatzort/);
});
test("all straightforward joined Stadt/Landkreis secondary sources split safely",()=>{
 const expected={
  DA:["Landkreis Darmstadt-Dieburg","Stadt Darmstadt"],
  KS:["Landkreis Kassel","Stadt Kassel"],
  NEC:["Stadt Coburg","Landkreis Coburg"],
  OF:["Landkreis Offenbach","Stadt Offenbach am Main"],
  TR:["Landkreis Trier-Saarburg","Stadt Trier"]
 };
 for(const [code,areas] of Object.entries(expected)){
  const e=catalog.lookup(code).find(x=>x.country==="DE");
  assert.ok(e,"Missing "+code);
  assert.equal(e.jurisdictionEvidence,"secondary",code+" must not gain false official status");
  assert.equal(e.jurisdictionVerified,false);
  assert.deepEqual(e.areaOptions.map(x=>x.areaName),areas,code);
 }
});
test("all composite secondary choices remain independently typed",()=>{
 const data=require("../domain/license-plate-jurisdictions-de-secondary.js");
 for(const [key,item] of Object.entries(data)){
  if(!item.areaOptions)continue;
  assert.ok(item.areaOptions.length>=2,key);
  for(const opt of item.areaOptions){
   assert.ok(["city","county"].includes(opt.admin),key);
   assert.doesNotMatch(opt.areaName,/\b(?:Stadt|Landkreis) .+ und (?:Stadt|Landkreis)\b/i,key);
  }
 }
});
