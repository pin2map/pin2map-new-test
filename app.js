"use strict";
(function () {
  const $ = id => document.getElementById(id);
  const GEOCACHE_HOURS = 24;
  const projectModel = window.Pin2MapProjectModel;
  if (!projectModel) throw new Error("pin2map project-model.js must load before app.js");
  const PRIVATE_ID = projectModel.PRIVATE_ID;
  const COLORS = projectModel.DEFAULT_COLORS;
  const defaults = projectModel.defaultProject;
  let projectStore, state = defaults(), mapAdapter, markers = new Map();
  const uiState = new window.Pin2MapUIState();
  let saveTimer, searchAbort, searchSerial = 0, lastRequestAt = 0;
  let longPressTimer = null, longPressStart = null, suppressMapClickUntil = 0, activePointers = new Set();
  let lastTouchStartAt = 0, markerPressTimer = null, markerPressStart = null;
  let movePreview = null, moveMarker = null, moveLine = null;
  let mapOverlayFrame = 0;
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "pin-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const layerById = id => state.layers.find(x => x.id === id);
  const selectedPin = () => state.pins.find(p => p.id === uiState.selectedPinId);
  const cleanText = projectModel.cleanText;
  const uiShell = new window.Pin2MapUIShell({getElement:$});
  const pinEditorView = new window.Pin2MapPinEditorView({
    getElement:$,document,scheduleFrame:requestAnimationFrame
  });
  const searchView = new window.Pin2MapSearchResultsView({
    container:$("searchResults"),document,
    onChoose:result=>choosePlace(result),
    titleOf:result=>placeTitle(result),
    detailOf:result=>placeDetail(result)
  });
  const showNotice = message => uiShell.showNotice(message);
  function dbWrite() {
    return projectStore ? projectStore.saveProject(state) : Promise.resolve();
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => dbWrite().catch(() => showNotice("Lokales Speichern fehlgeschlagen")), 300);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
  function persistViewport() {
    const view = mapAdapter.getViewport();
    state.viewport = { lat: view.center.lat, lng: view.center.lng, zoom: view.zoom }; save();
  }
  function setTileLayer() {
    mapAdapter.setBasemap(state.basemap);
    $("basemapSelect").value = state.basemap;
  }
  function markerAppearance(pin,highlighted,label,side) {
    const layer=layerById(pin.layerId);
    const color=layer?layer.color:COLORS[0];
    const labelHtml=label?'<span class="pin-side-label '+side+(highlighted?' highlighted':'')+'">'+esc(label)+'</span>':'';
    return {html:'<div class="pin-marker'+(highlighted?' selected':'')+'" style="background:'+color+'"></div>'+labelHtml,
      title:pin.name||"Pin"};
  }
  function renderMarkers() {
    if(!mapAdapter)return;
    const shown=new Set(),occupied=[];
    const sorted=[...state.pins].sort((a,b)=>Number(b.id===uiState.selectedPinId)-Number(a.id===uiState.selectedPinId));
    for(const pin of sorted){
      if(!layerById(pin.layerId)?.visible)continue;
      shown.add(pin.id);
      let marker=markers.get(pin.id);
      if(!marker){
        marker=mapAdapter.createMarker({lat:pin.lat,lng:pin.lng},{draggable:false,autoPan:false});
        mapAdapter.onMarker(marker,"click",()=>{if(Date.now()<suppressMapClickUntil||uiState.moveMode)return;selectPin(pin.id);});
        markers.set(pin.id,marker);
      }
      mapAdapter.setMarkerPosition(marker,{lat:pin.lat,lng:pin.lng});
      const chosen=pin.id===uiState.selectedPinId,point=mapAdapter.project({lat:pin.lat,lng:pin.lng});
      const side=point.x>mapAdapter.getSize().x*0.55?"left":"right";
      let label=cleanText(pin.name);
      if(!chosen&&!state.labelsVisible)label="";
      if(label){
        const width=Math.min(175,Math.max(80,mapAdapter.getSize().x*0.40));
        const left=side==="right"?point.x+20:point.x-20-width;
        const box={left,right:left+width,top:point.y-40,bottom:point.y-10};
        if(!chosen&&occupied.some(r=>!(r.right<box.left||r.left>box.right||r.bottom<box.top||r.top>box.bottom)))label="";
        else occupied.push(box);
      }
      mapAdapter.setMarkerAppearance(marker,markerAppearance(pin,chosen,label,side));
      attachMarkerLongPress(marker,pin.id);
      
    }
    for(const [id,marker] of markers)if(!shown.has(id)){mapAdapter.removeOverlay(marker);markers.delete(id);}
  }
  function deleteLayerOrPrivatePins(id) {
    const layer=layerById(id);
    if(!layer)return;
    const count=state.pins.filter(p=>p.layerId===id).length;
    if(id===PRIVATE_ID&&!count){showNotice("Keine privaten Pins vorhanden");return;}
    const privateOnly=id===PRIVATE_ID;
    const heading=privateOnly?"Alle Pins in Privat löschen?":"Ebene „"+layer.name+"“ löschen?";
    const message=privateOnly
      ?"Die Ebene Privat bleibt bestehen. "+count+" Pins werden gelöscht."
      :"Die Ebene und "+count+" zugeordnete Pins werden gelöscht.";
    $("bulkTitle").textContent=heading;
    $("bulkDescription").textContent=message;
    $("bulkDialog").returnValue="cancel";
    $("bulkDialog").showModal();
    $("bulkDialog").onclose=()=>{
      if($("bulkDialog").returnValue!=="confirm")return;
      const pins=state.pins.filter(p=>p.layerId!==id);
      const layers=privateOnly?state.layers:state.layers.filter(l=>l.id!==id);
      const currentSelected=uiState.selectedPinId;
      state.pins=pins;state.layers=layers;
      if(currentSelected&&!pins.some(p=>p.id===currentSelected))uiState.selectedPinId=null;
      save();renderLayers();renderMarkers();renderPinPanel();
      showNotice(privateOnly?"Private Pins gelöscht":"Ebene und Pins gelöscht");
    };
  }
  // Matches the predecessor app: a held pin alternates 18/14 at its on-screen pixel.
  // A tap still opens/closes its editor; dragging a pin never moves it.
  function zoomHeldPin(marker){
    if(!mapAdapter || !mapAdapter.hasOverlay(marker))return;
    const pinPosition=mapAdapter.getMarkerPosition(marker);
    const second=marker._heldZoomClose===true;
    const providerMax=state.basemap==="topo"?17:19;
    const target=Math.min(second?14:18,providerMax);
    const anchor=mapAdapter.project(pinPosition);
    mapAdapter.zoomAround(pinPosition,target,{animate:false});
    const actual=mapAdapter.project(pinPosition);
    const delta={x:actual.x-anchor.x,y:actual.y-anchor.y};
    if(Math.abs(delta.x)>0.5 || Math.abs(delta.y)>0.5)mapAdapter.panBy(delta,{animate:false});
    marker._heldZoomClose=!second;
    persistViewport();updatePanelLayout();
  }
  function attachMarkerLongPress(marker,id){
    const element=mapAdapter.getMarkerElement(marker);
    if(!element || element.dataset.pinGestureBound)return;
    element.dataset.pinGestureBound="true";
    // Stop Leaflet dragging for touches and mouse presses that begin on a pin.
    mapAdapter.stopMarkerEventPropagation(element);
    element.style.touchAction="none";
    element.addEventListener("pointerdown",event=>{
      if(event.button!==0 || uiState.moveMode)return;
      event.stopPropagation();
      if(markerPressStart)return;
      const gesture={id:event.pointerId,x:event.clientX,y:event.clientY,
        activated:false,cancelled:false,finished:false,wasDraggable:mapAdapter.isPanEnabled()};
      markerPressStart=gesture;
      if(gesture.wasDraggable)mapAdapter.setPanEnabled(false);
      try{element.setPointerCapture(gesture.id);}catch(_){}
      const cleanup=()=>{
        clearTimeout(markerPressTimer);markerPressTimer=null;
        if(markerPressStart===gesture)markerPressStart=null;
        if(gesture.wasDraggable)mapAdapter.setPanEnabled(true);
        gesture.finished=true;
        element.removeEventListener("pointermove",onMove);
        element.removeEventListener("pointerup",onUp);
        element.removeEventListener("pointercancel",onCancel);
        element.removeEventListener("lostpointercapture",onCancel);
        try{if(element.hasPointerCapture(gesture.id))element.releasePointerCapture(gesture.id);}catch(_){}
      };
      const onMove=e=>{
        if(e.pointerId!==gesture.id || gesture.finished)return;
        e.stopPropagation();
        // Before zooming, movement cancels the hold. After zooming, no dragging occurs.
        if(!gesture.activated && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>11){
          gesture.cancelled=true;cleanup();
        }else if(gesture.activated)e.preventDefault();
      };
      const onUp=e=>{
        if(e.pointerId!==gesture.id || gesture.finished)return;
        e.stopPropagation();e.preventDefault();
        const tap=!gesture.activated&&!gesture.cancelled;
        suppressMapClickUntil=Date.now()+600;
        cleanup();
        if(tap)selectPin(id);
        else renderMarkers();
      };
      const onCancel=e=>{
        if(e.pointerId!==gesture.id || gesture.finished)return;
        gesture.cancelled=true;cleanup();
      };
      element.addEventListener("pointermove",onMove,{passive:false});
      element.addEventListener("pointerup",onUp,{passive:false});
      element.addEventListener("pointercancel",onCancel);
      element.addEventListener("lostpointercapture",onCancel);
      markerPressTimer=setTimeout(()=>{
        if(markerPressStart!==gesture || gesture.finished || gesture.cancelled)return;
        gesture.activated=true;
        suppressMapClickUntil=Date.now()+900;
        zoomHeldPin(marker);
        if(navigator.vibrate)navigator.vibrate(15);
      },550);
    },{passive:false});
  }
  function positionMoveBar(){
    if(!movePreview || !uiState.moveMode)return;
    const bar=$("moveBar");
    if(bar.classList.contains("hidden"))return;
    const appRect=$("app").getBoundingClientRect();
    const mapRect=mapAdapter.getContainer().getBoundingClientRect();
    const point=mapAdapter.project(movePreview);
    const x=mapRect.left+point.x;
    const y=mapRect.top+point.y;
    const width=bar.offsetWidth,height=bar.offsetHeight;
    if(!width || !height)return;
    const viewport=window.visualViewport;
    const visibleLeft=viewport?viewport.offsetLeft:0;
    const visibleTop=viewport?viewport.offsetTop:0;
    const visibleRight=visibleLeft+(viewport?viewport.width:window.innerWidth);
    const visibleBottom=visibleTop+(viewport?viewport.height:window.innerHeight);
    const margin=8;
    // Screen-space position within #app, not within the movable Leaflet pane.
    const centerX=Math.max(visibleLeft+margin+width/2,
      Math.min(visibleRight-margin-width/2,x));
    const desiredBelow=y+30;  // Small gap below the preview marker.
    const desiredAbove=y-height-30;
    const top=desiredBelow+height+margin<=visibleBottom
      ?desiredBelow:Math.max(visibleTop+margin,desiredAbove);
    bar.style.left=(centerX-width/2-appRect.left)+"px";
    bar.style.top=(top-appRect.top)+"px";
    bar.style.right="auto";
    bar.style.bottom="auto";
    bar.style.transform="none";
  }
  function removeMovePreview(){
    if(moveMarker){mapAdapter.removeOverlay(moveMarker);moveMarker=null;}
    if(moveLine){mapAdapter.removeOverlay(moveLine);moveLine=null;}
    movePreview=null;
    $("confirmMove").disabled=true;
    $("moveBar").classList.add("hidden");
  }
  function previewMove(position){
    const pin=selectedPin();if(!uiState.moveMode||!pin)return;
    movePreview={lat:Number(position.lat),lng:Number(position.lng)};
    const old=[pin.lat,pin.lng];
    if(!moveMarker){
      moveMarker=mapAdapter.createMarker(movePreview,{draggable:true,autoPan:false,zIndexOffset:1000});
      mapAdapter.onMarker(moveMarker,"drag",previewMove);
      mapAdapter.onMarker(moveMarker,"dragend",previewMove);
    }else mapAdapter.setMarkerPosition(moveMarker,movePreview);
    if(!moveLine)moveLine=mapAdapter.createLine([old,movePreview],{color:"#d65a31",weight:3,dashArray:"7 5",interactive:false});
    else mapAdapter.setLinePositions(moveLine,[old,movePreview]);
    $("confirmMove").disabled=false;
    $("moveText").textContent="Neue Position";
    $("moveBar").classList.remove("hidden");
    positionMoveBar();
  }
  function endMove(){
    uiState.moveMode=false;removeMovePreview();
    $("moveBar").classList.add("hidden");
    updateModeUI();renderPinPanel();
  }
  function beginMove(){
    if(!selectedPin())return;
    uiState.moveMode=true;removeMovePreview();
    $("pinPanel").classList.add("hidden");
    document.body.classList.remove("pin-open");
    $("pinDialogTip").classList.add("hidden");
    // Controls only appear once a new position has been selected.
    $("moveBar").classList.add("hidden");
    updateModeUI();
  }
  function confirmMove(){
    const pin=selectedPin();if(!pin||!movePreview)return;
    pin.lat=movePreview.lat;pin.lng=movePreview.lng;
    endMove();save();renderMarkers();renderPinPanel();showNotice("Position gespeichert");
  }
  function renderLayers() {
    const list = $("layersList");
    list.replaceChildren();
    for (const layer of state.layers) {
      const row = document.createElement("div"); row.className = "layer-row";
      const eye = document.createElement("input"); eye.type = "checkbox"; eye.checked = layer.visible; eye.title = "Ebene sichtbar"; eye.setAttribute("aria-label", layer.name + " sichtbar");
      eye.addEventListener("change", () => { layer.visible = eye.checked; save(); renderLayers(); renderMarkers(); renderPinPanel(); });
      const dot = document.createElement("span"); dot.className = "layer-color"; dot.style.background = layer.color;
      const label = document.createElement("div"); label.className = "layer-name";
      const name = document.createElement("strong"); name.textContent = layer.name;
      const count = document.createElement("small"); count.textContent = state.pins.filter(p => p.layerId === layer.id).length + " Pins";
      label.append(name, count);
      row.append(eye,dot,label);
      const del=document.createElement("button");
      del.type="button";del.className="layer-delete";
      const isPrivate=layer.id===PRIVATE_ID;
      const pinCount=state.pins.filter(p=>p.layerId===PRIVATE_ID).length;
      del.textContent=isPrivate?"⌫":"✕";
      del.title=isPrivate?"Alle Pins in Privat löschen":"Ebene mit Pins löschen";
      del.setAttribute("aria-label",del.title);
      del.disabled=isPrivate && pinCount===0;
      del.addEventListener("click",()=>deleteLayerOrPrivatePins(layer.id));
      row.append(del);
      list.append(row);
    }
    const layerSelect = $("pinLayer"); const existing = layerSelect.value;
    layerSelect.replaceChildren();
    for (const layer of state.layers) {
      const option = document.createElement("option"); option.value = layer.id; option.textContent = layer.name;
      layerSelect.append(option);
    }
    layerSelect.value = selectedPin() ? selectedPin().layerId : existing;
  }
  function panelHeight(){return selectedPin()&&!$("pinPanel").classList.contains("hidden")?$("pinPanel").offsetHeight:0;}
  function updatePanelLayout(){
    const panel=$("pinPanel"),pin=selectedPin();
    const dialogOpen=!!pin && !uiState.moveMode && !panel.classList.contains("hidden");
    document.body.classList.toggle("pin-open",dialogOpen);
    $("pinDialogTip").classList.toggle("hidden",!dialogOpen);
    if(!dialogOpen || !map)return;
    // Match predecessor: the editor remains rigidly anchored to its pin,
    // including beyond every edge of the viewport. No clamping or auto-hiding.
    const point=mapAdapter.project({lat:pin.lat,lng:pin.lng});
    const appRect=$("app").getBoundingClientRect();
    const mapRect=mapAdapter.getContainer().getBoundingClientRect();
    const width=Math.min(310,appRect.width-16);
    const height=panel.offsetHeight;
    const x=mapRect.left+point.x-appRect.left;
    const y=mapRect.top+point.y-appRect.top;
    panel.style.visibility="visible";
    panel.style.left=(x-width/2)+"px";
    panel.style.top=(y-height-76)+"px";
    const tip=$("pinDialogTip");
    tip.style.left=x+"px";
    tip.style.top=(y-76)+"px";
    panel.style.bottom="auto";
    panel.style.right="auto";
    panel.style.transform="none";
    panel.style.width=width+"px";
    panel.classList.remove("panel-near-top");
  }
  function scheduleMapOverlayUpdate(){
    if(mapOverlayFrame)return;
    mapOverlayFrame=requestAnimationFrame(()=>{
      mapOverlayFrame=0;
      updatePanelLayout();
      positionMoveBar();
    });
  }
  function keepSelectedAbovePanel(){
    // Only when the editor first opens: pan the *map*, never change pin coordinates.
    // Subsequent user drags remain free and do not trigger another correction.
    updatePanelLayout();
    const panel=$("pinPanel"),pin=selectedPin();
    if(!pin || uiState.moveMode || panel.classList.contains("hidden") || !map)return;
    const app=$("app").getBoundingClientRect();
    const rect=panel.getBoundingClientRect();
    const tip=$("pinDialogTip").getBoundingClientRect();
    const margin=12;
    const minX=app.left+margin,maxX=app.right-margin;
    const minY=app.top+margin,maxY=app.bottom-margin;
    const dx=rect.left<minX?minX-rect.left:rect.right>maxX?maxX-rect.right:0;
    const lowest=Math.max(rect.bottom,tip.bottom);
    const dy=rect.top<minY?minY-rect.top:lowest>maxY?maxY-lowest:0;
    if(Math.abs(dx)>0.5 || Math.abs(dy)>0.5){
      // Leaflet panBy offsets the map opposite the desired pin/dialog shift.
      mapAdapter.panBy({x:-dx,y:-dy},{animate:false});
      updatePanelLayout();
    }
  }
  function fitAllPins(){
    const pts=state.pins.filter(p=>layerById(p.layerId)?.visible).map(p=>[p.lat,p.lng]);
    if(!pts.length){showNotice("Keine sichtbaren Pins vorhanden");return;}
    if(pts.length===1)mapAdapter.setView({center:{lat:pts[0][0],lng:pts[0][1]},zoom:Math.max(mapAdapter.getViewport().zoom,13)},{animate:false});
    else mapAdapter.fitBounds(pts,{padding:[35,35],maxZoom:15,animate:false});
    updatePanelLayout();
  }
  function renderPinPanel(){
    const pin=selectedPin();
    pinEditorView.render({
      pin,moving:uiState.moveMode,layerVisible:pin?!!layerById(pin.layerId)?.visible:true,
      onLayout:updatePanelLayout
    });
  }
  function selectPin(id) {
    if (uiState.selectedPinId === id) { closeMapOverlays(); return; }
    // A pin tap replaces other map overlays with the selected pin editor.
    hideResults();
    $("layersPanel").classList.add("hidden");
    $("settingsPanel").classList.add("hidden");
    uiState.selectedPinId = id; uiState.moveMode = false; updateModeUI();
    renderMarkers(); renderLayers(); renderPinPanel();
    requestAnimationFrame(keepSelectedAbovePanel);
  }
  function updateModeUI() {
    mapAdapter.getContainer().style.cursor = uiState.moveMode ? "crosshair" : "";
  }
  function addPin(lat, lng, name) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const layerId=PRIVATE_ID;
    const pin = { id: uid(), lat, lng, name: cleanText(name), layerId };
    state.pins.push(pin); save(); selectPin(pin.id);
    const layer = layerById(layerId);
    if (!layer.visible) showNotice("Pin in ausgeblendeter Ebene „" + layer.name + "“ gespeichert");
    return pin;
  }
  function closeMapOverlays() {
    hideResults();
    uiShell.closePanels();
    uiShell.hideNotice();
    const dlg = $("deleteDialog");
    if (dlg.open) dlg.close("cancel");
    if(uiState.moveMode)endMove();
    if (uiState.selectedPinId !== null || uiState.moveMode) {
      uiState.selectedPinId = null; uiState.moveMode = false;
      renderMarkers(); renderPinPanel(); updateModeUI();
    }
    if (document.activeElement && typeof document.activeElement.blur === "function") document.activeElement.blur();
  }
  function cancelLongPress() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    longPressStart = null;
  }
  function attachLongPress() {
    const container = mapAdapter.getContainer();
    const isMapSurface = target => mapAdapter.isMapSurface(target);
    container.addEventListener("pointerdown", e => {
      activePointers.add(e.pointerId);
      if(e.pointerType==="touch"||e.pointerType==="pen")lastTouchStartAt=Date.now();
      cancelLongPress();
      if (uiState.moveMode || e.button !== 0 || !isMapSurface(e.target) || activePointers.size !== 1) return;
      longPressStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
      // Long press works for touch and mouse. Right click remains an alternative.
      longPressTimer = setTimeout(() => {
        if (!longPressStart || activePointers.size !== 1) return;
        const start = longPressStart;
        cancelLongPress();
        suppressMapClickUntil = Date.now() + 850;
        const rect = container.getBoundingClientRect();
        const point = {x:start.x - rect.left, y:start.y - rect.top};
        const where = mapAdapter.unproject(point);
        const pin = addPin(where.lat, where.lng, "");
        if (pin) {
          if (navigator.vibrate) navigator.vibrate(15);
          requestAnimationFrame(updatePanelLayout);
        }
      }, 650);
    }, { passive: true });
    container.addEventListener("pointermove", e => {
      if (longPressStart && e.pointerId === longPressStart.id && Math.hypot(e.clientX - longPressStart.x, e.clientY - longPressStart.y) > 10) cancelLongPress();
    }, { passive: true });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      container.addEventListener(type, e => {
        activePointers.delete(e.pointerId);
        if (!longPressStart || e.pointerId === longPressStart.id) cancelLongPress();
      }, { passive: true });
    }
    mapAdapter.on("dragstart zoomstart", cancelLongPress);
    // Native desktop context menu is replaced by pin creation. Touch uses the timer above.
    container.addEventListener("contextmenu", e => {
      if(!isMapSurface(e.target))return;
      e.preventDefault();
      // iOS may synthesize contextmenu after a long touch; only create once.
      if(Date.now()-lastTouchStartAt<2400 || Date.now()<suppressMapClickUntil)return;
      if(uiState.moveMode)return;
      const rect=container.getBoundingClientRect();
      const location=mapAdapter.unproject({x:e.clientX-rect.left,y:e.clientY-rect.top});
      addPin(location.lat,location.lng,"");
      suppressMapClickUntil=Date.now()+750;
    });
  }
  const togglePanel = id => uiShell.togglePanel(id);
  const hideResults = () => searchView.hide();
  const searchMessage = msg => searchView.message(msg);
  function placeTitle(r) {
    const a = r.address || {};
    return a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || a.county || r.name || String(r.display_name || "").split(",")[0];
  }
  function placeDetail(r) {
    const a = r.address || {};
    const parts = [a.state || a.region || a.county, a.country].filter(Boolean);
    return parts.join(", ") || String(r.display_name || "").split(",").slice(1,4).join(",").trim();
  }
  function choosePlace(r) {
    const lat = Number(r.lat), lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { searchMessage("Ort konnte nicht übernommen werden"); return; }
    hideResults();
    const pin = addPin(lat, lng, placeTitle(r));
    if (pin) {
      mapAdapter.setView({center:{lat,lng},zoom:Math.max(mapAdapter.getViewport().zoom,13)}, { animate: false });
      requestAnimationFrame(keepSelectedAbovePanel);
      if (layerById(PRIVATE_ID).visible) renderMarkers();
    }
  }
  function renderResults(list) {
    if (!list.length) { searchMessage("Kein Ort gefunden"); return; }
    if (list.length === 1) { choosePlace(list[0]); return; }
    searchView.show(list);
  }
  function cacheKey(s) { return s.trim().replace(/\s+/g," ").toLocaleLowerCase("de"); }
  function cleanupCache() {
    const now = Date.now(), entries = Object.entries(state.geoCache || {});
    state.geoCache = Object.fromEntries(entries.filter(([,v]) => v && now-v.time < GEOCACHE_HOURS*3600000).slice(-100));
  }
  async function geocode(query, signal) {
    // Central adapter: Nominatim JSON -> normalized list. Endpoint can later be replaced.
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query); url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1"); url.searchParams.set("accept-language", navigator.language || "de");
    url.searchParams.set("limit", "40");
    const response = await fetch(url.toString(), { method:"GET", signal, headers: { "Accept":"application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const json = await response.json();
    if (!Array.isArray(json)) throw new Error("Ungültige Suchantwort");
    return json.filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon)));
  }
  async function runSearch(event) {
    if (event) event.preventDefault();
    const query = $("searchInput").value.trim();
    if (!query) return;
    ++searchSerial;
    const serial = searchSerial;
    if (searchAbort) searchAbort.abort();
    searchAbort = null;
    cleanupCache();
    const cached = state.geoCache[cacheKey(query)];
    if (cached) { renderResults(cached.results); return; }
    if (!state.allowGeocode) {
      searchMessage("Ortssuche im Test noch nicht aktiviert. Bitte in ⚙ Einstellungen nach Prüfung der Nominatim-Richtlinie aktivieren.");
      return;
    }
    // Local throttle only; this does NOT enforce the provider's aggregate cross-client limit.
    const remaining = 1100 - (Date.now() - lastRequestAt);
    if (remaining > 0) {
      searchMessage("Bitte kurz warten und die Suche erneut starten.");
      return;
    }
    const controller = new AbortController(); searchAbort = controller;
    const btn = $("searchButton"); btn.disabled = true;
    searchMessage("Ort wird gesucht …");
    lastRequestAt = Date.now();
    try {
      const results = await geocode(query, controller.signal);
      if (serial !== searchSerial) return;
      state.geoCache[cacheKey(query)] = { time: Date.now(), results };
      cleanupCache(); save();
      renderResults(results);
    } catch (err) {
      if (serial !== searchSerial || err.name === "AbortError") return;
      searchMessage("Ortssuche derzeit nicht verfügbar. Bitte Verbindung prüfen und erneut suchen.");
    } finally {
      if (serial === searchSerial) { btn.disabled = false; searchAbort = null; }
    }
  }
  const updateLabelButton = () => uiShell.updateLabelButton(state.labelsVisible);
  function bind() {
    $("searchForm").addEventListener("submit", runSearch);
    $("labelsToggle").addEventListener("click",()=>{state.labelsVisible=!state.labelsVisible;save();renderMarkers();updateLabelButton();});
    $("layersButton").addEventListener("click", () => togglePanel("layersPanel"));
    $("settingsButton").addEventListener("click", () => togglePanel("settingsPanel"));
    $("refreshButton").addEventListener("click",async()=>{
      const button=$("refreshButton");
      if(button.disabled)return;
      button.disabled=true;button.setAttribute("aria-busy","true");
      const fail=message=>{
        showNotice(message);
        button.disabled=false;button.removeAttribute("aria-busy");
      };
      // Do not risk losing locally changed pins or layers during an update.
      clearTimeout(saveTimer);
      try{await dbWrite();}
      catch(e){fail("Speichern fehlgeschlagen – Aktualisierung abgebrochen");return;}
      if(!navigator.onLine){fail("Offline – Aktualisierung benötigt Internet");return;}
      try{
        // First verify that the server can supply the new worker version.
        const workerURL=new URL("./sw.js",location.href);
        const networkResponse=await fetch(workerURL.href+"?refresh="+Date.now(),{cache:"no-store"});
        if(!networkResponse.ok)throw Error("SW HTTP "+networkResponse.status);
        const match=(await networkResponse.text()).match(/const CACHE=['"]([^'"]+)['"]/);
        if(!match)throw Error("Version nicht lesbar");
        const expectedVersion=match[1];
        if("serviceWorker" in navigator){
          const registration=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
          await registration.update();
          if(registration.waiting)registration.waiting.postMessage({type:"SKIP_WAITING"});
          const getActiveVersion=()=>new Promise(resolve=>{
            const active=registration.active;
            if(!active || active.state!=="activated"){resolve(null);return;}
            const channel=new MessageChannel();
            const timeout=setTimeout(()=>resolve(null),450);
            channel.port1.onmessage=event=>{
              clearTimeout(timeout);channel.port1.close();
              resolve(event.data?.version||null);
            };
            active.postMessage({type:"GET_VERSION"},[channel.port2]);
          });
          // register().update() can finish before installation and activation.
          // Keep the old page in place until the intended worker is active.
          let activated=false;
          const until=Date.now()+12000;
          while(Date.now()<until){
            if(registration.waiting)registration.waiting.postMessage({type:"SKIP_WAITING"});
            if(await getActiveVersion()===expectedVersion){activated=true;break;}
            await new Promise(resolve=>setTimeout(resolve,250));
          }
          if(!activated)throw Error("Neue Version noch nicht aktiviert");
        }
        // Don't preserve stale ?v= parameters in the navigation history.
        const target=new URL(location.href);
        target.searchParams.set("v",expectedVersion);
        target.searchParams.set("loaded",String(Date.now()));
        location.replace(target.href);
      }catch(error){
        fail("Neue Version nicht geladen – Verbindung prüfen und erneut versuchen");
        console.warn("PWA refresh:",error);
      }
    });
    document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => {if(b.dataset.close==="pinPanel"){closeMapOverlays();return;}uiShell.closePanel(b.dataset.close);}));
    $("basemapSelect").addEventListener("change", e => { state.basemap = e.target.value; setTileLayer(); save(); });
    $("allowGeocode").checked = state.allowGeocode;
    $("allowGeocode").addEventListener("change", e => { state.allowGeocode = e.target.checked; save(); });
    $("addLayer").addEventListener("click", () => {
      let number=1;
      const taken=new Set(state.layers.map(l=>l.name.trim().toLocaleLowerCase("de")));
      while(taken.has(("Ebene "+number).toLocaleLowerCase("de")))number++;
      const name=prompt("Name der neuen Ebene:","Ebene "+number);
      if(name===null)return;
      const trimmed=cleanText(name);
      if(!trimmed){showNotice("Bitte einen Ebenennamen eingeben");return;}
      if(taken.has(trimmed.toLocaleLowerCase("de")) || trimmed.toLocaleLowerCase("de")==="privat"){
        showNotice("Der Ebenenname ist bereits vergeben");return;
      }
      const id=uid();
      state.layers.push({id,name:trimmed,color:COLORS[state.layers.length%COLORS.length],visible:true});
      renderLayers();save();
    });

    $("pinName").addEventListener("input", e => { const p=selectedPin(); if(p){p.name=cleanText(e.target.value);save();renderMarkers();} });
    $("pinName").addEventListener("blur", e => {e.target.value=cleanText(e.target.value);});
    $("pinLayer").addEventListener("change", e => {
      const p=selectedPin(); if(!p || !layerById(e.target.value))return;
      p.layerId=e.target.value; save();renderLayers();renderMarkers();renderPinPanel();
      if(!layerById(p.layerId).visible) showNotice("Pin liegt jetzt in einer ausgeblendeten Ebene");
    });
    $("showPinLayer").addEventListener("click", () => {
      const p=selectedPin();if(!p)return;layerById(p.layerId).visible=true;
      save();renderLayers();renderMarkers();renderPinPanel();
    });
    $("movePin").addEventListener("click",beginMove);
    $("cancelMove").addEventListener("click",endMove);
    $("confirmMove").addEventListener("click",confirmMove);
    $("deletePin").addEventListener("click", () => { if(selectedPin())$("deleteDialog").showModal(); });
    $("deleteDialog").addEventListener("close", () => {
      if($("deleteDialog").returnValue!=="confirm")return;
      state.pins=state.pins.filter(p=>p.id!==uiState.selectedPinId);uiState.selectedPinId=null;uiState.moveMode=false;
      save();renderMarkers();renderLayers();renderPinPanel();updateModeUI();showNotice("Pin gelöscht");
    });
    document.addEventListener("pointerdown", e => {
      if(!$("searchResults").classList.contains("hidden") && !e.target.closest("#searchResults, #searchForm"))hideResults();
    });
    mapAdapter.onMapClick(position => {
      if (Date.now() < suppressMapClickUntil) return;
      if (uiState.moveMode && selectedPin()) {previewMove(position);return;}
      closeMapOverlays();
    });

    attachLongPress();
    // Leaflet fires move continuously while dragging/pinching, unlike moveend.
    mapAdapter.on("move",scheduleMapOverlayUpdate);
    mapAdapter.on("moveend", () => {persistViewport();if(!markerPressStart)renderMarkers();scheduleMapOverlayUpdate();});
    mapAdapter.on("zoomend", () => {if(!markerPressStart)renderMarkers();scheduleMapOverlayUpdate();});
    window.addEventListener("resize", () => { mapAdapter.invalidateSize();renderMarkers();scheduleMapOverlayUpdate(); });
    document.addEventListener("visibilitychange", () => { if(document.visibilityState==="hidden") dbWrite().catch(()=>{}); });
  }
  async function init() {
    if(!window.L){$("notice").textContent="Die Kartenbibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen."; $("notice").classList.remove("hidden");return;}
    try {projectStore=await window.Pin2MapIndexedDBProjectStore.open();const saved=await projectStore.loadProject();if(saved && Array.isArray(saved.layers) && Array.isArray(saved.pins))state={...defaults(),...saved};}
    catch(e){showNotice("IndexedDB nicht verfügbar – Änderungen können verloren gehen");}
    if(!layerById(PRIVATE_ID))state.layers.unshift(defaults().layers[0]);
    // Obsolete active-layer selection is deliberately discarded on load.
    delete state.activeLayer;
    cleanupCache();
    mapAdapter=window.Pin2MapLeafletAdapter.mount("map",{center:{lat:state.viewport.lat,lng:state.viewport.lng},zoom:state.viewport.zoom});
    mapAdapter.addZoomControls({onFitAll:fitAllPins});
    setTileLayer();bind();renderLayers();renderMarkers();renderPinPanel();updateModeUI();updateLabelButton();
    if("serviceWorker" in navigator && location.protocol==="https:")navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{});
  }
  document.addEventListener("DOMContentLoaded",init);
})();