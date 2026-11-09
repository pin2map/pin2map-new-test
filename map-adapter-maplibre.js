"use strict";
/* Experimental MapLibre renderer. Not loaded by the main PWA.
 * Public coordinates {lat,lng}; screen points {x,y}. MapLibre uses [lng,lat].
 */
(function(root){
  function ll(position) {
    if(Array.isArray(position))return {lat:Number(position[0]),lng:Number(position[1])};
    return {lat:Number(position.lat),lng:Number(position.lng)};
  }
  class MapLibreMapAdapter {
    constructor(map,gl) {
      if(!map || !gl)throw new TypeError("MapLibre map and library required");
      this.map=map;this.gl=gl;
    }
    static mount(element,viewport,gl,style="https://demotiles.maplibre.org/style.json") {
      const center=ll(viewport.center);
      return new MapLibreMapAdapter(new gl.Map({
        container:element,style,center:[center.lng,center.lat],zoom:viewport.zoom,
        pitch:0,bearing:0,attributionControl:true
      }),gl);
    }
    getContainer(){return this.map.getContainer();}
    getSize(){const e=this.getContainer();return {x:e.clientWidth,y:e.clientHeight};}
    getViewport(){const p=this.map.getCenter();return {center:{lat:p.lat,lng:p.lng},zoom:this.map.getZoom()};}
    project(position){const p=ll(position),q=this.map.project([p.lng,p.lat]);return {x:q.x,y:q.y};}
    unproject(point){const p=this.map.unproject([Number(point.x),Number(point.y)]);return {lat:p.lat,lng:p.lng};}
    panBy(point,options={}){this.map.panBy([Number(point.x),Number(point.y)],options);}
    setView(viewport){const p=ll(viewport.center);this.map.jumpTo({center:[p.lng,p.lat],zoom:viewport.zoom});}
    fitBounds(bounds,options={}){
      const positions=bounds.map(ll);
      if(!positions.length)return;
      const b=new this.gl.LngLatBounds();
      positions.forEach(p=>b.extend([p.lng,p.lat]));
      this.map.fitBounds(b,options);
    }
    zoomIn(){this.map.zoomIn({duration:120});}
    zoomOut(){this.map.zoomOut({duration:120});}
    zoomAround(position,zoom){
      // A fixed pixel anchor is preserved using the geographic position as camera anchor.
      const p=ll(position);this.map.jumpTo({zoom,around:[p.lng,p.lat]});
    }
    invalidateSize(){this.map.resize();}
    on(event,callback){
      const events=event.split(/\s+/).filter(Boolean);
      events.forEach(name=>this.map.on(name,callback));
      return ()=>events.forEach(name=>this.map.off(name,callback));
    }
    onMapClick(callback){
      const fn=e=>callback({lat:e.lngLat.lat,lng:e.lngLat.lng});
      this.map.on("click",fn);return ()=>this.map.off("click",fn);
    }
    createMarker(position,options={}){
      const p=ll(position);
      const marker=new this.gl.Marker({draggable:!!options.draggable,anchor:"bottom",offset:[0,0]})
        .setLngLat([p.lng,p.lat]).addTo(this.map);
      if(options.zIndexOffset)marker.getElement().style.zIndex=String(options.zIndexOffset);
      return marker;
    }
    getMarkerPosition(marker){const p=marker.getLngLat();return {lat:p.lat,lng:p.lng};}
    setMarkerPosition(marker,position){const p=ll(position);marker.setLngLat([p.lng,p.lat]);}
    getMarkerElement(marker){return marker.getElement();}
    setMarkerAppearance(marker,{html="",title="Pin"}={}){
      const el=marker.getElement();
      el.classList.add("pin-icon");
      // Only trusted, locally assembled marker markup is passed by the app.
      el.innerHTML=html;
      el.title=title;
    }
    onMarker(marker,event,callback){
      if(event==="drag"||event==="dragend"){
        const fn=()=>callback(this.getMarkerPosition(marker));
        marker.on(event,fn);return ()=>marker.off(event,fn);
      }
      const el=marker.getElement();
      el.addEventListener(event,callback);
      return ()=>el.removeEventListener(event,callback);
    }
    removeOverlay(overlay){
      if(!overlay)return;
      if(typeof overlay.remove==="function")overlay.remove();
      else if(overlay.id && this.map.getLayer(overlay.id)){
        this.map.removeLayer(overlay.id);
        if(this.map.getSource(overlay.id))this.map.removeSource(overlay.id);
      }
    }
    hasOverlay(marker){return !!marker && typeof marker.getElement==="function" && marker.getElement().isConnected;}
    isPanEnabled(){return this.map.dragPan.isEnabled();}
    setPanEnabled(enabled){if(enabled)this.map.dragPan.enable();else this.map.dragPan.disable();}
    stopMarkerEventPropagation(element){
      ["mousedown","touchstart","click","dblclick"].forEach(type=>element.addEventListener(type,e=>e.stopPropagation()));
    }
    isMapSurface(target){
      return !!target && typeof target.closest==="function" &&
        !target.closest(".maplibregl-marker,.maplibregl-control-container,.maplibregl-popup,button,input");
    }
    addZoomControls({onFitAll}){
      const div=document.createElement("div");
      div.className="prototype-zoom";
      for(const [symbol,label,action] of [
        ["+","Vergrößern",()=>this.zoomIn()],
        ["−","Verkleinern",()=>this.zoomOut()],
        ["◎","Alle sichtbaren Pins anzeigen",onFitAll]
      ]){
        const button=document.createElement("button");
        button.type="button";button.textContent=symbol;button.title=label;
        button.setAttribute("aria-label",label);
        button.addEventListener("click",action);div.append(button);
      }
      this.getContainer().append(div);
      return ()=>div.remove();
    }
    destroy(){this.map.remove();}
  }
  root.Pin2MapMapLibreAdapter=MapLibreMapAdapter;
})(window);
