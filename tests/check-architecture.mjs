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
assert.doesNotMatch(app,/\bL\s*\./,"Active application must only use map adapter");
assert.match(app,/Pin2MapProjectModel/,"Domain model must be used by app");
assert.match(app,/projectModel\.defaultProject/);
assert.doesNotMatch(app,/\bindexedDB\s*\.|\bindexedDB\.open\s*\(/,"Application must not access IndexedDB directly");
assert.match(app,/Pin2MapIndexedDBProjectStore\.open/);
assert.match(app,/projectStore\.saveProject/);
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
