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
  assert.deepEqual(container.children.map(c=>c.className),["result","result","results-footer"]);
  assert.equal(container.children.at(-1).children[0].textContent,"Abbrechen");
  container.children.at(-1).children[0].click();
  assert.equal(view.isVisible(),false);
  assert.deepEqual(chosen,[]);
});
test("status message is followed by cancel button",()=>{
  const {container,view}=fixture();
  view.message("Kein Ort gefunden");
  assert.deepEqual(container.children.map(c=>c.className),["message","results-footer"]);
  container.children.at(-1).children[0].click();
  assert.equal(view.isVisible(),false);
});