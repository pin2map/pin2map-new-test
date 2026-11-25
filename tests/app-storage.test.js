"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const AppStorage=require("../adapters/storage/app-storage.js");
test("preview inventories its own bytes and opaque entries and resets only its own writable data",async()=>{
 const tile="pin2map-preview-viewed-osm-tiles-v1";
 const meta="pin2map-preview-viewed-osm-tile-metadata-v1";
 const shell="pin2map-preview-v345";
 const stable="pin2map-viewed-osm-tiles-v1";
 const versionRoot="pin2map-new-v345";
 const fixtures=new Map([[tile,[{type:"opaque"},{type:"cors",blob:async()=>new Blob(["abc"])}]],
  [meta,[{blob:async()=>new Blob(["{ }"])}]],[shell,[{blob:async()=>new Blob(["start"])}]],
  [stable,[]],[versionRoot,[]],["unrelated-app",[]]]);
 const prefs=new Map([["pin2map-favorites-search-v1:/repo/preview/","Test"],
  ["pin2map-show-yellow-pin-hitboxes-v1","false"],["pin2map-route-time-factors:/repo/index.html","{}"],
  ["pin2map-route-time-factors:/repo/preview/index.html","{}"],["other-app","abc"]]);
 const removed=[];
 const app=new AppStorage({scope:"pin2map-preview",pathname:"/repo/preview/index.html",
  getStorage:()=>({getItem:key=>prefs.get(key)??null,removeItem:key=>prefs.delete(key)}),
  caches:{keys:async()=>[...fixtures.keys()],open:async name=>({
   keys:async()=>fixtures.get(name).map((_,i)=>i),match:async i=>fixtures.get(name)[i]
  }),delete:async name=>{removed.push(name);fixtures.delete(name);}},
  getStore:()=>({loadProject:async()=>({pins:[{name:"Ä"}],areas:[],basemap:"street"}),
   loadViewHistory:async()=>({entries:[{}]}),reset:async()=>removed.push("project")}),
  worker:async()=>null
 });
 const rows=await app.inspect(),find=label=>rows.find(row=>row.label===label);
 assert.deepEqual(find("Besuchte Kartenkacheln"),{label:"Besuchte Kartenkacheln",bytes:3,entries:2,unknown:1});
 assert.equal(find("App-Dateien für den Offline-Start").bytes,5);
 assert.equal(find("Pins und Anhänge").bytes,Buffer.byteLength('[{"name":"Ä"}]'));
 assert.equal(find("Kartenverlauf").entries,1);
 assert.equal(find("Geräteeinstellungen").entries,2);
 await app.reset();
 assert.deepEqual(removed,[tile,meta,"project"]);
 assert.deepEqual([...fixtures.keys()],[shell,stable,versionRoot,"unrelated-app"]);
 assert.deepEqual([...prefs.keys()],["pin2map-show-yellow-pin-hitboxes-v1","pin2map-route-time-factors:/repo/index.html","other-app"]);
});
