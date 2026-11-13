"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const marker=require("../ui/pin-marker-view.js");
const NoteEditor=require("../ui/pin-note-editor.js");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
test("compact 30x40 pin retains three status sectors and a yellow 52x56 test hitbox",()=>{
 const pin={id:"p",name:"Test",note:"Eine Notiz",url:"obsidian://note/a",gpxKey:"track"};
 const look=marker.appearance({pin,color:"#2474b7",selected:true});
 assert.match(look.html,/pin-marker selected/);
 assert.match(look.html,/viewBox="0 0 30 40"/);
 for(const type of ["note","url","gpx"])assert.ok(look.html.includes("pin-sector-"+type));
 assert.match(look.html,/stroke="#fff"/);
 assert.match(look.html,/fill="#d94f55"/);
 assert.match(look.html,/fill="#2979d1"/);
 assert.match(look.html,/fill="#8f989f"/);
 assert.ok(!look.html.includes("pin-status-column"));
 const css=read("styles.css");
 assert.match(css,/\.pin-marker\{[^}]*width:30px;height:40px/);
 assert.match(read("map-adapter-leaflet.js"),/iconSize:\[52,56\],iconAnchor:\[26,39\]/);
 assert.match(css,/#map \.leaflet-marker-icon\.pin-icon\{[^}]*background:rgba\(255,224,0,\.55\)/);
 assert.match(read("map-adapter-leaflet.js"),/iconAnchor:\[0,47\]/);
});
test("all 8 note URL GPX combinations map to independent sector colors",()=>{
 const fills={note:"#d94f55",url:"#2979d1",gpx:"#8f989f"};
 for(let mask=0;mask<8;mask++){
  const pin={id:"p",note:mask&1?"Notiz":"",url:mask&2?"mailto:a@example.org":"",
   gpxKey:mask&4?"track":null};
  const flags=marker.statusFlags(pin);
  assert.deepEqual(flags,{note:!!(mask&1),url:!!(mask&2),gpx:!!(mask&4)});
  const html=marker.appearance({pin,color:"#333333"}).html;
  for(const [type,active] of Object.entries(flags)){
   const re=new RegExp('class="pin-sector-'+type+'"[^>]*fill="([^"]+)"');
   const match=html.match(re);
   assert.ok(match,"sector always present "+type);
   assert.equal(match[1],active?fills[type]:"#e8edf2");
  }
  assert.ok(!html.includes("pin-status-badge"));
 }
});
test("insertion at captured caret and replacement of a selection never appends blindly",()=>{
 assert.deepEqual(NoteEditor.insertAtSelection("Zeile eins\nZeile zwei",{start:6,end:10},"12.11.2026"),
  {text:"Zeile 12.11.2026\nZeile zwei",caret:16});
 assert.deepEqual(NoteEditor.insertAtSelection("abc",{start:1,end:1},"17:30"),
  {text:"a17:30bc",caret:6});
});
test("optional GPX row and weather view are isolated from persistence",()=>{
 const html=read("index.html"),details=read("ui/pin-details.js"),css=read("styles.css");
 assert.match(html,/id="pinGpxActions" class="pin-gpx-actions hidden"/);
 assert.match(html,/id="pinWeatherBlock" class="pin-weather-placeholder hidden"/);
 assert.match(html,/id="pinMobileNoteEditor" class="pin-note-editor hidden"/);
 assert.match(html,/id="pinNoteInsertDate"/);
 assert.match(html,/id="pinNoteInsertTime"/);
 assert.match(details,/setWeather\(enabled\)/);
 assert.match(details,/pin\.gpxKey\|\|pin\.gpxTrackId/);
 assert.match(css,/#pinPanel \.pin-gpx-actions/);
 assert.match(css,/#pinPanel #pinUrlButton\.has-url::after/);
 assert.match(css,/#pinPanel #pinWeather\.is-active/);
});

test("every internal pin-dialog view has a shared, device-independent blue open state",()=>{
 const css=read("styles.css"),html=read("index.html"),deleteUI=read("ui/pin-delete-dialog.js");
 assert.match(css,/#pinPanel button:is\(\[aria-expanded="true"\],\[aria-pressed="true"\],\.is-active\):not\(#pinNotesExpand\)/);
 assert.match(css,/#pinPanel #deletePin\.p2m-icon-control\[aria-expanded="true"\]/);
 assert.match(css,/--p2m-button-bg:#1764bf;--p2m-button-ink:#fff;--p2m-button-border:#1764bf/);
 assert.match(html,/id="deletePin"[^>]*aria-haspopup="dialog"[^>]*aria-controls="deleteDialog"[^>]*aria-expanded="false"/);
 assert.match(deleteUI,/setExpanded\(true\)/);
 assert.match(deleteUI,/const onClose=\(\)=>\{\s*setExpanded\(false\)/);
 assert.match(css,/#deleteDialog\{[^}]*background-color:var\(--p2m-pin-dialog-surface\)/);
 assert.match(css,/#pinPanel\{[^}]*background:var\(--p2m-pin-dialog-surface\)/);
 assert.match(css,/:root\{--p2m-pin-dialog-surface:#f7f8fa\}/);
});
