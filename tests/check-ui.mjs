// Regression checks for the modularized UI, without relying on obsolete app.js internals.
// Run: node tests/check-ui.mjs
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const app=read("app.js");
const html=read("index.html");
const css=read("styles.css");
const sw=read("sw.js");
const move=read("ui/pin-move-preview.js");
const gestures=read("ui/map-gesture-controller.js");
const positioner=read("ui/pin-panel-positioner.js");
const editor=read("ui/pin-editor.js");
const controller=read("application/pin-move-controller.js");
const map=read("map-adapter-leaflet.js");

const {barPlacement}=require("../ui/pin-move-preview.js");
const {anchorGeometry,openingCorrection}=require("../ui/pin-panel-positioner.js");

function check(ok,description){
  assert.ok(ok,description);
  console.log("OK",description);
}

// Each feature is owned by its module, not copied back into app.js.
check((css.match(/\.move-bar\s*\{/g)||[]).length===1,
  "one move confirmation container declaration");
check((css.match(/\.move-bar span\s*\{/g)||[]).length===1,
  "one move confirmation label declaration");
check(css.includes("#confirmMove{background:#16883e}") &&
  css.includes("#cancelMove{background:#d42b32}"),
  "green confirm and red cancel controls");
check(html.includes('<span id="moveText">Neue Position</span>') &&
  html.includes('id="confirmMove"') && html.includes('id="cancelMove"'),
  "short preview label and explicit confirmation/cancellation");
check(move.includes("class PinMovePreview") &&
  move.includes("this.map.createMarker(") && move.includes("this.map.createLine("),
  "temporary marker and line owned by preview module");
check(move.includes('this.map.onMarker(this.marker,"drag"') &&
  move.includes("this.positionBar()"),
  "dragging preview updates its position through map adapter");
check(controller.includes("class PinMoveController") &&
  controller.includes("this.pinOperations.movePin(") &&
  controller.includes("this.preview.clear()"),
  "only confirmation workflow writes new pin coordinates");
check(app.includes("moveController.previewAt(position)") &&
  app.includes("moveController.confirm()") &&
  app.includes("moveController.cancel()"),
  "map and buttons delegate the move workflow");
const overlayLayout=read("ui/map-overlay-layout.js");
check(app.includes("mapOverlayLayout.bind()") &&
  overlayLayout.includes('this.map.on("move",this.onMove)') &&
  overlayLayout.includes("this.preview.positionBar()"),
  "confirmation bar tracks map changes");
check(!app.includes("Neue Stelle antippen") &&
  !app.includes("Alte und neue Position prüfen"),
  "obsolete move instructions stay removed");

// Test the actual pure geometry contracts instead of matching old source text.
const visible=barPlacement({
  point:{x:150,y:120},
  mapRect:{left:0,top:0},
  appRect:{left:0,top:0},
  width:120,height:40,
  viewport:{offsetLeft:0,offsetTop:0,width:320,height:360}
});
check(visible.left===90 && visible.top===150,
  "preview bar appears beneath a pin when there is room");
const nearBottom=barPlacement({
  point:{x:150,y:320},
  mapRect:{left:0,top:0},
  appRect:{left:0,top:0},
  width:120,height:40,
  viewport:{offsetLeft:0,offsetTop:0,width:320,height:360}
});
check(nearBottom.top===250,
  "preview bar moves above pin near bottom edge");
const anchored=anchorGeometry({
  point:{x:200,y:250},
  mapRect:{left:0,top:0},
  appRect:{left:0,top:0,width:400,height:500},
  panelHeight:140
});
check(anchored.panel.left===8 && anchored.panel.top===24 &&
  anchored.tip.left===200 && anchored.tip.top===164,
  "pin editor preserves the larger-marker 86px pointer clearance");
const correction=openingCorrection({
  appRect:{left:0,top:0,right:400,bottom:500},
  panelRect:{left:-10,top:25,right:300,bottom:170},
  tipRect:{left:150,right:170,top:160,bottom:175}
});
check(correction.needsPan && correction.dx===22,
  "edge correction pans map rather than changing stored pin");

// Structural interface checks for modular UI wiring.
check(positioner.includes("class PinPanelPositioner") &&
  positioner.includes("this.map.panBy(") &&
  app.includes("requestAnimationFrame(keepSelectedAbovePanel)"),
  "selected pin gets one-time opening correction");
check(editor.includes('this.document.body.classList.toggle("pin-open",shown)') &&
  css.includes("body.pin-open .topbar") &&
  css.includes("body.pin-open .layers-bottom-button"),
  "focused pin editing hides map controls");
check(css.includes(".leaflet-control:not(.leaflet-control-attribution)"),
  "attribution stays visible");
check(gestures.includes("attachMarkerLongPress") &&
  gestures.includes("attachLongPress"),
  "touch, mouse and marker gestures live in dedicated controller");
const mapClick=read("application/map-click-coordinator.js");
check(map.includes("onMapClick(callback)") &&
  app.includes("mapAdapter.onMapClick(position=>{") &&
  app.includes("if(satelliteInspector.isActive()){satelliteInspector.pick(position);return;}") &&
  app.includes("pinInfoMenu.close();mapClickCoordinator.handle(position);") &&
  mapClick.includes("handle(position)") && mapClick.includes("this.previewMove(position)"),
  "map events pass neutral coordinates through application coordinator");
check(!/\bL\.(?:marker|polyline|divIcon)\(/.test(app),
  "application never creates raw Leaflet overlays");
check(app.includes("mapAdapter.setBasemap(state.basemap,{") &&
  app.includes("esriRelief:!!state.esriRelief") &&
  app.includes("satelliteBrightness:state.satelliteBrightness") &&
  map.includes("setSatelliteAppearance(") &&
  app.includes("mapAdapter.addZoomControls({onFitAll:fitAllPins})"),
  "map selection and zoom controls use Leaflet adapter");
check(html.includes('id="refreshButton"') &&
  app.includes('updateViaCache:"none"'),
  "refresh control and worker no-cache configuration remain");

// Version-independent offline contract: never hardcode an old app-shell version.
check(/const CACHE='pin2map-new-v\d+'/.test(sw),
  "versioned offline shell is present");
check(sw.includes("pin2map-viewed-osm-tiles-v1") &&
  sw.includes("pin2map-viewed-osm-tile-metadata-v1"),
  "tile and tile metadata caches are distinct");
check(sw.includes("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js") &&
  sw.includes("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"),
  "Leaflet runtime is precached");
check(sw.includes("function tileFreshUntil(") &&
  sw.includes("if(entry?.fresh)return entry.response") &&
  sw.includes("return entry?.response || Response.error()"),
  "viewed tiles are fresh-first and still available offline");
check(!sw.includes("prefetchTiles("),
  "tile prefetch and bulk downloads remain disabled");
check(sw.includes("event.data?.type==='GET_VERSION'") &&
  sw.includes("event.data?.type==='SKIP_WAITING'"),
  "worker still supports explicit refresh protocol");
check(html.includes('src="./ui/pin-move-preview.js"') &&
  html.includes('src="./ui/pin-panel-positioner.js"'),
  "both UI overlays load before main app");
console.log("Modular UI static and geometry checks passed.");
