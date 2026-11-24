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
    containsPoint(point){
      const p=latLng(point);
      return Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&this.map.getBounds().contains([p.lat,p.lng]);
    }
    getViewport() {
      const center=this.map.getCenter();
      return {center:{lat:center.lat,lng:center.lng},zoom:this.map.getZoom()};
    }
    getImageryQueryViewport(){
      const bounds=this.map.getBounds(),size=this.map.getSize();
      return {zoom:this.map.getZoom(),bounds:[
        bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()
      ],width:size.x,height:size.y};
    }
    getContainer() { return this.map.getContainer(); }
    disableDoubleClickZoom(){
      // Touch double taps belong to the app's context chooser, not Leaflet's
      // built-in double-click zoom. Desktop double-click behavior is preserved.
      this.map.doubleClickZoom?.disable();
    }
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
    projectAtZoom(position,zoom){
      const p=this.map.project(latLng(position),zoom);
      return {x:p.x,y:p.y};
    }
    panBy(position,options={}) {
      const p=xy(position);
      this.map.panBy([p.x,p.y],options);
    }
    setView(viewport,options={}) {
      const center=latLng(viewport.center);
      this.map.setView([center.lat,center.lng],viewport.zoom,options);
    }
    onViewportResize(callback){this.map.on("resize",callback);}
    fitBounds(bounds,options={}) {
      const pairs=bounds.map(pair=>[latLng(pair).lat,latLng(pair).lng]);
      this.map.fitBounds(pairs,options);
    }
    // Provider catalog lives inside the renderer adapter: no Leaflet tile details
    // escape into application, UI, domain or project storage.
    setSatelliteAppearance({brightness=120}={}){
      // The filter belongs to the Esri satellite tile layer only.
      // Pins, tooltips, overlays and map controls remain untouched.
      const number=Number(brightness);
      const bounded=Number.isFinite(number)?Math.min(180,Math.max(70,number)):120;
      this.satelliteAppearance={brightness:bounded};
      if(this.activeBasemap!=="satellite"||!this.basemapLayer)return;
      const tiles=this.basemapLayer.getContainer();
      if(tiles)tiles.style.filter="brightness("+(bounded/100)+")";
    }
    setBasemap(id,{esriRelief=false,satelliteBrightness=120,satelliteRoads=false}={}) {
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
      if(this.satelliteReferenceOverlays){for(const layer of this.satelliteReferenceOverlays)this.map.removeLayer(layer);this.satelliteReferenceOverlays=null;}
      if(this.basemapLayer){this.map.removeLayer(this.basemapLayer);this.basemapLayer=null;}
      this.activeBasemap=id;
      this.basemapLayer=window.L.tileLayer(source.url,{
        maxZoom:source.maxZoom,crossOrigin:true,attribution:source.attribution
      }).addTo(this.map);
      this.setSatelliteAppearance({brightness:satelliteBrightness});
      // Historical relief composite still applies to non-satellite basemaps.
      // Do not override user brightness/contrast for satellite tiles.
      if(id==="satellite"&&satelliteRoads){
        let pane=this.map.getPane("p2mSatelliteReferencePane");
        if(!pane)pane=this.map.createPane("p2mSatelliteReferencePane");
        pane.style.zIndex="280";pane.style.pointerEvents="none";
        this.satelliteReferenceOverlays=[
          "World_Transportation","World_Boundaries_and_Places"
        ].map(service=>window.L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/"+service+"/MapServer/tile/{z}/{y}/{x}",
          {pane:"p2mSatelliteReferencePane",maxZoom:19,attribution:"Reference &copy; Esri und Datenanbieter"}
        ).addTo(this.map));
      }
      if(esriRelief&&id!=="satellite"){
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
    clearTemporaryPlateArea(){
      if(!this.temporaryPlateArea)return;
      const old=this.temporaryPlateArea;
      this.map.off("moveend zoomend resize",old.reposition);
      if(old.pinMarker)this.setMarkerInfo(old.pinMarker,"");
      this.map.removeLayer(old.group);
      this.temporaryPlateArea=null;
    }
    showTemporaryPlateArea(entry,onLabel){
      this.clearTemporaryPlateArea();
      if(!["Polygon","MultiPolygon"].includes(entry?.geojson?.type))
        throw new TypeError("Temporary plate area requires a polygon");
      const prepared=window.Pin2MapAreaGeometry.prepare(entry.geojson,{
        touchDevice:/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.maxTouchPoints>1
      });
      const group=window.L.layerGroup().addTo(this.map);
      const shape=window.L.geoJSON(prepared.geometry,{
        interactive:false,className:"p2m-temporary-geometry-visible",
        style:{color:"#e64294",weight:3,
          fillColor:"#f35ba9",fillOpacity:0.32,interactive:false}
      }).addTo(group);
      const bounds=shape.getBounds();
      if(!bounds.isValid()){this.map.removeLayer(group);throw new Error("Ungültige Gebietsgrenze");}
      const label=document.createElement("span");
      label.className="p2m-plate-label";label.textContent=entry.label;
      const marker=window.L.marker(bounds.getCenter(),{
        keyboard:true,interactive:true,zIndexOffset:420,
        icon:window.L.divIcon({html:label.outerHTML,className:"p2m-plate-label-wrap",
          iconSize:[0,0],iconAnchor:[0,0]})
      }).addTo(group);
      marker.on("click",event=>{
        window.L.DomEvent.stop(event.originalEvent);
        const p=marker.getLatLng();
        onLabel?.({lat:p.lat,lng:p.lng});
      });
      const reposition=()=>{
        const size=this.getSize();
        const visible=window.Pin2MapAreaLabelAnchor.visibleAnchor(prepared.geometry,
          p=>this.project(p),size.x,size.y,{padding:85});
        // If the provider's geometry misses the clicked point, leave the map
        // untouched and keep the preview label at the original map tap.
        const fallback=entry.preserveViewport&&entry.anchorPoint?
          this.project(entry.anchorPoint):null;
        const point=visible||(fallback&&fallback.x>=0&&fallback.x<=size.x&&
          fallback.y>=0&&fallback.y<=size.y?fallback:null);
        if(point){
          marker.setLatLng(this.map.containerPointToLatLng([point.x,point.y]));
          marker.setOpacity(1);
        }else marker.setOpacity(0);
      };
      this.temporaryPlateArea={group,reposition};
      this.map.on("moveend zoomend resize",reposition);
      if(!entry.preserveViewport)this.map.fitBounds(bounds,{padding:[40,40],maxZoom:11,animate:false});
      reposition();
    }
    // Shared transient object renderer: no project records or persistence.
    // Pin and reference-place previews have the same 52x56 pin geometry.
    showTemporaryPin(entry,onLabel){
      this.clearTemporaryPlateArea();
      const p=latLng(entry.point);
      if(!Number.isFinite(p.lat)||Math.abs(p.lat)>90||
         !Number.isFinite(p.lng)||Math.abs(p.lng)>180)
        throw new TypeError("Invalid temporary pin position");
      const group=window.L.layerGroup().addTo(this.map);
      const html='<div class="pin-marker" style="color:#e64294">'+
        '<svg class="pin-marker-shape" viewBox="0 0 30 40" aria-hidden="true">'+
        '<path d="M15 38C10 30 2 21 2 15a13 13 0 0 1 26 0c0 6-8 15-13 23Z" '+
        'fill="currentColor" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>'+
        '<g class="pin-status-segments">'+
        '<path d="M15 14 8.1 18A8 8 0 0 1 15 6Z" fill="#e8edf2"/>'+
        '<path d="M15 14 15 6A8 8 0 0 1 21.9 18Z" fill="#e8edf2"/>'+
        '<path d="M15 14 21.9 18A8 8 0 0 1 8.1 18Z" fill="#e8edf2"/>'+
        '<circle cx="15" cy="14" r="8" fill="none" stroke="#fff" stroke-width="1.1"/>'+
        '<path d="M15 14V6M15 14 8.1 18M15 14 21.9 18" '+
        'stroke="#fff" stroke-width="1.05" stroke-linecap="round"/></g>'+
        '</svg></div>';
      const pin=window.L.marker([p.lat,p.lng],{
        keyboard:true,interactive:true,zIndexOffset:420,
        icon:window.L.divIcon({html,className:"pin-icon p2m-temporary-pin",
          iconSize:[52,56],iconAnchor:[26,39]})
      }).addTo(group);
      const label=document.createElement("span");
      label.className="p2m-plate-label p2m-temporary-pin-label";
      label.textContent=entry.referencePlace
        ?(entry.label+" – "+entry.referencePlace+" (Ersatzort)")
        :(entry.label||entry.name||"Pin");
      const tag=window.L.marker([p.lat,p.lng],{
        keyboard:true,interactive:true,zIndexOffset:421,
        icon:window.L.divIcon({html:label.outerHTML,
          className:"p2m-plate-label-wrap p2m-temporary-pin-wrap",
          iconSize:[0,0],iconAnchor:[-23,48]})
      }).addTo(group);
      const click=event=>{
        if(event.originalEvent)window.L.DomEvent.stop(event.originalEvent);
        // A held zoom may generate a synthetic Leaflet click. Never open
        // the save actions on that ghost click.
        if(this.temporaryPinTapSuppressed?.())return;
        onLabel?.({lat:p.lat,lng:p.lng});
      };
      pin.on("click",click);tag.on("click",click);
      if(this.temporaryPinGesture){
        const tap=()=>onLabel?.({lat:p.lat,lng:p.lng});
        this.temporaryPinGesture(pin,tap,pin);
        this.temporaryPinGesture(tag,tap,pin);
      }
      const updateLabel=()=>{
        label.textContent=entry.referencePlace
          ?(entry.label+" – "+entry.referencePlace+" (Ersatzort)")
          :(entry.label||entry.name||"Pin");
        tag.setIcon(window.L.divIcon({html:label.outerHTML,
          className:"p2m-plate-label-wrap p2m-temporary-pin-wrap",
          iconSize:[0,0],iconAnchor:[-23,48]}));
        // setIcon replaces its DOM node; restore touch/hold behavior.
        if(this.temporaryPinGesture){
          const tap=()=>onLabel?.({lat:p.lat,lng:p.lng});
          this.temporaryPinGesture(tag,tap,pin);
        }
      };
      this.temporaryPlateArea={group,entry,pinMarker:pin,updateLabel,reposition:()=>{}};
      if(!entry.preserveViewport)
        this.map.setView([p.lat,p.lng],Math.max(this.map.getZoom(),12),{animate:false});
    }
    setTemporaryPinInfo(html){
      const preview=this.temporaryPlateArea;
      if(!preview?.pinMarker)return false;
      this.setMarkerInfo(preview.pinMarker,html);
      return true;
    }
    setTemporaryPinGestureHandler(handler,isSuppressed=()=>false){
      this.temporaryPinGesture=handler;
      this.temporaryPinTapSuppressed=isSuppressed;
    }
    updateTemporaryPinLabel(entry){
      const preview=this.temporaryPlateArea;
      if(preview?.entry!==entry)return false;
      preview.updateLabel();
      return true;
    }
    showTemporaryPlatePoint(entry,onLabel){
      this.showTemporaryPin(entry,onLabel);
    }
    showTemporaryRiver(entry,onLabel){
      this.clearTemporaryPlateArea();
      if(!Array.isArray(entry.chains)||!entry.chains.length)
        throw new TypeError("Temporary river requires line geometry");
      const group=window.L.layerGroup().addTo(this.map);
      const lines=entry.chains.filter(chain=>Array.isArray(chain)&&chain.length>=2)
        .map(chain=>chain.map(point=>[point[0],point[1]]));
      if(!lines.length){this.map.removeLayer(group);throw new TypeError("Empty river geometry");}
      const shape=window.L.polyline(lines,{
        color:"#e64294",weight:5,opacity:0.96,interactive:false,
        className:"p2m-temporary-geometry-visible"
      }).addTo(group);
      // The thin visible river line needs an iPhone-sized invisible tap
      // corridor, just like permanently saved river objects.
      const hit=window.L.polyline(lines,{
        color:"#e64294",weight:24,opacity:0.015,
        interactive:true,bubblingMouseEvents:false,
        className:"p2m-temporary-river-hit"
      }).addTo(group);
      const bounds=shape.getBounds();
      const label=document.createElement("span");
      label.className="p2m-plate-label";
      label.textContent=entry.label||entry.name||"Fluss";
      const marker=window.L.marker(bounds.getCenter(),{
        keyboard:true,interactive:true,zIndexOffset:420,
        icon:window.L.divIcon({html:label.outerHTML,
          className:"p2m-plate-label-wrap",iconSize:[0,0],iconAnchor:[0,0]})
      }).addTo(group);
      const click=event=>{
        if(event.originalEvent)window.L.DomEvent.stop(event.originalEvent);
        const p=event.latlng||marker.getLatLng();
        onLabel?.({lat:p.lat,lng:p.lng});
      };
      marker.on("click",click);hit.on("click",click);
      const reposition=()=>{
        const {x:width,y:height}=this.getSize();
        const anchor=window.Pin2MapRiverLabelAnchor.findVisibleAnchor(
          entry.chains,p=>this.project(p),width,height,40);
        if(!anchor){marker.setOpacity(0);return;}
        marker.setLatLng(this.map.containerPointToLatLng([anchor.x,anchor.y]));
        marker.setOpacity(1);
      };
      this.temporaryPlateArea={group,reposition};
      this.map.on("moveend zoomend resize",reposition);
      if(!entry.preserveViewport)this.map.fitBounds(bounds,{padding:[40,40],maxZoom:11,animate:false});
      reposition();
    }
    // Compatibility port: a GPS location is now ALWAYS a full pink
    // temporary pin, never the old gray circle marker.
    showTemporaryGpsPoint(position,onLabel){
      this.showTemporaryPin({kind:"point",point:position,label:"GPS-Location"},onLabel);
    }
    clearTemporaryGpsPoint(){
      this.clearTemporaryPlateArea();
    }
    showSatelliteSelection(position){
      this.clearSatelliteSelection();
      const p=latLng(position);
      this.satelliteSelectionRing=window.L.circleMarker([p.lat,p.lng],{
        radius:30,color:"#414141",weight:2,dashArray:"5 5",
        fillColor:"#ffde00",fillOpacity:0.46,interactive:false
      }).addTo(this.map);
      const icon=window.Pin2MapIcons.svg("satellite",document).outerHTML;
      this.satelliteSelectionSymbol=window.L.marker([p.lat,p.lng],{
        interactive:false,keyboard:false,zIndexOffset:550,
        icon:window.L.divIcon({html:icon,className:"p2m-satellite-selection-icon",
          iconSize:[24,24],iconAnchor:[12,12]})
      }).addTo(this.map);
    }
    setInspectionCursor(active){this.map.getContainer().classList.toggle("p2m-satellite-inspecting",!!active);}
    clearSatelliteSelection(){
      for(const key of ["satelliteSelectionRing","satelliteSelectionSymbol"]){
        if(this[key]){this.map.removeLayer(this[key]);this[key]=null;}
      }
    }
    // Exact predecessor control contract: Leaflet's native metric scale,
    // automatic scale changes on map zoom/move, no imperial line.
    addScaleControl(){
      if(this.scaleControl)return this.scaleControl;
      this.scaleControl=window.L.control.scale({
        position:"bottomleft",metric:true,imperial:false,maxWidth:160
      }).addTo(this.map);
      return this.scaleControl;
    }
    addZoomControls({onFitAll,onUndo,onRedo}) {
      const adapter=this;
      const control=window.L.control({position:"bottomleft"});
      control.onAdd=function(){
        const holder=window.L.DomUtil.create("div","pin-zoom-buttons leaflet-bar");
        const add=(symbol,title,action,icon)=>{
          const button=window.L.DomUtil.create("button","pin-zoom-button",holder);
          button.type="button";button.textContent=symbol;button.title=title;
          window.Pin2MapIcons?.mount(button,icon|| (symbol==="+"?"plus":symbol==="−"?"minus":"scan"));
          button.setAttribute("aria-label",title);
          window.L.DomEvent.on(button,"click",event=>{window.L.DomEvent.stop(event);if(!button.disabled)action();});
          return button;
        };
        adapter.zoomUndoButton=add("↶","Zurück zur letzten Ansicht",onUndo||(()=>{}),"undo-2");
        adapter.zoomUndoButton.disabled=true;
        adapter.zoomRedoButton=add("↷","Weiter zur nächsten Ansicht",onRedo||(()=>{}),"redo-2");
        adapter.zoomRedoButton.disabled=true;
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
    onMapClick(callback,{allowNonSurface=()=>false}={}) {
      const handler=event=>{
        // Ordinary background actions need a bare map target. The existing
        // pin relocation and satellite inspection modes are exceptions:
        // their own SVG preview target may cover the map click position.
        if(event.originalEvent&&!this.isMapSurface(event.originalEvent.target)&&
          !allowNonSurface())return;
        callback({lat:event.latlng.lat,lng:event.latlng.lng});
      };
      this.map.on("click",handler);
      return ()=>this.map.off("click",handler);
    }
    updateZoomUndo(enabled){if(this.zoomUndoButton)this.zoomUndoButton.disabled=!enabled;}
    updateZoomRedo(enabled){if(this.zoomRedoButton)this.zoomRedoButton.disabled=!enabled;}
    updateZoomHistory({undo,redo}){this.updateZoomUndo(undo);this.updateZoomRedo(redo);}
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
    setMarkerPriority(marker,priority=0){marker.setZIndexOffset(priority);}
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
      marker.setIcon(window.L.divIcon({html:markup,iconSize:[52,56],iconAnchor:[26,39],className:"pin-icon"}));
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
        permanent:true,direction:"right",offset:[28,-18],
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
          html,iconSize:[0,0],iconAnchor:[0,47]})};
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
    createRouteTimeMarker({lat,lng,hour}){
      const size=hour?16:5;
      const icon=window.L.divIcon({className:"p2m-route-time",html:hour?String(hour):"",
        iconSize:[size,size],iconAnchor:[size/2,size/2]});
      return window.L.marker([lat,lng],{icon,interactive:false,keyboard:false,zIndexOffset:300}).addTo(this.map);
    }
    onRouteLine(line,callback){
      if(!line||typeof callback!=="function")throw new TypeError("Route line callback required");
      const handler=event=>{if(event.originalEvent)window.L.DomEvent.stop(event.originalEvent);
        callback({lat:event.latlng.lat,lng:event.latlng.lng});};
      line.on("click",handler);return ()=>line.off("click",handler);
    }
    showRouteGuides(guides,onClick){
      for(const marker of this.routeGuideLayers||[])this.map.removeLayer(marker);
      this.routeGuideLayers=[];
      for(const guide of guides||[]){
        const p=latLng(guide);
        if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180)continue;
        const symbol=window.Pin2MapIcons.svg("flag-triangle-right",document).outerHTML;
        const marker=window.L.marker([p.lat,p.lng],{
          icon:window.L.divIcon({className:"p2m-route-guide-holder",html:symbol,
            iconSize:[32,32],iconAnchor:[7,30]})}).addTo(this.map);
        marker.on("click",e=>{if(e.originalEvent)window.L.DomEvent.stop(e.originalEvent);onClick?.(guide.id);});
        this.routeGuideLayers.push(marker);
      }
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
      return !target.closest(".leaflet-control, .leaflet-marker-icon, .leaflet-popup, .leaflet-tooltip, .leaflet-interactive, button, input, textarea, select");
    }
    stopMarkerEventPropagation(element) {
      window.L.DomEvent.disableClickPropagation(element);
      window.L.DomEvent.on(element,"mousedown touchstart",window.L.DomEvent.stopPropagation);
    }
    updateRiverLabels(){
      if(!this.riverNameMarkers?.length)return;
      const {x:width,y:height}=this.getSize();
      const anchor=window.Pin2MapRiverLabelAnchor;
      for(const item of this.riverNameMarkers){
        const point=anchor.findVisibleAnchor(item.chains,
          latLng=>this.project(latLng),width,height,30);
        if(!point){
          item.marker.setOpacity(0);
          continue;
        }
        item.marker.setLatLng(this.map.containerPointToLatLng([point.x,point.y]));
        item.marker.setOpacity(1);
      }
    }
    getRiverLabelTargets(){
      return (this.riverNameMarkers||[]).flatMap(item=>{
        if(item.marker.options.opacity===0)return [];
        const element=item.marker.getElement()?.querySelector(".p2m-river-name-label");
        if(!element)return [];
        const r=element.getBoundingClientRect();
        if(r.width<=0||r.height<=0)return [];
        const ll=item.marker.getLatLng();
        return [{type:"river",id:item.id,name:item.name,position:{lat:ll.lat,lng:ll.lng},
          rects:[{left:r.left,right:r.right,top:r.top,bottom:r.bottom}]}];
      });
    }
    getAreaLabelTargets(){
      const rect=element=>{
        const r=element.getBoundingClientRect();
        return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
      };
      return (this.areaNameMarkers||[]).flatMap(item=>{
        const element=item.marker.getElement()?.querySelector(".p2m-area-name-label");
        if(!element||item.marker.options.opacity===0)return [];
        const r=rect(element);
        if(r.right<=r.left||r.bottom<=r.top)return [];
        const ll=item.marker.getLatLng();
        return [{type:"area",id:item.id,name:item.name,kind:item.kind,
          position:{lat:ll.lat,lng:ll.lng},rects:[r]}];
      });
    }
    updateAreaLabels(){
      if(!this.areaNameMarkers?.length)return;
      const {x:width,y:height}=this.getSize();
      const anchor=window.Pin2MapAreaLabelAnchor;
      for(const item of this.areaNameMarkers){
        // Reserve space for longer labels so the whole tappable name
        // remains inside the viewport, not merely its zero-sized anchor.
        const renderedWidth=item.marker.getElement()?.querySelector(".p2m-area-name-label")?.getBoundingClientRect()?.width;
        const padding=Math.max(45,Math.min(185,
          Number.isFinite(renderedWidth)&&renderedWidth>0?renderedWidth/2+10:item.name.length*3.9+30));
        const point=anchor.visibleAnchor(item.geometry,
          latLng=>this.project(latLng),width,height,{padding});
        if(!point){
          item.marker.setOpacity(0);
          if(item.marker.getElement())item.marker.getElement().style.pointerEvents="none";
          continue;
        }
        item.marker.setLatLng(this.map.containerPointToLatLng([point.x,point.y]));
        item.marker.setOpacity(1);
        if(item.marker.getElement())item.marker.getElement().style.pointerEvents="";
      }
    }
    updateFeatureLabels(){
      this.updateRiverLabels();
      this.updateAreaLabels();
    }
    showAttachedGpx(chains){
      this.clearAttachedGpx();
      const group=window.L.featureGroup().addTo(this.map);
      for(const chain of chains){
        window.L.polyline(chain,{color:"#ed4035",weight:5,opacity:.92,
          interactive:false}).addTo(group);
      }
      this.attachedGpxLayer=group;
      const bounds=group.getBounds();
      if(bounds.isValid())this.map.fitBounds(bounds,{padding:[40,40],maxZoom:15});
    }
    clearAttachedGpx(){
      if(this.attachedGpxLayer)this.map.removeLayer(this.attachedGpxLayer);
      this.attachedGpxLayer=null;
    }
    renderProjectGeometry({areas=[],rivers=[],layerColors={},onAreaLabel=()=>{},
      onRiverLine=()=>{},highlightIds=null,flashIds=null}={}){
      // Keep exactly one viewport listener across redraws; do not recreate
      // geometry layers on map pan/zoom, only reposition lightweight labels.
      if(!this.riverLabelMoveHandler){
        this.riverLabelMoveHandler=()=>this.updateFeatureLabels();
        this.map.on("moveend zoomend resize",this.riverLabelMoveHandler);
      }
      if(this.featureLayers){this.map.removeLayer(this.featureLayers);this.featureLayers=null;}
      this.riverNameMarkers=[];
      this.areaNameMarkers=[];
      const group=window.L.layerGroup().addTo(this.map);
      this.featureLayers=group;
      const touch=/iPad|iPhone|iPod/.test(navigator.userAgent)||
        /MacIntel|MacARM/.test(navigator.platform)&&navigator.maxTouchPoints>1;
      let pointTotal=0;
      for(const area of areas){
        if(!["Polygon","MultiPolygon"].includes(area.geometry?.type))continue;
        const prepared=window.Pin2MapAreaGeometry.prepare(area.geometry,{
          touchDevice:touch,existingPoints:pointTotal
        });
        pointTotal=prepared.totalPoints;
        const color=/^#[0-9a-f]{6}$/i.test(area.color||"")?area.color:(layerColors[area.layerId]||"#326cc2");
        const geo=window.L.geoJSON(prepared.geometry,{
          interactive:false,
          className:flashIds?.has((area.kind==="lake"?"lakes":"areas")+":"+area.id)?"p2m-new-object-blink-geometry":"",
          style:{color,weight:2,fillColor:color,fillOpacity:.24,interactive:false}
        }).addTo(group);
        const bounds=geo.getBounds();
        if(!bounds.isValid()||!area.name)continue;
        const content=window.Pin2MapFeatureLabel.create(
          area.kind==="lake"?"lake":"area",area,layerColors[area.layerId]||"#326cc2",document);
        const marker=window.L.marker(bounds.getCenter(),{
          keyboard:true,interactive:true,zIndexOffset:highlightIds?.has("areas:"+area.id)||highlightIds?.has("lakes:"+area.id)?1800:350,
          icon:window.L.divIcon({html:content.outerHTML,className:"p2m-area-name-wrap",
            iconSize:[0,0],iconAnchor:[0,0]})
        }).addTo(group);
        marker.on("click",e=>{
          window.L.DomEvent.stop(e.originalEvent);
          const ll=marker.getLatLng();
          onAreaLabel(area,{lat:ll.lat,lng:ll.lng});
        });
        this.areaNameMarkers.push({marker,id:area.id,kind:area.kind,
          geometry:prepared.geometry,name:area.name});
      }
      for(const river of rivers){
        const color=/^#[0-9a-f]{6}$/i.test(river.color||"")?river.color:(layerColors[river.layerId]||"#1689e5");
        for(const chain of river.chains||[]){
          if(chain.length<2)continue;
          const line=window.L.polyline(chain,{color,weight:5,opacity:.9,
            lineCap:"round",lineJoin:"round",interactive:false,
            className:flashIds?.has("rivers:"+river.id)?"p2m-new-object-blink-geometry":""}).addTo(group);
          const hit=window.L.polyline(chain,{color,weight:24,opacity:.015,
            lineCap:"round",lineJoin:"round",interactive:true,bubblingMouseEvents:false}).addTo(group);
          hit.on("click",e=>{
            window.L.DomEvent.stop(e.originalEvent);
            onRiverLine(river,{lat:e.latlng.lat,lng:e.latlng.lng});
          });
        }
        if((river.chains||[]).some(chain=>chain.length>=2)&&river.name){
          const name=window.Pin2MapFeatureLabel.create(
            "river",river,layerColors[river.layerId]||"#1689e5",document);
          // The initial coordinate is only a placeholder; updateRiverLabels
          // immediately moves it onto the currently visible section.
          const marker=window.L.marker([0,0],{
            interactive:true,keyboard:true,zIndexOffset:highlightIds?.has("rivers:"+river.id)?1800:300,
            icon:window.L.divIcon({html:name.outerHTML,className:"p2m-river-name-wrap",
              iconSize:[0,0],iconAnchor:[0,0]})
          }).addTo(group);
          // A river name is a real object entry point. The broad transparent
          // line hit target must not steal pointer events from the label.
          marker.on("click",event=>{
            window.L.DomEvent.stop(event.originalEvent);
            const point=marker.getLatLng();
            onRiverLine(river,{lat:point.lat,lng:point.lng});
          });
          this.riverNameMarkers.push({marker,id:river.id,name:river.name,chains:river.chains});
        }
      }
      this.updateFeatureLabels();
    }
    fitGeometry(item){
      let bbox=null;
      if(item.geometry&&["Polygon","MultiPolygon"].includes(item.geometry.type)){
        const geo=window.L.geoJSON(item.geometry,{interactive:false});
        bbox=geo.getBounds();
      }else if(Array.isArray(item.chains)&&item.chains.length){
        const pts=item.chains.flat().map(p=>[p[0],p[1]]);
        bbox=window.L.latLngBounds(pts);
      }
      if(bbox?.isValid())this.map.fitBounds(bbox,{
        paddingTopLeft:[45,90],paddingBottomRight:[45,55],maxZoom:11,animate:false
      });
    }
    destroy() {
      if(this.riverLabelMoveHandler)
        this.map.off("moveend zoomend resize",this.riverLabelMoveHandler);
      this.riverNameMarkers=[];
      this.areaNameMarkers=[];
      this.map.remove();
    }
  }
  root.Pin2MapLeafletAdapter=LeafletMapAdapter;
})(window);
