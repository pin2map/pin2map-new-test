"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {search}=require("../domain/object-search.js");
const now=new Date(2026,10,20,14,0,0);
const today=new Date(2026,10,20,9,30).toISOString();
const yesterday=new Date(2026,10,19,16,0).toISOString();
const project={layers:[{id:"hidden",visible:false}],pins:[
  {id:"a",layerId:"hidden",name:"Karlsruhe Hbf",createdAt:today,updatedAt:today,note:"",url:""},
  {id:"b",layerId:"hidden",name:"Baden",note:"KARLSRUHE",createdAt:yesterday,updatedAt:today,gpxAttachment:{filename:"tour_karlsruhe.gpx",chains:[[[1,2],[3,4]]]}},
  {id:"c",layerId:"hidden",name:"Rastatt",createdAt:"",note:"",url:"https://karlsruhe.test"}
],areas:[{id:"d",layerId:"hidden",name:"Karlsruhe Gebiet",kind:"area",createdAt:today,geometry:{type:"Polygon",coordinates:[]}},
{id:"e",layerId:"hidden",name:"See",kind:"lake",note:"Karlsruhe",createdAt:yesterday}],
rivers:[{id:"f",layerId:"hidden",name:"Karlsruhe Fluss",createdAt:yesterday}]};
test("search traverses pins, areas, lakes and rivers regardless of hidden layers",()=>{
 const hits=search(project,{query:"karlsruhe"});assert.deepEqual(hits.map(x=>x.id),["a","b","c","d","e","f"]);
 assert.equal(project.layers[0].visible,false,"search never changes layer state");
 assert.equal(search(project,{query:"KARLSRUHE",kind:"lakes"})[0].id,"e");
});
test("creation date quick actions use local calendar days, not updatedAt",()=>{
 assert.deepEqual(search(project,{created:"today",now}).map(x=>x.id),["a","d"]);
 assert.deepEqual(search(project,{created:"yesterday",now}).map(x=>x.id),["b","e","f"]);
 assert.deepEqual(search(project,{created:"today",now,kind:"rivers"}),[]);
});
test("notes, links, GPX attachment names and combined flags are searchable",()=>{
 assert.deepEqual(search(project,{query:"tour_karlsruhe"}).map(x=>x.id),["b"]);
 assert.deepEqual(search(project,{query:"karlsruhe",track:true}).map(x=>x.id),["b"]);
 assert.deepEqual(search(project,{query:"karlsruhe",note:true}).map(x=>x.id),["b","e"]);
 assert.deepEqual(search(project,{query:"karlsruhe",link:true}).map(x=>x.id),["c"]);
 assert.deepEqual(search(project,{query:"karlsruhe",track:true,link:true}),[]);
});
test("no wildcard when no text or date; invalid and legacy dates do not match",()=>{
 assert.deepEqual(search(project,{}),[]);
 assert.deepEqual(search(project,{created:"today",now}).map(x=>x.id),["a","d"]);
 assert.throws(()=>search(project,{created:"tomorrow"}),/Unknown/);
});
test("v295 search controls use a compact category dropdown and three AND properties",()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,"../ui/search-type-menu.js"),"utf8");
 const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
 for(const word of ["Alle Objekte","Nur Pins","Flächen und Seen","Nur Seen","Nur Flüsse",
   "Auch Ausgeblendete","Mit Track","Mit Link","Mit Notiz"])assert.ok(ui.includes(word));
 assert.match(ui,/object-search-kind/);
 assert.match(html,/id="objectSearchCount"/);
 assert.match(html,/placeholder="Suchen\/Finden"/);
 assert.doesNotMatch(html,/id="searchButton"/);
});
test("category checkboxes, text inclusion and selectable change date respect original layers",()=>{
 assert.deepEqual(search(project,{query:"Karlsruhe",pins:false,areas:true,rivers:false}).map(x=>x.id),["d","e"]);
 assert.deepEqual(search(project,{query:"Karlsruhe",texts:false}).map(x=>x.id),["a","d","f"]);
 assert.deepEqual(search(project,{created:"today",now,dateField:"updatedAt"}).map(x=>x.id),["a","b"]);
 assert.deepEqual(search(project,{created:"date",date:"2026-11-19",dateField:"createdAt"}).map(x=>x.id),["b","e","f"]);
 assert.throws(()=>search(project,{created:"date",date:"19.11.2026"}),/Valid calendar date/);
 assert.equal(project.layers[0].visible,false);
});

test("checked inclusion flags are permissive; unchecking excludes matching metadata",()=>{
 assert.deepEqual(search(project,{query:"Karlsruhe",includeTrack:true,includeLink:true,includeNote:true}).map(x=>x.id),["a","b","c","d","e","f"]);
 assert.deepEqual(search(project,{query:"Karlsruhe",includeTrack:false}).map(x=>x.id),["a","c","d","e","f"]);
 assert.deepEqual(search(project,{query:"Karlsruhe",includeLink:false}).map(x=>x.id),["a","b","d","e","f"]);
 assert.deepEqual(search(project,{query:"Karlsruhe",includeNote:false}).map(x=>x.id),["a","c","d","f"]);
 assert.deepEqual(search(project,{query:"Karlsruhe",kind:"pins"}).map(x=>x.id),["a","b","c"]);
});

test("Areas filter includes lake geometries as its dropdown label promises",()=>{
 assert.deepEqual(search(project,{query:"Karlsruhe",kind:"areas"}).map(x=>x.id),["d","e"]);
});

test("hidden layers are included by default but excluded on request, with no mutation",()=>{
 const withVisible={...project,layers:[{id:"hidden",visible:false},{id:"visible",visible:true}],
  pins:[...project.pins,{id:"g",layerId:"visible",name:"Karlsruhe sichtbar"}]};
 assert.deepEqual(search(withVisible,{query:"Karlsruhe",includeHidden:false}).map(x=>x.id),["g"]);
 assert.deepEqual(search(withVisible,{query:"Karlsruhe",includeHidden:true}).map(x=>x.id),["a","b","c","g","d","e","f"]);
 assert.equal(withVisible.layers[0].visible,false);
 assert.equal(withVisible.layers[1].visible,true);
});
test("search result count is in the search bar and maps to stable object identities",()=>{
 const menu=fs.readFileSync(path.resolve(__dirname,"../ui/search-type-menu.js"),"utf8");
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 assert.match(menu,/this\.el\("objectSearchCount"\)/);
 assert.match(menu,/const ids=new Set\(\),count=/);
 const owner=fs.readFileSync(path.resolve(__dirname,"../ui/object-search-controller.js"),"utf8");
 assert.match(owner,/this\.getMenu\(\)\?\.setResults\(matches\)/);
 // Spotlight mode highlights matching geometry; only-hits mode must
 // deliberately render the same hits normally, without special emphasis.
 const presentation=fs.readFileSync(path.resolve(__dirname,"../ui/project-object-presentation.js"),"utf8");
  assert.match(app,/getSearchView:\(\)=>objectSearchController\.view/);
  assert.match(presentation,/highlightIds:view\?\.onlyHits\?null:view\?\.ids/);
});
test("repeated records with the same pin ID count as one map marker",()=>{
 const repeated={...project,pins:Array.from({length:8},()=>({...project.pins[0]}))};
 const found=search(repeated,{query:"Karlsruhe",kind:"pins"});
 assert.deepEqual(found.map(x=>x.id),["a"]);
 assert.equal(repeated.pins.length,8,"search does not mutate stored data");
});

test("v295 stored search: query, optional properties, empty string, visibility and dedup",()=>{
 const {searchExpanded}=require("../domain/object-search.js");
 const sample={layers:[{id:"on",visible:true},{id:"off",visible:false}],
 pins:[
  {id:"p1",layerId:"on",name:"Test Pin",createdAt:"2026-11-21T12:00:00Z",note:"geheim"},
  {id:"p2",layerId:"off",name:"Andere Pin",note:"memo",url:"https://example.org/test",
   gpxAttachment:{chains:[[[1,2],[3,4]]]}}
 ],areas:[
  {id:"a",layerId:"on",name:"Gebiet",kind:"area",note:"test"},
  {id:"l",layerId:"on",name:"See",kind:"lake",note:"test"}],
 rivers:[{id:"r",layerId:"on",name:"Fluss",note:"test"}]};
 assert.deepEqual(searchExpanded(sample,{query:"test",kind:"pins"}).map(x=>x.id),["p1"]);
 assert.deepEqual(searchExpanded(sample,{query:"test",note:true}).map(x=>x.id),["p1","a","l","r"]);
 assert.deepEqual(searchExpanded(sample,{query:"",note:true,kind:"pins"}).map(x=>x.id),["p1"]);
 assert.deepEqual(searchExpanded(sample,{query:"",track:true,kind:"pins",includeHidden:true}).map(x=>x.id),["p2"]);
 assert.deepEqual(searchExpanded(sample,{query:"test",link:true,includeHidden:true}).map(x=>x.id),[],
   "the all-object default searches Name + Notiz, not URL content");
 assert.deepEqual(searchExpanded(sample,{query:"test",link:true,kind:"pins",includeHidden:true}).map(x=>x.id),["p2"],
   "existing pin-only scope retains its optional URL text matching");
 assert.deepEqual(searchExpanded(sample,{query:"",note:true,link:true,track:true,includeHidden:true}).map(x=>x.id),["p2"]);
 assert.deepEqual(searchExpanded(sample,{query:"test",kind:"lakes"}).map(x=>x.id),["l"]);
 assert.deepEqual(searchExpanded(sample,{query:"21.11.2026",kind:"pins"}).map(x=>x.id),["p1"]);
 assert.deepEqual(searchExpanded(sample,{query:"test",kind:"all"}).map(x=>x.id),["p1","a","l","r"]);
 assert.equal(sample.layers[1].visible,false);
 const repeated={...sample,pins:[sample.pins[0],{...sample.pins[0]},sample.pins[1]]};
 assert.equal(searchExpanded(repeated,{query:"test",kind:"pins"}).length,1);
});



test("search hits preserve the normal overlap disambiguation and filter to matching pins",()=>{
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 const selection=fs.readFileSync(path.resolve(__dirname,"../ui/pin-selection-controller.js"),"utf8");
 const tap=selection.slice(selection.indexOf("handleMarkerTap(id){"));
 assert.match(app,/function handleMarkerTap\(id\)\{pinSelection\.handleMarkerTap\(id\);\}/);
 assert.match(app,/getSearchIds:\(\)=>objectSearchController\.view\?\.ids/);
 assert.match(app,/getVisiblePins:\(\)=>markerView\.visiblePins\(\)/);
 assert.match(tap,/ids\?\.has\("pins:"\+id\)/);
 assert.match(tap,/this\.getPinOverlap\(\)\.handleTap\(id,this\.getVisiblePins\(\)\.filter/);
 assert.ok(tap.indexOf('ids?.has("pins:"+id)')<
  tap.indexOf('this.getFeatureOverlap()?.handleTap("pin",id)'));
 const controller=fs.readFileSync(path.resolve(__dirname,"../ui/pin-overlap-zoom.js"),"utf8");
 assert.match(controller,/handleTap\(id,pinsOverride=null\)/);
});
test("active search re-evaluates after every object save without moving the viewport",()=>{
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 const search=fs.readFileSync(path.resolve(__dirname,"../ui/search-type-menu.js"),"utf8");
 assert.match(search,/if\(this\.searchMode\)this\.onSearch\(this\.searchOptions\(\)\)/);
 assert.match(app,/if\(objectSearchController\.view\)queueMicrotask\(/);
 const owner=fs.readFileSync(path.resolve(__dirname,"../ui/object-search-controller.js"),"utf8");
 const refresh=owner.split("    refresh(){")[1].split("    fit(matches){")[0];
 for(const expected of ["this.searchDomain.searchExpanded","this.getMenu()?.setResults(matches)",
   "this.render()","this.spotlight()?.schedule()"])
   assert.ok(refresh.includes(expected),expected);
 assert.doesNotMatch(refresh,/fitVisibleProject|this.fit\(|setView|fitBounds/);
});

test("live search membership follows addition and edits on every object kind",()=>{
 const {searchExpanded}=require("../domain/object-search.js");
 const layers=[{id:"shown",visible:true},{id:"hidden",visible:false}];
 const state={layers,pins:[],areas:[],rivers:[]};
 const criteria={query:"saale",kind:"all",includeHidden:false};
 assert.deepEqual(searchExpanded(state,criteria).map(x=>x.id),[]);
 state.pins.push({id:"new",layerId:"shown",name:"Saale-Kirche"});
 assert.deepEqual(searchExpanded(state,criteria).map(x=>x.id),["new"]);
 state.pins[0].name="Anderer Name";
 assert.deepEqual(searchExpanded(state,criteria).map(x=>x.id),[]);
 state.pins[0].note="An der Saale";
 assert.deepEqual(searchExpanded(state,{...criteria,note:true}).map(x=>x.id),["new"]);
 state.pins[0].note="";
 state.areas.push({id:"area",layerId:"shown",name:"Saale Gebiet",kind:"area"});
 state.rivers.push({id:"river",layerId:"shown",name:"Saale Fluss"});
 assert.deepEqual(searchExpanded(state,criteria).map(x=>x.id),["area","river"]);
 state.areas[0].name="Ohne Treffer";
 state.rivers[0].name="Kein Treffer";
 assert.deepEqual(searchExpanded(state,criteria).map(x=>x.id),[]);
 state.areas[0].name="Saale Gebiet";
 state.areas[0].layerId="hidden";
 assert.deepEqual(searchExpanded(state,criteria).map(x=>x.id),[]);
 assert.deepEqual(searchExpanded(state,{...criteria,includeHidden:true}).map(x=>x.id),["area"]);
});

test("first record of a legacy duplicate ID remains authoritative after edits",()=>{
 const {searchExpanded}=require("../domain/object-search.js");
 const project={layers:[{id:"a",visible:true}],pins:[
  {id:"same",layerId:"a",name:"Anderer Name"},
  {id:"same",layerId:"a",name:"Saale (stale duplicate)"}
 ],areas:[],rivers:[]};
 assert.deepEqual(searchExpanded(project,{query:"saale"}).map(x=>x.id),[],
   "stale duplicate must not resurrect a renamed pin");
 project.pins[0].name="Saale-Kirche";
 assert.deepEqual(searchExpanded(project,{query:"saale"}).map(x=>x.id),["same"]);
 project.pins[0].name="Unpassend";
 assert.deepEqual(searchExpanded(project,{query:"saale"}).map(x=>x.id),[]);
});

test("v298 all-object search defaults to name and note; name-only excludes note and URL",()=>{
 const {searchExpanded}=require("../domain/object-search.js");
 const p={layers:[{id:"on",visible:true}],pins:[
  {id:"name",layerId:"on",name:"Saale",note:"irrelevant"},
  {id:"note",layerId:"on",name:"Kirche",note:"An der Saale"},
  {id:"url",layerId:"on",name:"Kirche",url:"https://example.test/saale"}
 ],areas:[],rivers:[]};
 assert.deepEqual(searchExpanded(p,{query:"saale",kind:"all"}).map(m=>m.id),["name","note"]);
 assert.deepEqual(searchExpanded(p,{query:"saale",kind:"all-name"}).map(m=>m.id),["name"]);
 assert.deepEqual(searchExpanded(p,{query:"saale",kind:"pins"}).map(m=>m.id),["name","note","url"]);
 assert.deepEqual(searchExpanded(p,{query:"",kind:"all-name",link:true}).map(m=>m.id),["url"]);
});
test("v298 search scope exposes only six ordered choices with the two all-object modes first",()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,"../ui/search-type-menu.js"),"utf8");
 const options=[...ui.matchAll(/\["(all|all-name|pins|areas|lakes|rivers)","([^"]+)"\]/g)];
 assert.deepEqual(options.map(m=>[m[1],m[2]]),[
  ["all","Alle Objekte (Name + Notiz)"],
  ["all-name","Alle Objekte (nur Name)"],
  ["pins","Nur Pins"],["areas","Flächen und Seen"],
  ["lakes","Nur Seen"],["rivers","Nur Flüsse"]
 ]);
 assert.doesNotMatch(ui,/\["texts","Objekte mit Text"\]/);
});

test("v300 only-hits is a visual search toggle, never a persistent search filter",()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,"../ui/search-type-menu.js"),"utf8");
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
 assert.match(ui,/\["onlyHits","Nur Treffer"\]/);
 assert.match(ui,/onlyHits:checked\("onlyHits"\)/);
 const presentation=fs.readFileSync(path.resolve(__dirname,"../ui/project-object-presentation.js"),"utf8");
  assert.match(app,/getSearchView:\(\)=>objectSearchController\.view/);
  assert.match(presentation,/const onlyHits=!!view\?\.onlyHits/);
  assert.match(presentation,/view\?\.onlyHits\?view\.ids\.has/);
 const owner=fs.readFileSync(path.resolve(__dirname,"../ui/object-search-controller.js"),"utf8");
 assert.match(owner,/this\.spotlight\(\)\?\.setActive\(matches\.length>0&&!this\.view\.onlyHits\)/);
 assert.match(owner,/this\.spotlight\(\)\?\.setActive\(matches\.length>0&&!view\.onlyHits\)/);
 assert.match(owner,/if\(!displayOnlyChanged\)this\.fit\(matches\)/);
 assert.match(css,/width:min\(340px,calc\(100vw - 24px\)\)/);
 assert.match(css,/display:flex;flex-wrap:nowrap;/);
 const {searchExpanded}=require("../domain/object-search.js");
 const example={layers:[{id:"v",visible:true}],pins:[
  {id:"found",name:"Saale",layerId:"v"},
  {id:"context",name:"Berlin",layerId:"v"}],areas:[],rivers:[]};
 assert.deepEqual(searchExpanded(example,{query:"saale",onlyHits:true}).map(m=>m.id),["found"]);
 assert.deepEqual(searchExpanded(example,{query:"saale",onlyHits:false}).map(m=>m.id),["found"]);
});

// Regression fixture: all five matching objects must be found as in v299.
test("five visible sal matches survive the v300 display-only toggle",()=>{
 const {searchExpanded}=require("../domain/object-search.js");
 const sample={layers:[{id:"v",visible:true}],pins:[
  {id:"p1",layerId:"v",name:"Salzburg"},
  {id:"p2",layerId:"v",name:"Salzach"},
  {id:"p3",layerId:"v",name:"Ort",note:"Saline"}],areas:[
  {id:"a1",layerId:"v",kind:"area",name:"Salzgebiet"},
  {id:"a2",layerId:"v",kind:"lake",name:"Salzsee"}],rivers:[]};
 for(const onlyHits of [false,true]){
  const result=searchExpanded(sample,{query:"sal",kind:"all",onlyHits});
  assert.equal(result.length,5,"the display-only toggle must not alter matching");
  assert.deepEqual(result.map(m=>m.id),["p1","p2","p3","a1","a2"]);
 }
});

test("a saved house address is searchable without changing the name and is discarded on move",()=>{
 const {searchExpanded}=require("../domain/object-search.js");
 const operations=require("../application/pin-operations.js");
 const model=require("../domain/project-model.js");
 const state=model.defaultProject();
 const pin=operations.createPin(state,{id:"bochum",lat:51.48,lng:7.21,name:"Bergstraße 123",
  address:"Bergstraße 123, 44787 Bochum, Deutschland"},{validatePosition:model.position,cleanText:model.cleanText});
 assert.equal(searchExpanded(state,{query:"Bochum",kind:"pins"})[0].object.name,"Bergstraße 123");
 assert.deepEqual(searchExpanded(state,{query:"Bochum",kind:"all-name"}),[]);
 operations.movePin(state,pin.id,{lat:53.07,lng:8.8},{validatePosition:model.position});
 assert.equal(pin.address,undefined);
 assert.equal(pin.name,"Bergstraße 123");
 assert.deepEqual(searchExpanded(state,{query:"Bochum",kind:"pins"}),[]);
});
