import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
import "./map-adapter-maplibre.js";

const status=document.getElementById("status");
const samples=[
  {id:"a",lat:48.7758,lng:9.1829,name:"Stuttgart",color:"#d65a31"},
  {id:"b",lat:48.8584,lng:2.2945,name:"Paris",color:"#377caa"},
  {id:"c",lat:52.5200,lng:13.4050,name:"Berlin",color:"#28946d"}
];
let adapter;
let selected="a";
const markers=new Map();
function safeText(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function draw(){
  for(const pin of samples){
    let marker=markers.get(pin.id);
    if(!marker){
      marker=adapter.createMarker(pin,{draggable:false});
      adapter.onMarker(marker,"click",()=>{selected=pin.id;draw();status.textContent="Ausgewählt: "+pin.name;});
      markers.set(pin.id,marker);
    }
    adapter.setMarkerPosition(marker,pin);
    adapter.setMarkerAppearance(marker,{
      html:'<div class="pin-marker'+(selected===pin.id?' selected':'')+'" style="background:'+pin.color+'"></div><span class="pin-label">'+safeText(pin.name)+'</span>',
      title:pin.name
    });
  }
}
function showError(error){status.textContent="MapLibre-Test fehlgeschlagen: "+String(error?.message||error);}
try{
  adapter=window.Pin2MapMapLibreAdapter.mount("map",{center:{lat:49.3,lng:7.4},zoom:4.6},maplibregl);
  adapter.map.on("load",()=>{draw();status.textContent="MapLibre geladen · drei Test-Pins angezeigt";});
  adapter.map.on("error",event=>showError(event.error||"Unbekannter Kartenfehler"));
  adapter.addZoomControls({onFitAll:()=>adapter.fitBounds(samples,{padding:60,maxZoom:7,duration:350})});
}catch(error){showError(error);}
