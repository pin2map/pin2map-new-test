"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const PinLayerPicker=require("../ui/pin-layer-picker.js");
function fixture(){
  class Node{
    constructor(tag){
      this.tagName=tag;this.children=[];this.attrs={};this.listeners={};
      this.style={};this.className="";this.textContent="";this.value="";this.scrollHeight=160;
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
    getBoundingClientRect(){return {left:100,top:320,bottom:358,right:138,width:38,height:38};}
    focus(){this.focused=true;}
    click(){this.listeners.click?.();}
  }
  const elements=Object.fromEntries(["pinLayerTrigger","pinLayerMenu","pinLayer","pinPanel"].map(id=>[id,new Node("div")]));
  const listeners={},doc={
    defaultView:{innerWidth:375,innerHeight:667,Event:class{constructor(type,options){this.type=type;this.bubbles=options?.bubbles;}},addEventListener(){}},
    body:new Node("body"),
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
test("selected layer trigger uses Lucide icon and colored dot; menu keeps full labels",()=>{
  const {picker,elements,layers}=fixture();
  picker.render({layers,selectedLayerId:"private"});
  const trigger=elements.pinLayerTrigger;
  assert.equal(trigger.children[0].iconName,"layers-arrow-down");
  assert.equal(trigger.children[1].style.backgroundColor,"#cc2244");
  assert.match(trigger.attrs["aria-label"],/Privat, Sichtbar/);
  picker.render({layers,selectedLayerId:"work"});
  assert.equal(trigger.children[1].style.backgroundColor,"#235baa");
  assert.match(trigger.attrs["aria-label"],/Arbeit, Ausgeblendet/);
  assert.equal(elements.pinLayerMenu.children.length,2);
  assert.equal(elements.pinLayerMenu.children[1].children[2].children[0].iconName,"eye-off");
  assert.equal(elements.pinLayerMenu.children[1].attrs["aria-selected"],"true");
});
test("selecting a layer dispatches the existing native change event exactly once",()=>{
  const {picker,elements,layers}=fixture();
  let changes=0;
  elements.pinLayer.addEventListener("change",()=>changes++);
  picker.render({layers,selectedLayerId:"private"});
  elements.pinLayerTrigger.click();
  assert.equal(elements.pinLayerTrigger.attrs["aria-expanded"],"true");
  assert.equal(elements.pinPanel.classList.contains("pin-layer-open"),true);
  elements.pinLayerMenu.children[1].click();
  assert.equal(elements.pinLayer.value,"work");
  assert.equal(changes,1);
  assert.equal(elements.pinLayerTrigger.attrs["aria-expanded"],"false");
  assert.equal(elements.pinPanel.classList.contains("pin-layer-open"),false);
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
  assert.equal(elements.pinPanel.classList.contains("pin-layer-open"),false);
  elements.pinLayerTrigger.click();
  let prevented=false;
  elements.pinLayerMenu.listeners.keydown({key:"Escape",preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(picker.open,false);
  assert.equal(elements.pinLayer.value,"private");
});

test("layer menu is portalled outside pin panel and positioned in the visual viewport",()=>{
 const {picker,elements,layers}=fixture();
 picker.render({layers,selectedLayerId:"private"});
 picker.setOpen(true);
 const menu=elements.pinLayerMenu;
 assert.equal(menu.style.position,undefined,"Layout position comes from one CSS owner");
 assert.equal(menu.style.width,"260px");
 assert.ok(Number.parseFloat(menu.style.left)>=12);
 assert.ok(Number.parseFloat(menu.style.top)>=12);
 assert.equal(elements.pinPanel.classList.contains("pin-layer-open"),true);
});
test("layer picker uses fixed popup outside the scrolling panel and a circular trigger",()=>{
 const fs=require("node:fs"),css=fs.readFileSync(require("node:path").join(__dirname,"..","styles.css"),"utf8");
 const html=fs.readFileSync(require("node:path").join(__dirname,"..","index.html"),"utf8");
 assert.match(css,/#pinLayerMenu\.pin-layer-menu\{[^}]*position:fixed/);
 assert.match(css,/#pinPanel #pinLayerTrigger\.pin-layer-trigger\{/);
 assert.ok(css.includes("padding:0!important;border-radius:50%!important;"));
 assert.doesNotMatch(css,/#pinPanel\.pin-layer-open\{overflow:visible/);
 assert.match(css,/#pinLayerMenu\.pin-layer-menu\{[^}]*overflow-x:hidden/);
 const section=html.split('<section id="pinPanel"')[1]?.split("</section>")[0]||"";
 const footer=section.split('<div class="pin-actions">')[1]||"";
 const ids=["movePin","pinLayerPicker","pinUrlButton","pinWikipedia","pinWeather","closePin"];
 let last=-1;
 for(const id of ids){const next=footer.indexOf('id="'+id+'"');assert.ok(next>last,"Footer action order: "+id);last=next;}
});
