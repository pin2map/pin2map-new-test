import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../map-adapter-leaflet.js',import.meta.url),'utf8');
const scope={window:{}};
runInNewContext(source,scope);
const Adapter=scope.window.Pin2MapLeafletAdapter;
assert.equal(typeof Adapter,'function');
const calls=[];
const events={};
const center={lat:48.8,lng:9.2};
const map={
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
adapter.zoomIn();adapter.zoomOut();adapter.invalidateSize();adapter.destroy();
assert.deepEqual(calls.slice(-4).map(x=>x[0]),['zoomIn','zoomOut','invalidateSize','destroy']);
console.log('Leaflet adapter contract checks passed.');
