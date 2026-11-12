import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const PinEditorView=require("../ui/pin-editor.js");
function element(){
 const classes=new Set(["hidden"]);
 return {
  value:"",textContent:"",title:"",attributes:{},
  setAttribute(name,value){this.attributes[name]=String(value);},
  getAttribute(name){return this.attributes[name];},
  classList:{
   add:s=>classes.add(s),remove:s=>classes.delete(s),
   contains:s=>classes.has(s),
   toggle:(s,force)=>{
    if(force)classes.add(s);else classes.delete(s);
   }
  }
 };
}
const ids=["pinPanel","pinDialogTip","pinName","pinLayer","pinCoords","pinCreated","pinUpdated","pinHiddenInfo","movePin"];
const nodes=Object.fromEntries(ids.map(id=>[id,element()]));
const body=element(),doc={body,activeElement:null};
let layouts=0;
const view=new PinEditorView({
 getElement:id=>{assert.ok(nodes[id],"Unknown element "+id);return nodes[id];},
 document:doc,scheduleFrame:fn=>{layouts++;fn?.();}
});
const pin={id:"pin-1",name:"Aussichtspunkt",layerId:"private",lat:48.7758,lng:9.1829};
view.render({pin,moving:false,layerVisible:true,onLayout:()=>{}});
assert.equal(nodes.pinPanel.classList.contains("hidden"),false);
assert.equal(body.classList.contains("pin-open"),true);
assert.equal(nodes.pinName.value,"Aussichtspunkt");
assert.equal(nodes.pinLayer.value,"private");
assert.equal(nodes.pinCoords.textContent,"Koordinaten: 48.775800, 9.182900");
assert.match(nodes.pinCreated.textContent,/^Erstellt:/);
assert.match(nodes.pinUpdated.textContent,/^Geändert:/);
assert.equal(nodes.pinHiddenInfo.classList.contains("hidden"),true);
assert.equal(nodes.movePin.getAttribute("aria-label"),"Pin verschieben");
assert.equal(nodes.movePin.title,"Pin verschieben");
assert.equal(layouts,1);
doc.activeElement=nodes.pinName;
nodes.pinName.value="Laufende Eingabe";
view.render({pin:{...pin,name:"Serverwert"},moving:false,layerVisible:false,onLayout:()=>{}});
assert.equal(nodes.pinName.value,"Laufende Eingabe","Focus must prevent input overwrite");
assert.equal(nodes.pinHiddenInfo.classList.contains("hidden"),false);
view.render({pin:null,moving:false,layerVisible:true,onLayout:()=>{}});
assert.equal(nodes.pinPanel.classList.contains("hidden"),true);
assert.equal(body.classList.contains("pin-open"),false);
assert.equal(nodes.pinDialogTip.classList.contains("hidden"),true);
view.render({pin,moving:true,layerVisible:true,onLayout:()=>{}});
assert.equal(nodes.pinPanel.classList.contains("hidden"),true);
assert.equal(nodes.movePin.getAttribute("aria-label"),"Verschieben abbrechen");
assert.equal(nodes.movePin.title,"Verschieben abbrechen");
console.log("Pin editor view: rendering, focus preservation, hidden layers, and move state pass");
