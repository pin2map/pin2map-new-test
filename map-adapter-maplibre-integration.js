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
      this.lines=new Map();this.nextLineId=0;
      this.map.on("style.load",()=>this.restoreLines());
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
    panBy(point,options={}){
      // Renderer-neutral Leaflet contract: +x/+y moves map content left/up.
      // Derive the camera center explicitly to avoid MapLibre panBy sign
      // ambiguities (regression from the v8 edge-dialog iPhone test).
      const x=Number(point.x),y=Number(point.y);
      const center=this.map.getCenter();
      const screen=this.map.project([center.lng,center.lat]);
      const next=this.map.unproject([screen.x+x,screen.y+y]);
      this.map.jumpTo({center:[next.lng,next.lat]});
    }
    setView(viewport,options={}){
      const p=ll(viewport.center);
      this.map.jumpTo({center:[p.lng,p.lat],zoom:viewport.zoom});
    }
    fitBounds(bounds,options={}){
      const positions=bounds.map(ll);
      if(!positions.length)return;
      const b=new this.gl.LngLatBounds();
      positions.forEach(p=>b.extend([p.lng,p.lat]));
      const opts={...options};
      if(Array.isArray(opts.padding))opts.padding={top:opts.padding[1],bottom:opts.padding[1],left:opts.padding[0],right:opts.padding[0]};
      this.map.fitBounds(b,opts);
    }
    setBasemap(id){
      if(id!=="street"&&id!=="topo")throw new RangeError("Unknown basemap: "+id);
      if(this.currentBasemap===id)return;
      this.currentBasemap=id;
      const topo=id==="topo";
      const style={
        version:8,
        sources:{base:{type:"raster",tileSize:256,
          tiles:topo?[
            "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
            "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
            "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"
          ]:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          maxzoom:topo?17:19,
          attribution:topo
            ?'© OpenStreetMap contributors · OpenTopoMap'
            :'© OpenStreetMap contributors'
        }},
        layers:[{id:"basemap-raster",type:"raster",source:"base"}]
      };
      this.map.setStyle(style);
    }
    zoomIn(){this.map.zoomIn({duration:120});}
    zoomOut(){this.map.zoomOut({duration:120});}
    zoomAround(position,zoom){
      // zoomTo supports "around"; jumpTo does not. Keep the held pin at
      // its exact current screen point even when the map zoom changes.
      const p=ll(position);
      this.map.zoomTo(zoom,{around:[p.lng,p.lat],duration:0,animate:false});
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
    // Lines are renderer-owned objects. Their GeoJSON source is restored on a
    // style switch, because MapLibre removes style layers and sources then.
    createLine(positions,options={}){
      const id="pin2map-preview-line-"+(++this.nextLineId);
      const line={id,positions:positions.map(ll),options,removed:false};
      this.lines.set(id,line);
      this.paintLine(line);
      return line;
    }
    setLinePositions(line,positions){
      if(!line||line.removed)return;
      line.positions=positions.map(ll);
      this.paintLine(line);
    }
    lineData(line){
      return {type:"Feature",properties:{},geometry:{type:"LineString",
        coordinates:line.positions.map(p=>[p.lng,p.lat])}};
    }
    paintLine(line){
      if(line.removed||!this.map.isStyleLoaded())return;
      const source=this.map.getSource(line.id);
      if(source){source.setData(this.lineData(line));return;}
      this.map.addSource(line.id,{type:"geojson",data:this.lineData(line)});
      const options=line.options;
      this.map.addLayer({id:line.id,type:"line",source:line.id,
        paint:{"line-color":options.color||"#d65a31","line-width":options.weight||3,
          "line-dasharray":options.dashArray
            ? options.dashArray.trim().split(/\s+/).map(Number)
            :[1,1]}});
    }
    restoreLines(){
      for(const line of this.lines.values())this.paintLine(line);
    }
    removeOverlay(overlay){
      if(!overlay)return;
      if(this.lines.has(overlay.id)){
        overlay.removed=true;this.lines.delete(overlay.id);
        if(this.map.getLayer(overlay.id))this.map.removeLayer(overlay.id);
        if(this.map.getSource(overlay.id))this.map.removeSource(overlay.id);
      }else if(typeof overlay.remove==="function")overlay.remove();
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
