import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
const $=id=>document.getElementById(id);
const store=window.Pin2MapPMTilesLabStore;
const notify=(message,error=false)=>{
 $("status").textContent=message;
 $("status").classList.toggle("error",error);
};
const SIZE_LIMIT=40*1024*1024;
let selectedFile=null;
let currentMap=null;
let sequence=0;
let protocol=null;
function describe(record){
 const megabytes=(record.file.size/(1024*1024)).toFixed(2);
 return record.file.name+" ("+megabytes+" MiB)";
}
async function storageNote(){
 if(!navigator.storage?.estimate)return "";
 try{
  const {usage,quota}=await navigator.storage.estimate();
  if(!Number.isFinite(usage)||!Number.isFinite(quota))return "";
  return " · Speicher "+(usage/1048576).toFixed(1)+" / "+(quota/1048576).toFixed(0)+" MiB";
 }catch{return "";}
}
function validateFile(file){
 if(!file || typeof file.slice!=="function")throw Error("Keine Datei ausgewählt");
 if(!file.name.toLowerCase().endsWith(".pmtiles"))throw Error("Datei muss .pmtiles heißen");
 if(file.size<127||file.size>SIZE_LIMIT)throw Error("Testdatei muss zwischen 127 Byte und 40 MiB liegen");
}
async function inspectFile(file){
 validateFile(file);
 const archive=new window.pmtiles.PMTiles(new window.pmtiles.FileSource(file));
 const header=await archive.getHeader();
 if(header.tileType!==1 && header.tileType!=="mvt")throw Error("Nur MVT-Vektorkacheln unterstützt");
 const values=[header.minLon,header.minLat,header.maxLon,header.maxLat];
 if(!values.every(Number.isFinite))throw Error("Ungültige geografische Grenzen");
 if(!Number.isFinite(header.maxZoom)||header.maxZoom>16)throw Error("Unbekannte oder ungeeignete Zoomstufen");
 return {archive,header};
}
function safePosition(header){
 const bounds=[header.minLon,header.minLat,header.maxLon,header.maxLat];
 if(bounds[0]<=9.1829&&bounds[2]>=9.1829&&bounds[1]<=48.7758&&bounds[3]>=48.7758)
  return [9.1829,48.7758];
 return [(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2];
}
async function display(file){
 if(!window.pmtiles?.FileSource||!window.basemaps?.layers){
  throw Error("PMTiles-/Kartenstilbibliothek nicht geladen (Internet prüfen)");
 }
 if(!protocol){
  protocol=new window.pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles",protocol.tile);
 }
 const {archive,header}=await inspectFile(file);
 protocol.add(archive);
 const center=safePosition(header);
 const zoom=Math.min(header.maxZoom||12,12);
 const style={
  version:8,
  glyphs:"https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
  sprite:"https://protomaps.github.io/basemaps-assets/sprites/v4/light",
  sources:{protomaps:{
   type:"vector",
   url:"pmtiles://"+archive.source.getKey(),
   attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>'
  }},
  layers:window.basemaps.layers("protomaps",window.basemaps.namedFlavor("light"),{lang:"de"})
 };
 const token=++sequence;
 if(currentMap){currentMap.remove();currentMap=null;}
 const map=new maplibregl.Map({container:"map",style,center,zoom,pitch:0,bearing:0});
 currentMap=map;
 map.on("load",()=>{
  if(sequence===token)notify("Karte angezeigt: "+file.name+" · Zoom 0–"+header.maxZoom+" (Stilressourcen noch online)");
 });
 map.on("error",event=>{
  if(sequence===token)notify("Kartenfehler: "+String(event.error?.message||event.error||"Unbekannt"),true);
 });
 return header;
}
$("archiveFile").addEventListener("change",()=>{
 selectedFile=$("archiveFile").files?.[0]||null;
 $("save").disabled=!selectedFile;
 if(selectedFile)notify("Datei ausgewählt: "+describe({file:selectedFile})+" · Zum dauerhaften Speichern klicken");
});
$("save").addEventListener("click",async()=>{
 if(!selectedFile)return;
 $("save").disabled=true;
 try{
  const file=selectedFile;
  await inspectFile(file);
  await store.put({file,importedAt:new Date().toISOString(),format:"pmtiles-mvt-v1"});
  const stored=await store.get();
  if(!stored?.file||stored.file.size!==file.size)throw Error("Gespeicherte Datei konnte nicht verifiziert werden");
  let persistence="Speicherschutz nicht bestätigt";
  if(navigator.storage?.persist){
   try{persistence=await navigator.storage.persist()?"Speicherschutz gewährt":"Speicherschutz nicht gewährt";}
   catch{persistence="Speicherschutz nicht verfügbar";}
  }
  notify("Lokal gespeichert: "+describe(stored)+(await storageNote())+" · "+persistence+" · Nach Neuladen erneut öffnen");
  // Existing map stays intact; reopening is an explicit user operation.
 }catch(error){notify("Speichern fehlgeschlagen: "+String(error.message||error),true);}
 finally{$("save").disabled=!selectedFile;}
});
$("reopen").addEventListener("click",async()=>{
 notify("Lese lokal gespeicherte PMTiles-Datei …");
 try{
  const record=await store.get();
  if(!record?.file){notify("Keine lokale Kartendatei gespeichert",true);return;}
  await display(record.file);
  notify("Lokale Kartendatei geöffnet: "+describe(record)+" · Kartenstil lädt online");
 }catch(error){notify("Öffnen fehlgeschlagen: "+String(error.message||error),true);}
});
$("remove").addEventListener("click",async()=>{
 if(!confirm("Lokal gespeicherte Stuttgart-Testkarte aus diesem Browser entfernen?"))return;
 try{
  await store.remove();
  notify("Lokal gespeicherte Kartendatei entfernt. Bereits geöffnete Karte bleibt bis zum Neuladen sichtbar.");
 }catch(error){notify("Entfernen fehlgeschlagen: "+String(error.message||error),true);}
});
(async()=>{
 try{
  const record=await store.get();
  notify(record?.file
   ?"Vorhanden: "+describe(record)+(await storageNote())+" · Über „Gespeicherte Karte öffnen“ anzeigen"
   :"Noch keine Kartendatei gespeichert. Stuttgart-PMTiles auswählen und lokal speichern.");
 }catch(error){notify("Lokale Speicherung nicht verfügbar: "+String(error.message||error),true);}
})();
