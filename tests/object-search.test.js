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
test("UI contains three inline dates and active filter remains transient",()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,"../ui/search-type-menu.js"),"utf8");
 const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
 const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
 const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
 const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
 assert.match(ui,/"today","Heute"/);assert.match(ui,/"yesterday","Gestern"/);
 assert.match(ui,/Erstellungs-Datum/);assert.match(ui,/Änderungs-Datum/);
 assert.match(ui,/Erneut suchen/);assert.match(ui,/Suche beenden/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\) minmax\(0,1.35fr\)/);
 assert.match(app,/objectSearchView/);assert.match(app,/renderMarkers\(\);renderGeometry\(\)/);
 assert.ok(html.indexOf("domain/object-search.js")<html.indexOf("app.js"));
 assert.match(sw,/".\/domain\/object-search.js"/);
});

test("category checkboxes, text inclusion and selectable change date respect original layers",()=>{
 assert.deepEqual(search(project,{query:"Karlsruhe",pins:false,areas:true,rivers:false}).map(x=>x.id),["d","e"]);
 assert.deepEqual(search(project,{query:"Karlsruhe",texts:false}).map(x=>x.id),["a","d","f"]);
 assert.deepEqual(search(project,{created:"today",now,dateField:"updatedAt"}).map(x=>x.id),["a","b"]);
 assert.deepEqual(search(project,{created:"date",date:"2026-11-19",dateField:"createdAt"}).map(x=>x.id),["b","e","f"]);
 assert.throws(()=>search(project,{created:"date",date:"19.11.2026"}),/Valid calendar date/);
 assert.equal(project.layers[0].visible,false);
});
