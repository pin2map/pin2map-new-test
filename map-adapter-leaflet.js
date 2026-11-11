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
    // Provider catalog lives inside the renderer adapter: no Leaflet tile details
    // escape into application, UI, domain or project storage.
    setSatelliteAppearance({brightness=140}={}){
      // The filter belongs to the Esri satellite tile layer only.
      // Pins, tooltips, overlays and map controls remain untouched.
      const number=Number(brightness);
      const bounded=Number.isFinite(number)?Math.min(180,Math.max(70,number)):140;
      this.satelliteAppearance={brightness:bounded};
      if(this.activeBasemap!=="satellite"||!this.basemapLayer)return;
      const tiles=this.basemapLayer.getContainer();
      if(tiles)tiles.style.filter="brightness("+(bounded/100)+")";
    }
    setBasemap(id,{esriRelief=false,satelliteBrightness=140}={}) {
      const sources={
        street:{url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png",maxZoom:19,
          attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'},
        topo:{url:"https://a.tile.opentopomap.org/{z}/{x}/{y}.png",maxZoom:17,
          attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://opentopomap.org/">OpenTopoMap</a>'},
        international:{url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",maxZoom:19,attribution:"Tiles &copy; Esri"},
        satellite:{url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",maxZoom:19,attribution:"Tiles &copy; Esri"},
        humanitarian:{url:"https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",maxZoom:19,
          attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · HOT'}
      };
      const source=sources[id];
      if(!source)throw new RangeError("Unknown basemap: "+id);
      // Remove previous overlay first; never let its pane obscure markers or controls.
      if(this.reliefOverlay){this.map.removeLayer(this.reliefOverlay);this.reliefOverlay=null;}
      if(this.basemapLayer){this.map.removeLayer(this.basemapLayer);this.basemapLayer=null;}
      this.activeBasemap=id;
      this.basemapLayer=window.L.tileLayer(source.url,{
        maxZoom:source.maxZoom,crossOrigin:true,attribution:source.attribution
      }).addTo(this.map);
      this.setSatelliteAppearance({brightness:satelliteBrightness});
      // Historical relief composite still applies to non-satellite basemaps.
      // Do not override user brightness/contrast for satellite tiles.
      if(esriRelief){
        const container=this.basemapLayer.getContainer();
        if(container&&id!=="satellite")
          container.style.filter="saturate(0.68) contrast(0.94) brightness(1.04)";
        let pane=this.map.getPane("p2mEsriReliefPane");
        if(!pane)pane=this.map.createPane("p2mEsriReliefPane");
        pane.style.zIndex="250";
        pane.style.pointerEvents="none";
        pane.style.mixBlendMode="multiply";
        this.reliefOverlay=window.L.tileLayer(
          "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",{
          pane:"p2mEsriReliefPane",minZoom:1,maxNativeZoom:15,maxZoom:19,opacity:1,
          attribution:"Relief &copy; Esri und Datenanbieter"
        }).addTo(this.map);
      }
    }
    addZoomControls({onFitAll}) {
      const adapter=this;
      const control=window.L.control({position:"bottomleft"});
      control.onAdd=function(){
        const holder=window.L.DomUtil.create("div","pin-zoom-buttons leaflet-bar");
        const add=(symbol,title,action)=>{
          const button=window.L.DomUtil.create("button","pin-zoom-button",holder);
          button.type="button";button.textContent=symbol;button.title=title;
          window.Pin2MapIcons?.mount(button,symbol==="+"?"plus":symbol==="−"?"minus":"scan");
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
    // Presentational Leaflet tooltip port. Keep provider-specific anchoring
    // and safe DOM content creation out of the UI and application layers.
    setMarkerLabel(marker,text) {
      const name=String(text||"");
      if(!name){
        if(marker.getTooltip())marker.unbindTooltip();
        return;
      }
      const content=document.createElement("span");
      content.textContent=name; // Never interpret user-entered names as HTML.
      if(marker.getTooltip())marker.setTooltipContent(content);
      else marker.bindTooltip(content,{
        permanent:true,direction:"right",offset:[12,-18],
        className:"address-label",interactive:false
      });
    }
    // Per-pin information lives in a separate map overlay ABOVE the name tooltip.
    // Handles and Leaflet divIcon details never escape this adapter.
    setMarkerInfo(marker,html,onClick){
      if(!this.pinInfoOverlays)this.pinInfoOverlays=new Map();
      let overlay=this.pinInfoOverlays.get(marker);
      if(!html){
        if(overlay){this.map.removeLayer(overlay);this.pinInfoOverlays.delete(marker);}
        return;
      }
      const ll=marker.getLatLng();
      const options={interactive:true,keyboard:false,zIndexOffset:450,
        icon:window.L.divIcon({className:"elevation-label-wrap",
          html,iconSize:[0,0],iconAnchor:[0,34]})};
      if(!overlay){
        overlay=window.L.marker(ll,options).addTo(this.map);
        overlay.on("click",event=>{
          window.L.DomEvent.stop(event.originalEvent);
          onClick?.();
        });
        this.pinInfoOverlays.set(marker,overlay);
      }else{
        overlay.setLatLng(ll);
        overlay.setIcon(options.icon);
      }
    }
    getMarkerElement(marker) { return marker.getElement(); }
    onMarker(marker,event,callback) {
      const handler=e=>callback(event==="drag"||event==="dragend"?this.getMarkerPosition(e.target):e);
      marker.on(event,handler);
      return ()=>marker.off(event,handler);
    }
    removeOverlay(overlay) {
      if(!overlay)return;
      this.setMarkerInfo(overlay,"");
      this.map.removeLayer(overlay);
    }
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
    // Only the renderer knows which DOM descendants are map chrome,
    // marker elements or popups. This keeps gesture filtering out of app.js.
    isMapSurface(target) {
      if(!target || typeof target.closest!=="function")return false;
      return !target.closest(".leaflet-control, .leaflet-marker-icon, .leaflet-popup, .leaflet-tooltip, button, input");
    }
    stopMarkerEventPropagation(element) {
      window.L.DomEvent.disableClickPropagation(element);
      window.L.DomEvent.on(element,"mousedown touchstart",window.L.DomEvent.stopPropagation);
    }
    destroy() { this.map.remove(); }
  }
  root.Pin2MapLeafletAdapter=LeafletMapAdapter;
})(window);
