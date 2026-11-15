"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const saved={window:global.window,document:global.document,navigator:global.navigator};
const all=[];
const bounds={isValid:()=>true,getCenter:()=>({lat:49,lng:10})};
function layer(options={}){
 const item={options,handlers:{},position:{lat:49,lng:10},
  addTo(parent){parent.children.push(this);return this;},
  on(name,fn){this.handlers[name]=fn;return this;},
  getLatLng(){return this.position;},
  setLatLng(pos){this.position=Array.isArray(pos)?{lat:pos[0],lng:pos[1]}:pos;return this;},
  setOpacity(value){this.opacity=value;return this;},
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
global.window={
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
};
global.document={createElement:()=>({
 className:"",textContent:"",
 get outerHTML(){return '<span class="'+this.className+'">'+this.textContent+'</span>';}
})};
global.navigator={userAgent:"Node test",maxTouchPoints:0};
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
 assert.match(pin.options.icon.html,/#e64294/);
 assert.match(label.options.icon.html,/Ersatzort/);
 pin.handlers.click({originalEvent:{}});
 label.handlers.click({originalEvent:{}});
 assert.equal(tapped,2);
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
after(()=>{for(const k of Object.keys(saved))global[k]=saved[k];});
