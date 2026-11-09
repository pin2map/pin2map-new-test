import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
const label=document.getElementById("status");
const input=document.getElementById("archiveFile");
const msg=(value,error=false)=>{
 label.textContent=value;label.classList.toggle("error",error);
};
const protocol=window.pmtiles?.Protocol?new window.pmtiles.Protocol():null;
if(protocol)maplibregl.addProtocol("pmtiles",protocol.tile);
let map=null;
let current=null;
let generation=0;
input.addEventListener("change",async()=>{
 const file=input.files?.[0];
 if(!file)return;
 const myGeneration=++generation;
 if(!protocol||!window.pmtiles?.FileSource||!window.basemaps?.layers){
  msg("Bibliothek für PMTiles oder Kartenstil nicht geladen.",true);return;
 }
 if(!file.name.toLowerCase().endsWith(".pmtiles")){
  msg("Bitte eine Datei mit Endung .pmtiles wählen.",true);return;
 }
 try{
  msg("Lese Datei "+file.name+" ("+(file.size/1024/1024).toFixed(1)+" MiB) …");
  // Read byte ranges from the selected File; no server is involved.
  const archive=new window.pmtiles.PMTiles(new window.pmtiles.FileSource(file));
  const header=await archive.getHeader();
  if(myGeneration!==generation)return;
  protocol.add(archive);
  current=archive;
  const sourceKey=archive.source.getKey();
  const center=[header.centerLon,header.centerLat];
  const zoom=Math.min(header.maxZoom||12,12);
  const style={
   version:8,
   glyphs:"https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
   sprite:"https://protomaps.github.io/basemaps-assets/sprites/v4/light",
   sources:{
    protomaps:{
     type:"vector",
     url:"pmtiles://"+sourceKey,
     attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>'
    }
   },
   layers:window.basemaps.layers("protomaps",window.basemaps.namedFlavor("light"),{lang:"de"})
  };
  if(map){map.remove();map=null;}
  map=new maplibregl.Map({container:"map",style,center,zoom,pitch:0,bearing:0});
  map.on("load",()=>{
   if(myGeneration===generation)msg(file.name+" geöffnet · Protomaps Light · Zoom "+header.minZoom+"–"+header.maxZoom);
  });
  map.on("error",e=>{
   if(myGeneration===generation)msg("Kartendarstellung: "+String(e.error?.message||e.error||"Unbekannt"),true);
  });
 }catch(error){
  if(myGeneration===generation)msg("Datei nicht lesbar: "+String(error?.message||error),true);
 }
});
