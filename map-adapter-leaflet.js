"use strict";
/*
 * First migration seam: renderer-independent viewport and event operations.
 * This file is deliberately separate from app.js. In this incremental phase,
 * Leaflet renderer, tile layers, controls and map event translation remain
 * private implementation details. The existing user experience must not change.
 *
 * Public coordinates: {lat, lng}; screen points: {x, y}.
 * Routing geometry (future): GeoJSON coordinates [lng, lat].
 */
(function (root) {
  function latLng(position) {
    if (Array.isArray(position)) return {lat: Number(position[0]), lng: Number(position[1])};
    return {lat: Number(position.lat), lng: Number(position.lng)};
  }
  function xy(point) {
    if (Array.isArray(point)) return {x: Number(point[0]), y: Number(point[1])};
    return {x: Number(point.x), y: Number(point.y)};
  }
  class LeafletMapAdapter {
    static mount(element,viewport) {
      const map=window.L.map(element,{zoomControl:false});
      map.setView([viewport.center.lat,viewport.center.lng],viewport.zoom);
      return new LeafletMapAdapter(map);
    }
    constructor(map) {
      if (!map || typeof map.getCenter !== "function") throw new TypeError("Leaflet map required");
      this.map = map;
    }
    getViewport() {
      const center=this.map.getCenter();
      return {center:{lat:center.lat,lng:center.lng},zoom:this.map.getZoom()};
    }
    getContainer() { return this.map.getContainer(); }
    getSize() {
      const size=this.map.getSize();
      return {x:size.x,y:size.y};
    }
    project(position) {
      const p=this.map.latLngToContainerPoint(latLng(position));
      return {x:p.x,y:p.y};
    }
    unproject(position) {
      const p=this.map.containerPointToLatLng(xy(position));
      return {lat:p.lat,lng:p.lng};
    }
    panBy(position,options={}) {
      const p=xy(position);
      this.map.panBy([p.x,p.y],options);
    }
    setView(viewport,options={}) {
      const center=latLng(viewport.center);
      this.map.setView([center.lat,center.lng],viewport.zoom,options);
    }
    fitBounds(bounds,options={}) {
      const pairs=bounds.map(pair=>[latLng(pair).lat,latLng(pair).lng]);
      this.map.fitBounds(pairs,options);
    }
    setBasemap(id) {
      if(id!=="street" && id!=="topo")throw new RangeError("Unknown basemap: "+id);
      if(this.basemapLayer)this.map.removeLayer(this.basemapLayer);
      const topo=id==="topo";
      this.basemapLayer=window.L.tileLayer(topo
        ? "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
        maxZoom:topo?17:19,
        attribution:topo
          ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://opentopomap.org/">OpenTopoMap</a>'
          : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.map);
    }
    addZoomControls({onFitAll}) {
      const adapter=this;
      const control=window.L.control({position:"topleft"});
      control.onAdd=function(){
        const holder=window.L.DomUtil.create("div","pin-zoom-buttons leaflet-bar");
        const add=(symbol,title,action)=>{
          const button=window.L.DomUtil.create("button","pin-zoom-button",holder);
          button.type="button";button.textContent=symbol;button.title=title;
          button.setAttribute("aria-label",title);
          window.L.DomEvent.on(button,"click",event=>{window.L.DomEvent.stop(event);action();});
        };
        add("+","Vergrößern",()=>adapter.zoomIn());
        add("−","Verkleinern",()=>adapter.zoomOut());
        add("◎","Alle sichtbaren Pins anzeigen",onFitAll);
        window.L.DomEvent.disableClickPropagation(holder);
        window.L.DomEvent.disableScrollPropagation(holder);
        return holder;
      };
      control.addTo(this.map);
      return ()=>control.remove();
    }
    // Normalize map clicks to a plain coordinate instead of exposing Leaflet events.
    onMapClick(callback) {
      const handler=event=>callback({lat:event.latlng.lat,lng:event.latlng.lng});
      this.map.on("click",handler);
      return ()=>this.map.off("click",handler);
    }
    zoomIn() { this.map.zoomIn(); }
    zoomOut() { this.map.zoomOut(); }
    invalidateSize() { this.map.invalidateSize(); }
    on(event,callback) {
      const names=event.split(/\s+/).filter(Boolean);
      for(const name of names)this.map.on(name,callback);
      return ()=>{for(const name of names)this.map.off(name,callback);};
    }
    // Renderer-neutral pin and preview primitives. Handles remain opaque to app.js.
    createMarker(position,options={}) {
      const p=latLng(position);
      return window.L.marker([p.lat,p.lng],options).addTo(this.map);
    }
    setMarkerPosition(marker,position) {
      const p=latLng(position); marker.setLatLng([p.lat,p.lng]);
    }
    getMarkerPosition(marker) {
      const p=marker.getLatLng(); return {lat:p.lat,lng:p.lng};
    }
    setMarkerAppearance(marker,{html,selected=false,label="",side="right",color="#d65a31",title="Pin"}={}) {
      const markup=html===undefined
        ? '<div class="pin-marker'+(selected?' selected':'')+'" style="background:'+color+'"></div>'+label
        : html;
      marker.setIcon(window.L.divIcon({html:markup,iconSize:[30,32],iconAnchor:[15,29],className:"pin-icon"}));
      marker.options.title=title;
    }
    getMarkerElement(marker) { return marker.getElement(); }
    onMarker(marker,event,callback) {
      const handler=e=>callback(event==="drag"||event==="dragend"?this.getMarkerPosition(e.target):e);
      marker.on(event,handler);
      return ()=>marker.off(event,handler);
    }
    removeOverlay(overlay) { if(overlay)this.map.removeLayer(overlay); }
    hasOverlay(overlay) { return this.map.hasLayer(overlay); }
    setMarkerZIndex(marker,value) { marker.setZIndexOffset(value); }
    createLine(positions,options={}) {
      return window.L.polyline(positions.map(p=>{const v=latLng(p);return [v.lat,v.lng];}),options).addTo(this.map);
    }
    setLinePositions(line,positions) {
      line.setLatLngs(positions.map(p=>{const v=latLng(p);return [v.lat,v.lng];}));
    }
    zoomAround(position,zoom,options={}) {
      const p=latLng(position);this.map.setZoomAround([p.lat,p.lng],zoom,options);
    }
    isPanEnabled() { return this.map.dragging.enabled(); }
    setPanEnabled(enabled) { if(enabled)this.map.dragging.enable();else this.map.dragging.disable(); }
    stopMarkerEventPropagation(element) {
      window.L.DomEvent.disableClickPropagation(element);
      window.L.DomEvent.on(element,"mousedown touchstart",window.L.DomEvent.stopPropagation);
    }
    destroy() { this.map.remove(); }
  }
  root.Pin2MapLeafletAdapter=LeafletMapAdapter;
})(window);
