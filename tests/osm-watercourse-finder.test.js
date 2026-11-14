"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const river=require("../adapters/geocoding/osm-watercourse-finder.js");
test("predecessor river variants include international alternatives",()=>{
  assert.ok(river.aliases("Amazonas").includes("Rio Amazonas"));
  assert.ok(river.aliases("Weichsel").includes("Wisła"));
  assert.ok(river.aliases("Dnjepr").includes("Dnipro"));
});
test("river tags and relation scores prefer full named waterways",()=>{
  assert.equal(river.nameScore({name:"Weser"},["Weser"]),140);
  assert.equal(river.nameScore({alt_name:"Dordogne"},["Dordogne"]),140);
  assert.equal(river.kindScore({waterway:"canal"}),-35);
});
test("finder recognizes OSM relation and returns ranked geometry candidates",async()=>{
  const calls=[];
  const finder=new river.OsmWatercourseFinder({minimumNominatimIntervalMs:0,
    fetchImpl:async url=>{
      calls.push(url);
      if(url.includes("/search?"))return {ok:true,json:async()=>[
        {osm_type:"relation",osm_id:12,lat:"50",lon:"10",display_name:"Weser"},
        {osm_type:"way",osm_id:13,lat:"50",lon:"10",display_name:"Weser"}
      ]};
      if(url.includes("/relation/12.json"))return {ok:true,json:async()=>({elements:[
        {type:"relation",id:12,tags:{type:"waterway",name:"Weser",waterway:"river"}}
      ]})};
      if(url.includes("/way/13.json"))return {ok:true,json:async()=>({elements:[
        {type:"way",id:13,tags:{waterway:"stream",name:"Weser"}}
      ]})};
      throw Error("Unexpected: "+url);
    }});
  const result=await finder.find("Weser",{center:{lat:50,lng:10}});
  assert.equal(result[0].osmType,"relation");
  assert.equal(result[0].id,12);
  assert.ok(calls.some(url=>url.includes("/relation/12.json")));
});
