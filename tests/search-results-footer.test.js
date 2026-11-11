"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const SearchResultsView=require("../ui/search-results.js");
class Element {
  constructor(tag){
    this.tagName=tag;this.children=[];this.className="";this.type="";this.textContent="";
    this.listeners={};this.style={};const classes=new Set(["hidden"]);
    this.classList={contains:key=>classes.has(key),add:key=>classes.add(key),remove:key=>classes.delete(key),toggle:(key,force)=>{if(force===undefined? !classes.has(key):force)classes.add(key);else classes.delete(key);}};
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
test("framed chooser follows OUTER search block below it and stops at bottom controls",()=>{
  let width=410,outerTop=8,bottomTop=780;
  const outer={getBoundingClientRect:()=>({width,height:52,top:outerTop,bottom:outerTop+52})};
  const search={closest:selector=>selector===".topbar"?outer:null};
  const bottom={getBoundingClientRect:()=>({top:bottomTop})};
  const app={getBoundingClientRect:()=>({top:0,bottom:844})};
  const container=new Element("div");container.style={};
  container.querySelector=()=>container.children[0];
  const doc={createElement:tag=>new Element(tag),getElementById:id=>({
    searchForm:search,basemapButton:bottom,app})[id]||null};
  const view=new SearchResultsView({container,document:doc,onChoose:()=>{},
    titleOf:r=>r.name,detailOf:r=>r.place});
  view.show([{name:"Stuttgart",place:"Deutschland"}]);
  assert.equal(container.style.width,"410px");
  assert.equal(container.style.top,"68px");
  assert.equal(container.style.maxHeight,"712px");
  width=280;outerTop=12;bottomTop=700;
  view.message("Neue Suche");
  assert.equal(container.style.width,"280px");
  assert.equal(container.style.top,"72px");
  assert.equal(container.style.maxHeight,"628px");
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

test("predecessor keyboard contract cycles, selects with Enter and cancels with Escape",()=>{
  const listeners=new Map(),buttons=[];
  const doc={
    activeElement:null,
    getElementById:id=>id==="searchInput"?input:null,
    createElement:tag=>{
      const el=new Element(tag);
      el.focus=()=>{doc.activeElement=el;};
      el.scrollIntoView=()=>{};
      return el;
    },
    addEventListener:(event,fn)=>listeners.set(event,fn),
    removeEventListener:event=>listeners.delete(event)
  };
  const input={focus:()=>{doc.activeElement=input;}};
  const container=new Element("div");
  container.querySelectorAll=()=>container.children[0]?.children||[];
  container.querySelector=selector=>selector===".results-cancel"?container.children[1]?.children[0]:null;
  const selected=[];let cancelled=0;
  const view=new SearchResultsView({container,document:doc,
    onChoose:r=>selected.push(r.name),onCancel:()=>cancelled++,
    titleOf:r=>r.name,detailOf:r=>r.place});
  const emit=(key)=>{const e={key,preventDefault(){this.prevented=true;},stopPropagation(){}};
    listeners.get("keydown")?.(e);return e;};
  view.show([{name:"Berlin",place:"DE"},{name:"Bonn",place:"DE"}]);
  assert.equal(container.children[0].children[0].classList.contains("is-keyboard-selected"),true);
  emit("ArrowDown");
  assert.equal(doc.activeElement,container.children[0].children[1]);
  emit("ArrowDown");
  assert.equal(doc.activeElement,container.children[0].children[0]);
  emit("ArrowUp");
  assert.equal(doc.activeElement,container.children[0].children[1]);
  emit("Enter");
  assert.deepEqual(selected,["Bonn"]);
  emit("Escape");
  assert.equal(cancelled,1);
  assert.equal(view.isVisible(),false);
  assert.equal(doc.activeElement,input);
  view.dispose();
  assert.equal(listeners.has("keydown"),false);
});
