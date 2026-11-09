import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
const initial={lat:48.7905,lng:9.207,zoom:16};
const attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';
const tiles='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const leaflet=L.map("leafletMap",{zoomControl:true,attributionControl:true}).setView([initial.lat,initial.lng],initial.zoom);
L.tileLayer(tiles,{maxZoom:19,maxNativeZoom:19,attribution}).addTo(leaflet);
const maplibre=new maplibregl.Map({
 container:"maplibreMap",center:[initial.lng,initial.lat],zoom:initial.zoom,
 pitch:0,bearing:0,attributionControl:true,
 style:{
  version:8,
  sources:{osm:{type:"raster",tiles:[tiles],tileSize:256,maxzoom:19,attribution}},
  layers:[{id:"osm",type:"raster",source:"osm"}]
 }
});
maplibre.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");
let lock=false;
const syncFromLeaflet=()=>{
 if(lock)return;
 lock=true;
 const c=leaflet.getCenter(),m=maplibre.getCenter();
 if(Math.abs(c.lat-m.lat)<1e-7&&Math.abs(c.lng-m.lng)<1e-7&&Math.abs(leaflet.getZoom()-maplibre.getZoom())<0.001){lock=false;return;}
 maplibre.jumpTo({center:[c.lng,c.lat],zoom:leaflet.getZoom()});
 queueMicrotask(()=>{lock=false;});
};
const syncFromMapLibre=()=>{
 if(lock)return;
 lock=true;
 const c=maplibre.getCenter(),l=leaflet.getCenter();
 if(Math.abs(c.lat-l.lat)<1e-7&&Math.abs(c.lng-l.lng)<1e-7&&Math.abs(leaflet.getZoom()-maplibre.getZoom())<0.001){lock=false;return;}
 leaflet.setView([c.lat,c.lng],maplibre.getZoom(),{animate:false});
 queueMicrotask(()=>{lock=false;});
};
leaflet.on("moveend zoomend",syncFromLeaflet);
maplibre.on("moveend",syncFromMapLibre);
maplibre.on("error",e=>{
 document.getElementById("status").textContent="MapLibre-Fehler: "+String(e.error?.message||e.error);
});
maplibre.on("load",()=>{
 document.getElementById("status").textContent=
 "Beide Karten benutzen dieselbe OSM-Rasterquelle. Unterschiede im Inhalt stammen hier nicht von MapLibre oder Leaflet.";
});
addEventListener("resize",()=>{leaflet.invalidateSize();maplibre.resize();});
