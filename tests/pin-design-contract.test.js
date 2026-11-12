"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const marker=require("../ui/pin-marker-view.js");
const NoteEditor=require("../ui/pin-note-editor.js");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
test("wide predecessor-style pin has large white center and aligned status column",()=>{
 const pin={id:"p",name:"Test",note:"Eine Notiz",url:"obsidian://note/a",gpxKey:"track"};
 const look=marker.appearance({pin,color:"#2474b7",selected:true});
 assert.match(look.html,/pin-marker selected/);
 assert.match(look.html,/viewBox="0 0 36 46"/);
 assert.match(look.html,/fill="#fff"/);
 assert.equal((look.html.match(/class="pin-status-badge/g)||[]).length,3);
 assert.ok(look.html.indexOf("pin-status-note")<look.html.indexOf("pin-status-url"));
 assert.ok(look.html.indexOf("pin-status-url")<look.html.indexOf("pin-status-gpx"));
 const css=read("styles.css");
 assert.match(css,/\.pin-status-column\{[^}]*flex-direction:column/);
 assert.match(css,/\.pin-status-badge\{[^}]*width:14px;height:14px/);
 assert.match(read("map-adapter-leaflet.js"),/iconSize:\[68,64\],iconAnchor:\[25,61\]/);
});
test("badges derive from existing pin data; no empty gaps or persistent marker flags",()=>{
 const pin={id:"p",note:"",url:"mailto:a@example.com"};
 assert.deepEqual(marker.statusFlags(pin),{note:false,url:true,gpx:false});
 const look=marker.appearance({pin,color:"#333333"});
 assert.equal((look.html.match(/class="pin-status-badge/g)||[]).length,1);
 pin.url="";pin.note="Jetzt Notiz";
 assert.deepEqual(marker.statusFlags(pin),{note:true,url:false,gpx:false});
 assert.equal((marker.appearance({pin,color:"#333333"}).html.match(/class="pin-status-badge/g)||[]).length,1);
 pin.note="";
 assert.ok(!marker.appearance({pin,color:"#333333"}).html.includes("pin-status-column"));
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
