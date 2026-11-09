import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
import "./map-adapter-maplibre-v4.js";

// Isolated interactive test. No IndexedDB, no service worker, no user pins.
const header=document.querySelector("header");
for(const eventName of ["touchstart","touchend"]){
  header.addEventListener(eventName,event=>event.preventDefault(),{passive:false});
}
const $=id=>document.getElementById(id);
const status=$("status"),editor=$("pinEditor"),tip=$("tip"),bar=$("moveConfirm");
const samples=[
 {id:"a",lat:48.7758,lng:9.1829,name:"Stuttgart",color:"#d65a31"},
 {id:"b",lat:48.8584,lng:2.2945,name:"Paris",color:"#377caa"},
 {id:"c",lat:52.5200,lng:13.4050,name:"Berlin",color:"#28946d"}
];
let adapter=null,selected=null,moveMode=false,movePreview=null,moveMarker=null;
let previewGesture=null,markerGesture=null,holdTimer=null,suppressClickUntil=0;
const markers=new Map();
const labels=new Map();
function escaped(value){
 return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function pinById(id){return samples.find(p=>p.id===id);}
function currentPin(){return pinById(selected);}
function notify(message){status.textContent=message;}
function appearance(pin){
 return '<div class="pin-marker'+(selected===pin.id&&!moveMode?' selected':'')+'" style="background:'+pin.color+'"></div>'+
 '<span class="pin-label">'+escaped(pin.name)+'</span>';
}
function render(){
 for(const pin of samples){
  let marker=markers.get(pin.id);
  if(!marker){
   marker=adapter.createMarker(pin,{draggable:false});
   marker.getElement().dataset.testPinId=pin.id;
   bindPinGesture(marker,pin.id);
   markers.set(pin.id,marker);
  }
  adapter.setMarkerPosition(marker,pin);
  adapter.setMarkerAppearance(marker,{html:appearance(pin),title:pin.name});
 }
 scheduleLayout();
}
function selectPin(id){
 if(moveMode)return;
 selected=selected===id?null:id;
 render();
 if(selected){
  const pin=currentPin();
  $("pinName").value=pin.name;
  notify("Pin ausgewählt: "+pin.name);
 }else notify("Pin-Dialog geschlossen");
 scheduleLayout();
}
function bindPinGesture(marker,id){
 const element=adapter.getMarkerElement(marker);
 element.style.touchAction="none";
 element.addEventListener("pointerdown",event=>{
  if(event.button!==0||moveMode||markerGesture)return;
  event.stopPropagation();
  const gesture={id:event.pointerId,x:event.clientX,y:event.clientY,activated:false,cancelled:false,finished:false,
    panWasEnabled:adapter.isPanEnabled()};
  markerGesture=gesture;
  if(gesture.panWasEnabled)adapter.setPanEnabled(false);
  try{element.setPointerCapture(gesture.id);}catch(_){}
  const cleanup=()=>{
   clearTimeout(holdTimer);holdTimer=null;
   if(markerGesture===gesture)markerGesture=null;
   if(gesture.panWasEnabled)adapter.setPanEnabled(true);
   gesture.finished=true;
   element.removeEventListener("pointermove",onMove);
   element.removeEventListener("pointerup",onUp);
   element.removeEventListener("pointercancel",onCancel);
   element.removeEventListener("lostpointercapture",onCancel);
   try{if(element.hasPointerCapture(gesture.id))element.releasePointerCapture(gesture.id);}catch(_){}
  };
  const onMove=e=>{
   if(e.pointerId!==gesture.id||gesture.finished)return;
   e.stopPropagation();
   if(!gesture.activated&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>11){
    gesture.cancelled=true;cleanup();
   }else if(gesture.activated)e.preventDefault();
  };
  const onUp=e=>{
   if(e.pointerId!==gesture.id||gesture.finished)return;
   e.preventDefault();e.stopPropagation();
   const tapped=!gesture.activated&&!gesture.cancelled;
   suppressClickUntil=Date.now()+700;
   cleanup();
   if(tapped)selectPin(id);
  };
  const onCancel=e=>{
   if(e.pointerId!==gesture.id||gesture.finished)return;
   gesture.cancelled=true;cleanup();
  };
  element.addEventListener("pointermove",onMove,{passive:false});
  element.addEventListener("pointerup",onUp,{passive:false});
  element.addEventListener("pointercancel",onCancel);
  element.addEventListener("lostpointercapture",onCancel);
  holdTimer=setTimeout(()=>{
   if(markerGesture!==gesture||gesture.finished||gesture.cancelled)return;
   gesture.activated=true;
   suppressClickUntil=Date.now()+900;
   zoomHeldPin(marker);
   if(navigator.vibrate)navigator.vibrate(15);
  },550);
 },{passive:false});
 // Prevent synthesized mouse click from closing/reopening the selection.
 element.addEventListener("click",event=>{event.stopPropagation();event.preventDefault();});
}
function zoomHeldPin(marker){
 const position=adapter.getMarkerPosition(marker);
 const far=marker._heldZoomClose===true;
 adapter.zoomAround(position,far?14:18);
 marker._heldZoomClose=!far;
 notify(far?"Pin-Langdruck: Zoom 14":"Pin-Langdruck: Zoom 18");
 scheduleLayout();
}
function closeEditor(){
 selected=null;
 render();
 notify("Dialog geschlossen");
}
function scheduleLayout(){
 if(!adapter)return;
 requestAnimationFrame(positionOverlays);
}
function positionOverlays(){
 if(!adapter)return;
 const mapRect=adapter.getContainer().getBoundingClientRect();
 if(selected&&!moveMode){
  const p=adapter.project(currentPin());
  const x=mapRect.left+p.x,y=mapRect.top+p.y;
  editor.classList.remove("hidden");
  tip.classList.remove("hidden");
  editor.style.left=x+"px";editor.style.top=y+"px";
  tip.style.left=x+"px";tip.style.top=(y-58)+"px";
 }else{
  editor.classList.add("hidden");
  tip.classList.add("hidden");
 }
 const svg=$("previewLine");
 if(!moveMode||!movePreview||!currentPin()){
  svg.classList.add("hidden");
  bar.classList.add("hidden");
  return;
 }
 const before=adapter.project(currentPin()),after=adapter.project(movePreview);
 svg.classList.remove("hidden");
 svg.setAttribute("viewBox","0 0 "+adapter.getSize().x+" "+adapter.getSize().y);
 $("moveLine").setAttribute("x1",before.x);
 $("moveLine").setAttribute("y1",before.y);
 $("moveLine").setAttribute("x2",after.x);
 $("moveLine").setAttribute("y2",after.y);
 const desiredX=mapRect.left+after.x,desiredY=mapRect.top+after.y+30;
 bar.classList.remove("hidden");
 const width=bar.offsetWidth||250,height=bar.offsetHeight||50;
 const x=Math.max(width/2+8,Math.min(window.innerWidth-width/2-8,desiredX));
 const y=desiredY+height+10<window.innerHeight?desiredY:mapRect.top+after.y-height-34;
 bar.style.left=x+"px";bar.style.top=Math.max(mapRect.top+8,y)+"px";
}
function startMove(){
 if(!currentPin())return;
 moveMode=true;movePreview=null;
 editor.classList.add("hidden");tip.classList.add("hidden");
 $("approveMove").disabled=true;
 notify("Neue Stelle auf der Karte antippen oder Vorschau verschieben");
 render();
}
function setPreview(position){
 if(!moveMode||!currentPin())return;
 movePreview={lat:Number(position.lat),lng:Number(position.lng)};
 if(!moveMarker){
  moveMarker=adapter.createMarker(movePreview,{draggable:true,zIndexOffset:1000});
  adapter.setMarkerAppearance(moveMarker,{html:'<div class="preview-pin"></div>',title:"Neue Position"});
  adapter.onMarker(moveMarker,"drag",setPreview);
  adapter.onMarker(moveMarker,"dragend",setPreview);
 }else adapter.setMarkerPosition(moveMarker,movePreview);
 $("approveMove").disabled=false;
 positionOverlays();
}
function clearPreview(){
 if(moveMarker){adapter.removeOverlay(moveMarker);moveMarker=null;}
 movePreview=null;
 $("approveMove").disabled=true;
 $("previewLine").classList.add("hidden");
 bar.classList.add("hidden");
}
function endMove(){
 moveMode=false;
 clearPreview();
 render();
 notify("Verschieben abgebrochen");
}
function approveMove(){
 const pin=currentPin();
 if(!pin||!movePreview)return;
 pin.lat=movePreview.lat;pin.lng=movePreview.lng;
 moveMode=false;
 clearPreview();
 render();
 notify("Neue Position übernommen (nur Testdaten)");
}
function showError(error){notify("MapLibre-Test fehlgeschlagen: "+String(error?.message||error));}
$("closeEditor").addEventListener("click",closeEditor);
$("startMove").addEventListener("click",startMove);
$("cancelMove").addEventListener("click",endMove);
$("approveMove").addEventListener("click",approveMove);
$("pinName").addEventListener("input",e=>{
 const pin=currentPin();if(!pin)return;
 pin.name=e.target.value.slice(0,120);render();
});
try{
 adapter=window.Pin2MapMapLibreAdapter.mount("map",{center:{lat:49.3,lng:7.4},zoom:4.6},maplibregl);
 adapter.map.on("load",()=>{
  render();
  notify("MapLibre Testversion 5 · drei Test-Pins angezeigt");
 });
 adapter.map.on("error",event=>showError(event.error||"Unbekannter Kartenfehler"));
 adapter.onMapClick(position=>{
  if(Date.now()<suppressClickUntil)return;
  if(moveMode){setPreview(position);return;}
  if(selected)closeEditor();
 });
 adapter.on("move",scheduleLayout);
 adapter.on("zoom",scheduleLayout);
 window.addEventListener("resize",scheduleLayout);
 adapter.addZoomControls({onFitAll:()=>adapter.fitBounds(samples,{padding:60,maxZoom:7,duration:0,animate:false})});
}catch(error){showError(error);}
