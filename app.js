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
    geocoder:new window.Pin2MapNominatimGeocoder({fetchImpl:(...args)=>fetch(...args),language:"de"})
  });
  const layerOps = window.Pin2MapLayerOperations;
  const projectFeatures=window.Pin2MapProjectFeatures;
  const riverGeometry=window.Pin2MapRiverGeometry;
  const areaFinder=new window.Pin2MapNominatimAreaFinder.NominatimAreaFinder({
    fetchImpl:(...args)=>fetch(...args)
  });
  const riverFinder=new window.Pin2MapOsmWatercourseFinder.OsmWatercourseFinder({
    fetchImpl:(...args)=>fetch(...args)
  });
  const currentPinFilter = pinFilter.createFilter();
  let projectStore, state = defaults(), mapAdapter, markerView, moveView, moveGuide, panelPositioner, moveController;
  const uiState = new window.Pin2MapUIState();
  let gestures,pinOverlapZoom,mapViewHistory,favoritesPanel,historyRecordTimer=null;
  let mapActionChooser,geometryEditor,searchTypeMenu,featureController=null,featureRun=0;
  let areaHierarchyPoint=null,areaHierarchyCountry="";
  const favorites=window.Pin2MapMapFavorites;
  // Device-local presentation preference only: never include the debug hitbox
  // overlay switch in syncable project data or alter the 52x56 tap geometry.
  const HITBOX_DISPLAY_KEY="pin2map-show-yellow-pin-hitboxes-v1";
  function applyHitboxDisplay(visible){
    document.body.classList.toggle("pin-hitboxes-hidden",!visible);
    $("showPinHitboxes").checked=visible;
  }
  function readHitboxDisplay(){
    try{return localStorage.getItem(HITBOX_DISPLAY_KEY)!=="false";}
    catch(_){return true;}
  }
  function writeHitboxDisplay(visible){
    applyHitboxDisplay(visible);
    try{localStorage.setItem(HITBOX_DISPLAY_KEY,String(visible));}catch(_){}
  }
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "pin-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const layerById = id => layerOps.find(state,id);
  const selectedPin = () => pinOps.findPin(state,uiState.selectedPinId);
  const cleanText = projectModel.cleanText;
  const uiShell = new window.Pin2MapUIShell({getElement:$,mountLabelIcon:(button,name)=>window.Pin2MapIcons.mount(button,name)});
  const pinEditorView = new window.Pin2MapPinEditorView({
    getElement:$,document,scheduleFrame:callback=>window.requestAnimationFrame(callback)
  });
  const searchView = new window.Pin2MapSearchResultsView({
    container:$("searchResults"),document,
    onChoose:result=>{
      if(result.__featureType)void chooseGeometryResult(result);
      else choosePlace(result);
    },
    onCancel:()=>{searchForm.cancel();cancelGeometrySearch();},
    titleOf:result=>result.__featureType?
      (result.name||result.tags?.name||result.display_name?.split(",")[0]||"Unbenannt"):
      placeDomain.title(result),
    detailOf:result=>result.__featureType?
      (result.detail||result.display_name||result.type||"OpenStreetMap"):
      placeDomain.detail(result),
    kindOf:result=>result.__featureType?null:placeDomain.kind(result),
    featureIconOf:result=>result.__featureType==="river"?"spline":
      result.__featureType==="lake"?"waves-horizontal":
      result.__featureType?"vector-polygon":null,
    icons:window.Pin2MapIcons,
    duplicateCoordinates:results=>results.some(r=>r.__featureType)?[]:
      placeDomain.duplicateCoordinates(results)
  });
  const layerView = new window.Pin2MapLayerView({
    getElement:$,document,
    onVisibility:(id,visible)=>{filterOps.setLayerVisible(state,id,visible);save();renderLayers();renderMarkers();renderGeometry();renderPinPanel();},
    onDelete:id=>deleteLayerOrPrivatePins(id)
  });
  const pinLayerPicker = new window.Pin2MapPinLayerPicker({getElement:$,document});
  const pinInfoService=new window.Pin2MapPinInfoService.PinInfoService({
    provider:new window.Pin2MapPinInfoProvider({
      forecast:new window.Pin2MapOpenMeteoPinInfo({fetchImpl:(...args)=>fetch(...args)}),
      climatology:new window.Pin2MapNasaPowerClimatology({fetchImpl:(...args)=>fetch(...args)}),
      precipitation:new window.Pin2MapNasaPowerPrecipitation({fetchImpl:(...args)=>fetch(...args)}),
      sunTimes:new window.Pin2MapMonthlySunTimes({fetchImpl:(...args)=>fetch(...args)})
    }),
    onUpdate:()=>renderMarkers(),
    onLoadingChange:loading=>pinInfoMenu.setLoading(loading),
    onError:()=>showNotice("Pin-Informationen vorübergehend nicht verfügbar")
  });
  const pinInfoMenu=new window.Pin2MapPinInfoMenu({
    getElement:$,document,icons:window.Pin2MapIcons,
    onOpening:()=>{basemapMenu.close();uiShell.closePanels();searchView.hide();},
    onPeriodChange:(mode,period)=>{
      const field=mode==="daily"?"pinInfoDailyPeriod":mode==="precipitation"?"pinInfoPrecipitationPeriod":"pinInfoSunPeriod";
      if(state[field]!==period||state.pinInfoMode!==mode){
        state[field]=period;
        state.pinInfoMode=mode;
        pinInfoService.setMode(mode,period);
        pinInfoMenu.render(mode,{daily:state.pinInfoDailyPeriod,precipitation:state.pinInfoPrecipitationPeriod,sun:state.pinInfoSunPeriod});
        save();renderMarkers();
      }
    },
    onSelect:mode=>{
      if(state.pinInfoMode!==mode){
        state.pinInfoMode=mode;
        const period=mode==="daily"?state.pinInfoDailyPeriod:
          mode==="sun"?state.pinInfoSunPeriod:mode==="precipitation"?state.pinInfoPrecipitationPeriod:"today";
        pinInfoService.setMode(mode,period);
        pinInfoMenu.render(mode,{daily:state.pinInfoDailyPeriod,precipitation:state.pinInfoPrecipitationPeriod,sun:state.pinInfoSunPeriod});
        save();renderMarkers();
      }
    }
  });
  const satelliteInspector=new window.Pin2MapSatelliteInspector({
    getElement:$,document,
    mapPort:{
      getViewport:()=>mapAdapter.getImageryQueryViewport(),
      showSatelliteSelection:p=>mapAdapter.showSatelliteSelection(p),
      clearSatelliteSelection:()=>mapAdapter?.clearSatelliteSelection(),
      setInspectionCursor:active=>mapAdapter?.setInspectionCursor(active)
    },
    provider:new window.Pin2MapEsriImageryMetadata({fetchImpl:(...args)=>fetch(...args)}),
    onNotice:message=>showNotice(message)
  });
  const basemapMenu = new window.Pin2MapBasemapMenu({
    getElement:$,document,
    onOpening:()=>{pinInfoMenu.close();uiShell.closePanels();searchView.hide();},
    onSelect:value=>{
      if(state.basemap!==value){satelliteInspector.stop();state.basemap=value;setTileLayer();save();}
    },
    onRoadsChange:enabled=>{
      if(state.basemap!=="satellite")return;
      if(!!state.satelliteRoads!==enabled){state.satelliteRoads=enabled;setTileLayer();save();}
    },
    onReliefChange:enabled=>{
      if(!!state.esriRelief!==enabled){state.esriRelief=enabled;setTileLayer();save();}
    },
    onSatelliteReset:()=>{
      if(state.basemap!=="satellite")return;
      state.satelliteBrightness=120;
      mapAdapter.setSatelliteAppearance({brightness:120});
      save();
    },
    onSatelliteAdjust:(key,value,commit)=>{
      if(state.basemap!=="satellite"||key!=="brightness")return;
      state.satelliteBrightness=value;
      mapAdapter.setSatelliteAppearance({brightness:value});
      if(commit)save();
    }
  });
  const bulkDeleteDialog = new window.Pin2MapBulkDeleteDialog({
    getElement:$,onConfirm:id=>confirmBulkDeletion(id)
  });
  const pinDetails=new window.Pin2MapPinDetails({
    getElement:$,document,
    onNote:value=>{
      const p=selectedPin();if(!p)return;
      pinOps.updateDetails(state,p.id,{note:value});save();renderMarkers();
    },
    onUrl:value=>{
      const p=selectedPin();if(!p)return;
      pinOps.updateDetails(state,p.id,{url:value});save();renderMarkers();
    },
    onWikipedia:()=>{
      const name=selectedPin()?.name?.trim();if(!name){showNotice("Bitte zuerst einen Pin-Namen eingeben");return;}
      const url="https://de.wikipedia.org/w/index.php?search="+encodeURIComponent(name);
      const link=document.createElement("a");
      link.href=url;link.target="_blank";link.rel="noopener noreferrer";
      link.style.display="none";document.body.appendChild(link);link.click();link.remove();
    },
    onLayout:focus=>{
      updatePanelLayout();
      if(focus)requestAnimationFrame(keepSelectedAbovePanel);
    }
  });
  const noteEditor=new window.Pin2MapPinNoteEditor({
    getElement:$,document,
    onChange:value=>{
      const pin=selectedPin();
      if(pin){pinOps.updateDetails(state,pin.id,{note:value});$("pinNotes").value=value;save();renderMarkers();}
    },
    onClose:()=>{updatePanelLayout();}
  });
  const pinEditorActions = new window.Pin2MapPinEditorActions({
    getElement:$,cleanText,
    onNameChange:value=>{
      const p=selectedPin();
      if(p){pinOps.renamePin(state,p.id,value,{cleanText});save();renderMarkers();}
    },
    onLayerChange:id=>{
      const p=selectedPin();if(!p||!layerById(id))return;
      pinOps.assignLayer(state,p.id,id);save();renderLayers();renderMarkers();renderPinPanel();
      if(!layerById(p.layerId).visible)showNotice("Pin liegt jetzt in einer ausgeblendeten Ebene");
    },
    onShowLayer:()=>{
      const p=selectedPin();if(!p)return;
      filterOps.setLayerVisible(state,p.layerId,true);
      save();renderLayers();renderMarkers();renderPinPanel();
    }
  });
  const overlayCoordinator = new window.Pin2MapMapOverlayCoordinator({
    getElement:$,document,searchView,uiShell,basemapMenu,pinInfoMenu,
    getMoveMode:()=>uiState.moveMode,
    getSelectedPinId:()=>uiState.selectedPinId,
    onCancelMove:()=>moveController.cancel(),
    onClearSelection:()=>{
      uiState.selectedPinId=null;uiState.moveMode=false;
      renderMarkers();renderPinPanel();updateModeUI();
    }
  });
  const pinDeleteDialog = new window.Pin2MapPinDeleteDialog({
    getElement:$,
    getSelectedPinId:()=>selectedPin()?.id??null,
    onConfirm:id=>{
      if(!pinOps.deletePin(state,id))return;
      if(uiState.selectedPinId===id)uiState.clearSelection();
      save();renderMarkers();renderLayers();renderPinPanel();updateModeUI();showNotice("Pin gelöscht");
    }
  });
  const pinSession = new window.Pin2MapPinSession({
    getProject:()=>state,getSelectedPinId:()=>uiState.selectedPinId,
    uiState,pinOps,privateLayerId:PRIVATE_ID,createId:uid,
    validatePosition:projectModel.position,cleanText,getLayer:layerById,
    overlays:overlayCoordinator,cancelMove:()=>moveController.cancel(),
    onModeChange:()=>updateModeUI(),
    onRenderMarkers:()=>renderMarkers(),onRenderLayers:()=>renderLayers(),
    onRenderPanel:()=>renderPinPanel(),
    scheduleSelectionLayout:()=>requestAnimationFrame(keepSelectedAbovePanel),
    onSave:()=>save(),onNotice:message=>showNotice(message)
  });
  const layerCreation = new window.Pin2MapLayerCreation({
    getProject:()=>state,operations:layerOps,
    askName:defaultName=>prompt("Name der neuen Ebene:",defaultName),
    createId:uid,cleanText,colors:COLORS,
    onNotice:message=>showNotice(message),onRender:()=>renderLayers(),onSave:()=>save()
  });
  const searchPinTransfer = new window.Pin2MapSearchPinTransfer({
    searchView,titleOf:result=>placeDomain.pinName(result),
    addPin:(lat,lng,name)=>addPin(lat,lng,name),mapPort:{
      getViewport:()=>mapAdapter.getViewport(),
      setView:(view,options)=>mapAdapter.setView(view,options)
    },
    onLayout:()=>requestAnimationFrame(keepSelectedAbovePanel),
    isPrivateLayerVisible:()=>layerById(PRIVATE_ID).visible,
    onRenderMarkers:()=>renderMarkers()
  });
  const mapClickCoordinator = new window.Pin2MapMapClickCoordinator({
    isMoveMode:()=>uiState.moveMode,
    previewMove:position=>moveController.previewAt(position),
    isSuppressed:()=>gestures.isSuppressed(),
    onTargetAccepted:()=>{
      moveGuide.stop();
      markerView.setRelocationSource(null);
      updateModeUI();
    },
    onOrdinaryClick:()=>overlayCoordinator.closeAll()
  });
  const mapOverlayLayout = new window.Pin2MapMapOverlayLayoutCoordinator({
    mapPort:{
      on:(event,handler)=>mapAdapter.on(event,handler),
      off:(event,handler)=>mapAdapter.off?.(event,handler),
      invalidateSize:()=>mapAdapter.invalidateSize()
    },
    windowPort:window,
    getPin:()=>selectedPin(),isMoving:()=>uiState.moveMode,
    isMarkerPressActive:()=>gestures.isMarkerPressActive(),
    panelPositioner:{
      layout:options=>panelPositioner?.layout(options),
      keepVisibleAtOpen:options=>panelPositioner?.keepVisibleAtOpen(options)
    },
    movePreview:{positionBar:()=>moveView.positionBar()},
    onPersistViewport:()=>persistViewport(),onRenderMarkers:()=>renderMarkers(),
    requestFrame:callback=>requestAnimationFrame(callback),
    cancelFrame:id=>cancelAnimationFrame(id)
  });
  const showNotice = message => uiShell.showNotice(message);
  const persistence = new window.Pin2MapProjectPersistence({
    getProject:()=>state,getStore:()=>projectStore,onError:message=>showNotice(message)
  });
  const save = () => persistence.save();
  const dbWrite = () => persistence.writeNow();
  function persistViewport() {
    persistence.saveViewport(mapAdapter.getViewport());
  }
  function flushHistoryRecord(){
    if(historyRecordTimer!==null){clearTimeout(historyRecordTimer);historyRecordTimer=null;}
    if(mapViewHistory)mapViewHistory.push(mapAdapter.getViewport());
  }
  function navigateMapHistory(direction){
    flushHistoryRecord();
    const view=direction==="undo"?mapViewHistory?.undo():mapViewHistory?.redo();
    if(view){pinOverlapZoom?.close();overlayCoordinator.closeAll();
      mapAdapter.setView(view,{animate:false});persistViewport();}
  }
  function currentFavorites(){return favorites.items(state).slice(0,favorites.ACTIVE_CAPACITY);}
  function setFavoriteMessage(message){$("favoritesMessage").textContent=message;}
  function syncFavoritePanel(){favoritesPanel?.render(currentFavorites());}
  function suggestFavoriteName(){
    const size=mapAdapter.getSize(),middle={x:size.x/2,y:size.y/2};
    let nearest=null,best=Infinity;
    const visible=pinFilter.visiblePins(state.pins,state.layers,currentPinFilter);
    for(const pin of visible){
      const point=mapAdapter.project(pin);
      if(point.x<0||point.y<0||point.x>size.x||point.y>size.y)continue;
      const dist=(point.x-middle.x)**2+(point.y-middle.y)**2;
      if(dist<best){nearest=pin;best=dist;}
    }
    return nearest?.name?.trim()||"Unbekannt "+new Date().toISOString().slice(0,10);
  }
  function addMapFavorite(name){
    const letter=favorites.append(state,mapAdapter.getViewport(),state.layers,
      new Date().toISOString(),name,state.basemap);
    if(!letter){setFavoriteMessage("Maximale Anzahl von 500 Favoriten erreicht.");return;}
    save();syncFavoritePanel();setFavoriteMessage("Favorit gespeichert.");
  }
  function replaceMapFavorite(index,name){
    if(favorites.replace(state,index,mapAdapter.getViewport(),state.layers,
      new Date().toISOString(),name,state.basemap)){
      save();syncFavoritePanel();setFavoriteMessage("Favorit ersetzt.");
    }
  }
  function renameMapFavorite(index,name){
    if(favorites.rename(state,index,name)){
      save();syncFavoritePanel();setFavoriteMessage("Favorit umbenannt.");
    }
  }
  function removeMapFavorite(index){
    if(favorites.remove(state,index)){
      save();syncFavoritePanel();
      setFavoriteMessage("Favorit entfernt. Die Liste wurde lückenlos neu geordnet.");
    }
  }
  function removeAllMapFavorites(){
    if(favorites.removeAll(state)){
      save();
      syncFavoritePanel();
      setFavoriteMessage("Alle Favoriten gelöscht.");
    }
  }
  function openMapFavorite(index){
    const viewport=favorites.apply(state,index);
    if(!viewport)return;
    const favorite=state.favorites[index];
    if(favorite?.basemap&&["street","topo","international","satellite","humanitarian"].includes(favorite.basemap)
      &&state.basemap!==favorite.basemap){
      satelliteInspector.stop();state.basemap=favorite.basemap;setTileLayer();
    }
    save();renderLayers();renderMarkers();renderPinPanel();
    favoritesPanel.close();
    setFavoriteMessage("");
    // Preserve a just-completed zoom/drag even when its animation and
    // 320ms gesture-coalescing timer have not settled yet.
    flushHistoryRecord();
    mapAdapter.setView(viewport,{animate:false});
    persistViewport();
  }
  function setTileLayer() {
    mapAdapter.setBasemap(state.basemap,{
      esriRelief:!!state.esriRelief,
      satelliteBrightness:state.satelliteBrightness,
      satelliteRoads:!!state.satelliteRoads
    });
    basemapMenu.render(state.basemap,!!state.esriRelief,{
      brightness:state.satelliteBrightness,roads:!!state.satelliteRoads
    });
  }
  function renderGeometry(){
    if(!mapAdapter?.renderProjectGeometry)return;
    const visible=new Set(state.layers.filter(l=>l.visible).map(l=>l.id));
    const layerColors=Object.fromEntries(state.layers.map(l=>[l.id,l.color]));
    mapAdapter.renderProjectGeometry({
      areas:(state.areas||[]).filter(a=>visible.has(a.layerId)),
      rivers:(state.rivers||[]).filter(r=>visible.has(r.layerId)),
      layerColors,
      onAreaLabel:(area,point)=>openGeometryEditor("area",area,point),
      onRiverLine:(river,point)=>openGeometryEditor("river",river,point)
    });
  }
  function openGeometryEditor(type,item,position){
    if(!geometryEditor)return;
    uiState.clearSelection();renderMarkers();renderPinPanel();
    const xy=mapAdapter.project(position);
    const rect=mapAdapter.getContainer().getBoundingClientRect();
    geometryEditor.show(type,item,state.layers,{x:rect.left+xy.x,y:rect.top+xy.y});
  }
  function saveGeometry(type,id,patch){
    const result=projectFeatures.change(state,type,id,patch);
    if(result){save();renderGeometry();}
    return result;
  }
  function deleteGeometry(type,id){
    if(projectFeatures.remove(state,type,id)){
      save();renderGeometry();showNotice(type==="river"?"Fluss entfernt":"Fläche entfernt");
    }
  }
  function renderMarkers(){
    if(!markerView)return;
    const visible=pinFilter.visiblePins(state.pins,state.layers,currentPinFilter);
    pinInfoService.setVisiblePins(visible);
    markerView.render({
      pins:visible,
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
    // Existing geometry must never become orphaned when its layer disappears.
    // Retain it in Private rather than deleting unrelated spatial information.
    if(!result.privateOnly){
      for(const x of [...(state.areas||[]),...(state.rivers||[])])
        if(x.layerId===id)x.layerId=PRIVATE_ID;
    }
    save();renderLayers();renderMarkers();renderGeometry();renderPinPanel();
    showNotice(result.privateOnly?"Private Pins gelöscht":"Ebene und Pins gelöscht");
  }
  function renderLayers(){
    layerView.render({
      layers:state.layers,
      counts:pinFilter.countByLayer(state.pins,state.layers),
      selectedLayerId:selectedPin()?.layerId??null
    });
  }
  const updatePanelLayout = ()=>mapOverlayLayout.layout();
  const scheduleMapOverlayUpdate = ()=>mapOverlayLayout.schedule();
  const keepSelectedAbovePanel = ()=>mapOverlayLayout.keepVisibleAtOpen();
  function fitAllPins(){
    flushHistoryRecord();
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
    pinDetails.render(pin);
    if(pin)pinLayerPicker.render({layers:state.layers,selectedLayerId:pin.layerId});
    else pinLayerPicker.setOpen(false);
  }
  function selectPin(id){
    pinOverlapZoom?.close();
    pinSession.select(id);
  }
  function handleMarkerTap(id){
    if(uiState.moveMode||satelliteInspector.isActive())return;
    if(pinOverlapZoom)pinOverlapZoom.handleTap(id);
    else selectPin(id);
  }
  function updateModeUI() {
    const picking=uiState.moveMode&&!moveView.current();
    document.body.classList.toggle("pin-relocation-picking",picking);
    mapAdapter.getContainer().style.cursor = picking ? "crosshair" : "";
  }
  function addPin(lat,lng,name){return pinSession.add(lat,lng,name);}

  function setGeometryBusy(message){
    const element=$("geometrySearchBusy");
    if(!element)return;
    element.textContent=message||"Suche läuft …";
    element.classList.toggle("hidden",!message);
    if(message){
      const outer=$("searchForm").getBoundingClientRect();
      const app=$("app").getBoundingClientRect();
      element.style.left=Math.max(8,outer.left-app.left)+"px";
      element.style.top=Math.max(8,outer.bottom-app.top+7)+"px";
    }
  }
  function cancelGeometrySearch(){
    ++featureRun;
    featureController?.abort();featureController=null;setGeometryBusy("");
  }
  async function findGeometry(kind,query){
    if(!query.trim()){ $("searchInput").focus();return;}
    cancelGeometrySearch();
    searchForm.cancel();
    if(!state.allowGeocode){
      searchView.message("Bitte zuerst in den Einstellungen die Nominatim-Suche aktivieren.");
      return;
    }
    const run=featureRun,controller=new AbortController();featureController=controller;
    searchView.hide();
    if(kind==="river")setGeometryBusy("Flusssuche läuft …");
    try{
      if(kind==="area"||kind==="lake"){
        const results=await areaFinder.find(query,{kind,signal:controller.signal});
        if(run!==featureRun)return;
        if(!results.length){
          searchView.message(kind==="lake"?"Kein passender kartierter See gefunden.":"Keine passende kartierte Fläche gefunden.");
          return;
        }
        searchView.show(results.map(x=>({...x,__featureType:kind})));
      }else{
        const candidates=await riverFinder.find(query,{
          center:mapAdapter.getViewport().center,signal:controller.signal,
          onProgress:p=>{
            if(run!==featureRun)return;
            const text=p.phase==="alternative"?"Alternative Flussnamen werden geprüft …":
              "Flusssuche läuft … "+(p.step||1)+"/"+(p.total||1);
            setGeometryBusy(text);
          }
        });
        if(run!==featureRun)return;
        const relations=candidates.filter(c=>c.osmType==="relation"&&c.nameScore>=100);
        const choices=relations.length?relations:candidates;
        if(choices.length===1)await chooseGeometryResult({
          __featureType:"river",candidate:choices[0],name:choices[0].tags?.name||query,
          query
        });
        else searchView.show(choices.map(c=>({
          __featureType:"river",candidate:c,name:c.tags?.name||query,query,
          detail:[c.osmType==="relation"?"OSM-Relation":"OSM-Way",
            c.tags?.waterway,c.display].filter(Boolean).join(" · ")
        })));
      }
    }catch(error){
      if(run!==featureRun||error?.name==="AbortError")return;
      searchView.message("Suche fehlgeschlagen: "+(error?.message||"Netzwerkfehler"));
    }finally{
      if(run===featureRun){featureController=null;setGeometryBusy("");}
    }
  }
  async function chooseGeometryResult(result){
    searchView.hide();
    const kind=result.__featureType;
    if(kind==="areaHierarchy"){
      if(!areaHierarchyPoint)return;
      const run=++featureRun,controller=new AbortController();featureController=controller;
      try{
        const choice=await areaFinder.findContaining(result,areaHierarchyPoint,{
          countryCode:areaHierarchyCountry,signal:controller.signal
        });
        if(run!==featureRun)return;
        if(!choice){searchView.message("Keine eindeutige Gebietsgrenze am Klickpunkt gefunden.");return;}
        createAreaObject(choice,"area",result.name);
      }catch(error){
        if(run===featureRun)searchView.message("Gebietssuche fehlgeschlagen: "+error.message);
      }finally{if(run===featureRun)featureController=null;}
      return;
    }
    if(kind==="area"||kind==="lake"){createAreaObject(result,kind);return;}
    if(kind==="river"){
      const run=++featureRun,controller=new AbortController();featureController=controller;
      setGeometryBusy("Flussverlauf wird geladen …");
      try{
        const source=await riverFinder.resolve(result.candidate,{
          query:result.query||result.name,signal:controller.signal,
          onProgress:p=>{if(run===featureRun)setGeometryBusy(
            p.phase==="parent"?"Übergeordnete Flussrelation wird geprüft …":"Flussverlauf wird geladen …");}
        });
        if(run!==featureRun)return;
        const resolved=riverGeometry.resolve(source.data,source.match);
        const river=projectFeatures.createRiver(state,{
          id:uid(),name:resolved.name||result.name,chains:resolved.chains
        },PRIVATE_ID);
        save();renderGeometry();mapAdapter.fitGeometry(river);
        const point=river.chains[0][Math.floor(river.chains[0].length/2)];
        openGeometryEditor("river",river,{lat:point[0],lng:point[1]});
      }catch(error){
        if(run===featureRun)searchView.message("Fluss konnte nicht geladen werden: "+error.message);
      }finally{if(run===featureRun){featureController=null;setGeometryBusy("");}}
    }
  }
  function createAreaObject(source,kind,nameOverride=null){
    const name=nameOverride||source.name||source.display_name?.split(",")[0]||"Fläche";
    const area=projectFeatures.createArea(state,{
      id:uid(),name,kind,geometry:source.geojson
    },PRIVATE_ID);
    save();renderGeometry();mapAdapter.fitGeometry(area);
    const prepared=window.Pin2MapAreaGeometry.prepare(area.geometry);
    // Choose a deterministic visible anchor via the map's renderer bounds.
    const geometry=prepared.geometry;
    let first=geometry.type==="Polygon"?geometry.coordinates[0][0]:
      geometry.coordinates[0]?.[0]?.[0];
    if(first)openGeometryEditor("area",area,{lat:first[1],lng:first[0]});
  }
  async function findAreaAt(point){
    cancelGeometrySearch();
    searchForm.cancel();searchView.hide();
    if(!state.allowGeocode){
      searchView.message("Bitte zuerst in den Einstellungen die Nominatim-Suche aktivieren.");
      return;
    }
    const run=featureRun,controller=new AbortController();featureController=controller;
    try{
      const result=await areaFinder.hierarchyAt(point,{signal:controller.signal});
      if(run!==featureRun)return;
      areaHierarchyPoint=point;areaHierarchyCountry=result.countryCode;
      if(!result.rows.length){
        searchView.message("Keine Gebietshierarchie für diesen Kartenpunkt gefunden.");
        return;
      }
      searchView.show(result.rows.map(row=>({
        ...row,__featureType:"areaHierarchy"
      })));
    }catch(error){
      if(run===featureRun)searchView.message("Gebietssuche fehlgeschlagen: "+error.message);
    }finally{if(run===featureRun)featureController=null;}
  }
  function runSearchMode(mode){
    if(mode==="pin"){searchForm.submit();return;}
    void findGeometry(mode,$("searchInput").value);
  }
  const searchMessage = msg => searchView.message(msg);
  const choosePlace = result => searchPinTransfer.choose(result);
  const renderResults = list => searchPinTransfer.present(list);

  const searchForm = new window.Pin2MapSearchFormController({
    getElement:$,
    search:(query,hooks)=>placeSearch.search(query,{
      state,allowed:state.allowGeocode,
      ...hooks,onCacheWrite:save
    }),
    onResults:renderResults,
    onMessage:searchMessage,
    onInputChange:()=>{searchView.hide();cancelGeometrySearch();},
    cancelSearch:()=>placeSearch.cancel()
  });
  const updateLabelButton = () => uiShell.updateLabelButton(state.labelsVisible);
  function bind() {
    searchForm.bind();
    searchTypeMenu=new window.Pin2MapSearchTypeMenu({
      document,getElement:$,icons:window.Pin2MapIcons,onChoose:runSearchMode
    });
    searchTypeMenu.bind();
    pinInfoMenu.bind();
    $("labelsToggle").addEventListener("click",()=>{state.labelsVisible=!state.labelsVisible;save();renderMarkers();updateLabelButton();});
    $("layersButton").addEventListener("click", () => overlayCoordinator.togglePanel("layersPanel"));
    $("settingsButton").addEventListener("click", () => overlayCoordinator.togglePanel("settingsPanel"));
    $("refreshButton").addEventListener("click",()=>window.Pin2MapPwaRefresh.refresh({
      button:$("refreshButton"),
      save:dbWrite,
      showNotice
    }));
    overlayCoordinator.bind();
    basemapMenu.bind();
    satelliteInspector.bind();
    applyHitboxDisplay(readHitboxDisplay());
    $("showPinHitboxes").addEventListener("change",event=>writeHitboxDisplay(event.target.checked));
    $("allowGeocode").checked = state.allowGeocode;
    $("allowGeocode").addEventListener("change", e => { state.allowGeocode = e.target.checked; save(); });
    $("addLayer").addEventListener("click",()=>layerCreation.create());

    pinEditorActions.bind();
    pinDetails.bind();
    noteEditor.bind();
    $("pinNotesExpand").addEventListener("click",()=>{
      const pin=selectedPin();if(!pin||noteEditor.open)return;
      pinDetails.closeTransient();
      noteEditor.show({name:pin.name,note:pin.note,desktop:true});
    });
    $("pinNotes").addEventListener("focus",()=>{
      const pin=selectedPin();
      if(!pin||noteEditor.open)return;
      if(window.matchMedia("(max-width: 700px), (pointer: coarse)").matches){
        $("pinNotes").blur();
        noteEditor.show({name:pin.name,note:pin.note});
      }
    });
    for(const id of ["deletePin","movePin","pinLayerTrigger","closePin"]){
      $(id).addEventListener("click",()=>pinDetails.closeTransient());
    }
    $("movePin").addEventListener("click",()=>moveController.begin());
    $("cancelMove").addEventListener("click",()=>moveController.cancel());
    $("confirmMove").addEventListener("click",()=>moveController.confirm());
    pinDeleteDialog.bind();

    mapAdapter.onMapClick(position=>{
      // A pin touch can synthesize a later Leaflet map click. Do not let that
      // suppressed ghost click immediately dismiss the new overlap chooser.
      if(!gestures.isSuppressed())pinOverlapZoom?.close();
      if(satelliteInspector.isActive()){satelliteInspector.pick(position);return;}
      pinInfoMenu.close();mapClickCoordinator.handle(position);
    });

    gestures.attachLongPress();
    mapOverlayLayout.bind();
    document.addEventListener("visibilitychange", () => { if(document.visibilityState==="hidden"){flushHistoryRecord();persistence.flushOnHidden();} });
  }
  async function init() {
    if(!window.L){$("notice").textContent="Die Kartenbibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen."; $("notice").classList.remove("hidden");return;}
    let savedProject;
    try {projectStore=await window.Pin2MapIndexedDBProjectStore.open();savedProject=await projectStore.loadProject();}
    catch(e){showNotice("IndexedDB nicht verfügbar – Änderungen können verloren gehen");}
    state=window.Pin2MapProjectHydration.hydrate(savedProject,{
      defaults,privateLayerId:PRIVATE_ID,cleanupSearch:project=>placeSearch.cleanup(project)
    });
    if(!Array.isArray(state.favorites))state.favorites=[];
    projectFeatures.ensure(state);
    mapAdapter=window.Pin2MapLeafletAdapter.mount("map",{center:{lat:state.viewport.lat,lng:state.viewport.lng},zoom:state.viewport.zoom});
    geometryEditor=new window.Pin2MapGeometryEditor({
      document,icons:window.Pin2MapIcons,onUpdate:saveGeometry,
      onDelete:deleteGeometry,onWikipedia:name=>{
        const url="https://de.wikipedia.org/w/index.php?search="+encodeURIComponent(name);
        const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";
        document.body.append(a);a.click();a.remove();
      }
    });
    mapActionChooser=new window.Pin2MapMapActionChooser({
      document,getElement:$,icons:window.Pin2MapIcons,
      onZoom:point=>{
        flushHistoryRecord();
        mapAdapter.setView({center:{lat:point.lat,lng:point.lng},zoom:16},{animate:false});
        persistViewport();
      },
      onPin:point=>addPin(point.lat,point.lng,""),
      onArea:point=>void findAreaAt(point)
    });
    mapActionChooser.bind();
    gestures=window.Pin2MapMapGestureController({
      mapAdapter,
      onMapAction:(point,screen)=>{geometryEditor?.close(false);mapActionChooser?.open(point,screen);},
      getBasemap:()=>state.basemap,
      isMoveMode:()=>uiState.moveMode,
      isInspectMode:()=>satelliteInspector.isActive(),
      selectPin:handleMarkerTap,addPin,renderMarkers,persistViewport,updatePanelLayout,
      scheduleFrame:requestAnimationFrame,
      vibrate:duration=>{if(navigator.vibrate)navigator.vibrate(duration);}
    });
    markerView=new window.Pin2MapPinMarkerView.PinMarkerView({
      mapAdapter,cleanText,defaultColor:COLORS[0],
      getInfoLabel:pin=>pinInfoService.label(pin),
      formatInfo:info=>window.Pin2MapPinInfoLabel.labelMarkup(info,{
        getIconSvg:name=>window.Pin2MapIcons.svg(name,document).outerHTML
      }),
      onInfoClick:id=>selectPin(id),
      onSelect:id=>{if(gestures.isSuppressed()||uiState.moveMode)return;handleMarkerTap(id);},
      attachGesture:(marker,id)=>gestures.attachMarkerLongPress(marker,id)
    });
    pinOverlapZoom=new window.Pin2MapPinOverlapZoom.PinOverlapZoom({
      mapPort:mapAdapter,
      getPins:()=>markerView.visiblePins(),
      getMaxZoom:()=>state.basemap==="topo"?17:19,
      onSelect:id=>selectPin(id),
      onBeforeZoom:()=>overlayCoordinator.closeAll(),
      onHistoryChange:()=>setTimeout(flushHistoryRecord,0),
      getElement:$,document
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
    mapViewHistory=new window.Pin2MapMapViewHistory.MapViewHistory({
      onChange:availability=>mapAdapter.updateZoomHistory(availability),
      onSave:value=>projectStore?.saveViewHistory(value).catch(()=>showNotice("Ansichts-Historie konnte nicht gespeichert werden"))
    });
    let previouslySavedHistory=null;
    try{previouslySavedHistory=await projectStore?.loadViewHistory();}
    catch(_){showNotice("Ansichts-Historie konnte nicht geladen werden");}
    const restoredViewport=mapViewHistory.load(previouslySavedHistory,mapAdapter.getViewport());
    if(restoredViewport)mapAdapter.setView(restoredViewport,{animate:false});
    mapAdapter.addZoomControls({
      onFitAll:fitAllPins,
      onUndo:()=>navigateMapHistory("undo"),
      onRedo:()=>navigateMapHistory("redo")
    });
    mapAdapter.updateZoomHistory({undo:mapViewHistory.canUndo(),redo:mapViewHistory.canRedo()});
    // A whole drag or a wheel/pinch sequence becomes one settled navigation
    // step, rather than creating dozens of intermediate undo entries.
    mapAdapter.on("moveend zoomend",()=>{
      if(historyRecordTimer!==null)clearTimeout(historyRecordTimer);
      historyRecordTimer=setTimeout(flushHistoryRecord,320);
    });
    favoritesPanel=new window.Pin2MapMapFavoritesPanel({
      document,getElement:$,icons:window.Pin2MapIcons,
      onOpen:()=>{overlayCoordinator.closeAll();pinInfoMenu.close();pinOverlapZoom.close();setFavoriteMessage("");},
      onAdd:addMapFavorite,onReplace:replaceMapFavorite,onRename:renameMapFavorite,
      onRemove:removeMapFavorite,onRemoveAll:removeAllMapFavorites,
      onChoose:openMapFavorite,suggestName:suggestFavoriteName,
      capacity:favorites.ACTIVE_CAPACITY,
      getSearch:()=>{
        try{return localStorage.getItem("pin2map-favorites-search-v1")||"";}
        catch(_){return "";}
      },
      onSearchChange:value=>{
        try{
          if(value)localStorage.setItem("pin2map-favorites-search-v1",value);
          else localStorage.removeItem("pin2map-favorites-search-v1");
        }catch(_){}
      }
    });
    // No modal dialog is used: replacement confirmation is inside the panel.
    window.Pin2MapIcons.mount($("favoritesButton"),"star");
    const favoriteAdd=$("favoritesAdd");
    favoriteAdd.replaceChildren(window.Pin2MapIcons.svg("plus",document),
      document.createTextNode("Ansicht hinzufügen"));
    $("favoritesButton").addEventListener("click",()=>favoritesPanel.toggle(currentFavorites()));
    $("favoritesClose").addEventListener("click",()=>favoritesPanel.close());
    $("favoritesCloseBottom").addEventListener("click",()=>favoritesPanel.close());
    favoriteAdd.addEventListener("click",()=>{
      if(favoriteAdd.disabled)return;
      setFavoriteMessage("");favoritesPanel.start("new");
    });
    // Every click/tap outside the panel (especially on the map) closes it,
    // consistent with the existing overlay convention. No map content is hidden.
    document.addEventListener("pointerdown",event=>{
      if(favoritesPanel.open&&!event.target.closest("#favoritesPanel,#favoritesButton"))
        favoritesPanel.close();
    });
    document.addEventListener("keydown",event=>{
      if(event.key==="Escape"&&favoritesPanel.open){event.preventDefault();favoritesPanel.close();}
    });
    mapAdapter.addScaleControl();
    if(!window.Pin2MapPinInfoService.MODES.includes(state.pinInfoMode))state.pinInfoMode="off";
    for(const field of ["pinInfoDailyPeriod","pinInfoPrecipitationPeriod","pinInfoSunPeriod"]){
      // The old single period is retained when reopening an existing v122 project.
      if(!Object.hasOwn(savedProject||{},field)&&
        window.Pin2MapPinInfoService.PERIODS.includes(savedProject?.pinInfoPeriod))
        state[field]=savedProject.pinInfoPeriod;
      if(!window.Pin2MapPinInfoService.PERIODS.includes(state[field]))state[field]="today";
    }
    const selectedPeriod=state.pinInfoMode==="daily"?state.pinInfoDailyPeriod:
      state.pinInfoMode==="sun"?state.pinInfoSunPeriod:state.pinInfoMode==="precipitation"?state.pinInfoPrecipitationPeriod:"today";
    pinInfoService.setMode(state.pinInfoMode,selectedPeriod);
    pinInfoMenu.render(state.pinInfoMode,{daily:state.pinInfoDailyPeriod,precipitation:state.pinInfoPrecipitationPeriod,sun:state.pinInfoSunPeriod});
    setTileLayer();bind();renderLayers();renderMarkers();renderGeometry();renderPinPanel();updateModeUI();updateLabelButton();
    if("serviceWorker" in navigator && (location.protocol==="https:" || ["localhost","127.0.0.1"].includes(location.hostname)))navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{});
  }
  document.addEventListener("DOMContentLoaded",init);
})();