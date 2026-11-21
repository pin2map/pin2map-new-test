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
  getAttribute(name){return this.attrs[name]??null;},
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
 layersUnite:element("button"),layersHelpers:element("div"),
 layersVisibilityCycle:element("button"),addLayer:element("button"),
 layersCloseBottom:element("button")
};
const changed=[],deleted=[],removed=[],merged=[];
const view=new LayerView({
 getElement:id=>els[id],
 document:{createElement:element,defaultView:{matchMedia:()=>({matches:true})}},
 onVisibility:(id,value)=>changed.push([id,value]),
 onDelete:id=>deleted.push(id),
 onDeleteContents:id=>removed.push(id),
 onMergeRequest:(ids,target)=>{merged.push({ids,target});return true;}
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
assert.equal(els.layersUnite.classList.contains("hidden"),false,
 "Merge button remains rendered before any selection");
assert.equal(els.layersUnite.disabled,true,"Merge button starts disabled");
const privateRow=els.layersList.children[0];
const workRow=els.layersList.children[1];
assert.equal(privateRow.children.length,4,"Privat has a color-only editor plus eye, selection and deletion");
assert.equal(workRow.children.length,4,"Standard row has eye, selection, edit and delete");
assert.match(workRow.children[1].children[1].textContent,/2 Pins/);
assert.match(workRow.children[1].children[1].textContent,/Flächen/);
assert.match(workRow.children[1].children[1].textContent,/Gewässer/);
assert.equal(workRow.children[0].children[1].className,"layer-color-checkbox");
assert.equal(workRow.children[0].children[1].children[0].type,"checkbox");
assert.equal(workRow.children[0].children[1].style.backgroundColor,"#555555");
workRow.children[0].children[0].trigger("click");
assert.deepEqual(changed,[["a",true]]);
assert.equal(view.selectedIds.size,0,"No level selected by default");
workRow.children[1].children[0].trigger("click");
assert.deepEqual(changed,[["a",true]],
 "Clicking a layer name must not change its visibility");
workRow.children[0].children[1].children[0].checked=true;
workRow.children[0].children[1].children[0].trigger("change");
assert.equal(view.selectedIds.has("a"),true);
assert.equal(els.layersUnite.classList.contains("hidden"),false,
 "Merge icon stays visible after the first selection");
assert.equal(els.layersUnite.disabled,true,"One selected layer cannot be merged");
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
view.selectedIds.add("private");
view.render();
assert.equal(els.layersUnite.disabled,false,"Two selections activate Merge");
view.beginMerge();
assert.equal(view.mergeMode,true);
assert.equal(els.addLayer.textContent,"Zusammenführen");
assert.equal(els.addLayer.disabled,true,"No merge without a chosen target");
assert.equal(els.layersCloseBottom.textContent,"Abbrechen");
assert.equal(els.layersHelpers.classList.contains("hidden"),true);
assert.equal(els.layersList.children[0].children.length,1,
 "Merge guidance has only its text; no redundant upper action buttons");
view.footerCancel();
assert.equal(view.mergeMode,false);
assert.equal(els.addLayer.textContent,"+ Ebene hinzufügen");
assert.equal(els.layersPanel.classList.contains("hidden"),false,
 "Cancel from footer must preserve the open Layers dialog");
assert.deepEqual(merged,[],"Cancel is never a data mutation");
view.beginMerge();
view.chooseMergeTarget("a");
assert.equal(els.addLayer.disabled,false);
assert.equal(view.footerAction(),true);
assert.deepEqual(merged,[{ids:["a","private"],target:"a"}]);
assert.equal(view.mergeMode,false);
console.log("Layer view: shared list layout, visibility, merge selection and safe inline deletion pass.");
