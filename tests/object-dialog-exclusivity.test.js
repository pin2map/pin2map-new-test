"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");

test("opening either object editor always closes competing object dialogs first",()=>{
 const app=read("app.js");
 assert.match(app,/function openGeometryEditor\(type,item,position\)\{[\s\S]*?closeAllMapMenus\(\);[\s\S]*?geometryEditor\.show\(/);
 assert.match(app,/function selectPin\(id\)\{\s*closeAllMapMenus\(\);[\s\S]*?pinSession\.select\(id\)/);
 // v295: closing competing editors must NOT terminate the active object search.
 const areaOpen=app.split("function openGeometryEditor(type,item,position){")[1].split("function saveGeometry(")[0];
 const pinOpen=app.split("function selectPin(id){")[1].split("function handleMarkerTap(")[0];
 for(const code of [areaOpen,pinOpen]){
  assert.doesNotMatch(code,/endObjectSearch|resetObjectSearch|exitSearchMode/);
  assert.match(code,/closeAllMapMenus\(\)/);
 }
 assert.match(app,/function closeAllMapMenus\(\)\{[\s\S]*?geometryEditor\?\.close\(false\)/);
 assert.match(app,/function closeAllMapMenus\(\)\{[\s\S]*?uiState\.clearSelection\(\);renderMarkers\(\);renderPinPanel\(\)/);
});
test("properties tabs maintain version and storage estimates without modifying project data",()=>{
 const html=read("index.html"),app=read("app.js");
 for(const id of ["General","Interface","Services","Colors"]){
  assert.ok(html.includes('id="settings'+id+'Tab"'));
  assert.ok(html.includes('id="settings'+id+'Content"'));
 }
 assert.match(html,/id="settingsStorageUsage"/);
 assert.match(html,/id="settingsProductVersion"/);
 assert.match(html,/id="settingsInterfaceContent"[\s\S]*?id="showPinHitboxes"/);
 assert.match(html,/id="settingsServicesContent"[\s\S]*?id="allowGeocode"/);
 assert.match(app,/navigator\.storage\?\.estimate/);
 assert.match(app,/usageDetails\?\.caches/);
});
