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
  function appearance({pin,color,selected,label,side}){
    const labelHtml=label?'<span class="pin-side-label '+side+(selected?' highlighted':'')+'">'+escapeHtml(label)+'</span>':"";
    return {html:'<div class="pin-marker'+(selected?' selected':'')+'" style="background:'+color+'"></div>'+labelHtml,
      title:pin.name||"Pin"};
  }
  function layout(pins,{selectedPinId=null,labelsVisible=true,size,project,cleanText,colorsByLayer,defaultColor}){
    const occupied=[];
    // Preserve the existing stable ordering: selected marker first, others in input order.
    const sorted=[...pins].sort((a,b)=>Number(b.id===selectedPinId)-Number(a.id===selectedPinId));
    return sorted.map(pin=>{
      const selected=pin.id===selectedPinId;
      const point=project({lat:pin.lat,lng:pin.lng});
      const side=point.x>size.x*0.55?"left":"right";
      let label=cleanText(pin.name);
      if(!selected&&!labelsVisible)label="";
      if(label){
        const width=Math.min(175,Math.max(80,size.x*0.40));
        const left=side==="right"?point.x+20:point.x-20-width;
        const rect={left,right:left+width,top:point.y-40,bottom:point.y-10};
        if(!selected&&occupied.some(r=>!(r.right<rect.left||r.left>rect.right||r.bottom<rect.top||r.top>rect.bottom)))label="";
        else occupied.push(rect);
      }
      const color=colorsByLayer[pin.layerId]||defaultColor;
      return {pin,appearance:appearance({pin,color,selected,label,side}),selected,label,side};
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
        this.map.getMarkerElement(marker)?.classList.toggle("pin-relocation-source",pinId===this.relocationSourceId);
      }
    }
    render({pins,layers,selectedPinId=null,labelsVisible=true}){
      const colorsByLayer=Object.fromEntries(layers.map(l=>[l.id,l.color]));
      const size=this.map.getSize();
      const placements=layout(pins,{
        selectedPinId,labelsVisible,size,project:p=>this.map.project(p),
        cleanText:this.cleanText,colorsByLayer,defaultColor:this.defaultColor
      });
      const shown=new Set();
      for(const {pin,appearance:look} of placements){
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
        this.map.getMarkerElement(marker)?.classList.toggle("pin-relocation-source",pin.id===this.relocationSourceId);
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
