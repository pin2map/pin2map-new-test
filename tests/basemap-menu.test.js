"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const BasemapMenu=require("../ui/basemap-menu.js");

function fakeElement(id){
  const handlers=new Map();
  const values=new Set(["hidden"]);
  const attributes=new Map();
  return {
    id,handlers,attributes,dataset:{},focused:false,
    classList:{
      contains:name=>values.has(name),
      add:name=>values.add(name),
      remove:name=>values.delete(name),
      toggle:(name,force)=>{if(force===undefined? !values.has(name):force)values.add(name);else values.delete(name);}
    },
    addEventListener:(type,handler)=>{const list=handlers.get(type)||[];list.push(handler);handlers.set(type,list);},
    removeEventListener:(type,handler)=>handlers.set(type,(handlers.get(type)||[]).filter(x=>x!==handler)),
    emit(type,details={}){for(const fn of handlers.get(type)||[])fn(details);},
    setAttribute:(name,value)=>attributes.set(name,value),
    focus(){this.focused=true;}
  };
}
function setup(){
  const menu=fakeElement("basemapMenu"),button=fakeElement("basemapButton");
  const street=fakeElement("street"),topo=fakeElement("topo"),invalid=fakeElement("invalid");
  street.dataset.basemap="street";topo.dataset.basemap="topo";invalid.dataset.basemap="other";
  const doc=fakeElement("document");
  doc.querySelectorAll=selector=>{
    assert.equal(selector,"#basemapMenu [data-basemap]");
    return [street,topo,invalid];
  };
  const selected=[],opened=[];
  const view=new BasemapMenu({
    getElement:id=>({basemapMenu:menu,basemapButton:button})[id],
    document:doc,onSelect:value=>selected.push(value),onOpening:()=>opened.push(true)
  });
  return {view,menu,button,street,topo,invalid,doc,selected,opened};
}
test("render synchronizes selected option aria and classes",()=>{
  const x=setup();
  x.view.render("topo");
  assert.equal(x.topo.attributes.get("aria-pressed"),"true");
  assert.equal(x.street.attributes.get("aria-pressed"),"false");
  assert.equal(x.topo.classList.contains("is-selected"),true);
  x.view.render("street");
  assert.equal(x.topo.classList.contains("is-selected"),false);
});
test("button toggle, selection callback and focus preserve menu contract",()=>{
  const x=setup();x.view.bind();x.view.bind();
  x.button.emit("click");
  assert.equal(x.opened.length,1);
  assert.equal(x.menu.classList.contains("hidden"),false);
  assert.equal(x.button.attributes.get("aria-expanded"),"true");
  x.topo.emit("click");
  assert.deepEqual(x.selected,["topo"]);
  assert.equal(x.menu.classList.contains("hidden"),true);
  assert.equal(x.button.attributes.get("aria-expanded"),"false");
  assert.equal(x.button.focused,true);
  x.view.open();x.invalid.emit("click");assert.deepEqual(x.selected,["topo"]);
  assert.equal(x.view.isOpen(),true);
  x.view.dispose();x.button.emit("click");
  assert.equal(x.view.isOpen(),true);
});
test("Escape and outside pointer close, inside pointer leaves menu open",()=>{
  const x=setup();x.view.bind();x.view.open();
  x.doc.emit("pointerdown",{target:{closest:()=>true}});
  assert.equal(x.view.isOpen(),true);
  x.doc.emit("pointerdown",{target:{closest:()=>false}});
  assert.equal(x.view.isOpen(),false);
  x.view.open();x.doc.emit("keydown",{key:"Escape"});
  assert.equal(x.view.isOpen(),false);
  assert.equal(x.button.focused,true);
  x.view.open();x.doc.emit("keydown",{key:"Enter"});
  assert.equal(x.view.isOpen(),true);
});
test("wiring loads UI module before app and includes it in offline shell",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const worker=fs.readFileSync(path.join(__dirname,"../sw.js"),"utf8");
  const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
  assert.ok(html.indexOf('./ui/basemap-menu.js')>html.indexOf('./ui/shell.js'));
  assert.ok(html.indexOf('./ui/basemap-menu.js')<html.indexOf('./app.js'));
  assert.match(worker,/".\/ui\/basemap-menu\.js"/);
  assert.match(app,/new window\.Pin2MapBasemapMenu/);
  assert.doesNotMatch(app,/document\.querySelectorAll\("#basemapMenu \[data-basemap\]"\)/);
  assert.match(worker,/const CACHE='pin2map-new-v101'/);
});
