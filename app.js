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
  const fitVisiblePins = window.Pin2MapFitVisiblePins;
  const filterOps = window.Pin2MapFilterOperations;
  const placeDomain = window.Pin2MapPlaceSearch;
  const placeSearch = new window.Pin2MapPlaceSearchService({
    domain:placeDomain,
    geocoder:new window.Pin2MapNominatimGeocoder({fetchImpl:(...args)=>fetch(...args),language:navigator.language||"de"})
  });
  const layerOps = window.Pin2MapLayerOperations;
  const currentPinFilter = pinFilter.createFilter();
  let projectStore, state = defaults(), mapAdapter, markerView, moveView, moveGuide, panelPositioner, moveController;
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
    getElement:$,document,scheduleFrame:callback=>window.requestAnimationFrame(callback)
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
  const pinLayerPicker = new window.Pin2MapPinLayerPicker({getElement:$,document});
  const basemapMenu = new window.Pin2MapBasemapMenu({
    getElement:$,document,
    onOpening:()=>{uiShell.closePanels();searchView.hide();},
    onSelect:value=>{
      if(state.basemap!==value){state.basemap=value;setTileLayer();save();}
    }
  });
  const bulkDeleteDialog = new window.Pin2MapBulkDeleteDialog({
    getElement:$,onConfirm:id=>confirmBulkDeletion(id)
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
    basemapMenu.render(state.basemap);
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
    bulkDeleteDialog.show(id,info);
  }
  function confirmBulkDeletion(id){
    const result=layerOps.deleteLayerOrPins(state,id,PRIVATE_ID);
    if(!result)return;
    if(uiState.selectedPinId&&result.removedPinIds.includes(uiState.selectedPinId))uiState.selectedPinId=null;
    save();renderLayers();renderMarkers();renderPinPanel();
    showNotice(result.privateOnly?"Private Pins gelöscht":"Ebene und Pins gelöscht");
  }
  function renderLayers(){
    layerView.render({
      layers:state.layers,
      counts:pinFilter.countByLayer(state.pins,state.layers),
      selectedLayerId:selectedPin()?.layerId??null
    });
  }
  function updatePanelLayout(){
    if(panelPositioner)panelPositioner.layout({pin:selectedPin(),moving:uiState.moveMode});
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
    if(panelPositioner)panelPositioner.keepVisibleAtOpen({pin:selectedPin(),moving:uiState.moveMode});
  }
  function fitAllPins(){
    fitVisiblePins({
      pins:state.pins,layers:state.layers,filter:currentPinFilter,
      pinFilter,mapPort:mapAdapter,onEmpty:()=>showNotice("Keine sichtbaren Pins vorhanden"),
      onFit:updatePanelLayout
    });
  }
  function renderPinPanel(){
    const pin=selectedPin();
    pinEditorView.render({
      pin,moving:uiState.moveMode,layerVisible:pin?!!layerById(pin.layerId)?.visible:true,
      onLayout:updatePanelLayout
    });
    if(pin)pinLayerPicker.render({layers:state.layers,selectedLayerId:pin.layerId});
    else pinLayerPicker.setOpen(false);
  }
  function selectPin(id) {
    if (uiState.selectedPinId === id) { closeMapOverlays(); return; }
    // A pin tap replaces other map overlays with the selected pin editor.
    hideResults();
    $("layersPanel").classList.add("hidden");
    $("settingsPanel").classList.add("hidden");
    closeBasemapMenu();
    moveController.cancel();
    uiState.selectPin(id); updateModeUI();
    renderMarkers(); renderLayers(); renderPinPanel();
    requestAnimationFrame(keepSelectedAbovePanel);
  }
  function updateModeUI() {
    const picking=uiState.moveMode&&!moveView.current();
    document.body.classList.toggle("pin-relocation-picking",picking);
    mapAdapter.getContainer().style.cursor = picking ? "crosshair" : "";
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
    closeBasemapMenu();
    uiShell.hideNotice();
    const dlg = $("deleteDialog");
    if (dlg.open) dlg.close("cancel");
    if(uiState.moveMode)moveController.cancel();
    if (uiState.selectedPinId !== null || uiState.moveMode) {
      uiState.selectedPinId = null; uiState.moveMode = false;
      renderMarkers(); renderPinPanel(); updateModeUI();
    }
    if (document.activeElement && typeof document.activeElement.blur === "function") document.activeElement.blur();
  }
  const closeBasemapMenu = () => basemapMenu.close();
  const togglePanel = id => {closeBasemapMenu();uiShell.togglePanel(id);};
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

  const searchForm = new window.Pin2MapSearchFormController({
    getElement:$,
    search:(query,hooks)=>placeSearch.search(query,{
      state,allowed:state.allowGeocode,
      ...hooks,onCacheWrite:save
    }),
    onResults:renderResults,
    onMessage:searchMessage
  });
  const updateLabelButton = () => uiShell.updateLabelButton(state.labelsVisible);
  function bind() {
    searchForm.bind();
    $("labelsToggle").addEventListener("click",()=>{state.labelsVisible=!state.labelsVisible;save();renderMarkers();updateLabelButton();});
    $("layersButton").addEventListener("click", () => togglePanel("layersPanel"));
    $("settingsButton").addEventListener("click", () => togglePanel("settingsPanel"));
    $("refreshButton").addEventListener("click",()=>window.Pin2MapPwaRefresh.refresh({
      button:$("refreshButton"),
      save:async()=>{clearTimeout(saveTimer);await dbWrite();},
      showNotice
    }));
    document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => {if(b.dataset.close==="pinPanel"){closeMapOverlays();return;}uiShell.closePanel(b.dataset.close);}));
    basemapMenu.bind();
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
    $("movePin").addEventListener("click",()=>moveController.begin());
    $("cancelMove").addEventListener("click",()=>moveController.cancel());
    $("confirmMove").addEventListener("click",()=>moveController.confirm());
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
      // A deliberate relocation target is not an accidental follow-up click
      // to the preceding long press. Process move mode before suppression.
      if (uiState.moveMode) {
        if(moveController.previewAt(position)){
          moveGuide.stop();
          markerView.setRelocationSource(null);
          updateModeUI();
        }
        return;
      }
      if (gestures.isSuppressed()) return;
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
      onPosition:position=>moveController.previewAt(position)
    });
    moveGuide=new window.Pin2MapPinMoveGuide({
      mapAdapter,requestFrame:callback=>window.requestAnimationFrame(callback),
      cancelFrame:id=>window.cancelAnimationFrame(id)
    });
    panelPositioner=new window.Pin2MapPinPanelPositioner.PinPanelPositioner({
      mapAdapter,getElement:$,document
    });
    moveController=new window.Pin2MapPinMoveController({
      uiState,getProject:()=>state,getSelectedPin:selectedPin,
      pinOperations:pinOps,validatePosition:projectModel.position,preview:moveView,
      onEnter:()=>{
        $("pinPanel").classList.add("hidden");
        document.body.classList.remove("pin-open");
        $("pinDialogTip").classList.add("hidden");
        $("moveBar").classList.add("hidden");
        moveGuide.start(selectedPin());
        markerView.setRelocationSource(uiState.selectedPinId);
        updateModeUI();
      },
      onExit:({committed}={})=>{
        moveGuide.stop();
        markerView.setRelocationSource(null);
        if(committed)uiState.clearSelection();
        updateModeUI();renderMarkers();renderPinPanel();
      },
      onCommitted:()=>{save();renderMarkers();showNotice("Position gespeichert");}
    });
    mapAdapter.addZoomControls({onFitAll:fitAllPins});
    setTileLayer();bind();renderLayers();renderMarkers();renderPinPanel();updateModeUI();updateLabelButton();
    if("serviceWorker" in navigator && (location.protocol==="https:" || ["localhost","127.0.0.1"].includes(location.hostname)))navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{});
  }
  document.addEventListener("DOMContentLoaded",init);
})();