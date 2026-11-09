import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const source=readFileSync(new URL("../map-adapter-maplibre.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../maplibre-prototype.html",import.meta.url),"utf8");
const app=readFileSync(new URL("../maplibre-prototype.js",import.meta.url),"utf8");
let assertions=0;
function check(ok,label){assert.ok(ok,label);assertions++;}
const events=new Map(),calls=[],element={
  clientWidth:360,clientHeight:540,isConnected:true,
  style:{},classList:{add(){}},addEventListener(name,fn){events.set("element:"+name,fn);},
  removeEventListener(){},append(){},closest(){return null}
};
const map={
  getCenter:()=>({lat:48,lng:9}),getZoom:()=>10,
  getContainer:()=>element,project:p=>({x:p[0]*2,y:p[1]*3}),
  unproject:p=>({lng:p[0]/2,lat:p[1]/3}),
  panBy:(p)=>calls.push(["pan",p]),jumpTo:o=>calls.push(["jump",o]),
  fitBounds:(bounds,opts)=>calls.push(["fit",bounds,opts]),
  zoomIn:()=>calls.push(["zoomIn"]),zoomOut:()=>calls.push(["zoomOut"]),
  resize:()=>calls.push(["resize"]),
  dragPan:{isEnabled:()=>true,enable:()=>calls.push(["panEnabled"]),disable:()=>calls.push(["panDisabled"])},
  on:(name,fn)=>events.set(name,fn),off:(name,fn)=>calls.push(["off",name,fn]),
  remove:()=>calls.push(["remove"]),
};
let initOptions;
class Marker{
  constructor(options){this.options=options;this.position=null;this.handlers={};}
  setLngLat(p){this.position=p;return this;}
  getLngLat(){return {lng:this.position[0],lat:this.position[1]};}
  addTo(){return this;}
  getElement(){return element;}
  on(name,fn){this.handlers[name]=fn;return this;}
  off(name){delete this.handlers[name];}
  remove(){calls.push(["markerRemove"]);}
}
class LngLatBounds{constructor(){this.points=[];}extend(p){this.points.push(p);}}
const gl={Map:class{constructor(options){initOptions=options;return map;}},Marker,LngLatBounds};
const context={window:{},document:{createElement:()=>({
  type:"",className:"",textContent:"",title:"",setAttribute(){},
  addEventListener(){},append(){},remove(){}
})}};
runInNewContext(source,context);
const Adapter=context.window.Pin2MapMapLibreAdapter;
const adapter=Adapter.mount("map",{center:{lat:48,lng:9},zoom:10},gl);
check(JSON.stringify(initOptions.center)==="[9,48]","MapLibre receives longitude before latitude");
check(adapter.getViewport().center.lat===48,"viewport latitude returned");
check(adapter.project({lat:2,lng:3}).x===6,"projection order");
check(adapter.unproject({x:6,y:6}).lat===2,"unprojection order");
adapter.setView({center:{lat:51,lng:7},zoom:12});
check(calls.at(-1)[1].center[0]===7,"center order");
adapter.zoomAround({lat:51,lng:7},13);
check(calls.at(-1)[1].around[0]===7,"zoom anchor order");
const marker=adapter.createMarker({lat:48,lng:9},{draggable:false});
check(marker.position[0]===9,"marker position order");
adapter.setMarkerPosition(marker,{lat:52,lng:13});
check(adapter.getMarkerPosition(marker).lat===52,"marker movement");
let dragged=null;
adapter.onMarker(marker,"drag",p=>dragged=p);
marker.handlers.drag();
check(dragged.lat===52 && dragged.lng===13,"drag callback coordinates");
let clicked=null;
adapter.onMapClick(p=>clicked=p);
events.get("click")({lngLat:{lng:15,lat:44}});
check(clicked.lat===44 && clicked.lng===15,"map click neutral coordinates");
adapter.fitBounds([{lat:48,lng:9},{lat:52,lng:13}],{padding:30});
check(calls.at(-1)[1].points[1][0]===13,"bounds coordinate order");
check(adapter.isMapSurface({closest:()=>null}),"map surface accepted");
check(!adapter.isMapSurface({closest:()=>({})}),"map controls rejected");
check(html.includes("maplibre-prototype.js") && app.includes("map-adapter-maplibre.js"),"standalone page imports adapter");
check(!html.includes('src="./app.js"'),"prototype does not load production app");
check(app.includes("@6.16.0") && html.includes("@6.16.0"),"library version pinned");
check(!html.includes('serviceWorker.register') && !app.includes("indexedDB"),"prototype does not persist or register service worker");
console.log("MapLibre prototype contract passed:",assertions,"checks");
