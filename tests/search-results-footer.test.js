"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const SearchResultsView=require("../ui/search-results.js");
class Element {
  constructor(tag){
    this.tagName=tag;this.children=[];this.className="";this.type="";this.textContent="";
    this.listeners={};const classes=new Set(["hidden"]);
    this.classList={contains:key=>classes.has(key),add:key=>classes.add(key),remove:key=>classes.delete(key)};
  }
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  addEventListener(type,fn){this.listeners[type]=fn;}
  click(){this.listeners.click?.();}
}
function fixture(){
  const container=new Element("div"),document={createElement:tag=>new Element(tag)},chosen=[];
  const view=new SearchResultsView({container,document,onChoose:x=>chosen.push(x),
    titleOf:x=>x.name,detailOf:x=>x.place});
  return {container,view,chosen};
}
test("multiple search results end in cancel button, with no old header",()=>{
  const {container,view,chosen}=fixture();
  view.show([{name:"Stuttgart",place:"Deutschland"},{name:"Stuttgart",place:"USA"}]);
  assert.deepEqual(container.children.map(c=>c.className),["results-items","results-footer"]);
  assert.equal(container.children[0].children.length,2);
  assert.equal(container.children.at(-1).children[0].textContent,"Abbrechen");
  container.children.at(-1).children[0].click();
  assert.equal(view.isVisible(),false);
  assert.deepEqual(chosen,[]);
});
test("status message is followed by cancel button",()=>{
  const {container,view}=fixture();
  view.message("Kein Ort gefunden");
  assert.deepEqual(container.children.map(c=>c.className),["results-items","results-footer"]);
  assert.equal(container.children[0].children[0].textContent,"Kein Ort gefunden");
  container.children.at(-1).children[0].click();
  assert.equal(view.isVisible(),false);
});
test("results use measured search pill width, also after viewport changes",()=>{
  let width=258;
  const anchor={getBoundingClientRect:()=>({width,height:42})};
  const container=new Element("div");container.style={};
  const doc={createElement:tag=>new Element(tag),getElementById:id=>id==="searchForm"?anchor:null};
  const view=new SearchResultsView({container,document:doc,onChoose:()=>{},
    titleOf:r=>r.name,detailOf:r=>r.place});
  view.show([{name:"Stuttgart",place:"Deutschland"}]);
  // The straight horizontal segments of the 42px-tall pill exclude
  // its 21px rounded end cap on each side.
  assert.equal(container.style.width,"216px");
  width=305;
  view.message("Neue Suche");
  assert.equal(container.style.width,"263px");
});

test("legacy type badges and duplicate coordinate details stay in scrolling items",()=>{
  const Domain=require("../domain/place-search.js");
  const container=new Element("div"),doc={createElement:tag=>new Element(tag)};
  const view=new SearchResultsView({container,document:doc,onChoose:()=>{},
    titleOf:Domain.title,detailOf:Domain.detail,kindOf:Domain.kind,
    duplicateCoordinates:Domain.duplicateCoordinates});
  const list=[
    {name:"Springfield",display_name:"Springfield, USA",addresstype:"city",class:"place",osm_type:"node",lat:"39.12345",lon:"-89.12345"},
    {name:"Springfield",display_name:"Springfield, USA",addresstype:"city",class:"boundary",osm_type:"relation",lat:"39.23456",lon:"-89.23456"}
  ];
  view.show(list);
  assert.deepEqual(container.children.map(c=>c.className),["results-items","results-footer"]);
  const [first,second]=container.children[0].children;
  assert.equal(first.children[0].children[1].textContent,"● Stadt · Ortsmittelpunkt");
  assert.equal(second.children[0].children[1].textContent,"▧ Stadt · Gebiet");
  assert.equal(first.children[2].textContent,"Position: 39.12345, -89.12345");
  assert.equal(second.children[2].textContent,"Position: 39.23456, -89.23456");
});
