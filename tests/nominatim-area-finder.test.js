"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {NominatimAreaFinder,matches,variants}=require("../adapters/geocoding/nominatim-area-finder.js");
const poly={type:"Polygon",coordinates:[[[10,50],[11,50],[11,51],[10,50]]]};
test("area name variants retain predecessor mountain aliases",()=>{
  assert.ok(variants("Alpen").includes("Alps"));
  assert.ok(variants("See Tegernsee").includes("Tegernsee"));
});
test("name match ignores display_name address components",()=>{
  assert.equal(matches({name:"Berlin",display_name:"Berlin, Hamburg"},["Hamburg"]),false);
  assert.equal(matches({name:"Hamburg",geojson:poly},["Hamburg"]),true);
});
test("finder keeps matching polygon features and filters water search kinds",async()=>{
  const calls=[];
  const finder=new NominatimAreaFinder({fetchImpl:async url=>{
    calls.push(url);
    return {ok:true,json:async()=>[
      {osm_type:"relation",osm_id:10,name:"Tegernsee",class:"natural",type:"water",geojson:poly},
      {osm_type:"way",osm_id:11,name:"Tegernsee",class:"highway",type:"road",geojson:poly},
      {osm_type:"node",osm_id:12,name:"Tegernsee",class:"natural",geojson:{type:"Point",coordinates:[11,48]}},
      {osm_type:"relation",osm_id:10,name:"Tegernsee",class:"natural",type:"water",geojson:poly}
    ]};
  }});
  const found=await finder.find("Tegernsee",{kind:"lake"});
  assert.equal(found.length,1);
  assert.equal(found[0].osm_id,10);
  assert.match(calls[0],/polygon_geojson=1/);
});
