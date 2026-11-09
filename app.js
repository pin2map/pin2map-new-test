"use strict";
(function () {
  const $ = id => document.getElementById(id);
  const STORAGE_DB = "pin2map-new-v1";
  const STORAGE_KEY = "appState";
  const GEOCACHE_HOURS = 24;
  const PRIVATE_ID = "private";
  const COLORS = ["#326cc2", "#e07c2b", "#865ab8", "#16836b", "#c14d72", "#8a7431"];
  const defaults = () => ({
    layers: [{ id: PRIVATE_ID, name: "Privat", color: "#326cc2", visible: true },
      { id: "layer-1", name: "Ebene 1", color: "#e07c2b", visible: true }],
    pins: [], activeLayer: "layer-1",
    viewport: { lat: 48.7758, lng: 9.1829, zoom: 6 },
    basemap: "street", labelsVisible: true, allowGeocode: false, geoCache: {}
  });
  let db, state = defaults(), map, tileLayer, markers = new Map();
  let selected = null, moveMode = false, saveTimer, searchAbort, searchSerial = 0, lastRequestAt = 0, noticeTimer;
  let longPressTimer = null, longPressStart = null, suppressMapClickUntil = 0, activePointers = new Set();
  let lastTouchStartAt = 0, markerPressTimer = null, markerPressStart = null;
  let movePreview = null, moveMarker = null, moveLine = null;
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "pin-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const layerById = id => state.layers.find(x => x.id === id);
  const selectedPin = () => state.pins.find(p => p.id === selected);
  const cleanText = value => String(value || "").trim().slice(0,120);
  function showNotice(message) {
    $("notice").textContent = message; $("notice").classList.remove("hidden");
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $("notice").classList.add("hidden"), 3500);
  }
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(STORAGE_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function dbRead() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readonly");
      const req = tx.objectStore("kv").get(STORAGE_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function dbWrite() {
    if (!db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(state, STORAGE_KEY);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => dbWrite().catch(() => showNotice("Lokales Speichern fehlgeschlagen")), 300);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
  function persistViewport() {
    const center = map.getCenter();
    state.viewport = { lat: center.lat, lng: center.lng, zoom: map.getZoom() }; save();
  }
  function setTileLayer() {
    if (tileLayer) map.removeLayer(tileLayer);
    const isTopo = state.basemap === "topo";
    tileLayer = L.tileLayer(isTopo
      ? "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: isTopo ? 17 : 19,
        attribution: isTopo ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://opentopomap.org/">OpenTopoMap</a>' :
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
    $("basemapSelect").value = state.basemap;
  }
  function markerIcon(pin,highlighted,label,side) {
    const layer=layerById(pin.layerId);
    const color=layer?layer.color:COLORS[0];
    const labelHtml=label?'<span class="pin-side-label '+side+(highlighted?' highlighted':'')+'">'+esc(label)+'</span>':'';
    return L.divIcon({html:'<div class="pin-marker'+(highlighted?' selected':'')+'" style="background:'+color+'"></div>'+labelHtml,
      iconSize:[30,32],iconAnchor:[15,29],className:"pin-icon"});
  }
  function renderMarkers() {
    if(!map)return;
    const shown=new Set(),occupied=[];
    const sorted=[...state.pins].sort((a,b)=>Number(b.id===selected)-Number(a.id===selected));
    for(const pin of sorted){
      if(!layerById(pin.layerId)?.visible)continue;
      shown.add(pin.id);
      let marker=markers.get(pin.id);
      if(!marker){
        marker=L.marker([pin.lat,pin.lng],{draggable:false,autoPan:false}).addTo(map);
        marker.on("click",e=>{if(Date.now()<suppressMapClickUntil||moveMode)return;selectPin(pin.id);});
        markers.set(pin.id,marker);
      }
      marker.setLatLng([pin.lat,pin.lng]);
      const chosen=pin.id===selected,point=map.latLngToContainerPoint([pin.lat,pin.lng]);
      const side=point.x>map.getSize().x*0.55?"left":"right";
      let label=cleanText(pin.name);
      if(!chosen&&!state.labelsVisible)label="";
      if(label){
        const width=Math.min(175,Math.max(80,map.getSize().x*0.40));
        const left=side==="right"?point.x+20:point.x-20-width;
        const box={left,right:left+width,top:point.y-40,bottom:point.y-10};
        if(!chosen&&occupied.some(r=>!(r.right<box.left||r.left>box.right||r.bottom<box.top||r.top>box.bottom)))label="";
        else occupied.push(box);
      }
      marker.setIcon(markerIcon(pin,chosen,label,side));
      attachMarkerLongPress(marker,pin.id);
      marker.options.title=pin.name||"Pin";
    }
    for(const [id,marker] of markers)if(!shown.has(id)){map.removeLayer(marker);markers.delete(id);}
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
      const currentSelected=selected;
      state.pins=pins;state.layers=layers;
      if(!layerById(state.activeLayer))state.activeLayer=PRIVATE_ID;
      if(currentSelected&&!pins.some(p=>p.id===currentSelected))selected=null;
      save();renderLayers();renderMarkers();renderPinPanel();
      showNotice(privateOnly?"Private Pins gelöscht":"Ebene und Pins gelöscht");
    };
  }
  // Matches the predecessor app: a held pin alternates 18/14 at its on-screen pixel.
  // A tap still opens/closes its editor; dragging a pin never moves it.
  function zoomHeldPin(marker){
    if(!map || !map.hasLayer(marker))return;
    const pinPosition=marker.getLatLng();
    const second=marker._heldZoomClose===true;
    const providerMax=state.basemap==="topo"?17:19;
    const target=Math.min(second?14:18,providerMax);
    const anchor=map.latLngToContainerPoint(pinPosition);
    map.setZoomAround(pinPosition,target,{animate:false});
    const actual=map.latLngToContainerPoint(pinPosition);
    const delta=actual.subtract(anchor);
    if(Math.abs(delta.x)>0.5 || Math.abs(delta.y)>0.5)map.panBy(delta,{animate:false});
    marker._heldZoomClose=!second;
    persistViewport();renderMarkers();updatePanelLayout();
  }
  function attachMarkerLongPress(marker,id){
    const element=marker.getElement();
    if(!element || element.dataset.pinGestureBound)return;
    element.dataset.pinGestureBound="true";
    // Stop Leaflet dragging for touches and mouse presses that begin on a pin.
    L.DomEvent.disableClickPropagation(element);
    L.DomEvent.on(element,"mousedown touchstart",L.DomEvent.stopPropagation);
    element.style.touchAction="none";
    element.addEventListener("pointerdown",event=>{
      if(event.button!==0 || moveMode)return;
      event.stopPropagation();
      if(markerPressStart)return;
      const gesture={id:event.pointerId,x:event.clientX,y:event.clientY,
        activated:false,cancelled:false,finished:false,wasDraggable:map.dragging.enabled()};
      markerPressStart=gesture;
      if(gesture.wasDraggable)map.dragging.disable();
      try{element.setPointerCapture(gesture.id);}catch(_){}
      const cleanup=()=>{
        clearTimeout(markerPressTimer);markerPressTimer=null;
        if(markerPressStart===gesture)markerPressStart=null;
        if(gesture.wasDraggable)map.dragging.enable();
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
  function removeMovePreview(){
    if(moveMarker){map.removeLayer(moveMarker);moveMarker=null;}
    if(moveLine){map.removeLayer(moveLine);moveLine=null;}
    movePreview=null;
    $("confirmMove").disabled=true;
  }
  function previewMove(position){
    const pin=selectedPin();if(!moveMode||!pin)return;
    movePreview=L.latLng(position);
    const old=[pin.lat,pin.lng];
    if(!moveMarker){
      moveMarker=L.marker(movePreview,{draggable:true,autoPan:false,zIndexOffset:1000}).addTo(map);
      moveMarker.bindTooltip("Neue Position",{direction:"right",permanent:true});
      moveMarker.on("drag",e=>previewMove(e.target.getLatLng()));
      moveMarker.on("dragend",e=>previewMove(e.target.getLatLng()));
    }else moveMarker.setLatLng(movePreview);
    if(!moveLine)moveLine=L.polyline([old,movePreview],{color:"#d65a31",weight:3,dashArray:"7 5",interactive:false}).addTo(map);
    else moveLine.setLatLngs([old,movePreview]);
    $("confirmMove").disabled=false;
    $("moveText").textContent="Alte und neue Position prüfen, danach übernehmen.";
  }
  function endMove(){
    moveMode=false;removeMovePreview();
    $("moveBar").classList.add("hidden");
    updateModeUI();renderPinPanel();
  }
  function beginMove(){
    if(!selectedPin())return;
    moveMode=true;removeMovePreview();
    $("pinPanel").classList.add("hidden");
    $("moveBar").classList.remove("hidden");
    $("moveText").textContent="Neue Stelle antippen. Die Vorschau lässt sich ziehen.";
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
      const active = document.createElement("button"); active.className = state.activeLayer === layer.id ? "" : "secondary";
      active.textContent = state.activeLayer === layer.id ? "Aktiv" : "Aktivieren";
      active.addEventListener("click", () => { state.activeLayer = layer.id; save(); renderLayers(); });
      row.append(eye,dot,label,active);
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
    if(moveMode)return;
    document.body.classList.toggle("pin-open",!!pin);
    if(!pin||!map)return;
    const p=map.latLngToContainerPoint([pin.lat,pin.lng]);
    const rect=map.getContainer().getBoundingClientRect();
    const width=Math.min(310,window.innerWidth-16);
    const height=panel.offsetHeight;
    const x=rect.left+p.x,y=rect.top+p.y;
    const left=Math.max(8,Math.min(window.innerWidth-width-8,x-width/2));
    const minTop=rect.top+8;
    const top=Math.max(minTop,y-height-30);
    panel.style.left=left+"px";panel.style.top=top+"px";
    panel.style.bottom="auto";panel.style.transform="none";panel.style.width=width+"px";
    panel.classList.toggle("panel-near-top",y-height-30<minTop);
  }
  function keepSelectedAbovePanel(){updatePanelLayout();}
  function fitAllPins(){
    const pts=state.pins.filter(p=>layerById(p.layerId)?.visible).map(p=>[p.lat,p.lng]);
    if(!pts.length){showNotice("Keine sichtbaren Pins vorhanden");return;}
    if(pts.length===1)map.setView(pts[0],Math.max(map.getZoom(),13),{animate:false});
    else map.fitBounds(L.latLngBounds(pts),{padding:[35,35],maxZoom:15,animate:false});
    updatePanelLayout();
  }
  function renderPinPanel(){
    const pin=selectedPin();
    $("pinPanel").classList.toggle("hidden",!pin||moveMode);
    if(!pin){document.body.classList.remove("pin-open");return;}
    if(document.activeElement!==$("pinName"))$("pinName").value=pin.name||"";
    $("pinLayer").value=pin.layerId;
    $("pinCoords").textContent="Koordinaten: "+pin.lat.toFixed(6)+", "+pin.lng.toFixed(6);
    $("pinHiddenInfo").classList.toggle("hidden",!!layerById(pin.layerId)?.visible);
    $("movePin").textContent=moveMode?"Verschieben abbrechen":"Pin verschieben";
    requestAnimationFrame(updatePanelLayout);
  }
  function selectPin(id) {
    if (selected === id) { closeMapOverlays(); return; }
    // A pin tap replaces other map overlays with the selected pin editor.
    hideResults();
    $("layersPanel").classList.add("hidden");
    $("settingsPanel").classList.add("hidden");
    selected = id; moveMode = false; updateModeUI();
    renderMarkers(); renderLayers(); renderPinPanel();
    requestAnimationFrame(keepSelectedAbovePanel);
  }
  function updateModeUI() {
    map.getContainer().style.cursor = moveMode ? "crosshair" : "";
  }
  function addPin(lat, lng, name, layerId) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!layerById(layerId)) { showNotice("Bitte zuerst eine Ebene auswählen"); return; }
    const pin = { id: uid(), lat, lng, name: cleanText(name), layerId };
    state.pins.push(pin); save(); selectPin(pin.id);
    const layer = layerById(layerId);
    if (!layer.visible) showNotice("Pin in ausgeblendeter Ebene „" + layer.name + "“ gespeichert");
    return pin;
  }
  function closeMapOverlays() {
    hideResults();
    $("layersPanel").classList.add("hidden");
    $("settingsPanel").classList.add("hidden");
    $("notice").classList.add("hidden");
    const dlg = $("deleteDialog");
    if (dlg.open) dlg.close("cancel");
    if(moveMode)endMove();
    if (selected !== null || moveMode) {
      selected = null; moveMode = false;
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
    const container = map.getContainer();
    const isMapSurface = target => !target.closest(".leaflet-control, .leaflet-marker-icon, .leaflet-popup, .leaflet-tooltip, button, input");
    container.addEventListener("pointerdown", e => {
      activePointers.add(e.pointerId);
      if(e.pointerType==="touch"||e.pointerType==="pen")lastTouchStartAt=Date.now();
      cancelLongPress();
      if (moveMode || e.button !== 0 || !isMapSurface(e.target) || activePointers.size !== 1) return;
      longPressStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
      // Long press works for touch and mouse. Right click remains an alternative.
      longPressTimer = setTimeout(() => {
        if (!longPressStart || activePointers.size !== 1) return;
        const start = longPressStart;
        cancelLongPress();
        suppressMapClickUntil = Date.now() + 850;
        const rect = container.getBoundingClientRect();
        const point = L.point(start.x - rect.left, start.y - rect.top);
        const where = map.containerPointToLatLng(point);
        const pin = addPin(where.lat, where.lng, "", state.activeLayer);
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
    map.on("dragstart zoomstart", cancelLongPress);
    // Native desktop context menu is replaced by pin creation. Touch uses the timer above.
    container.addEventListener("contextmenu", e => {
      if(!isMapSurface(e.target))return;
      e.preventDefault();
      // iOS may synthesize contextmenu after a long touch; only create once.
      if(Date.now()-lastTouchStartAt<2400 || Date.now()<suppressMapClickUntil)return;
      if(moveMode)return;
      const rect=container.getBoundingClientRect();
      const location=map.containerPointToLatLng([e.clientX-rect.left,e.clientY-rect.top]);
      addPin(location.lat,location.lng,"",state.activeLayer);
      suppressMapClickUntil=Date.now()+750;
    });
  }
  function togglePanel(id) {
    const panel = $(id), wasHidden = panel.classList.contains("hidden");
    ["layersPanel","settingsPanel"].forEach(x => $(x).classList.add("hidden"));
    if (wasHidden) panel.classList.remove("hidden");
  }
  function resultHead() {
    const head = document.createElement("div"); head.className = "results-head";
    const close = document.createElement("button"); close.type = "button"; close.textContent = "×"; close.title = "Trefferliste schließen";
    close.addEventListener("click", hideResults); head.append(close); return head;
  }
  function hideResults() { $("searchResults").classList.add("hidden"); $("searchResults").replaceChildren(); }
  function searchMessage(msg) {
    const box = $("searchResults"); box.replaceChildren(resultHead());
    const p = document.createElement("div"); p.className = "message"; p.textContent = msg; box.append(p);
    box.classList.remove("hidden");
  }
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
    const pin = addPin(lat, lng, placeTitle(r), PRIVATE_ID);
    if (pin) {
      map.setView([lat,lng], Math.max(map.getZoom(), 13), { animate: false });
      requestAnimationFrame(keepSelectedAbovePanel);
      if (layerById(PRIVATE_ID).visible) renderMarkers();
    }
  }
  function renderResults(list) {
    if (!list.length) { searchMessage("Kein Ort gefunden"); return; }
    if (list.length === 1) { choosePlace(list[0]); return; }
    const box = $("searchResults"); box.replaceChildren(resultHead());
    for (const r of list) {
      const item = document.createElement("button"); item.type = "button"; item.className = "result";
      const title = document.createElement("strong"); title.textContent = placeTitle(r);
      const detail = document.createElement("small"); detail.textContent = placeDetail(r);
      item.append(title, detail); item.addEventListener("click", () => choosePlace(r)); box.append(item);
    }
    box.classList.remove("hidden");
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
  function updateLabelButton(){
    const btn=$("labelsToggle");
    btn.setAttribute("aria-pressed",String(state.labelsVisible));
    btn.title=state.labelsVisible?"Pin-Beschriftungen ausblenden":"Pin-Beschriftungen einblenden";
    btn.classList.toggle("is-off",!state.labelsVisible);
  }
  function bind() {
    $("searchForm").addEventListener("submit", runSearch);
    $("labelsToggle").addEventListener("click",()=>{state.labelsVisible=!state.labelsVisible;save();renderMarkers();updateLabelButton();});
    $("layersButton").addEventListener("click", () => togglePanel("layersPanel"));
    $("settingsButton").addEventListener("click", () => togglePanel("settingsPanel"));
    document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => $(b.dataset.close).classList.add("hidden")));
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
      state.activeLayer=id;renderLayers();save();
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
      state.pins=state.pins.filter(p=>p.id!==selected);selected=null;moveMode=false;
      save();renderMarkers();renderLayers();renderPinPanel();updateModeUI();showNotice("Pin gelöscht");
    });
    document.addEventListener("pointerdown", e => {
      if(!$("searchResults").classList.contains("hidden") && !e.target.closest("#searchResults, #searchForm"))hideResults();
    });
    map.on("click", e => {
      if (Date.now() < suppressMapClickUntil) return;
      if (moveMode && selectedPin()) {previewMove(e.latlng);return;}
      closeMapOverlays();
    });

    attachLongPress();
    map.on("moveend", () => {persistViewport();renderMarkers();updatePanelLayout();});
    map.on("zoomend", () => {renderMarkers();updatePanelLayout();});
    window.addEventListener("resize", () => { map.invalidateSize(); updatePanelLayout();renderMarkers(); });
    document.addEventListener("visibilitychange", () => { if(document.visibilityState==="hidden") dbWrite().catch(()=>{}); });
  }
  async function init() {
    if(!window.L){$("notice").textContent="Die Kartenbibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen."; $("notice").classList.remove("hidden");return;}
    try {db=await openDB();const saved=await dbRead();if(saved && Array.isArray(saved.layers) && Array.isArray(saved.pins))state={...defaults(),...saved};}
    catch(e){showNotice("IndexedDB nicht verfügbar – Änderungen können verloren gehen");}
    if(!layerById(PRIVATE_ID))state.layers.unshift(defaults().layers[0]);
    if(!layerById(state.activeLayer))state.activeLayer=state.layers[0].id;
    cleanupCache();
    map=L.map("map",{zoomControl:false}).setView([state.viewport.lat,state.viewport.lng],state.viewport.zoom);
    const zoomButtons = L.control({position:"topleft"});
    zoomButtons.onAdd = () => {
      const holder = L.DomUtil.create("div","pin-zoom-buttons leaflet-bar");
      const add = (symbol, title, action) => {
        const button = L.DomUtil.create("button","pin-zoom-button",holder);
        button.type = "button"; button.textContent = symbol; button.title = title;
        button.setAttribute("aria-label",title);
        L.DomEvent.on(button,"click",e => {L.DomEvent.stop(e);action();});
      };
      add("+","Vergrößern",() => map.zoomIn());
      add("−","Verkleinern",() => map.zoomOut());
      add("◎","Alle sichtbaren Pins anzeigen",fitAllPins);
      L.DomEvent.disableClickPropagation(holder);
      L.DomEvent.disableScrollPropagation(holder);
      return holder;
    };
    zoomButtons.addTo(map);
    setTileLayer();bind();renderLayers();renderMarkers();renderPinPanel();updateModeUI();updateLabelButton();
    if("serviceWorker" in navigator && location.protocol==="https:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
  document.addEventListener("DOMContentLoaded",init);
})();