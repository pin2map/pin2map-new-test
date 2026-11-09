import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";

// Documented upstream PMTiles MapLibre demo; limited to the Florence sample.
// This is not a planet-scale basemap nor a pin2map data store.
const SAMPLE="https://pmtiles.io/protomaps(vector)ODbL_firenze.pmtiles";
const START=[11.2543435,43.7672134];
const status=document.getElementById("status");
const notify=(message,error=false)=>{
 status.textContent=message;
 status.classList.toggle("error",error);
};
if(!window.pmtiles?.Protocol){
 notify("PMTiles-Bibliothek nicht geladen; Internetverbindung prüfen.",true);
}else{
 const protocol=new window.pmtiles.Protocol();
 maplibregl.addProtocol("pmtiles",protocol.tile);
 const style={
  version:8,
  sources:{
   example_source:{
    type:"vector",
    url:"pmtiles://"+SAMPLE,
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>'
   }
  },
  layers:[
   {id:"water",type:"fill",source:"example_source","source-layer":"water",
    filter:["==",["geometry-type"],"Polygon"],paint:{"fill-color":"#80b1d3"}},
   {id:"buildings",type:"fill",source:"example_source","source-layer":"buildings",
    paint:{"fill-color":"#d9d9d9"}},
   {id:"roads",type:"line",source:"example_source","source-layer":"roads",
    paint:{"line-color":"#fc8d62","line-width":2}},
   {id:"pois",type:"circle",source:"example_source","source-layer":"pois",
    paint:{"circle-color":"#eec857","circle-radius":3}}
  ]
 };
 try{
  const map=new maplibregl.Map({
   container:"map",style,center:START,zoom:13,pitch:0,bearing:0
  });
  map.on("load",()=>notify("PMTiles-Protokoll aktiv · Karte wird dargestellt"));
  map.on("error",e=>notify("PMTiles/Kartenfehler: "+String(e.error?.message||e.error||"Unbekannt"),true));
  document.getElementById("plus").addEventListener("click",()=>map.zoomIn({duration:120}));
  document.getElementById("minus").addEventListener("click",()=>map.zoomOut({duration:120}));
  document.getElementById("reset").addEventListener("click",()=>map.jumpTo({center:START,zoom:13}));
 }catch(e){notify("PMTiles-Start fehlgeschlagen: "+String(e.message||e),true);}
}
