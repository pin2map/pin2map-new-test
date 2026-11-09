import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const LayerView=require("../ui/layer-view.js");
function element(tag){
 const listeners=new Map();
 return {
  tagName:tag,children:[],value:"",checked:false,disabled:false,style:{},
  textContent:"",title:"",className:"",attrs:{},
  setAttribute(name,value){this.attrs[name]=value;},
  addEventListener(name,cb){listeners.set(name,cb);},
  trigger(name){listeners.get(name)?.();},
  replaceChildren(...children){this.children=[...children];},
  append(...children){this.children.push(...children);}
 };
}
const els={layersList:element("div"),pinLayer:element("select")};
const changed=[],deleted=[];
const view=new LayerView({
 getElement:id=>els[id],document:{createElement:element},
 onVisibility:(id,value)=>changed.push([id,value]),onDelete:id=>deleted.push(id)
});
const layers=[{id:"private",name:"Privat",color:"#333",visible:true},{id:"a",name:"Arbeit",color:"#555",visible:false}];
view.render({layers,counts:{private:0,a:2},selectedLayerId:"a"});
assert.equal(els.layersList.children.length,2);
assert.equal(els.pinLayer.children.length,2);
assert.equal(els.pinLayer.value,"a");
const privateRow=els.layersList.children[0];
const workRow=els.layersList.children[1];
assert.equal(privateRow.children[3].disabled,true);
assert.equal(workRow.children[0].checked,false);
assert.equal(workRow.children[2].children[1].textContent,"2 Pins");
workRow.children[0].checked=true;
workRow.children[0].trigger("change");
workRow.children[3].trigger("click");
assert.deepEqual(changed,[["a",true]]);
assert.deepEqual(deleted,["a"]);
console.log("Layer view: pure rendering and delegated UI actions pass.");
