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
const html=source("index.html");
const domain=html.indexOf('src="./domain/project-model.js"');
const storage=html.indexOf('src="./adapters/storage/indexeddb-project-store.js"');
const ui=html.indexOf('src="./ui/shell.js"');
const adapter=html.indexOf('src="./map-adapter-leaflet.js"');
const application=html.indexOf('src="./app.js"');
assert.ok(domain>=0&&storage>domain&&ui>storage&&adapter>ui&&application>adapter,
  "Domain → repository → UI shell → map adapter → app load order required");
console.log("Architectural gates passed:",modelFiles.join(", "),"; Leaflet app uses adapter");
