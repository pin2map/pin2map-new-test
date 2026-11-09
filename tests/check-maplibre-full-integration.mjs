import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const html=read("maplibre-full-integration.html");
const app=read("maplibre-full-integration-app.js");
const adapter=read("maplibre-full-integration-adapter.js");
const bootstrap=read("maplibre-full-integration-bootstrap.js");
assert.match(html,/maplibre-full-integration-bootstrap\.js/);
assert.doesNotMatch(html,/leaflet(?:\.js|\.css)/);
assert.match(bootstrap,/maplibre-full-integration-adapter\.js/);
assert.match(bootstrap,/maplibre-full-integration-app\.js/);
assert.match(app,/STORAGE_DB = "pin2map-maplibre-integration-v1"/);
assert.doesNotMatch(app,/STORAGE_DB = "pin2map-new-v1"/);
assert.match(app,/Pin2MapMapLibreAdapter\.mount/);
assert.match(app,/refreshButton"\)\.disabled=true/);
assert.match(app,/if\(document\.readyState==="loading"\)/);
assert.match(adapter,/setBasemap\(id\)/);
assert.match(adapter,/createLine\(positions,options=\{\}\)/);
assert.match(adapter,/setLinePositions\(line,positions\)/);
const scope={window:{}};
vm.runInNewContext(adapter,scope);
const events=[],sources=new Map(),layers=new Map();
const map={
 on(type,fn){events.push(["on",type]);},
 setStyle(style){events.push(["setStyle",style]);},
 isStyleLoaded(){return true;},
 addSource(id,src){sources.set(id,{...src,setData(data){this.data=data;}});},
 getSource(id){return sources.get(id);},
 addLayer(layer){layers.set(layer.id,layer);},
 getLayer(id){return layers.get(id);},
 removeLayer(id){layers.delete(id);},
 removeSource(id){sources.delete(id);},
 getCenter(){return {lat:48,lng:9};},
 project([lng,lat]){return {x:lng*10,y:lat*10};},
 unproject([x,y]){return {lng:x/10,lat:y/10};},
 jumpTo(opts){events.push(["jump",opts]);},
 getContainer(){return {clientWidth:300,clientHeight:500};}
};
const a=new scope.window.Pin2MapMapLibreAdapter(map,{});
a.setBasemap("street");
a.setBasemap("topo");
assert.equal(events.filter(e=>e[0]==="setStyle").length,2);
assert.equal(events.find(e=>e[0]==="setStyle")[1].version,8);
assert.throws(()=>a.setBasemap("invalid"),/Unknown basemap/);
const line=a.createLine([{lat:48,lng:9},{lat:49,lng:10}],{color:"#d65a31",weight:3,dashArray:"7 5"});
assert.deepEqual(Array.from(sources.get(line.id).data.geometry.coordinates,c=>Array.from(c)),[[9,48],[10,49]]);
a.setLinePositions(line,[{lat:50,lng:11},{lat:51,lng:12}]);
assert.deepEqual(Array.from(sources.get(line.id).data.geometry.coordinates,c=>Array.from(c)),[[11,50],[12,51]]);
a.removeOverlay(line);
assert.equal(sources.size,0);
assert.equal(layers.size,0);
a.panBy({x:10,y:-4});
const nextCenter=events.find(e=>e[0]==="jump")[1].center;
assert.equal(Math.abs(nextCenter[0]-10)<1e-9,true);
assert.equal(Math.abs(nextCenter[1]-47.6)<1e-9,true);
console.log("MapLibre full-app integration: wiring + adapter mock checks passed.");
