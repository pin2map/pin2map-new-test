"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
for(const moduleName of ["dach","europe","central","east"])
  require("../domain/license-plate-data-"+moduleName+".js");
require("../domain/license-plate-jurisdictions.js");
const cat=require("../domain/license-plate-catalog.js");
const pick=(code,country)=>cat.lookup(code).find(x=>x.country===country);
test("large offline catalog remains deterministic and country-distinct",()=>{
  assert.ok(cat.records.length>1750,"Should contain substantially more than original 54 rows");
  assert.ok(new Set(cat.records.map(x=>x.country)).size>=20);
  assert.equal(new Set(cat.records.map(x=>x.country+"|"+x.code)).size,cat.records.length);
  assert.equal(cat.lookup("B").some(x=>x.country==="DE"&&x.name==="Berlin"),true);
  assert.equal(cat.lookup("B").some(x=>x.country==="RO"&&x.name==="Bukarest"),true);
  assert.equal(cat.lookup("67").some(x=>x.country==="FR"),true);
  assert.equal(cat.lookup("67").some(x=>x.country==="TR"),true);
});
test("official-list-backed series and recent Sardinian changes are represented",()=>{
  assert.equal(pick("81","TR").name,"Düzce");
  assert.equal(pick("01","FR").name,"Ain");
  assert.equal(pick("2A","FR")?.country,"FR");
  assert.equal(pick("MI","IT")?.country,"IT");
  assert.equal(pick("OT","IT")?.name,"Gallura Nord-Est Sardegna");
  assert.equal(pick("OG","IT")?.name,"Ogliastra");
  assert.equal(pick("VS","IT")?.name,"Medio Campidano");
  assert.equal(pick("SU","IT")?.name,"Sulcis Iglesiente");
  assert.equal(pick("D","IE")?.name,"Dublin");
});
test("DACH CC0, regional eastern and central Europe codes can be searched offline",()=>{
  assert.equal(pick("AA","DE")?.query,"Ostalbkreis");
  assert.equal(pick("AM","AT")?.country,"AT");
  assert.equal(pick("VD","CH")?.country,"CH");
  assert.equal(pick("DW","PL")?.country,"PL");
  assert.equal(pick("CJ","RO")?.country,"RO");
  assert.equal(pick("A","CZ")?.country,"CZ");
  assert.equal(pick("ČK","HR")?.country,"HR");
  assert.equal(pick("LJ","SI")?.country,"SI");
  assert.equal(pick("CB","BG")?.country,"BG");
  assert.equal(pick("BG","RS")?.country,"RS");
  assert.equal(pick("1","BY")?.country,"BY");
  assert.equal(pick("AA","UA")?.country,"UA");
  assert.equal(cat.lookup("M").some(x=>x.country==="ES"&&x.status==="historic"),true);
});
test("catalog records are immutable, sourced, and distinguish unknown historic status",()=>{
  assert.ok(Object.isFrozen(cat.records));
  for(const item of cat.records){
    assert.match(item.country,/^[A-Z]{2}$/);
    assert.match(item.code,/^[\p{L}0-9]{1,5}$/u);
    assert.ok(item.source.length>0);
    assert.ok(["current","historic","unknown"].includes(item.status));
    assert.ok(["city","county","state"].includes(item.admin));
    assert.ok(item.flag.length>=2);
  }
  assert.equal(pick("AA","DE")?.status,"unknown");
  assert.equal(cat.lookup("???").length,0);
});
test("offline source files do not fetch network data or access persistence",()=>{
  const index=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const sw=fs.readFileSync(path.join(__dirname,"../sw.js"),"utf8");
  for(const n of ["dach","europe","central","east"]){
    const file="domain/license-plate-data-"+n+".js";
    const source=fs.readFileSync(path.join(__dirname,"../"+file),"utf8");
    assert.ok(index.includes("./"+file));
    assert.ok(sw.includes("./"+file));
    assert.doesNotMatch(source,/\bfetch\(|\bindexedDB\b|\bL\./);
  }
  assert.ok(index.indexOf("domain/license-plate-data-east.js") <
    index.indexOf("domain/license-plate-catalog.js"));
});

test("reviewed jurisdiction data is loaded before catalog and kept offline",()=>{
 const entry=pick("KN","DE");
 assert.equal(entry.jurisdictionVerified,true);
 assert.equal(entry.admin,"county");
 assert.equal(entry.name,"Landkreis Konstanz");
 assert.equal(entry.namesakePlace,"Konstanz");
 const index=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const sw=fs.readFileSync(path.join(__dirname,"../sw.js"),"utf8");
 assert.ok(index.includes("./domain/license-plate-jurisdictions.js"));
 assert.ok(sw.includes("./domain/license-plate-jurisdictions.js"));
 assert.ok(index.indexOf("license-plate-jurisdictions.js")<
   index.indexOf("license-plate-catalog.js"));
});
