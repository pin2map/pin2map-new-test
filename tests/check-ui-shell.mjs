import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const UIShell=require("../ui/shell.js");

function element(){
  const classes=new Set(["hidden"]);
  const attributes=new Map();
  return {
    textContent:"",title:"",
    classList:{
      contains:c=>classes.has(c),
      add:c=>classes.add(c),
      remove:c=>classes.delete(c),
      toggle:(c,force)=>{
        if(force===undefined)force=!classes.has(c);
        if(force)classes.add(c);else classes.delete(c);
        return force;
      }
    },
    setAttribute:(key,value)=>attributes.set(key,String(value)),
    getAttribute:key=>attributes.get(key)
  };
}
const ids=["notice","layersPanel","settingsPanel","layersButton","settingsButton","labelsToggle"];
const nodes=Object.fromEntries(ids.map(id=>[id,element()]));
let nextId=0;
const pending=new Map();
const timers=[];
const iconCalls=[];
const ui=new UIShell({
 mountLabelIcon:(button,name)=>{assert.equal(button,nodes.labelsToggle);iconCalls.push(name);},
 getElement:id=>{
   assert.ok(nodes[id],"Unknown element "+id);
   return nodes[id];
 },
 setTimer:(cb,ms)=>{
   assert.equal(ms,3500);
   const id=++nextId;pending.set(id,cb);timers.push(id);return id;
 },
 clearTimer:id=>pending.delete(id)
});
ui.showNotice("Test");
assert.equal(nodes.notice.textContent,"Test");
assert.equal(nodes.notice.classList.contains("hidden"),false);
ui.showNotice("Nächste Meldung");
assert.equal(nodes.notice.textContent,"Nächste Meldung");
assert.equal(pending.size,1,"Old notice timeout must be cancelled");
const fired=timers.at(-1);
const fire=pending.get(fired);
pending.delete(fired);
fire();
assert.equal(nodes.notice.classList.contains("hidden"),true);

ui.togglePanel("layersPanel");
assert.equal(nodes.layersPanel.classList.contains("hidden"),false);
assert.equal(nodes.settingsPanel.classList.contains("hidden"),true);
assert.equal(nodes.layersButton.getAttribute("aria-expanded"),"true");
ui.togglePanel("layersPanel");
assert.equal(nodes.layersPanel.classList.contains("hidden"),true);
assert.equal(nodes.layersButton.getAttribute("aria-expanded"),"false");
ui.togglePanel("settingsPanel");
assert.equal(nodes.settingsPanel.classList.contains("hidden"),false);
assert.equal(nodes.layersButton.getAttribute("aria-expanded"),"false");
assert.equal(nodes.settingsButton.getAttribute("aria-expanded"),"true");
ui.closePanel("settingsPanel");
assert.equal(nodes.settingsButton.getAttribute("aria-expanded"),"false");
ui.togglePanel("settingsPanel");
ui.closePanels();
assert.equal(nodes.settingsButton.getAttribute("aria-expanded"),"false");
assert.equal(nodes.settingsPanel.classList.contains("hidden"),true);
assert.throws(()=>ui.togglePanel("pinPanel"),RangeError);

ui.updateLabelButton(true);
assert.equal(nodes.labelsToggle.getAttribute("aria-pressed"),"true");
assert.equal(nodes.labelsToggle.classList.contains("is-off"),false);
assert.match(nodes.labelsToggle.title,/ausblenden/);
assert.equal(iconCalls.at(-1),"tags");
ui.updateLabelButton(false);
assert.equal(nodes.labelsToggle.getAttribute("aria-pressed"),"false");
assert.equal(nodes.labelsToggle.classList.contains("is-off"),true);
assert.match(nodes.labelsToggle.title,/einblenden/);
assert.deepEqual(iconCalls,["tags","tags-off"]);
ui.updateLabelButton(true);
assert.deepEqual(iconCalls,["tags","tags-off","tags"]);
assert.equal(nodes.labelsToggle.getAttribute("aria-pressed"),"true");

ui.showNotice("Kurz");
ui.hideNotice();
assert.equal(nodes.notice.classList.contains("hidden"),true);
assert.equal(pending.size,0);
ui.dispose();
console.log("UI shell: notices, timers, panels and labels pass.");
