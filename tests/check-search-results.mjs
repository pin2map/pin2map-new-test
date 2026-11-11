import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const SearchResultsView=require("../ui/search-results.js");
function element(tag){
 const classes=new Set(["hidden"]);
 const events=new Map();
 const node={
  tagName:tag,className:"",type:"",textContent:"",title:"",children:[],
  classList:{
   contains:key=>classes.has(key),add:key=>classes.add(key),remove:key=>classes.delete(key)
  },
  append(...children){this.children.push(...children);},
  replaceChildren(...children){this.children=[...children];},
  addEventListener:(name,callback)=>events.set(name,callback),
  click(){events.get("click")?.();}
 };
 return node;
}
const container=element("section");
const chosen=[];
const ui=new SearchResultsView({
 container,document:{createElement:element},
 onChoose:record=>chosen.push(record.id),
 titleOf:record=>record.title,
 detailOf:record=>record.subtitle
});
assert.equal(ui.isVisible(),false);
ui.message("Ort wird gesucht …");
assert.equal(ui.isVisible(),true);
assert.equal(container.children.length,2);
assert.equal(container.children[0].children[0].textContent,"Ort wird gesucht …");
assert.equal(container.children[1].className,"results-footer");
assert.equal(container.children[1].children[0].textContent,"Abbrechen");
container.children[1].children[0].click();
assert.equal(ui.isVisible(),false);
assert.equal(container.children.length,0);
const results=[
 {id:"a",title:"Stuttgart",subtitle:"Baden-Württemberg"},
 {id:"b",title:"Berlin",subtitle:"Deutschland"}
];
ui.show(results);
assert.equal(ui.isVisible(),true);
assert.equal(container.children.length,2);
assert.equal(container.children[0].className,"results-items");
assert.equal(container.children[0].children.length,2);
assert.equal(container.children[0].children[0].children[0].children[0].textContent,"Stuttgart");
assert.equal(container.children[0].children[1].children[1].textContent,"Deutschland");
assert.equal(container.children[1].className,"results-footer");
assert.equal(container.children[1].children[0].textContent,"Abbrechen");
container.children[0].children[1].click();
assert.deepEqual(chosen,["b"]);
assert.throws(()=>ui.show(null),TypeError);
ui.hide();
assert.equal(container.children.length,0);
console.log("Search results view: messages, closing, multiple results and selections pass.");
