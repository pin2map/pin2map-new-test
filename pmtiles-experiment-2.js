import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
// Deliberately uses the upstream public V4 sample and full Protomaps basemap style.
// Separate from pin2map pins, offline storage and the existing raster basemaps.
const status=document.getElementById("status");
const notify=(value,error=false)=>{
 status.textContent=value;
 status.classList.toggle("error",error);
};
if(!window.pmtiles?.Protocol||!window.basemaps?.layers){
 notify("PMTiles oder Protomaps-Stilbibliothek konnte nicht geladen werden.",true);
}else{
 try{
  const protocol=new window.pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles",protocol.tile);
  const start=[9.1829,48.7758]; // Stuttgart
  const style={
   version:8,
   glyphs:"https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
   sprite:"https://protomaps.github.io/basemaps-assets/sprites/v4/light",
   sources:{
    protomaps:{
     type:"vector",
     url:"pmtiles://https://demo-bucket.protomaps.com/v4.pmtiles",
     attribution:'<a href="https://protomaps.com">Protomaps</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>'
    }
   },
   layers:window.basemaps.layers("protomaps",window.basemaps.namedFlavor("light"),{lang:"de"})
  };
  const map=new maplibregl.Map({container:"map",style,center:start,zoom:12,pitch:0,bearing:0});
  map.on("load",()=>notify("Protomaps Light geladen · deutsche Kartenbeschriftung"));
  map.on("error",e=>notify("Kartenfehler: "+String(e.error?.message||e.error||"Unbekannt"),true));
  document.getElementById("plus").addEventListener("click",()=>map.zoomIn({duration:120}));
  document.getElementById("minus").addEventListener("click",()=>map.zoomOut({duration:120}));
  document.getElementById("reset").addEventListener("click",()=>map.jumpTo({center:start,zoom:12}));
 }catch(e){notify("Protomaps-Start fehlgeschlagen: "+String(e.message||e),true);}
}
