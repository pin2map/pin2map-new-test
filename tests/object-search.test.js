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
test("compact predecessor-style options show select, three flags and one circular exit",()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,"../ui/search-type-menu.js"),"utf8");
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
 const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
 const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
 assert.match(ui,/Pins, Flächen, Flüsse, Text/);
 assert.match(ui,/Mit Track/);assert.match(ui,/Mit Link/);assert.match(ui,/Mit Notiz/);
 assert.match(ui,/object-search-exit/);assert.match(ui,/Suche beenden/);
 assert.doesNotMatch(ui,/Erneut suchen|Gestern|object-search-picker/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/border-radius:999px;background:#c92f39;color:white/);
 assert.match(app,/objectSearchView/);
 assert.ok(html.indexOf("domain/object-search.js")<html.indexOf("app.js"));
 assert.match(sw,/"\.\/domain\/object-search.js"/);
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
test("search results and dialog contract are wired without changing saved visibility",()=>{
 const menu=fs.readFileSync(path.resolve(__dirname,"../ui/search-type-menu.js"),"utf8");
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
 assert.match(menu,/Ausgeblendete/);
 assert.match(menu,/object-search-results/);
 assert.match(menu,/setResults\(matches=\[\]\)/);
 assert.match(menu,/this\.onBeforeOpen\(\)/);
 assert.match(app,/searchTypeMenu\?\.setResults\(matches\)/);
 assert.match(app,/onBeforeOpen:closeAllMapMenus/);
 assert.match(css,/#app #searchTypeMenu\.search-type-menu:not\(\.hidden\)\{[\s\S]*?z-index:1650/);
});

test("repeated records with the same pin ID count as one map marker",()=>{
 const repeated={...project,pins:Array.from({length:8},()=>({...project.pins[0]}))};
 const found=search(repeated,{query:"Karlsruhe",kind:"pins"});
 assert.deepEqual(found.map(x=>x.id),["a"]);
 assert.equal(repeated.pins.length,8,"search does not mutate stored data");
});
