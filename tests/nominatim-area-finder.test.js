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

test("NSW hierarchy search is country-scoped but not clipped to 6-degree viewbox",async()=>{
  globalThis.Pin2MapAreaGeometry=require("../domain/area-geometry.js");
  const calls=[];
  const state={
    osm_type:"relation",osm_id:2316596,name:"New South Wales",
    namedetails:{"name:de":"Neusüdwales"},
    type:"administrative",addresstype:"state",extratags:{admin_level:"4"},
    geojson:{type:"Polygon",coordinates:[[
      [141,-37.5],[154,-37.5],[154,-28],[141,-28],[141,-37.5]
    ]]}
  };
  const finder=new NominatimAreaFinder({fetchImpl:async url=>{
    calls.push(url);
    return {ok:true,json:async()=>[state]};
  }});
  const selected=await finder.findContaining({kind:"state",name:"Neusüdwales"},
    {lat:-35.3,lng:150.3},{countryCode:"au"});
  assert.equal(selected.osm_id,2316596);
  const url=new URL(calls[0]);
  assert.equal(url.searchParams.has("viewbox"),false);
  assert.equal(url.searchParams.has("bounded"),false);
  assert.equal(url.searchParams.get("countrycodes"),"au");
  assert.equal(url.searchParams.get("namedetails"),"1");
});
test("trusted reverse-geocoded state hierarchy survives simplified shoreline containment mismatch",async()=>{
  globalThis.Pin2MapAreaGeometry=require("../domain/area-geometry.js");
  const state={osm_type:"relation",osm_id:9,name:"New South Wales",
    namedetails:{"name:de":"Neusüdwales"},addresstype:"state",
    geojson:{type:"Polygon",coordinates:[[[-150,-37],[-149,-37],[-149,-36],[-150,-37]]]}};
  const finder=new NominatimAreaFinder({fetchImpl:async()=>({
    ok:true,json:async()=>[state]
  })});
  const found=await finder.findContaining({name:"Neusüdwales",kind:"state"},
    {lat:-35.3,lng:150.3},{countryCode:"au"});
  assert.equal(found.osm_id,9);
});
test("ambiguous administrative names never select an unrelated polygon automatically",async()=>{
  globalThis.Pin2MapAreaGeometry=require("../domain/area-geometry.js");
  const make=id=>({osm_type:"relation",osm_id:id,name:"Springfield",
    addresstype:"city",geojson:{type:"Polygon",coordinates:[[
      [10,50],[11,50],[11,51],[10,50]
    ]]}});
  const finder=new NominatimAreaFinder({fetchImpl:async()=>({
    ok:true,json:async()=>[make(1),make(2)]
  })});
  assert.equal(await finder.findContaining({kind:"city",name:"Springfield"},
    {lat:-35,lng:150},{countryCode:"au"}),null);
});

test("reverse area hierarchy removes roads, subdistricts and POIs and displays country first",async()=>{
  const finder=new NominatimAreaFinder({fetchImpl:async()=>({ok:true,json:async()=>({
    osm_type:"way",osm_id:451319630,name:"Kolonnenweg",type:"path",
    address:{suburb:"Helmershausen",village:"Gerthausen",city:"Rhönblick",
      county:"Landkreis Schmalkalden-Meiningen",state:"Thüringen",country:"Deutschland",country_code:"de"}
  })})});
  const result=await finder.hierarchyAt({lat:50.6,lng:10.1});
  assert.deepEqual(result.rows.map(x=>x.kind),["country","state","county","city","village"]);
  assert.deepEqual(result.rows.map(x=>x.name),["Deutschland","Thüringen",
    "Landkreis Schmalkalden-Meiningen","Rhönblick","Gerthausen"]);
  assert.equal(result.rows.some(x=>x.name==="Kolonnenweg"||x.name==="Helmershausen"),false);
  assert.equal(result.countryCode,"de");
});
