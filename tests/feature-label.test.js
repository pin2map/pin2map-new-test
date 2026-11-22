"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
require("../ui/object-type-icons.js");
require("../ui/object-status.js");
const labels=require("../ui/feature-label.js");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
function documentStub(){
 const make=tag=>{
  const styleMap=new Map();
  return {tagName:tag,children:[],attrs:{},classes:new Set(),textContent:"",
   style:{setProperty:(name,value)=>styleMap.set(name,value),
     getPropertyValue:name=>styleMap.get(name)||""},
   classList:{add(name){this.owner.classes.add(name);}},
   append(...children){this.children.push(...children);},
   setAttribute(name,value){this.attrs[name]=String(value);}};
 };
 const wrap=tag=>{const element=make(tag);element.classList.owner=element;return element;};
 return {createElement:wrap,createElementNS:(_ns,tag)=>wrap(tag)};
}
test("one object label factory colors only the layer segment for area, lake and river",()=>{
 const doc=documentStub(),obj={id:"a",name:"Testname",layerId:"blue",color:"#AD1042",note:"",url:""};
 for(const [kind,cls,asset] of [
  ["area","p2m-area-name-label","region.svg"],
  ["lake","p2m-area-name-label","lake.svg"],
  ["river","p2m-river-name-label","river.svg"]
 ]){
  const label=labels.create(kind,obj,"#1E90FF",doc);
  assert.equal(label.className,cls);
  assert.equal(label.style.getPropertyValue("--p2m-feature-layer-color"),"#1E90FF");
  assert.equal(label.children.length,3,"icon + two-half status + name are unchanged");
  assert.ok(label.children[0].src.endsWith(asset));
  assert.equal(label.children[1].className,"p2m-object-status");
  assert.equal(label.children[1].children[0].children.length,3,"two halves + circular outline");
  assert.equal(label.children[2].textContent,"Testname");
  assert.notEqual(label.style.getPropertyValue("--p2m-feature-layer-color"),obj.color,
   "Layer color must not be derived from individual geometry paint");
 }
 assert.throws(()=>labels.create("pin",obj,"#1E90FF",doc),RangeError);
});
test("all feature label types share one CSS layer strip which ends before the status indicator",()=>{
 const css=read("styles.css"),map=read("map-adapter-leaflet.js"),html=read("index.html"),sw=read("sw.js");
 assert.match(css,/#map \.p2m-area-name-label::before,#map \.p2m-river-name-label::before\{/);
 assert.match(css,/background:color-mix\(in srgb,var\(--p2m-feature-layer-color,#a4b0bd\) 35%,white\)/);
 assert.match(css,/width:var\(--p2m-feature-label-layer-strip\)/);
 assert.match(map,/Pin2MapFeatureLabel\.create\(\s*area\.kind==="lake"\?"lake":"area"/);
 assert.match(map,/Pin2MapFeatureLabel\.create\(\s*"river",river/);
 assert.match(html,/<script defer src="\.\/ui\/feature-label\.js"><\/script>/);
 assert.match(sw,/"\.\/ui\/feature-label\.js"/);
});
