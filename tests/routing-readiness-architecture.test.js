"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const app=read("app.js");
const html=read("index.html"),sw=read("sw.js");

test("composition root owns only the bootstrap event listener",()=>{
 const registrations=[...app.matchAll(/\.addEventListener\s*\(/g)];
 assert.equal(registrations.length,1,
  "New listeners belong in UI controllers; app.js may only bootstrap the application");
 assert.match(app,/document\.addEventListener\("DOMContentLoaded",init\)/);
 for(const file of ["ui/app-lifecycle-controller.js","ui/search-type-menu.js",
    "ui/map-interaction-controller.js","ui/pin-selection-controller.js"]){
  assert.ok(html.includes('src="./'+file+'"'),file+" must load in the app");
  assert.ok(sw.includes('"./'+file+'"'),file+" must load offline");
 }
});

test("geometry and layer mutations remain application-owned; selection and pin entry are isolated",()=>{
 const owners=[
  ["application/pin-entry-coordinator.js","Pin2MapPinEntryCoordinator"],
  ["application/layer-deletion-session.js","Pin2MapLayerDeletionSession"],
  ["application/geometry-mutation-session.js","Pin2MapGeometryMutationSession"],
  ["ui/pin-selection-controller.js","Pin2MapPinSelectionController"],
  ["ui/app-lifecycle-controller.js","Pin2MapAppLifecycleController"]
 ];
 for(const [file,publicName] of owners){
  assert.ok(app.includes("new window."+publicName),publicName+" must be injected in composition");
  assert.ok(html.indexOf('src="./'+file+'"')<html.indexOf('src="./app.js"'));
  assert.ok(sw.includes('"./'+file+'"'),"Offline shell must contain "+file);
 }
 assert.doesNotMatch(app,/projectFeatures\.(?:change|remove)\(state,type,id/,
  "Geometry writes are not composition root logic");
 assert.doesNotMatch(app,/layerOps\.deleteLayerOrPins\(state,id,PRIVATE_ID\)/,
  "Layer removal is not composition root logic");
 assert.doesNotMatch(app,/function addPin\(lat,lng,name,source="search"\)\{\s*if\(!Number\.isFinite/,
  "Pin request validation is an application use case");
});

test("map-click priorities retain isolated owners for satellite, relocation, longpress and pin overlap",()=>{
 const clicks=read("ui/map-interaction-controller.js");
 const coordinator=read("application/map-click-coordinator.js");
 const selection=read("ui/pin-selection-controller.js");
 assert.ok(clicks.indexOf("this.onSatellitePick(position)")<
  clicks.indexOf("this.onRegularMapClick(position)"),
  "Satellite inspection takes priority before ordinary map click");
 assert.ok(coordinator.indexOf("if(this.isMoveMode())")<
  coordinator.indexOf("if(this.isSuppressed())"),
  "Move target takes precedence over ghost-click suppression");
 assert.ok(selection.indexOf('ids?.has("pins:"+id)')<
  selection.indexOf('this.getFeatureOverlap()?.handleTap("pin",id)'),
  "Filtered pin hits precede generic geometry overlap");
 assert.match(app,/new window\.Pin2MapMapClickCoordinator/);
 assert.match(app,/new window\.Pin2MapMapInteractionController/);
});

test("routing coordination stays provider-neutral and is intentionally inactive until separately specified",()=>{
 const coordinator=read("application/routing-service.js");
 assert.ok(!html.includes('src="./application/routing-service.js"'),
  "A reserved routing seam is not an active feature");
 assert.doesNotMatch(app,/Pin2MapRouting|calculateTransitRoute|calculateRoute/,
  "Do not embed active routing or provider calculations in app.js");
 for(const mode of ['CAR:"car"','PEDESTRIAN:"pedestrian"',
                    'BICYCLE:"bicycle"','TRANSIT:"transit"'])
  assert.ok(coordinator.includes(mode),mode);
 assert.match(coordinator,/return provider\.calculate\(request\)/);
 assert.doesNotMatch(coordinator,/\b(?:fetch|XMLHttpRequest|indexedDB|localStorage|document|Leaflet)\s*(?:\(|\.)/,
  "Routing coordinator must not know provider transport, DB, DOM or renderer");
});
