"use strict";
// Architecture gate: future dialog changes must keep ONE implementation of
// interaction semantics, with only type-specific adapters in the four views.
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const core=read("ui/object-dialog-core.js");
const pin=read("ui/pin-editor.js");
const details=read("ui/pin-details.js");
const geometry=read("ui/geometry-editor.js");
const layers=read("ui/pin-layer-picker.js");
const url=read("ui/object-url-popup.js");
const del=read("ui/object-delete-dialog.js");
const pinDelete=read("ui/pin-delete-dialog.js");
const html=read("index.html");
const sw=read("sw.js");
test("all four object dialogs have one shared foundation and one canonical search icon owner",()=>{
 assert.match(core,/class ObjectDialogCore/);
 assert.match(core,/Pin2MapSearchTypeMenu\?\.CHOICES/);
 assert.match(pin,/core\.configureSurface\(/);
 assert.match(pin,/core\.arrangeFooter\(/);
 assert.match(geometry,/this\.core\.configureSurface\(/);
 assert.match(geometry,/this\.core\.createFooter\(/);
 assert.match(geometry,/this\.core\.mountDeleteSymbol\(/);
 assert.match(geometry,/type==="river"/);
 assert.match(geometry,/item\.kind==="lake"/);
 assert.match(read("ui/search-type-menu.js"),/SearchTypeMenu\.CHOICES=CHOICES/);
});
test("layer filter has a single behavior owner, not a second geometry implementation",()=>{
 assert.match(layers,/class ObjectLayerPicker/);
 assert.match(layers,/applyFilter\(\)/);
 assert.match(layers,/Ebenenfilter zurücksetzen/);
 assert.match(layers,/funnel-x/);
 assert.match(geometry,/this\.layerPicker=new Picker\(/);
 assert.match(geometry,/this\.layerPicker\.render\(/);
 assert.doesNotMatch(geometry,/geometry-layer-choice/);
 assert.doesNotMatch(geometry,/applyFilter\(\)/);
 assert.doesNotMatch(geometry,/toLocaleLowerCase\(/);
});
test("URL editing and deletion are shared controllers, not parallel business logic",()=>{
 assert.match(url,/class ObjectUrlPopup/);
 assert.match(url,/setCustomValidity/);
 assert.match(url,/keyboardAnchor/);
 assert.match(details,/new Url\(/);
 assert.match(geometry,/this\.urlController=new Url\(/);
 assert.doesNotMatch(geometry,/new URL\(/);
 assert.match(del,/class ObjectDeleteDialog/);
 assert.match(pinDelete,/extends Base/);
 assert.match(geometry,/this\.deleteController=new Controller\(/);
 assert.doesNotMatch(geometry,/geometry-confirm-remove/);
});
test("single green OK label and four-part footer can be changed in one place",()=>{
 assert.match(core,/const OK_LABEL="OK"/);
 assert.match(core,/static arrangeFooter\(/);
 assert.match(core,/\[move,layer,url,wiki,meteo,ok\]/);
 assert.match(pin,/core\.configureOk\(this\.element\("closePin"\)\)/);
 assert.match(geometry,/this\.core\.configureOk\(ok\)/);
 assert.match(geometry,/this\.core\.makeNotes\(/);
 assert.match(geometry,/this\.core\.bindNoteLaunch\(/);
 assert.match(read("app.js"),/Pin2MapObjectDialogCore\.bindNoteLaunch\(/);
 assert.match(core,/static bindNoteLaunch\(/);
 assert.match(geometry,/Pin2MapPinNoteEditor/);
 assert.ok(html.includes('src="./ui/object-dialog-core.js"'));
 for(const module of ["object-dialog-core","object-url-popup","object-delete-dialog"]){
  assert.ok(sw.includes('"./ui/'+module+'.js"'));
  assert.ok(html.includes('src="./ui/'+module+'.js"'));
 }
});

test("shared picker uses DOM identity and the same rendered hidden-state semantics",()=>{
 const css=read("styles.css");
 assert.match(layers,/trigger\.contains\?\.\(event\.target\)/);
 assert.match(layers,/menu\.contains\?\.\(event\.target\)/);
 assert.doesNotMatch(layers,/event\.target\.closest\?\.\(/);
 assert.match(css,/#geometryLayerMenu \.pin-layer-option\[hidden\]/);
 assert.match(css,/#geometryLayerMenu\.pin-layer-menu\.hidden\{display:none\}/);
 assert.match(css,/#app \.object-editor \.object-editor-notes textarea\.object-editor-notes-input\{\s*background:#fff/);
});
test("Pin and geometry launch the same note editor on mobile focus and explicit expand",()=>{
 assert.match(core,/static bindNoteLaunch\(/);
 assert.match(read("app.js"),/Pin2MapObjectDialogCore\.bindNoteLaunch\(/);
 assert.match(geometry,/this\.core\.bindNoteLaunch\(/);
 assert.match(core,/textarea\.addEventListener\("focus"/);
 const css=read("styles.css");
 assert.match(css,/\.pin-note-editor > textarea\{/);
 assert.match(css,/\.pin-note-editor-actions button:last-child\{/);
});

test("all object dialogs share overlay layout and map anchoring owner",()=>{
 assert.match(core,/static layerMenuLayout\(/);
 assert.match(core,/if\(kind==="layer"\)\{[\s\S]*?this\.layerMenuLayout\(/);
 assert.doesNotMatch(core,/kind==="layer"\?260/);
 assert.doesNotMatch(core,/Math\.max\(45,bottom-upper\)/);
 assert.match(geometry,/Positioner\.clampedObjectAnchor\(/);
 assert.doesNotMatch(geometry,/Math\.max\(8,Math\.min\(idealLeft/);
 assert.match(layers,/Core\.layerMenuLayout\(/);
});
