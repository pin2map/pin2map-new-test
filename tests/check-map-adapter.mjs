import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../map-adapter-leaflet.js',import.meta.url),'utf8');
const markerEvents={};
const marker={options:{},setLatLng:p=>calls.push(['markerPos',p]),getLatLng:()=>({lat:5,lng:6}),setIcon:icon=>calls.push(['markerIcon',icon]),getElement:()=>({id:'pin'}),on:(name,cb)=>{markerEvents[name]=cb;},off:(name)=>calls.push(['markerOff',name]),setZIndexOffset:value=>calls.push(['zIndex',value])};
const L={marker:()=>marker,divIcon:options=>options,polyline:()=>({setLatLngs:p=>calls.push(['linePos',p])}),DomEvent:{disableClickPropagation:()=>calls.push(['stopClick']),on:()=>calls.push(['stopDown']),stopPropagation:()=>{}}};
const scope={window:{L}};
runInNewContext(source,scope);
const Adapter=scope.window.Pin2MapLeafletAdapter;
assert.equal(typeof Adapter,'function');
const calls=[];
const events={};
const center={lat:48.8,lng:9.2};
const map={
  dragging:{enabled:()=>true,disable:()=>calls.push(['panDisabled']),enable:()=>calls.push(['panEnabled'])},
  hasLayer:()=>true,removeLayer:()=>calls.push(['removeLayer']),setZoomAround:()=>calls.push(['zoomAround']),
  getCenter:()=>center,getZoom:()=>12,
  getContainer:()=>({id:'map'}),getSize:()=>({x:400,y:300}),
  latLngToContainerPoint:p=>({x:p.lat*2,y:p.lng*3}),
  containerPointToLatLng:p=>({lat:p.x/2,lng:p.y/3}),
  panBy:(p,options)=>calls.push(['panBy',p,options]),
  setView:(p,z,options)=>calls.push(['setView',p,z,options]),
  fitBounds:(pairs,options)=>calls.push(['fitBounds',pairs,options]),
  zoomIn:()=>calls.push(['zoomIn']),zoomOut:()=>calls.push(['zoomOut']),
  invalidateSize:()=>calls.push(['invalidateSize']),
  on:(name,cb)=>{events[name]=cb;},off:(name,cb)=>calls.push(['off',name,cb]),
  remove:()=>calls.push(['destroy'])
};
const adapter=new Adapter(map);
assert.deepEqual(JSON.parse(JSON.stringify(adapter.getViewport())),{center,zoom:12});
assert.deepEqual(JSON.parse(JSON.stringify(adapter.project({lat:2,lng:3}))),{x:4,y:9});
assert.deepEqual(JSON.parse(JSON.stringify(adapter.unproject({x:4,y:9}))),{lat:2,lng:3});
adapter.panBy({x:4,y:-5},{animate:false});
assert.equal(calls.at(-1)[0],'panBy');
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1)[1])),[4,-5]);
adapter.setView({center:{lat:48,lng:9},zoom:10},{animate:false});
assert.equal(calls.at(-1)[0],'setView');
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1)[1])),[48,9]);
assert.equal(calls.at(-1)[2],10);
let seen=0;
const off=adapter.on('move',()=>seen++);
events.move();assert.equal(seen,1);
off();assert.equal(calls.at(-1)[0],'off');
const pin=adapter.createMarker({lat:2,lng:3},{draggable:false});
assert.equal(pin,marker);
adapter.setMarkerPosition(pin,{lat:4,lng:5});
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1)[1])),[4,5]);
assert.deepEqual(JSON.parse(JSON.stringify(adapter.getMarkerPosition(pin))),{lat:5,lng:6});
adapter.setMarkerAppearance(pin,{html:'<div></div>',title:'Test'});
assert.equal(pin.options.title,'Test');
assert.equal(calls.at(-1)[0],'markerIcon');
assert.equal(adapter.getMarkerElement(pin).id,'pin');
let draggingPosition;
const offMarker=adapter.onMarker(pin,'drag',p=>draggingPosition=p);
markerEvents.drag({target:pin});
assert.deepEqual(JSON.parse(JSON.stringify(draggingPosition)),{lat:5,lng:6});
offMarker();assert.equal(calls.at(-1)[0],'markerOff');
const line=adapter.createLine([[2,3],{lat:4,lng:5}]);
adapter.setLinePositions(line,[[6,7]]);
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1)[1])),[[6,7]]);
adapter.zoomAround({lat:2,lng:3},14);
assert.equal(calls.at(-1)[0],'zoomAround');
adapter.setPanEnabled(false);assert.equal(calls.at(-1)[0],'panDisabled');
adapter.setPanEnabled(true);assert.equal(calls.at(-1)[0],'panEnabled');
adapter.stopMarkerEventPropagation({});
assert.equal(calls.at(-1)[0],'stopDown');
assert.equal(adapter.hasOverlay(pin),true);
adapter.removeOverlay(pin);assert.equal(calls.at(-1)[0],'removeLayer');
adapter.zoomIn();adapter.zoomOut();adapter.invalidateSize();adapter.destroy();
assert.deepEqual(calls.slice(-4).map(x=>x[0]),['zoomIn','zoomOut','invalidateSize','destroy']);
console.log('Leaflet adapter contract checks passed.');
