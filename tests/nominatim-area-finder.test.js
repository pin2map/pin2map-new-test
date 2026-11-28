"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {NominatimAreaFinder,matches,variants,areaProviders}=require("../adapters/geocoding/nominatim-area-finder.js");
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
  assert.match(requests[1],/ovp\.dresel\.systems/);
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

test("slow Overpass never delays the initial administrative Kartentip choices",async()=>{
  let release,markAsked,partial=null;
  const requested=new Promise(resolve=>{markAsked=resolve;});
  const stalled=new Promise(resolve=>{release=resolve;});
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    if(url.includes("/reverse"))return {ok:true,json:async()=>({
      address:{country:"Deutschland",state:"Mecklenburg-Vorpommern",country_code:"de"}
    })};
    markAsked();
    await stalled;
    return {ok:true,json:async()=>({elements:[{type:"relation",id:7,
      tags:{name:"Nationalpark Jasmund",boundary:"national_park"}}]})};
  }});
  const operation=finder.hierarchyAt({lat:54.5,lng:13.6},{
    onPartial:early=>{if(!partial)partial=early;}
  });
  await requested;
  assert.deepEqual(partial.rows.map(row=>row.name),
    ["Deutschland","Mecklenburg-Vorpommern"],
    "The old administrative list must be usable while Overpass is pending");
  release();
  const result=await operation;
  assert.ok(result.rows.some(row=>row.name==="Nationalpark Jasmund"));
  assert.equal(result.extraUnavailable,false);
});
test("Overpass failure retains reverse-geocoded hierarchy and flags partial availability",async()=>{
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    if(url.includes("/reverse"))return {ok:true,json:async()=>({
      address:{country:"Deutschland",country_code:"de"}
    })};
    return {ok:false,status:503};
  }});
  let partial=null;
  const result=await finder.hierarchyAt({lat:54.5,lng:13.6},
    {onPartial:early=>{partial=early;}});
  assert.equal(partial.rows[0].name,"Deutschland");
  assert.equal(result.rows[0].name,"Deutschland");
  assert.equal(result.extraUnavailable,true);
});

test("actual regional Overpass hosts have correct bounded coverage and global fallback",()=>{
  assert.match(areaProviders({lat:54.55,lng:13.63})[0],/dresel\.systems\/api\/interpreter/);
  assert.match(areaProviders({lat:40.71,lng:-74.0})[0],/dresel\.systems\/api-na\/interpreter/);
  assert.match(areaProviders({lat:-33.9,lng:151.2})[0],/maps\.mail\.ru/);
  assert.match(areaProviders({lat:-22.9737,lng:-43.2125})[0],/maps\.mail\.ru/);
  assert.ok(!areaProviders({lat:-33.9,lng:151.2}).some(s=>s.includes("dresel")));
});
test("provider HTTP failures retry an independent server without losing administrative choices",async()=>{
  let calls=[],shown=null;
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    calls.push(url);
    if(url.includes("/reverse"))return {ok:true,json:async()=>({address:{
      country:"Deutschland",state:"Mecklenburg-Vorpommern",country_code:"de"}})};
    if(url.includes("dresel.systems"))return {ok:false,status:503};
    return {ok:true,json:async()=>({elements:[{type:"relation",id:23,
      tags:{name:"Nationalpark Jasmund",boundary:"national_park"}}]})};
  }});
  const found=await finder.hierarchyAt({lat:54.55,lng:13.63},
    {onPartial:x=>{if(!shown)shown=x.rows.map(r=>r.name);}});
  assert.deepEqual(shown,["Deutschland","Mecklenburg-Vorpommern"]);
  assert.equal(found.rows.at(-1).name,"Nationalpark Jasmund");
  assert.equal(found.extraUnavailable,false);
  assert.equal(calls.length,3);
  assert.match(calls[1],/dresel\.systems/);
  assert.match(calls[2],/private\.coffee/);
});

test("Borgwallsee query uses filtered containing areas and original OSM pivots",async()=>{
  const calls=[];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    calls.push(url);
    if(url.includes("/reverse"))return {ok:true,json:async()=>({
      address:{country:"Deutschland",state:"Mecklenburg-Vorpommern",
        country_code:"de"}})};
    return {ok:true,json:async()=>({elements:[
      {type:"way",id:92345,tags:{name:"Borgwallsee",natural:"water",water:"lake"}}
    ]})};
  }});
  const result=await finder.hierarchyAt({lat:54.272442,lng:13.005109});
  const query=new URL(calls[1]).searchParams.get("data");
  assert.match(query,/is_in\(54\.272442,13\.005109\)->\.inside/);
  assert.match(query,/area\.inside\["natural"="water"\]/);
  assert.match(query,/area\.inside\["water"~"\^\(lake\|reservoir\|pond\)\$"\]/);
  assert.match(query,/way\(pivot\.found\)/);
  assert.match(query,/rel\(pivot\.found\)/);
  assert.equal(query.includes("pivot.containing"),false);
  assert.equal(result.rows.find(x=>x.name==="Borgwallsee")?.kind,"lake");
  assert.equal(result.rows.find(x=>x.name==="Borgwallsee")?.osmId,92345);
});

test("global Kartentip asks only for matching area IDs, resolving relation areas and closed ways",async()=>{
  const queries=[];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    queries.push(url);
    if(url.includes("/reverse"))return {ok:true,json:async()=>({
      address:{country:"Australien",country_code:"au"}})};
    return {ok:true,json:async()=>({elements:[
      {type:"area",id:3600000719,tags:{name:"Australisches Schutzgebiet",boundary:"protected_area"}},
      {type:"way",id:9001,tags:{name:"Testsee",natural:"water"}},
      {type:"area",id:2400009123,tags:{name:"Reservoir",water:"reservoir"}},
      {type:"node",id:99,tags:{name:"Nicht als Fläche",natural:"water"}}
    ]})};
  }});
  const result=await finder.hierarchyAt({lat:-35.2925,lng:149.131});
  const query=new URL(queries[1]).searchParams.get("data");
  assert.match(queries[1],/maps\.mail\.ru/);
  assert.match(query,/\.found out tags/);
  assert.equal(query.includes("pivot.found"),false);
  assert.deepEqual(result.rows.slice(1).map(x=>[x.name,x.osmType,x.osmId]),[
    ["Australisches Schutzgebiet","relation",719],
    ["Testsee","way",9001],
    ["Reservoir","way",9123]
  ]);
  assert.equal(result.rows.some(x=>x.name==="Nicht als Fläche"),false);
  assert.equal(result.extraUnavailable,false);
});
test("global provider falls back after failure without hiding reverse-address results",async()=>{
  const queries=[];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    queries.push(url);
    if(url.includes("/reverse"))return {ok:true,json:async()=>({
      address:{country:"Brasil",country_code:"br"}})};
    if(url.includes("maps.mail.ru"))return {ok:false,status:504};
    return {ok:true,json:async()=>({elements:[
      {type:"area",id:3600000042,tags:{name:"Parque Nacional",boundary:"national_park"}}
    ]})};
  }});
  let initial=null;
  const result=await finder.hierarchyAt({lat:-22.9737,lng:-43.2125},
    {onPartial:partial=>{if(!initial)initial=partial.rows.map(x=>x.name);}});
  assert.deepEqual(initial,["Brasil"]);
  assert.equal(result.rows.find(x=>x.name==="Parque Nacional").osmId,42);
  assert.equal(result.extraUnavailable,false);
  assert.match(queries[1],/maps\.mail\.ru/);
  assert.match(queries[2],/private\.coffee/);
});

test("two area sources start concurrently; late provider enriches without replacing earlier choices",async()=>{
  let firstResolve,secondResolve;
  const first=new Promise(resolve=>{firstResolve=resolve;});
  const second=new Promise(resolve=>{secondResolve=resolve;});
  const requested=[],updates=[];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    requested.push(url);
    if(url.includes("/reverse"))return {ok:true,json:async()=>({
      address:{country:"Deutschland",state:"Mecklenburg-Vorpommern",country_code:"de"}
    })};
    if(url.includes("dresel.systems"))return first;
    if(url.includes("private.coffee"))return second;
    throw Error("unexpected third request");
  }});
  const operation=finder.hierarchyAt({lat:54.55,lng:13.63},{
    onPartial:x=>updates.push(x.rows.map(r=>r.name))
  });
  for(let i=0;i<12&&requested.length<3;i++)await Promise.resolve();
  assert.equal(requested.length,3,"Both area sources must start before either completes");
  assert.deepEqual(updates[0],["Deutschland","Mecklenburg-Vorpommern"]);
  secondResolve({ok:true,json:async()=>({elements:[
    {type:"relation",id:100,tags:{name:"Nationalpark Jasmund",boundary:"national_park"}}
  ]})});
  for(let i=0;i<12&&updates.length<2;i++)await Promise.resolve();
  assert.ok(updates[1].includes("Nationalpark Jasmund"),
    "The second provider must update the view before first provider replies");
  firstResolve({ok:true,json:async()=>({elements:[
    {type:"relation",id:100,tags:{name:"Nationalpark Jasmund",boundary:"national_park"}},
    {type:"relation",id:101,tags:{name:"Rügen",place:"island"}}
  ]})});
  const result=await operation;
  assert.equal(result.extraUnavailable,false);
  assert.equal(result.rows.filter(r=>r.name==="Nationalpark Jasmund").length,1);
  assert.ok(result.rows.some(r=>r.name==="Rügen"));
  assert.equal(requested.length,3,"Do not request a third provider after a thematic match");
  assert.ok(updates.at(-1).includes("Rügen"));
});
test("provider errors do not erase parallel results and no third request follows success",async()=>{
  const requested=[];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    requested.push(url);
    if(url.includes("/reverse"))return {ok:true,json:async()=>({
      address:{country:"Brasil",country_code:"br"}
    })};
    if(url.includes("maps.mail.ru"))return {ok:false,status:504};
    if(url.includes("private.coffee"))return {ok:true,json:async()=>({elements:[
      {type:"area",id:3600000300,tags:{name:"Reserva",boundary:"protected_area"}}
    ]})};
    throw Error("third provider should not be requested");
  }});
  const result=await finder.hierarchyAt({lat:-22.97,lng:-43.21});
  assert.equal(result.extraUnavailable,false);
  assert.equal(result.rows.find(x=>x.name==="Reserva")?.osmId,300);
  assert.equal(requested.length,3);
});
test("a third provider is used only when both parallel sources produce no thematic matches",async()=>{
  const requested=[];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async url=>{
    requested.push(url);
    if(url.includes("/reverse"))return {ok:true,json:async()=>({
      address:{country:"Australien",country_code:"au"}
    })};
    if(url.includes("overpass-api.de"))return {ok:true,json:async()=>({elements:[
      {type:"area",id:3600000025,tags:{name:"Nationalpark",boundary:"national_park"}}
    ]})};
    return {ok:false,status:503};
  }});
  const result=await finder.hierarchyAt({lat:-35.3,lng:149.1});
  assert.equal(requested.length,4);
  assert.equal(result.rows.find(x=>x.name==="Nationalpark")?.osmId,25);
  assert.equal(result.extraUnavailable,false);
});
test("aborting an in-flight parallel search prevents any late additional choices",async()=>{
  const controller=new AbortController(),deferred=[];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,fetchImpl:async(url,options)=>{
    if(url.includes("/reverse"))return {ok:true,json:async()=>({
      address:{country:"Deutschland",country_code:"de"}
    })};
    return new Promise((resolve,reject)=>{
      deferred.push(resolve);
      options.signal?.addEventListener("abort",()=>reject(Object.assign(
        new Error("Aborted"),{name:"AbortError"})),{once:true});
    });
  }});
  const snapshots=[];
  const operation=finder.hierarchyAt({lat:54.5,lng:13.5},{
    signal:controller.signal,onPartial:x=>snapshots.push(x.rows.map(r=>r.name))
  });
  for(let i=0;i<12&&deferred.length<2;i++)await Promise.resolve();
  assert.equal(deferred.length,2);
  controller.abort();
  await assert.rejects(operation,/Aborted/);
  assert.deepEqual(snapshots,[["Deutschland"]]);
});

test("a stalled source releases the hierarchy and aborts each provider at the time limit",async()=>{
  const signals=[];
  const finder=new NominatimAreaFinder({minimumIntervalMs:0,requestTimeoutMs:10,fetchImpl:async(url,{signal})=>{
    if(url.includes("/reverse?"))return {ok:true,json:async()=>({address:{city:"Teststadt"}})};
    signals.push(signal);
    return new Promise(()=>{});
  }});
  const answer=await finder.hierarchyAt({lat:30,lng:110});
  assert.equal(answer.extraUnavailable,true);
  assert.deepEqual(answer.rows.map(row=>row.name),["Teststadt"]);
  assert.equal(signals.length,3);
  assert.ok(signals.every(signal=>signal.aborted));
});
