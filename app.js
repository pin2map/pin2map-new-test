"use strict";
(function () {
  const $ = id => document.getElementById(id);
  const projectModel = window.Pin2MapProjectModel;
  if (!projectModel) throw new Error("pin2map project-model.js must load before app.js");
  const PRIVATE_ID = projectModel.PRIVATE_ID;
  const COLORS = projectModel.DEFAULT_COLORS;
  const defaults = projectModel.defaultProject;
  const pinOps = window.Pin2MapPinOperations;
  const pinFilter = window.Pin2MapPinFilter;
  const filterOps = window.Pin2MapFilterOperations;
  const placeDomain = window.Pin2MapPlaceSearch;
  const placeSearch = new window.Pin2MapPlaceSearchService({
    domain:placeDomain,
    geocoder:new window.Pin2MapNominatimGeocoder({fetchImpl:(...args)=>fetch(...args),language:navigator.language||"de"})
  });
  const layerOps = window.Pin2MapLayerOperations;
  const currentPinFilter = pinFilter.createFilter();
  let projectStore, state = defaults(), mapAdapter, markerView, moveView;
  const uiState = new window.Pin2MapUIState();
  let saveTimer;
  let gestures;
  let mapOverlayFrame = 0;
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "pin-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const layerById = id => layerOps.find(state,id);
  const selectedPin = () => pinOps.findPin(state,uiState.selectedPinId);
  const cleanText = projectModel.cleanText;
  const uiShell = new window.Pin2MapUIShell({getElement:$});
  const pinEditorView = new window.Pin2MapPinEditorView({
    getElement:$,document,scheduleFrame:requestAnimationFrame
  });
  const searchView = new window.Pin2MapSearchResultsView({
    container:$("searchResults"),document,
    onChoose:result=>choosePlace(result),
    titleOf:result=>placeDomain.title(result),
    detailOf:result=>placeDomain.detail(result)
  });
  const layerView = new window.Pin2MapLayerView({
    getElement:$,document,
    onVisibility:(id,visible)=>{filterOps.setLayerVisible(state,id,visible);save();renderLayers();renderMarkers();renderPinPanel();},
    onDelete:id=>deleteLayerOrPrivatePins(id)
  });
  const showNotice = message => uiShell.showNotice(message);
  function dbWrite() {
    return projectStore ? projectStore.saveProject(state) : Promise.resolve();
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => dbWrite().catch(() => showNotice("Lokales Speichern fehlgeschlagen")), 300);
  }
  function persistViewport() {
    const view = mapAdapter.getViewport();
    state.viewport = { lat: view.center.lat, lng: view.center.lng, zoom: view.zoom }; save();
  }
  function setTileLayer() {
    mapAdapter.setBasemap(state.basemap);
    $("basemapSelect").value = state.basemap;
  }
  function renderMarkers(){
    if(!markerView)return;
    markerView.render({
      pins:pinFilter.visiblePins(state.pins,state.layers,currentPinFilter),
      layers:state.layers,selectedPinId:uiState.selectedPinId,
      labelsVisible:state.labelsVisible
    });
  }
  function deleteLayerOrPrivatePins(id) {
    const info=layerOps.deletionInfo(state,id,PRIVATE_ID);
    if(!info)return;
    if(!info.allowed){showNotice("Keine privaten Pins vorhanden");return;}
    $("bulkTitle").textContent=info.privateOnly?"Alle Pins in Privat löschen?":"Ebene „"+info.layer.name+"“ löschen?";
    $("bulkDescription").textContent=info.privateOnly
      ?"Die Ebene Privat bleibt bestehen. "+info.count+" Pins werden gelöscht."
      :"Die Ebene und "+info.count+" zugeordnete Pins werden gelöscht.";
    $("bulkDialog").returnValue="cancel";
    $("bulkDialog").showModal();
    $("bulkDialog").onclose=()=>{
      if($("bulkDialog").returnValue!=="confirm")return;
      const result=layerOps.deleteLayerOrPins(state,id,PRIVATE_ID);
      if(!result)return;
      if(uiState.selectedPinId&&result.removedPinIds.includes(uiState.selectedPinId))uiState.selectedPinId=null;
      save();renderLayers();renderMarkers();renderPinPanel();
      showNotice(result.privateOnly?"Private Pins gelöscht":"Ebene und Pins gelöscht");
    };
  }
  function endMove(){
    uiState.moveMode=false;moveView.clear();
    $("moveBar").classList.add("hidden");
    updateModeUI();renderPinPanel();
  }
  function beginMove(){
    if(!selectedPin())return;
    uiState.moveMode=true;moveView.clear();
    $("pinPanel").classList.add("hidden");
    document.body.classList.remove("pin-open");
    $("pinDialogTip").classList.add("hidden");
    // Controls only appear once a new position has been selected.
    $("moveBar").classList.add("hidden");
    updateModeUI();
  }
  function confirmMove(){
    const pin=selectedPin(),position=moveView.current();if(!pin||!position)return;
    pinOps.movePin(state,pin.id,position,{validatePosition:projectModel.position});
    endMove();save();renderMarkers();renderPinPanel();showNotice("Position gespeichert");
  }
  function renderLayers(){
    layerView.render({
      layers:state.layers,
      counts:pinFilter.countByLayer(state.pins,state.layers),
      selectedLayerId:selectedPin()?.layerId??null
    });
  }
  function panelHeight(){return selectedPin()&&!$("pinPanel").classList.contains("hidden")?$("pinPanel").offsetHeight:0;}
  function updatePanelLayout(){
    const panel=$("pinPanel"),pin=selectedPin();
    const dialogOpen=!!pin && !uiState.moveMode && !panel.classList.contains("hidden");
    document.body.classList.toggle("pin-open",dialogOpen);
    $("pinDialogTip").classList.toggle("hidden",!dialogOpen);
    if(!dialogOpen || !mapAdapter)return;
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
      moveView.positionBar();
    });
  }
  function keepSelectedAbovePanel(){
    // Only when the editor first opens: pan the *map*, never change pin coordinates.
    // Subsequent user drags remain free and do not trigger another correction.
    updatePanelLayout();
    const panel=$("pinPanel"),pin=selectedPin();
    if(!pin || uiState.moveMode || panel.classList.contains("hidden") || !mapAdapter)return;
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
    const pts=pinFilter.visiblePins(state.pins,state.layers,currentPinFilter).map(p=>[p.lat,p.lng]);
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
    const pin = pinOps.createPin(state,{id:uid(),lat,lng,name,layerId},
      {validatePosition:projectModel.position,cleanText});
    save(); selectPin(pin.id);
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
  const togglePanel = id => uiShell.togglePanel(id);
  const hideResults = () => searchView.hide();
  const searchMessage = msg => searchView.message(msg);
  function choosePlace(r) {
    const lat = Number(r.lat), lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { searchMessage("Ort konnte nicht übernommen werden"); return; }
    hideResults();
    const pin = addPin(lat, lng, placeDomain.title(r));
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
  async function runSearch(event) {
    if(event)event.preventDefault();
    const query=$("searchInput").value.trim();
    if(!query)return;
    // Search service owns cache, throttling, cancellation and provider calls.
    const btn=$("searchButton");
    btn.disabled=false;
    const result=await placeSearch.search(query,{
      state,allowed:state.allowGeocode,
      onStart:()=>{btn.disabled=true;searchMessage("Ort wird gesucht …");},
      onFinish:()=>{btn.disabled=false;},
      onCacheWrite:save
    });
    switch(result.kind){
      case "results":renderResults(result.results);break;
      case "disabled":searchMessage("Ortssuche im Test noch nicht aktiviert. Bitte in ⚙ Einstellungen nach Prüfung der Nominatim-Richtlinie aktivieren.");break;
      case "throttled":searchMessage("Bitte kurz warten und die Suche erneut starten.");break;
      case "error":searchMessage("Ortssuche derzeit nicht verfügbar. Bitte Verbindung prüfen und erneut suchen.");break;
      // A superseded or cancelled request must never change the UI.
      case "stale":break;
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
      const name=prompt("Name der neuen Ebene:",layerOps.nextName(state));
      if(name===null)return;
      try{layerOps.create(state,{id:uid(),name,cleanText,colors:COLORS});}
      catch(error){
        showNotice(error.message==="Empty layer name"?"Bitte einen Ebenennamen eingeben":
          error.message==="Duplicate layer name"?"Der Ebenenname ist bereits vergeben":"Ebene konnte nicht erstellt werden");
        return;
      }
      renderLayers();save();
    });

    $("pinName").addEventListener("input", e => { const p=selectedPin(); if(p){pinOps.renamePin(state,p.id,e.target.value,{cleanText});save();renderMarkers();} });
    $("pinName").addEventListener("blur", e => {e.target.value=cleanText(e.target.value);});
    $("pinLayer").addEventListener("change", e => {
      const p=selectedPin(); if(!p || !layerById(e.target.value))return;
      pinOps.assignLayer(state,p.id,e.target.value); save();renderLayers();renderMarkers();renderPinPanel();
      if(!layerById(p.layerId).visible) showNotice("Pin liegt jetzt in einer ausgeblendeten Ebene");
    });
    $("showPinLayer").addEventListener("click", () => {
      const p=selectedPin();if(!p)return;filterOps.setLayerVisible(state,p.layerId,true);
      save();renderLayers();renderMarkers();renderPinPanel();
    });
    $("movePin").addEventListener("click",beginMove);
    $("cancelMove").addEventListener("click",endMove);
    $("confirmMove").addEventListener("click",confirmMove);
    $("deletePin").addEventListener("click", () => { if(selectedPin())$("deleteDialog").showModal(); });
    $("deleteDialog").addEventListener("close", () => {
      if($("deleteDialog").returnValue!=="confirm")return;
      pinOps.deletePin(state,uiState.selectedPinId);uiState.clearSelection();
      save();renderMarkers();renderLayers();renderPinPanel();updateModeUI();showNotice("Pin gelöscht");
    });
    document.addEventListener("pointerdown", e => {
      if(!$("searchResults").classList.contains("hidden") && !e.target.closest("#searchResults, #searchForm"))hideResults();
    });
    mapAdapter.onMapClick(position => {
      if (gestures.isSuppressed()) return;
      if (uiState.moveMode && selectedPin()) {moveView.show(position,selectedPin());return;}
      closeMapOverlays();
    });

    gestures.attachLongPress();
    // Leaflet fires move continuously while dragging/pinching, unlike moveend.
    mapAdapter.on("move",scheduleMapOverlayUpdate);
    mapAdapter.on("moveend", () => {persistViewport();if(!gestures.isMarkerPressActive())renderMarkers();scheduleMapOverlayUpdate();});
    mapAdapter.on("zoomend", () => {if(!gestures.isMarkerPressActive())renderMarkers();scheduleMapOverlayUpdate();});
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
    placeSearch.cleanup(state);
    mapAdapter=window.Pin2MapLeafletAdapter.mount("map",{center:{lat:state.viewport.lat,lng:state.viewport.lng},zoom:state.viewport.zoom});
    gestures=window.Pin2MapMapGestureController({
      mapAdapter,
      getBasemap:()=>state.basemap,
      isMoveMode:()=>uiState.moveMode,
      selectPin,addPin,renderMarkers,persistViewport,updatePanelLayout,
      scheduleFrame:requestAnimationFrame,
      vibrate:duration=>{if(navigator.vibrate)navigator.vibrate(duration);}
    });
    markerView=new window.Pin2MapPinMarkerView.PinMarkerView({
      mapAdapter,cleanText,defaultColor:COLORS[0],
      onSelect:id=>{if(gestures.isSuppressed()||uiState.moveMode)return;selectPin(id);},
      attachGesture:(marker,id)=>gestures.attachMarkerLongPress(marker,id)
    });
    moveView=new window.Pin2MapPinMovePreview.PinMovePreview({
      mapAdapter,getElement:$,
      getAppRect:()=>$("app").getBoundingClientRect(),
      getViewport:()=>window.visualViewport||{offsetLeft:0,offsetTop:0,width:window.innerWidth,height:window.innerHeight},
      onPosition:position=>{if(uiState.moveMode&&selectedPin())moveView.show(position,selectedPin());}
    });
    mapAdapter.addZoomControls({onFitAll:fitAllPins});
    setTileLayer();bind();renderLayers();renderMarkers();renderPinPanel();updateModeUI();updateLabelButton();
    if("serviceWorker" in navigator && location.protocol==="https:")navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{});
  }
  document.addEventListener("DOMContentLoaded",init);
})();