"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {PinMarkerView,appearance,routeRoles,layout}=require("../ui/pin-marker-view.js");
const {ActiveCarRoute}=require("../domain/active-car-route.js");
const {CarRouteMapView}=require("../ui/car-route-map-view.js");
const fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const pins=["s","w1","w2","t","x"].map((id,i)=>Object.freeze({id,name:id,layerId:"layer",lat:48+i/10,lng:9,note:"note",url:"https://example.org",gpxKey:"track"}));
const options={cleanText:x=>x,colorsByLayer:{layer:"#aabbcc"},defaultColor:"#333333",selectedPinId:"s"};
const plan=()=>{const route=new ActiveCarRoute();route.setEndpoint("start","s");route.setEndpoint("target","t");route.addWaypoint("w1");route.addWaypoint("w2");return route;};
test("Route roles replace the informational sectors only on participating pins, keeping the existing shape and labels",()=>{
 const route=plan(),before=layout(pins,options),during=layout(pins,{...options,routeSnapshot:route.snapshot()});
 assert.deepEqual(during.map(x=>x.pin),pins);
 assert.deepEqual(during.map(x=>x.label),before.map(x=>x.label));
 for(const p of during.slice(0,4)){
  assert.doesNotMatch(p.appearance.html,/pin-status-segments|#aabbcc/);
  assert.match(p.appearance.html,/viewBox="0 0 30 40"/);
  assert.match(p.appearance.html,/stroke="#fff"/);
 }
 assert.match(during[0].appearance.html,/pin-marker selected" data-route-role="start"/);
 assert.match(during[0].appearance.html,/fill="#ed3434"/);
 assert.match(during[0].appearance.html,/data-route-icon="arrow-up-right"/);
 assert.match(during[3].appearance.html,/fill="#289d54"/);
 assert.match(during[3].appearance.html,/data-route-icon="goal"/);
 assert.match(during[1].appearance.html,/fill="#efc63e"/);
 assert.match(during[1].appearance.html,/<text[^>]*fill="#fff"[^>]*>1<\/text>/);
 assert.match(during[2].appearance.html,/<text[^>]*fill="#fff"[^>]*>2<\/text>/);
 assert.deepEqual(during[4],before[4]);
 route.removeWaypoint("w1");
 assert.equal(routeRoles(route.snapshot()).get("w2").number,1);
 assert.deepEqual(layout(pins,{...options,routeSnapshot:route.snapshot()})[1],before[1]);
 route.reset();assert.deepEqual(layout(pins,{...options,routeSnapshot:route.snapshot()}),before);
});
test("Role projection handles partial routes, reversal and a single red/green roundtrip pin",()=>{
 const partial=new ActiveCarRoute();partial.setEndpoint("start","s");
 assert.deepEqual([...routeRoles(partial.snapshot())],[["s",{kind:"start"}]]);
 const route=plan();route.reverse();const roles=routeRoles(route.snapshot());
 assert.deepEqual([roles.get("t"),roles.get("w2"),roles.get("w1"),roles.get("s")],
  [{kind:"start"},{kind:"waypoint",number:1},{kind:"waypoint",number:2},{kind:"target"}]);
 route.setEndpoint("target","t");
 const round=routeRoles(route.snapshot());assert.equal(round.get("t").kind,"roundtrip");assert.equal(round.size,3);
 const html=appearance({pin:pins[3],color:"#aabbcc",routeRole:round.get("t")}).html;
 assert.match(html,/data-route-role="roundtrip"/);
 assert.match(html,/fill="#ed3434"/);assert.match(html,/fill="#289d54"/);
 assert.match(html,/data-route-icon="flag"/);assert.doesNotMatch(html,/pin-status-segments/);
});
test("Pin view retains one marker per visible pin and same click identity across route changes",()=>{
 const route=plan(),created=[],removed=[],clicks=[],selected=[],looks=new Map();
 let active=null;
 const adapter={createMarker:()=>{const h={};created.push(h);return h;},
  onMarker:(h,event,fn)=>clicks.push(fn),setMarkerPosition:()=>{},setMarkerAppearance:(h,look)=>looks.set(h,look),
  setMarkerLabel:()=>{},removeOverlay:h=>removed.push(h)};
 const view=new PinMarkerView({mapAdapter:adapter,onSelect:id=>selected.push(id),attachGesture:()=>{},cleanText:x=>x,
  defaultColor:"#333333",getRouteSnapshot:()=>active});
 const args={pins,layers:[{id:"layer",color:"#aabbcc"}]};
 view.render(args);const original=looks.get(created[0]);
 active=route.snapshot();view.render(args);assert.equal(created.length,pins.length);
 assert.equal(removed.length,0);assert.match(looks.get(created[0]).html,/data-route-role="start"/);
 clicks[0]();assert.deepEqual(selected,["s"]);
 active=null;view.render(args);assert.deepEqual(looks.get(created[0]),original);
 assert.equal(created.length,pins.length);assert.equal(removed.length,0);
});
test("Route line view has no role-marker layer; independent guides remain supported",()=>{
 const calls=[],mapPort={removeOverlay:h=>calls.push(["remove",h]),createLine:()=>({}),onRouteLine:()=>{},
  showRouteGuides:(guides)=>calls.push(["guides",guides])};
 const view=new CarRouteMapView({mapPort,onLineClick:()=>{}});
 view.render({...plan().snapshot(),legs:[]});view.clear();
 view.guides([{id:"g",lat:48,lng:9}]);
 assert.deepEqual(calls,[["guides",[{id:"g",lat:48,lng:9}]]]);
 for(const file of ["ui/car-route-map-view.js","map-adapter-leaflet.js","styles.css"])
  assert.doesNotMatch(read(file),/showRouteRoles|p2m-route-role-holder/);
});
