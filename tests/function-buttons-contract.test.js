"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const contract=()=>read("styles.css").split("/* v264 – functional-button contract:")[1];
test("all current function launchers share a dialog-safe low stacking level",()=>{
 const css=read("styles.css"),html=read("index.html"),rule=contract();
 assert.ok(rule,"binding rule exists");
 for(const id of ["layersButton","favoritesButton","settingsButton","labelsToggle","pinInfoButton","basemapButton","refreshButton"]){
  assert.ok(html.includes('id="'+id+'"'),id+" button exists");
  assert.ok(rule.includes("#"+id),id+" participates in dialog priority");
 }
 assert.match(rule,/#app#app > button:is\(/,"specificity must defeat old !important rules");
 assert.match(rule,/z-index:1090!important/);
 assert.match(css,/#app #layersPanel\.layers-panel:not\(\.hidden\),[\s\S]*?z-index:1600!important/);
 assert.match(css,/#app #basemapMenu\.basemap-menu\{[\s\S]*?z-index:1200/);
});
test("menu toggles and name-labels have consistent permanent blue-white ON visuals",()=>{
 const rule=contract();
 assert.match(rule,/button#labelsToggle\[aria-pressed="true"\]/);
 for(const v of ["--p2m-map-control-bg:#1764bf!important","--p2m-map-control-ink:#fff!important","--p2m-map-control-border:#1764bf!important"])
  assert.ok(rule.includes(v),v);
 assert.ok(read("ui/shell.js").includes('button.setAttribute("aria-pressed",String(enabled))'));
 assert.ok(read("ui/map-favorites-panel.js").includes('setAttribute("aria-expanded","true")'));
 assert.ok(read("ui/basemap-menu.js").includes('setAttribute("aria-expanded","true")'));
});
test("menu exclusivity does not suppress peer buttons",()=>{
 const app=read("app.js"),rule=contract();
 assert.ok(app.includes('if(!ownOpen)closeAllMapMenus()'));
 for(const id of ["favoritesButton","layersButton","settingsButton","basemapButton","pinInfoButton","labelsToggle"])
  assert.ok(app.includes('"#'+id+'"'),id+" has central close coordination");
 assert.ok(!/display\s*:\s*none/.test(rule),"no hiding of other functional buttons");
});
test("future import/export is covered by specification but not falsely exposed as implemented",()=>{
 assert.ok(!read("index.html").includes('id="importExportButton"'));
 assert.ok(read("docs/FUNCTION_BUTTONS_CONTRACT_2026-11-18.md").includes("Import/Export"));
});
