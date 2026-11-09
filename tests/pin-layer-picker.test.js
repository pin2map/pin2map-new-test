"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const PinLayerPicker=require("../ui/pin-layer-picker.js");
function fixture(){
  class Node{
    constructor(tag){
      this.tagName=tag;this.children=[];this.attrs={};this.listeners={};
      this.style={};this.className="";this.textContent="";this.value="";
      this.classList={
        add(key){this.list.add(key);},
        list:new Set(["hidden"]),
        toggle:(key,force)=>{if(force)this.classList.list.add(key);else this.classList.list.delete(key);},
        contains:key=>this.classList.list.has(key)
      };
    }
    setAttribute(k,v){this.attrs[k]=String(v);}
    addEventListener(k,fn){this.listeners[k]=fn;}
    replaceChildren(...kids){this.children=kids;}
    append(...kids){this.children.push(...kids);}
    dispatchEvent(e){this.listeners[e.type]?.(e);return true;}
    focus(){this.focused=true;}
    click(){this.listeners.click?.();}
  }
  const elements=Object.fromEntries(["pinLayerTrigger","pinLayerMenu","pinLayer"].map(id=>[id,new Node("div")]));
  const listeners={},doc={
    defaultView:{Event:class{constructor(type,options){this.type=type;this.bubbles=options?.bubbles;}}},
    createElement:tag=>new Node(tag),
    addEventListener:(type,fn)=>{listeners[type]=fn;}
  };
  const icons={svg(name){const icon=new Node("svg");icon.iconName=name;return icon;}};
  const picker=new PinLayerPicker({getElement:id=>elements[id],document:doc,icons});
  const layers=[
    {id:"private",name:"Privat",color:"#cc2244",visible:true},
    {id:"work",name:"Arbeit",color:"#235baa",visible:false}
  ];
  elements.pinLayer.value="private";
  return {picker,elements,layers,listeners};
}
test("selected layer shows own color and visibility, including hidden layer",()=>{
  const {picker,elements,layers}=fixture();
  picker.render({layers,selectedLayerId:"private"});
  const trigger=elements.pinLayerTrigger;
  assert.equal(trigger.children[0].style.backgroundColor,"#cc2244");
  assert.equal(trigger.children[1].textContent,"Privat");
  assert.equal(trigger.children[2].children[0].iconName,"eye");
  assert.equal(trigger.children[2].attrs["aria-label"],"Sichtbar");
  picker.render({layers,selectedLayerId:"work"});
  assert.equal(trigger.children[0].style.backgroundColor,"#235baa");
  assert.equal(trigger.children[2].children[0].iconName,"eye-off");
  assert.equal(trigger.children[2].attrs["aria-label"],"Ausgeblendet");
  assert.equal(elements.pinLayerMenu.children.length,2);
  assert.equal(elements.pinLayerMenu.children[1].children[2].children[0].iconName,"eye-off");
  assert.equal(elements.pinLayerMenu.children[1].attrs["aria-label"],"Arbeit, Ausgeblendet");
  assert.equal(elements.pinLayerMenu.children[1].attrs["aria-selected"],"true");
});
test("selecting a layer dispatches the existing native change event exactly once",()=>{
  const {picker,elements,layers}=fixture();
  let changes=0;
  elements.pinLayer.addEventListener("change",()=>changes++);
  picker.render({layers,selectedLayerId:"private"});
  elements.pinLayerTrigger.click();
  assert.equal(elements.pinLayerTrigger.attrs["aria-expanded"],"true");
  elements.pinLayerMenu.children[1].click();
  assert.equal(elements.pinLayer.value,"work");
  assert.equal(changes,1);
  assert.equal(elements.pinLayerTrigger.attrs["aria-expanded"],"false");
  assert.equal(elements.pinLayerTrigger.focused,true);
  // Re-selecting identical value must not create redundant save events.
  elements.pinLayerMenu.children[1].click();
  assert.equal(changes,1);
});
test("outside press and Escape close selector without changing assignment",()=>{
  const {picker,elements,layers,listeners}=fixture();
  picker.render({layers,selectedLayerId:"private"});
  elements.pinLayerTrigger.click();
  listeners.pointerdown({target:{closest:()=>null}});
  assert.equal(picker.open,false);
  elements.pinLayerTrigger.click();
  let prevented=false;
  elements.pinLayerMenu.listeners.keydown({key:"Escape",preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(picker.open,false);
  assert.equal(elements.pinLayer.value,"private");
});

test("layer picker overlay does not change dialog height and labels are 12px",()=>{
  const fs=require("node:fs");
  const css=fs.readFileSync(require("node:path").join(__dirname,"..","styles.css"),"utf8");
  const menu=css.match(/#pinPanel \.pin-layer-menu\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(menu.includes("position:absolute"),"Floating list should not enlarge the pin panel");
  assert.ok(menu.includes("z-index:20"));
  assert.ok(menu.includes("top:100%"));
  const label=css.match(/#pinPanel \.pin-layer-trigger,[\s\S]*?#pinPanel \.pin-layer-option\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(label.includes("font-size:12px!important"));
});
