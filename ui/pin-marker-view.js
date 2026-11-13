"use strict";
/*
 * Renderer-neutral presentation of pin markers and their labels.
 * Owns marker handles, label placement and visual collision suppression.
 * Does not mutate pins, layers or persistent project state.
 */
(function(root){
  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  // Visual-only badges are derived from existing pin information.
  // No additional persistent marker state or schema is introduced.
  function statusFlags(pin){
    const hasText=value=>typeof value==="string"&&value.trim().length>0;
    const hasGpx=Boolean(pin.gpxKey||pin.gpxTrackId||pin.gpxFileId||pin.gpxRef);
    return {note:hasText(pin.note),url:hasText(pin.url),gpx:hasGpx};
  }
  function appearance({pin,color,selected}){
    const flags=statusFlags(pin);
    const safeColor=/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color)?color:"#3676c4";
    // Three 120-degree sectors: top-left note, top-right URL, bottom GPX.
    // Status is derived entirely from existing persisted pin fields.
    const noteColor=flags.note?"#d94f55":"#e8edf2";
    const urlColor=flags.url?"#2979d1":"#e8edf2";
    const gpxColor=flags.gpx?"#8f989f":"#e8edf2";
    const html='<div class="pin-marker'+(selected?' selected':'')+'" style="color:'+safeColor+'">'
      +'<svg class="pin-marker-shape" viewBox="0 0 30 40" aria-hidden="true">'
      +'<path d="M15 38C10 30 2 21 2 15a13 13 0 0 1 26 0c0 6-8 15-13 23Z" fill="currentColor" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>'
      +'<g class="pin-status-segments">'
      +'<path class="pin-sector-note" d="M15 14 8.1 18A8 8 0 0 1 15 6Z" fill="'+noteColor+'"/>'
      +'<path class="pin-sector-url" d="M15 14 15 6A8 8 0 0 1 21.9 18Z" fill="'+urlColor+'"/>'
      +'<path class="pin-sector-gpx" d="M15 14 21.9 18A8 8 0 0 1 8.1 18Z" fill="'+gpxColor+'"/>'
      +'<circle cx="15" cy="14" r="8" fill="none" stroke="#fff" stroke-width="1.1"/>'
      +'<path d="M15 14V6M15 14 8.1 18M15 14 21.9 18" stroke="#fff" stroke-width="1.05" stroke-linecap="round"/>'
      +'</g></svg></div>';
    return {html,title:pin.name||"Pin"};
  }
  // Legacy contract: permanently visible pin-name tooltip on the right,
  // without label collision suppression or special selected-label exception.
  // All Leaflet placement and content-node details stay in the map adapter.
  function layout(pins,{selectedPinId=null,labelsVisible=true,cleanText,colorsByLayer,defaultColor}){
    return pins.map(pin=>{
      const selected=pin.id===selectedPinId;
      const label=labelsVisible?cleanText(pin.name):"";
      const color=colorsByLayer[pin.layerId]||defaultColor;
      return {pin,appearance:appearance({pin,color,selected}),selected,label,side:"right"};
    });
  }
  class PinMarkerView{
    constructor({mapAdapter,onSelect,attachGesture,cleanText,defaultColor,getInfoLabel=()=>null,formatInfo=()=>"",onInfoClick=()=>{}}){
      if(!mapAdapter||typeof onSelect!=="function"||typeof attachGesture!=="function")
        throw new TypeError("Pin marker adapter and callbacks required");
      this.map=mapAdapter;this.onSelect=onSelect;this.attachGesture=attachGesture;
      this.cleanText=cleanText;this.defaultColor=defaultColor;this.markers=new Map();
      this.getInfoLabel=getInfoLabel;this.formatInfo=formatInfo;this.onInfoClick=onInfoClick;
      this.relocationSourceId=null;
      this.visiblePinList=[];
    }
    visiblePins(){return this.visiblePinList;}
    setRelocationSource(id){
      this.relocationSourceId=id||null;
      for(const [pinId,marker] of this.markers){
        this.map.getMarkerElement?.(marker)?.classList.toggle("pin-relocation-source",pinId===this.relocationSourceId);
      }
    }
    render({pins,layers,selectedPinId=null,labelsVisible=true}){
      const colorsByLayer=Object.fromEntries(layers.map(l=>[l.id,l.color]));
      const placements=layout(pins,{
        selectedPinId,labelsVisible,
        cleanText:this.cleanText,colorsByLayer,defaultColor:this.defaultColor
      });
      this.visiblePinList=placements.map(({pin})=>({
        id:pin.id,lat:pin.lat,lng:pin.lng,name:pin.name
      }));
      const shown=new Set();
      for(const {pin,appearance:look,label} of placements){
        shown.add(pin.id);
        let marker=this.markers.get(pin.id);
        if(!marker){
          marker=this.map.createMarker({lat:pin.lat,lng:pin.lng},{draggable:false,autoPan:false});
          const id=pin.id; // Never capture a mutable pin or rendered list index.
          this.map.onMarker(marker,"click",()=>this.onSelect(id));
          this.markers.set(pin.id,marker);
        }
        this.map.setMarkerPosition(marker,{lat:pin.lat,lng:pin.lng});
        this.map.setMarkerAppearance(marker,look);
        this.map.setMarkerLabel(marker,label);
        this.map.setMarkerInfo?.(marker,this.formatInfo(this.getInfoLabel(pin)),()=>this.onInfoClick(pin.id));
        this.map.getMarkerElement?.(marker)?.classList.toggle("pin-relocation-source",pin.id===this.relocationSourceId);
        this.attachGesture(marker,pin.id);
      }
      for(const [id,marker] of this.markers){
        if(!shown.has(id)){this.map.removeOverlay(marker);this.markers.delete(id);}
      }
    }
    dispose(){
      for(const marker of this.markers.values())this.map.removeOverlay(marker);
      this.markers.clear();
      this.visiblePinList=[];
    }
  }
  const api=Object.freeze({escapeHtml,statusFlags,appearance,layout,PinMarkerView});
  root.Pin2MapPinMarkerView=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
