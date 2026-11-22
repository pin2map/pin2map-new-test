import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=name=>readFileSync(path.join(root,name),"utf8");
const modelFiles=[];
function scan(dir){
 for(const entry of readdirSync(path.join(root,dir),{withFileTypes:true})){
  const rel=path.posix.join(dir,entry.name);
  if(entry.isDirectory())scan(rel);
  else if(entry.isFile()&&rel.endsWith(".js"))modelFiles.push(rel);
 }
}
scan("domain");
assert.ok(modelFiles.length>0,"Expected independent domain modules");
for(const filename of modelFiles){
 const code=source(filename);
 // Explicit exclusion of dependency on UI, browser, network and mapping.
 for(const [term,re] of Object.entries({
  "Leaflet":/\b(?:L|Leaflet)\s*\./,
  "MapLibre":/\b(?:maplibregl|mapboxgl)\s*\./,
  "DOM":/\b(?:document|HTMLElement|Element|customElements)\b/,
  "Persistence":/\b(?:indexedDB|localStorage|sessionStorage|caches)\b/,
  "Networking":/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/,
  "UI dependencies":/\b(?:from\s*["'][^"']*(?:\/ui\/|\/adapters\/|\/app\.js)|require\s*\([^)]*(?:ui\/|adapters\/))/
 })){
  const executable=code.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,"");
  assert.doesNotMatch(executable,re,filename+": forbidden "+term);
 }
}
scan("application");
for(const filename of modelFiles.filter(name=>name.startsWith("application/"))){
 const executable=source(filename).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,"");
 assert.doesNotMatch(executable,/\b(?:indexedDB|localStorage|sessionStorage|document|maplibregl|Leaflet)\b|\bL\s*\./,
  filename+": application use cases must not know DOM, database or map engine");
}
scan("ui");
for(const filename of modelFiles.filter(name=>name.startsWith("ui/"))){
 const code=source(filename).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,"");
 assert.doesNotMatch(code,/\b(?:indexedDB|localStorage|sessionStorage|maplibregl|Leaflet)\b|\bL\s*\./,
   filename+": UI must not know database or map engine");
}
const app=source("app.js");
assert.match(app,/new window\.Pin2MapTemporaryObjectMoveController/);
assert.doesNotMatch(app,/\b(?:temporaryMoveEntry|beginTemporaryMove|previewTemporaryMove|cancelTemporaryMove|confirmTemporaryMove)\b/,
  "No removed temporary-move function or state may be referenced by app.js");
assert.match(app,/function clearObjectPreview\(\)\{\s*temporaryMove\.cancel\(\)/,
  "Closing a transient object must cancel via the new state owner");
const temporaryMove=source("ui/temporary-object-move-controller.js");
assert.match(temporaryMove,/this.validatePosition\(point.lat,point.lng\)/);
assert.match(temporaryMove,/this.cancel\(\);\s*entry.point=position/);

assert.match(app,/Pin2MapObjectCreationService/);
assert.match(app,/Pin2MapObjectAcceptanceController/);
assert.doesNotMatch(app,/created=pinOps\.createPin\(state|created=projectFeatures\.create(?:Area|River)\(state/,
  "Object creation belongs to the application use case, not app.js");
assert.doesNotMatch(app,/function showObjectPreview\(entry\)\{/,
  "Object acceptance state/side effects belong to UI controller");

assert.match(app,/Pin2MapGeometrySearchController/);
assert.doesNotMatch(app,/\b(?:featureRun|featureController|areaHierarchyPoint|areaHierarchyCountry)\b/,
  "External geometry request ownership must never live in app.js");
for(const fn of ["findGeometry","chooseGeometryResult","findAreaAt","choosePlateResult"]){
 assert.doesNotMatch(app,new RegExp("(?:(?:async )?function) "+fn+"\\s*\\("),
   "Async geometry workflows must remain in their controller: "+fn);
}

assert.match(app,/Pin2MapObjectSearchController/);
for(const functionName of ["resetObjectSearch","refreshObjectSearch","fitObjectSearchMatches","runObjectSearch","endObjectSearch"]){
 assert.doesNotMatch(app,new RegExp("function "+functionName+"\\s*\\("),
   "Persisted-object search logic must remain in its UI owner: "+functionName);
}

for(const name of ["transferPending","transferBusy","chooseTransferFile","applyTransfer","downloadTransfer","openTransferDialog","closeTransferDialog","bindTransfer"]){
 assert.doesNotMatch(app,new RegExp("\\b"+name+"\\b"),"Project transfer responsibility must not return to app.js: "+name);
}
assert.match(app,/Pin2MapProjectTransferSession/);
assert.match(app,/Pin2MapProjectTransferController/);
assert.doesNotMatch(app,/function (?:hideAttachedRoute|toggleAttachedRoute|exportAttachedRoute)\s*\(/,
  "GPX attachment display/export must remain outside the composition root");
assert.match(app,/Pin2MapPinGpxActions/);
assert.match(app,/Pin2MapGpxAttachmentExport/);
assert.doesNotMatch(app,/\bL\s*\./,"Active application must only use map adapter");
assert.match(app,/Pin2MapProjectModel/,"Domain model must be used by app");
assert.match(app,/projectModel\.defaultProject/);
assert.doesNotMatch(app,/\bindexedDB\s*\.|\bindexedDB\.open\s*\(/,"Application must not access IndexedDB directly");
assert.match(app,/Pin2MapIndexedDBProjectStore\.open/);
assert.match(app,/new window\.Pin2MapProjectPersistence/);
const persistence=source("application/project-persistence.js");
assert.match(persistence,/store\.saveProject\(this\.getProject\(\)\)/,
  "Project persistence use case must call the injected repository port");
assert.doesNotMatch(app,/projectStore\.saveProject/,
  "Project write orchestration belongs to the application use case");
assert.match(app,/Pin2MapSearchResultsView/,"App must use independent search presentation");
assert.match(app,/Pin2MapUIState/,"App must use isolated UI state");
assert.match(app,/Pin2MapPinEditorView/,"App must use pin editor view");
assert.match(app,/Pin2MapPinOperations/,"App must use independent pin use cases");
assert.match(app,/Pin2MapPinFilter/,"App must use composed pin visibility");
assert.match(app,/Pin2MapFilterOperations/,"App must use filter operations");
assert.match(app,/Pin2MapLayerOperations/,"App must use layer use cases");
assert.match(app,/Pin2MapLayerView/,"App must use layer presentation");
assert.match(app,/pinEditorView\.render/,"Pin editor must render through its view");
const html=source("index.html");
const domain=html.indexOf('src="./domain/project-model.js"');
const pinFilter=html.indexOf('src="./domain/pin-filter.js"');
const pinOperations=html.indexOf('src="./application/pin-operations.js"');
const filterOperations=html.indexOf('src="./application/filter-operations.js"');
const layerOperations=html.indexOf('src="./application/layer-operations.js"');
const layerView=html.indexOf('src="./ui/layer-view.js"');
const storage=html.indexOf('src="./adapters/storage/indexeddb-project-store.js"');
const ui=html.indexOf('src="./ui/shell.js"');
const searchView=html.indexOf('src="./ui/search-results.js"');
const uiState=html.indexOf('src="./ui/ui-state.js"');
const pinEditor=html.indexOf('src="./ui/pin-editor.js"');
const adapter=html.indexOf('src="./map-adapter-leaflet.js"');
const application=html.indexOf('src="./app.js"');
assert.ok(domain>=0&&pinFilter>domain&&pinOperations>pinFilter&&filterOperations>pinOperations&&layerOperations>filterOperations&&layerView>layerOperations&&storage>layerView&&ui>storage&&searchView>ui&&uiState>searchView&&pinEditor>uiState&&adapter>pinEditor&&application>adapter,
  "Domain → repository → UI modules → map adapter → app load order required");
console.log("Architectural gates passed:",modelFiles.join(", "),"; Leaflet app uses adapter");

assert.match(app,/overlayCoordinator\.bindMapLaunchers\(\)/,
  "Map launcher capture must be wired via its UI coordinator");
assert.doesNotMatch(app,/mapLauncherSelector|document\.addEventListener\("click",event=>\{\s*const button=event\.target\?\.closest\?/,
  "Launcher classification and capture must not regress into the composition root");
const overlay=source("ui/map-overlay-coordinator.js");
assert.match(overlay,/bindMapLaunchers\(\)/);

const favoriteController=source("ui/map-favorites-controller.js");
assert.match(app,/new window\.Pin2MapMapFavoritesController/);
assert.match(app,/favoritesPanel=favoritesController\.bind\(\)/);
assert.doesNotMatch(app,/function (?:currentFavorites|suggestFavoriteName|addMapFavorite|replaceMapFavorite|renameMapFavorite|removeMapFavorite|removeAllMapFavorites|openMapFavorite)\s*\(/,
  "Map-favorites UI orchestration must stay outside composition root");
assert.match(favoriteController,/this\.favorites\.apply\(project,index\)/);
assert.match(favoriteController,/this\.onFlushHistory\(\);[\s\S]*?this\.mapPort\.setView\(viewport,\{animate:false\}\);[\s\S]*?this\.onPersistViewport\(\)/);
assert.ok(source("index.html").includes('src="./ui/map-favorites-controller.js"'));
assert.ok(source("sw.js").includes('"./ui/map-favorites-controller.js"'));

const presentation=source("ui/project-object-presentation.js");
assert.match(app,/new window\.Pin2MapProjectObjectPresentation/);
assert.match(app,/function renderGeometry\(\)\{objectPresentation\.renderGeometry\(\);\}/);
assert.match(app,/function renderMarkers\(\)\{objectPresentation\.renderMarkers\(\);\}/);
assert.doesNotMatch(app,/function renderMarkers\(\)\{\s*const regular=pinFilter\.visiblePins\(/,
  "Visible-object selection belongs to the new presentation owner");
assert.match(presentation,/this\.mapPort\.renderProjectGeometry\(/);
assert.match(presentation,/this\.pinInfoService\.setVisiblePins\(/);
assert.ok(source("index.html").includes('src="./ui/project-object-presentation.js"'));
assert.ok(source("sw.js").includes('"./ui/project-object-presentation.js"'));

const settingsTabsController=source("ui/settings-tabs-controller.js");
assert.match(app,/new window\.Pin2MapSettingsTabsController/);
assert.match(app,/settingsTabs\.bind\(\)/);
assert.doesNotMatch(app,/async function updateSettingsStorage\(\)/);
assert.doesNotMatch(app,/const selectSettingsTab=key=>/);
assert.match(settingsTabsController,/this\.select\("General"\)/);
assert.match(settingsTabsController,/this\.getElement\("settings"\+tab\+"Tab"\)/);
assert.ok(source("index.html").includes('src="./ui/settings-tabs-controller.js"'));
assert.ok(source("sw.js").includes('"./ui/settings-tabs-controller.js"'));

const mapViewControls=source("ui/map-view-controls.js");
assert.match(app,/new window\.Pin2MapMapViewControls/);
assert.match(app,/mapViewControls\.bindMapButtons\(\)/);
assert.match(app,/mapViewControls\.bindSettingsAndLayerActions\(\)/);
assert.doesNotMatch(app,/function (?:applyHitboxDisplay|readHitboxDisplay|writeHitboxDisplay)\(/);
assert.match(mapViewControls,/this\.getElement\("showPinHitboxes"\)\.checked=visible/);
assert.match(mapViewControls,/this\.setGeocodeEnabled\(event\.target\.checked\);this\.onSave\(\)/);
assert.match(mapViewControls,/this\.overlayCoordinator\.closeAll\(\);this\.layerView\.show\(\)/);
assert.ok(source("index.html").includes('src="./ui/map-view-controls.js"'));
assert.ok(source("sw.js").includes('"./ui/map-view-controls.js"'));

const mapInteraction=source("ui/map-interaction-controller.js");
assert.match(app,/new window\.Pin2MapMapInteractionController/);
assert.match(app,/mapInteraction\.bindPinMoveButtons\(\)/);
assert.match(app,/mapInteraction\.bindMapClick\(\)/);
assert.match(app,/mapInteraction\.bindLongPress\(\)/);
assert.match(mapInteraction,/this\.onMapClick\(position=>/);
assert.match(mapInteraction,/if\(this\.isSatellitePicking\(\)\)\{this\.onSatellitePick\(position\);return;\}/);
assert.match(mapInteraction,/this\.onRegularMapClick\(position\)/);
assert.match(app,/allowNonSurface:\(\)=>uiState\.moveMode\|\|temporaryMove\.isActive\(\)\|\|satelliteInspector\.isActive\(\)/);
assert.ok(source("index.html").includes('src="./ui/map-interaction-controller.js"'));
assert.ok(source("sw.js").includes('"./ui/map-interaction-controller.js"'));

const viewHistoryController=source("ui/map-view-history-controller.js");
assert.match(app,/new window\.Pin2MapMapViewHistoryController/);
assert.match(app,/await mapHistoryController\.initialize\(\)/);
assert.match(app,/function flushHistoryRecord\(\)\{mapHistoryController\.flush\(\);\}/);
assert.match(viewHistoryController,/this\.history\.load\(saved,this\.mapPort\.getViewport\(\)\)/);
assert.match(viewHistoryController,/this\.recordTimer=this\.setTimer\(\(\)=>this\.flush\(\),320\)/);
assert.match(viewHistoryController,/this\.onBeforeNavigate\(\);[\s\S]*this\.mapPort\.setView\(view,\{animate:false\}\)/);
assert.ok(source("index.html").includes('src="./ui/map-view-history-controller.js"'));
assert.ok(source("sw.js").includes('"./ui/map-view-history-controller.js"'));

const recentObjectFlash=source("ui/recent-object-flash.js");
assert.match(app,/new window\.Pin2MapRecentObjectFlash/);
assert.match(app,/const activeFlashIds=\(\)=>recentObjectFlash\.activeIds\(\)/);
assert.match(app,/function flashNewObject\(type,id\)\{recentObjectFlash\.flash\(type,id\);\}/);
assert.doesNotMatch(app,/const recentlyCreated=new Map\(\)/);
assert.match(recentObjectFlash,/if\(this\.entries\.get\(key\)!==deadline\)return/);
assert.ok(source("index.html").includes('src="./ui/recent-object-flash.js"'));
assert.ok(source("sw.js").includes('"./ui/recent-object-flash.js"'));
