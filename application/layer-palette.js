"use strict";
/* Project-owned, sync-ready palette and stable layer color allocation.
 * No DOM, storage, network, or browser globals. */
(function(root){
 // Exact nine category colors from the predecessor pin2map/pin2map
 // index.html defaults (Red, DodgerBlue, LimeGreen, Gold, DarkOrange,
 // BlueViolet, DeepPink, DarkCyan, SaddleBrown), normalized to HEX.
 const DEFAULT_STANDARD=Object.freeze(["#FF0000","#1E90FF","#32CD32",
  "#FFD700","#FF8C00","#8A2BE2","#FF1493","#008B8B","#8B4513"]);
 const LEGACY_STANDARD=Object.freeze(["#2563EB","#FFCBA4","#2AA198","#FF6F61",
  "#8FD3FF","#D9A441","#4F8A66","#7ED957","#C8A2FF","#FFE234","#9B5DE5","#FF8C32"]);
 const DEFAULT_SIGNALS=Object.freeze({red:"#F5222D",yellow:"#FFC400",green:"#19BD39"});
 const PRIVATE_COLOR="#808080";
 function hex(value){const s=String(value||"").trim().toUpperCase();return /^#[0-9A-F]{6}$/.test(s)?s:null;}
 function colors(project){
  const saved=project?.colorSettings||{};
  return {
   // Migrate untouched v232 defaults, but preserve any personalized slot.
   // Existing layer objects retain their actual colors until users edit them.
   standard:DEFAULT_STANDARD.map((c,i)=>{
    const stored=hex(saved.standard?.[i]);
    return Array.isArray(saved.standard)&&saved.standard.length===12&&
      stored===LEGACY_STANDARD[i]?c:stored||c;
   }),
   signals:Object.fromEntries(Object.entries(DEFAULT_SIGNALS).map(([key,value])=>
    [key,hex(saved.signals?.[key])||value]))
  };
 }
 function setColor(project,kind,key,value){
  const parsed=hex(value);if(!parsed)throw new RangeError("Ungültiger HEX-Farbwert");
  // Old projects and partially synchronized settings may omit one group.
  // Normalize missing slots without rewriting user-selected valid colors.
  project.colorSettings=colors(project);
  if(kind==="standard"){
   if(!Number.isInteger(key)||key<0||key>=DEFAULT_STANDARD.length)throw new RangeError("Unbekannte Standardfarbe");
   project.colorSettings.standard[key]=parsed;
  }else if(kind==="signals"&&Object.hasOwn(DEFAULT_SIGNALS,key)){
   project.colorSettings.signals[key]=parsed;
  }else throw new RangeError("Unbekannter Farbtyp");
  return parsed;
 }
 function nextLayerNumber(project){
  // Never reuse an existing ID/number even when names were edited.
  const high=Math.max(Number.isSafeInteger(project.layerSerial)?project.layerSerial:0,
   ...project.layers.map(l=>{
    const n=Number(String(l.id||"").match(/^layer-(\d+)$/)?.[1]);
    return Number.isSafeInteger(n)?n:0;
   }));
  return high+1;
 }
 function nextLayerColorIndex(project){
  // The last-created layer's immutable palette slot determines the next slot.
  // Deleted last layers must not rewind the sequence.
  const last=project.layerAllocation;
  if(last&&Number.isInteger(last.paletteIndex)&&last.paletteIndex>=0)
   return (last.paletteIndex+1)%DEFAULT_STANDARD.length;
  const layers=project.layers.filter(l=>l.id!=="private");
  const latest=layers.reduce((best,l)=>
   (Number(l.createdOrdinal)||0)>(Number(best?.createdOrdinal)||0)?l:best,null);
  if(Number.isInteger(latest?.paletteIndex))return (latest.paletteIndex+1)%DEFAULT_STANDARD.length;
  return layers.length%DEFAULT_STANDARD.length;
 }
 function recordLayer(project,layer,colorIndex){
  // The ID may already encode the allocated serial (legacy layer-N).
  // The newly pushed layer must not count itself as a *future* allocation.
  const encoded=Number(String(layer.id||"").match(/^layer-(\d+)$/)?.[1]);
  const ordinal=Number.isSafeInteger(encoded)&&encoded>0?encoded:nextLayerNumber(project);
  project.layerSerial=Math.max(project.layerSerial||0,ordinal);
  layer.paletteIndex=colorIndex;
  layer.createdOrdinal=ordinal;
  project.layerAllocation={paletteIndex:colorIndex,ordinal};
  return layer;
 }
 function repairPrivate(project){
  const layer=project.layers?.find(l=>l.id==="private");
  if(layer)layer.color=PRIVATE_COLOR;
 }
 const api=Object.freeze({DEFAULT_STANDARD,DEFAULT_SIGNALS,PRIVATE_COLOR,
  hex,colors,setColor,nextLayerNumber,nextLayerColorIndex,recordLayer,repairPrivate});
 root.Pin2MapLayerPalette=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
