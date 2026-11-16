import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const LayerView=require("../ui/layer-view.js");
const Shared=require("../ui/list-dialog-core.js");
function element(tag){
 const listeners=new Map(),classes=new Set();
 return {
  tagName:tag,children:[],value:"",checked:false,disabled:false,style:{},
  dataset:{},textContent:"",title:"",className:"",attrs:{},scrollTop:0,
  classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),
   toggle:(v,on)=>{if(on===false)classes.delete(v);else classes.add(v);},
   contains:v=>classes.has(v)},
  setAttribute(name,value){this.attrs[name]=String(value);},
  addEventListener(name,cb){listeners.set(name,cb);},
  trigger(name){listeners.get(name)?.({target:this,preventDefault(){}});},
  replaceChildren(...children){this.children=[...children];},
  append(...children){this.children.push(...children);},
  querySelector(){return null;},
  focus(){this.focused=true;}
 };
}
const els={
 layersPanel:element("aside"),layersList:element("div"),pinLayer:element("select"),
 layersSearch:element("input"),layersSearchClear:element("button"),
 layersUnite:element("button")
};
const changed=[],deleted=[],removed=[];
const view=new LayerView({
 getElement:id=>els[id],
 document:{createElement:element,defaultView:{matchMedia:()=>({matches:true})}},
 onVisibility:(id,value)=>changed.push([id,value]),
 onDelete:id=>deleted.push(id),
 onDeleteContents:id=>removed.push(id)
});
assert.ok(view instanceof Shared);
const layers=[
 {id:"private",name:"Privat",color:"#808080",visible:true},
 {id:"a",name:"Arbeit",color:"#555555",visible:false}
];
view.render({layers,counts:{private:0,a:2},selectedLayerId:"a"});
assert.equal(els.layersList.children.length,2);
assert.equal(els.pinLayer.children.length,2);
assert.equal(els.pinLayer.value,"a");
const privateRow=els.layersList.children[0];
const workRow=els.layersList.children[1];
assert.equal(privateRow.children.length,3,"Private has no edit, but has eye, selection and deletion");
assert.equal(workRow.children.length,4,"Standard row has eye, selection, edit and delete");
assert.match(workRow.children[1].children[1].textContent,/2 Pins/);
assert.match(workRow.children[1].children[1].textContent,/Flächen/);
assert.match(workRow.children[1].children[1].textContent,/Gewässer/);
assert.equal(workRow.children[0].children[1].type,"checkbox");
workRow.children[0].children[0].trigger("click");
assert.deepEqual(changed,[["a",true]]);
assert.equal(view.selectedIds.size,0,"No level selected by default");
workRow.children[0].children[1].checked=true;
workRow.children[0].children[1].trigger("change");
assert.equal(view.selectedIds.has("a"),true);
assert.equal(els.layersUnite.classList.contains("hidden"),true,
 "Merge control replaces filter only when two or more layers selected");
workRow.children[3].trigger("click");
assert.equal(view.mode,"delete");
const confirmation=els.layersList.children.find(c=>c.className?.includes("favorite-confirm"));
assert.ok(confirmation,"Delete button opens inline confirmation without deleting");
const actions=confirmation.children.at(-1);
assert.equal(actions.children.length,3);
assert.equal(removed.length,0);
actions.children[1].trigger("click");
assert.deepEqual(removed,["a"]);
assert.deepEqual(deleted,[]);
const reordered=[layers[1],layers[0]];
view.render({layers:reordered,counts:{private:0,a:2},selectedLayerId:"a"});
assert.equal(els.layersList.children[0].dataset.itemId,"private",
 "Private must be first in the UI even when stored layers are out of order");
assert.equal(reordered[0].id,"a","UI sorting must never rewrite stored layer order");
console.log("Layer view: shared list layout, visibility, merge selection and safe inline deletion pass.");
