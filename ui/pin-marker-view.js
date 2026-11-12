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
    const badges=[
      flags.note?'<span class="pin-status-badge pin-status-note" title="Notiz vorhanden" aria-label="Notiz vorhanden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 11h8M10 15h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>':"",
      flags.url?'<span class="pin-status-badge pin-status-url" title="URL vorhanden" aria-label="URL vorhanden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H7a5 5 0 0 0 0 10h2m6-10h2a5 5 0 0 1 0 10h-2M8 12h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>':"",
      flags.gpx?'<span class="pin-status-badge pin-status-gpx" title="GPX-Track vorhanden" aria-label="GPX-Track vorhanden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 18 6-11 6 7 6-10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="3" cy="18" r="2" fill="currentColor"/><circle cx="21" cy="4" r="2" fill="currentColor"/></svg></span>':""
    ].filter(Boolean).join("");
    // A wide teardrop with a large white center, not a rotated square.
    // The three badges always stack flush in a single compact column.
    const html='<div class="pin-marker'+(selected?' selected':'')+'" style="color:'+color+'">'
      +'<svg class="pin-marker-shape" viewBox="0 0 50 64" aria-hidden="true"><path d="M25 61C19 51 3 33 3 24a22 22 0 0 1 44 0c0 9-16 27-22 37Z" fill="currentColor" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/><circle cx="25" cy="24" r="12.5" fill="#fff"/></svg>'
      +(badges?'<span class="pin-status-column" aria-label="Weitere Pin-Inhalte">'+badges+'</span>':"")
      +'</div>';
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
    }
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
    }
  }
  const api=Object.freeze({escapeHtml,statusFlags,appearance,layout,PinMarkerView});
  root.Pin2MapPinMarkerView=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
