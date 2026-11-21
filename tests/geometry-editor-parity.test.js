"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
require("../ui/pin-note-editor.js");
require("../ui/pin-layer-picker.js");
require("../ui/search-type-menu.js");
require("../ui/object-dialog-core.js");
require("../ui/object-delete-dialog.js");
require("../ui/object-url-popup.js");
const GeometryEditor=require("../ui/geometry-editor.js");
class Element{
  constructor(tag="div"){
    this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.style={};this.dataset={};
    this.className="";this.textContent="";this.value="";this.hidden=false;
    this.offsetWidth=350;this.offsetHeight=280;this.scrollHeight=210;
    const cls=new Set();
    this.classList={
      add:c=>cls.add(c),remove:c=>cls.delete(c),contains:c=>cls.has(c),
      toggle:(c,force)=>{if(force===undefined?!cls.has(c):force)cls.add(c);else cls.delete(c);}
    };
  }
  append(...children){this.children.push(...children);}
  prepend(...children){this.children.unshift(...children);}
  insertBefore(child,reference){
    const index=this.children.indexOf(reference);
    if(index<0)throw new Error("insertBefore reference is not a child");
    this.children.splice(index,0,child);
    return child;
  }
  replaceChildren(...children){this.children=[...children];}
  addEventListener(type,fn){this.listeners[type]=fn;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k];}
  getBoundingClientRect(){return {left:90,right:440,top:90,bottom:380,width:350,height:290};}
  focus(){this.focused=true;}
  setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}
  click(){this.listeners.click?.({preventDefault(){},stopPropagation(){}});}
  closest(){return null;}
}
function fixture(){
  const nodes=[],app=new Element("main");
  const doc={body:new Element("body"),createElement:t=>{const e=new Element(t);nodes.push(e);return e;},
    getElementById:id=>id==="app"?app:null,
    addEventListener(){},
    defaultView:{innerWidth:900,innerHeight:700,visualViewport:{width:900,height:700,
      offsetTop:0,offsetLeft:0,addEventListener(){}},
      matchMedia:()=>({matches:false})}
  };
  const item={id:"area-1",name:"Lüttich",note:"",url:"",layerId:"private"};
  const patches=[],deleted=[];
  const editor=new GeometryEditor({
    document:doc,icons:{svg:(name)=>{const el=new Element("svg");el.iconName=name;return el;}},
    onUpdate:(_type,_id,patch)=>{patches.push(patch);Object.assign(item,patch);
      if(Object.hasOwn(patch,"color")&&patch.color===null)delete item.color;
      return item;},
    onDelete:(type,id)=>deleted.push([type,id]),onWikipedia(){}
  });
  const layers=[{id:"private",name:"Privat",color:"#326cc2",visible:true},
    {id:"hidden",name:"Versteckt",color:"#ef8023",visible:false}];
  editor.show("area",item,layers,{x:200,y:200});
  return {editor,item,patches,deleted,layers,doc};
}
test("area editor uses area deletion artwork and pin-style layer indicator",()=>{
  const {editor}=fixture();
  assert.equal(editor.removeButton.children[0].className,"object-delete-art");
  assert.equal(editor.removeButton.children[0].children[0].src,"./assets/region.svg");
  assert.equal(editor.layerButton.children[0].iconName,"layers-arrow-down");
  assert.equal(editor.layerDot.style.backgroundColor,"#326cc2");
  assert.equal(editor.colorButton.children[0].iconName,"palette");
  assert.equal(editor.expandButton.classList.contains("hidden"),false);
});
test("area layer popover uses colored dot, eye, name, and persists only selection",()=>{
  const {editor,item,patches}=fixture();
  editor.layerButton.click();
  const menu=editor.layerMenu;
  assert.equal(menu.classList.contains("hidden"),false);
  const visible=menu.children[0],hidden=menu.children[1];
  assert.equal(visible.children[0].style.backgroundColor,"#326cc2");
  assert.equal(visible.children[1].children[0].iconName,"eye");
  assert.equal(hidden.children[1].children[0].iconName,"eye-off");
  assert.equal(hidden.classList.contains("is-invisible-layer"),true);
  assert.equal(patches.length,0);
  hidden.click();
  assert.equal(item.layerId,"hidden");
  assert.equal(editor.layerDot.style.backgroundColor,"#ef8023");
  assert.equal(menu.classList.contains("hidden"),true);
});
test("area URL popover validates, persists, and preserves pin-like open state",()=>{
  const {editor,item}=fixture();
  editor.linkButton.click();
  assert.equal(editor.urlPopup.classList.contains("hidden"),false);
  editor.urlInput.value="https://example.org/area";
  editor.urlInput.listeners.input();
  assert.equal(editor.urlOpen.disabled,false);
  editor.urlSave.click();
  assert.equal(item.url,"https://example.org/area");
  assert.equal(editor.linkButton.classList.contains("has-url"),true);
  assert.equal(editor.urlPopup.classList.contains("hidden"),true);
  assert.equal(editor.normalizedUrl("javascript:alert(1)"),null);
});
test("area enlarged notes reuse the mobile pin note editor and save on change",()=>{
  const {editor,item}=fixture();
  editor.expandButton.click();
  assert.equal(editor.noteEditor.open,true);
  assert.equal(editor.noteNodes.pinNoteEditorTitle.textContent,"Lüttich");
  editor.noteNodes.pinNoteEditorText.value="Flächennotiz";
  editor.noteNodes.pinNoteEditorText.listeners.input();
  assert.equal(item.note,"Flächennotiz");
  editor.noteNodes.pinNoteEditorDone.click();
  assert.equal(editor.noteEditor.open,false);
  assert.equal(editor.notesInput.value,"Flächennotiz");
});

test("area URL overlay stays within editor and ends above footer actions",()=>{
  const {editor}=fixture();
  editor.panel.getBoundingClientRect=()=>({left:120,right:510,top:80,bottom:555,width:390,height:475});
  editor.header.getBoundingClientRect=()=>({left:130,right:500,top:95,bottom:166,width:370,height:71});
  editor.actions.getBoundingClientRect=()=>({left:130,right:500,top:474,bottom:535,width:370,height:61});
  editor.linkButton.click();
  const popupTop=parseFloat(editor.urlPopup.style.top);
  const popupHeight=parseFloat(editor.urlPopup.style.height);
  assert.ok(popupTop>=166,"URL must not overlap the editor name row");
  assert.ok(popupTop+popupHeight<=466,"URL must end above bottom buttons");
  assert.ok(parseFloat(editor.urlPopup.style.left)>=120);
  assert.equal(editor.urlPopup.classList.contains("hidden"),false);
});

test("geometry color menu is available even before any override is chosen",()=>{
 const {editor,item}=fixture();
 assert.equal(item.color,undefined);
 editor.colorButton.click();
 assert.equal(editor.colorMenu.classList.contains("hidden"),false);
 assert.equal(editor.noColorButton.textContent,"Keine Farbe");
 assert.equal(editor.nativeColor.type,"color");
});
