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

test("Kartentip discovers island, protected and restricted areas absent from address hierarchy",async()=>{
  globalThis.Pin2MapAreaGeometry=require("../domain/area-geometry.js");
  const requests=[];
  const overpass=[
    {type:"relation",id:101,tags:{name:"Nationalpark Jasmund",boundary:"national_park"}},
    {type:"relation",id:102,tags:{name:"Schießgebiet Arkona",military:"danger_area"}},
    {type:"relation",id:103,tags:{name:"Rügen",place:"island"}},
    {type:"way",id:104,tags:{name:"Sperrgebiet",landuse:"military"}},
    {type:"way",id:105,tags:{name:"Privathaus",building:"yes"}},
    {type:"node",id:106,tags:{name:"Aussichtspunkt",tourism:"viewpoint"}}
  ];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    requests.push(url);
    const body=url.includes("/reverse")?{
      class:"highway",type:"residential",name:"Dorfstraße",
      address:{country:"Deutschland",state:"Mecklenburg-Vorpommern",
        county:"Vorpommern-Rügen",town:"Sassnitz",island:"Rügen",country_code:"de"}
    }:{elements:overpass};
    return {ok:true,json:async()=>body};
  }});
  const result=await finder.hierarchyAt({lat:54.55,lng:13.63});
  const names=result.rows.map(x=>x.name);
  for(const name of ["Deutschland","Mecklenburg-Vorpommern","Rügen",
    "Nationalpark Jasmund","Schießgebiet Arkona","Sperrgebiet"])
    assert.ok(names.includes(name),name+" must be selectable");
  assert.equal(names.filter(x=>x==="Rügen").length,1,
    "An island in reverse and Overpass must appear only once");
  assert.equal(result.rows.find(x=>x.name==="Rügen").osmId,103);
  assert.equal(names.includes("Privathaus"),false);
  assert.equal(names.includes("Aussichtspunkt"),false);
  assert.equal(names.includes("Dorfstraße"),false);
  assert.equal(result.rows.find(x=>x.name==="Nationalpark Jasmund").osmId,101);
  assert.equal(result.rows.find(x=>x.name==="Schießgebiet Arkona").kind,"restricted_area");
  assert.match(requests[1],/overpass\.private\.coffee/);
  assert.match(decodeURIComponent(requests[1]),/is_in\(54\.55,13\.63\)/);
});
test("Kartentip resolves a thematic candidate by exact OSM identity, not an unrelated namesake",async()=>{
  const geometry={type:"Polygon",coordinates:[[
    [13.3,54.3],[13.9,54.3],[13.9,54.8],[13.3,54.8],[13.3,54.3]
  ]]};
  const urls=[];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    urls.push(url);
    if(url.includes("/lookup"))return {ok:true,json:async()=>[
      {osm_type:"relation",osm_id:101,name:"Nationalpark Jasmund",geojson:geometry},
      {osm_type:"relation",osm_id:999,name:"Nationalpark Jasmund",geojson:geometry}
    ]};
    throw Error("unexpected name search");
  }});
  const result=await finder.findContaining({name:"Nationalpark Jasmund",
    kind:"protected_area",osmType:"relation",osmId:101,fromContainingArea:true},
    {lat:54.5,lng:13.6},{countryCode:"de"});
  assert.equal(result.osm_id,101);
  assert.match(urls[0],/osm_ids=R101/);
  assert.match(urls[0],/polygon_geojson=1/);
  assert.equal(urls.length,1);
});
test("recognized unique villages and small places resolve despite simplified polygon mismatch",async()=>{
  globalThis.Pin2MapAreaGeometry=require("../domain/area-geometry.js");
  const mismatch={type:"Polygon",coordinates:[[
    [14,55],[14.1,55],[14.1,55.1],[14,55.1],[14,55]
  ]]};
  const candidate={osm_type:"relation",osm_id:501,name:"Abtshagen",
    addresstype:"village",geojson:mismatch};
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async()=>({
    ok:true,json:async()=>[candidate]
  })});
  const found=await finder.findContaining({kind:"village",name:"Abtshagen"},
    {lat:54.1,lng:13.2},{countryCode:"de"});
  assert.equal(found?.osm_id,501);
});
