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
  function appearance({pin,color,selected}){
    return {html:'<div class="pin-marker'+(selected?' selected':'')+'" style="background:'+color+'"></div>',
      title:pin.name||"Pin"};
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
    constructor({mapAdapter,onSelect,attachGesture,cleanText,defaultColor}){
      if(!mapAdapter||typeof onSelect!=="function"||typeof attachGesture!=="function")
        throw new TypeError("Pin marker adapter and callbacks required");
      this.map=mapAdapter;this.onSelect=onSelect;this.attachGesture=attachGesture;
      this.cleanText=cleanText;this.defaultColor=defaultColor;this.markers=new Map();
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
  const api=Object.freeze({escapeHtml,appearance,layout,PinMarkerView});
  root.Pin2MapPinMarkerView=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
