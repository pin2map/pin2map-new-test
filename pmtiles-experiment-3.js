import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
const $=id=>document.getElementById(id);
const status=$("status"),diagnostics=$("diagnostics");
const DEMO="https://demo-bucket.protomaps.com/v4.pmtiles";
const FLORENCE="https://pmtiles.io/protomaps(vector)ODbL_firenze.pmtiles";
const GLYPH="https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf";
const SPRITE="https://protomaps.github.io/basemaps-assets/sprites/v4/light";
const centerStuttgart=[9.1829,48.7758],centerFlorence=[11.2543435,43.7672134];
let map=null,florenceFallback=false;
const messages=[];
function log(message){
 messages.push(message);
 diagnostics.textContent=messages.slice(-6).join(" · ");
}
function state(message,error=false){
 status.textContent=message;status.classList.toggle("error",error);
}
function finiteCheck(promise,ms=9000){
 return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error("Zeitüberschreitung nach "+ms/1000+" s")),ms))]);
}
async function probe(name,check){
 try{await finiteCheck(check());log(name+": OK");return true;}
 catch(error){log(name+": FEHLER ("+String(error?.message||error).slice(0,100)+")");return false;}
}
function simpleStyle(){
 return {version:8,sources:{firenze:{type:"vector",url:"pmtiles://"+FLORENCE,
 attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}},
 layers:[
 {id:"water",type:"fill",source:"firenze","source-layer":"water",paint:{"fill-color":"#80b1d3"}},
 {id:"buildings",type:"fill",source:"firenze","source-layer":"buildings",paint:{"fill-color":"#d9d9d9"}},
 {id:"roads",type:"line",source:"firenze","source-layer":"roads",paint:{"line-color":"#fc8d62","line-width":2}},
 {id:"pois",type:"circle",source:"firenze","source-layer":"pois",paint:{"circle-color":"#eec857","circle-radius":3}}
 ]};
}
function styledMap(){
 return {version:8,glyphs:GLYPH,sprite:SPRITE,
 sources:{protomaps:{type:"vector",url:"pmtiles://"+DEMO,
 attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}},
 layers:window.basemaps.layers("protomaps",window.basemaps.namedFlavor("light"),{lang:"de"})};
}
function mount(style,center,zoom,fallback){
 if(map){map.remove();map=null;}
 florenceFallback=fallback;
 map=new maplibregl.Map({container:"map",style,center,zoom,pitch:0,bearing:0});
 map.on("load",()=>state(fallback
   ?"Florenz-Rückfallkarte geladen · Stuttgart-Demo nicht erreichbar"
   :"Protomaps Light geladen · Stuttgart"));
 map.on("error",e=>{
   const message=String(e.error?.message||e.error||"Unbekannt");
   log((fallback?"Florenz":"Stuttgart")+" Renderfehler: "+message.slice(0,130));
   state("Kartenressource nicht geladen: "+message,true);
 });
}
$("plus").addEventListener("click",()=>map?.zoomIn({duration:120}));
$("minus").addEventListener("click",()=>map?.zoomOut({duration:120}));
$("reset").addEventListener("click",()=>map?.jumpTo({center:florenceFallback?centerFlorence:centerStuttgart,zoom:florenceFallback?13:12}));
async function begin(){
 if(!window.pmtiles?.Protocol){state("PMTiles-Bibliothek nicht verfügbar",true);return;}
 const protocol=new window.pmtiles.Protocol();
 maplibregl.addProtocol("pmtiles",protocol.tile);
 log("PMTiles-Protokoll registriert");
 const canStyle=!!window.basemaps?.layers;
 log("Protomaps-Stilbibliothek: "+(canStyle?"OK":"FEHLER"));
 // PMTiles header probe narrows the problem to the remote archive,
 // unlike MapLibre's generic 'Load failed' report.
 const ok=await probe("Stuttgart-Demo-PMTiles",()=>new window.pmtiles.PMTiles(DEMO).getHeader());
 if(ok&&canStyle){
   await probe("Sprite-Metadaten",async()=>{
     const response=await fetch(SPRITE+".json",{cache:"no-store"});
     if(!response.ok)throw Error("HTTP "+response.status);
     await response.json();
   });
   state("Protomaps-Demo erreichbar · Kartenstil wird geladen");
   try{mount(styledMap(),centerStuttgart,12,false);}
   catch(e){log("Stilfehler: "+String(e.message||e));mount(simpleStyle(),centerFlorence,13,true);}
 }else{
   state("Demo-PMTiles nicht verfügbar · Rückfall auf Florenz");
   try{mount(simpleStyle(),centerFlorence,13,true);}
   catch(e){state("Auch die Florenz-Testkarte konnte nicht gestartet werden: "+String(e.message||e),true);}
 }
}
begin().catch(e=>state("Diagnose fehlgeschlagen: "+String(e.message||e),true));
