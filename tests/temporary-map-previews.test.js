"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const saved=Object.fromEntries(["window","document","navigator"].map(
 key=>[key,Object.getOwnPropertyDescriptor(global,key)]));
const expose=(key,value)=>Object.defineProperty(global,key,{
 configurable:true,writable:true,value
});
const all=[];
const bounds={isValid:()=>true,getCenter:()=>({lat:49,lng:10})};
function layer(options={}){
 const item={options,handlers:{},position:{lat:49,lng:10},
  addTo(parent){parent.children.push(this);return this;},
  on(name,fn){this.handlers[name]=fn;return this;},
  getLatLng(){return this.position;},
  setLatLng(pos){this.position=Array.isArray(pos)?{lat:pos[0],lng:pos[1]}:pos;return this;},
  setOpacity(value){this.opacity=value;return this;},
  setIcon(icon){this.options.icon=icon;return this;},
  getBounds:()=>bounds
 };
 all.push(item);return item;
}
const map={
 removed:[],events:[],
 getCenter:()=>({lat:49,lng:10}),getZoom:()=>10,
 getSize:()=>({x:800,y:600}),
 latLngToContainerPoint:()=>({x:200,y:200}),
 containerPointToLatLng:()=>({lat:49,lng:10}),
 setView(pos,zoom){this.view={pos,zoom};},
 fitBounds(){this.fitted=true;},
 on(event,fn){this.events.push({event,fn});},
 off(event,fn){this.events=this.events.filter(x=>x.fn!==fn);},
 removeLayer(item){this.removed.push(item);}
};
expose("window",{
 L:{
  layerGroup:()=>({children:[],addTo(){return this;}}),
  marker:(pos,options)=>{const x=layer(options);x.setLatLng(pos);return x;},
  divIcon:options=>options,
  polyline:(lines,options)=>layer(options),
  geoJSON:(geometry,options)=>layer(options),
  DomEvent:{stop(){}}
 },
 Pin2MapAreaGeometry:{prepare:geometry=>({geometry})},
 Pin2MapAreaLabelAnchor:{visibleAnchor:()=>({x:200,y:200})},
 Pin2MapRiverLabelAnchor:{findVisibleAnchor:()=>({x:200,y:200})}
});
expose("document",{createElement:()=>({
 className:"",textContent:"",
 get outerHTML(){return '<span class="'+this.className+'">'+this.textContent+'</span>';}
})});
expose("navigator",{userAgent:"Node test",maxTouchPoints:0});
require("../map-adapter-leaflet.js");
const Adapter=global.window.Pin2MapLeafletAdapter;
const adapter=new Adapter(map);
const poly={type:"Polygon",coordinates:[[[9,48],[10,48],[10,49],[9,49],[9,48]]]};
test("full pink pin is clickable without persistence and labels reference places accurately",()=>{
 let tapped=0;
 adapter.showTemporaryPin({kind:"point",point:{lat:49,lng:10},
  label:"Test",referencePlace:"Stadt Test"},()=>{tapped++;});
 const group=adapter.temporaryPlateArea.group;
 assert.equal(group.children.length,2);
 const pin=group.children[0],label=group.children[1];
 assert.match(pin.options.icon.html,/pin-marker-shape/);
 assert.match(pin.options.icon.html,/pin-status-segments/);
 assert.equal(pin.options.icon.className,"pin-icon p2m-temporary-pin");
 assert.deepEqual(pin.options.icon.iconSize,[52,56]);
 assert.match(pin.options.icon.html,/#e64294/);
 assert.match(label.options.icon.html,/Ersatzort/);
 pin.handlers.click({originalEvent:{}});
 label.handlers.click({originalEvent:{}});
 assert.equal(tapped,2);
});
test("locality label updates without moving, re-creating or saving a pink pin",()=>{
 let tapped;
 const entry={kind:"point",point:{lat:55.1,lng:14.8},label:"Neuer Pin",name:""};
 adapter.showTemporaryPin(entry,()=>tapped++);
 const preview=adapter.temporaryPlateArea,marker=preview.group.children[0];
 const labelMarker=preview.group.children[1];
 const originalPosition=marker.getLatLng();
 const originalGroup=preview.group;
 entry.name=entry.label="Knudsker";
 assert.equal(adapter.updateTemporaryPinLabel(entry),true);
 assert.equal(adapter.temporaryPlateArea.group,originalGroup);
 assert.deepEqual(marker.getLatLng(),originalPosition);
 assert.match(labelMarker.options.icon.html,/Knudsker/);
 assert.doesNotMatch(labelMarker.options.icon.html,/Neuer Pin/);
 assert.equal(adapter.updateTemporaryPinLabel({...entry}),false,
   "Replaced previews must not accept stale updates");
});
test("temporary pin long-press attaches to both hit targets and survives renamed label",()=>{
 const attachments=[];
 adapter.setTemporaryPinGestureHandler((marker,onTap,target)=>{
  attachments.push({marker,onTap,target});
 });
 const entry={kind:"point",label:"Neuer Pin",name:"",point:{lat:55.1,lng:14.8}};
 adapter.showTemporaryPin(entry,()=>{});
 assert.equal(attachments.length,2);
 const pin=adapter.temporaryPlateArea.group.children[0];
 const label=adapter.temporaryPlateArea.group.children[1];
 assert.equal(attachments[0].marker,pin);
 assert.equal(attachments[1].marker,label);
 assert.equal(attachments[1].target,pin,"Label uses same zoom toggle as pin");
 entry.label="Knudsker";
 adapter.updateTemporaryPinLabel(entry);
 assert.equal(attachments.length,3,"Reattached after Leaflet setIcon");
 assert.equal(attachments[2].marker,label);
 adapter.setTemporaryPinGestureHandler(null);
});
test("synthetic click following temporary pin long-press zoom cannot open save menu",()=>{
 let count=0,blocked=true;
 adapter.setTemporaryPinGestureHandler(()=>{},()=>blocked);
 const entry={kind:"point",label:"Test",point:{lat:49,lng:10}};
 adapter.showTemporaryPin(entry,()=>count++);
 const marker=adapter.temporaryPlateArea.group.children[0];
 marker.handlers.click({originalEvent:{}});
 assert.equal(count,0);
 blocked=false;
 marker.handlers.click({originalEvent:{}});
 assert.equal(count,1);
 adapter.setTemporaryPinGestureHandler(null);
});
test("pink polygon replaces old pin overlay and offers a tappable label",()=>{
 let tapped=0;
 const old=adapter.temporaryPlateArea.group;
 adapter.showTemporaryPlateArea({kind:"area",geojson:poly,label:"Fläche"},()=>tapped++);
 assert.ok(map.removed.includes(old),"Old preview must be removed on new object");
 const group=adapter.temporaryPlateArea.group;
 assert.equal(group.children.length,2);
 assert.equal(group.children[0].options.style.color,"#e64294");
 group.children[1].handlers.click({originalEvent:{}});
 assert.equal(tapped,1);
});
test("river draws pink line and a separate 24px invisible tap corridor",()=>{
 let tapped=0;
 const old=adapter.temporaryPlateArea.group;
 adapter.showTemporaryRiver({kind:"river",label:"Testfluss",
  chains:[[[48,9],[49,10],[50,11]]]},()=>tapped++);
 assert.ok(map.removed.includes(old));
 const group=adapter.temporaryPlateArea.group;
 assert.equal(group.children.length,3);
 assert.equal(group.children[0].options.color,"#e64294");
 assert.equal(group.children[1].options.weight,24);
 assert.equal(group.children[1].options.interactive,true);
 group.children[1].handlers.click({originalEvent:{},latlng:{lat:49,lng:10}});
 group.children[2].handlers.click({originalEvent:{}});
 assert.equal(tapped,2);
 adapter.clearTemporaryPlateArea();
 assert.equal(adapter.temporaryPlateArea,null);
});
const {after}=require("node:test");
after(()=>{
 for(const [key,descriptor] of Object.entries(saved)){
  if(descriptor)Object.defineProperty(global,key,descriptor);
  else delete global[key];
 }
});
