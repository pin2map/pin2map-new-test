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
  const fitVisibleProject = window.Pin2MapFitVisibleProject;
  const filterOps = window.Pin2MapFilterOperations;
  const placeDomain = window.Pin2MapPlaceSearch;
  const geocoder=new window.Pin2MapNominatimGeocoder({
    fetchImpl:(...args)=>fetch(...args),language:"de"
  });
  const placeSearch = new window.Pin2MapPlaceSearchService({
    domain:placeDomain,geocoder
  });
  const layerOps = window.Pin2MapLayerOperations;
  const projectFeatures=window.Pin2MapProjectFeatures;
  const riverGeometry=window.Pin2MapRiverGeometry;
  const areaFinder=new window.Pin2MapNominatimAreaFinder.NominatimAreaFinder({
    fetchImpl:(...args)=>fetch(...args)
  });
  const plateSearch=new window.Pin2MapLicensePlateSearch({
    catalog:window.Pin2MapLicensePlateCatalog,areaFinder
  });
  const riverFinder=new window.Pin2MapOsmWatercourseFinder.OsmWatercourseFinder({
    fetchImpl:(...args)=>fetch(...args)
  });
  const currentPinFilter = pinFilter.createFilter();
  const objectSearch=window.Pin2MapObjectSearch;
  let objectSearchSpotlight=null;
  // Presentation only: fresh persisted objects blink for at most 30 seconds.
  const recentlyCreated=new Map();
  const activeFlashIds=()=>new Set([...recentlyCreated].filter(([,end])=>Date.now()<end).map(([id])=>id));
  function flashNewObject(type,id){
    const key=type+":"+id,deadline=Date.now()+10000;
    recentlyCreated.set(key,deadline);
    setTimeout(()=>{
      if(recentlyCreated.get(key)!==deadline)return;
      recentlyCreated.delete(key);renderMarkers();renderGeometry();
    },10000);
  }
  let projectStore, state = defaults(), mapAdapter, markerView, moveView, moveGuide, panelPositioner, moveController;
  const uiState = new window.Pin2MapUIState();
  let gestures,pinOverlapZoom,featureOverlapZoom,mapViewHistory,favoritesPanel,historyRecordTimer=null;
  let mapActionChooser,geometryEditor,searchTypeMenu,gpsLocation,platePanel,temporaryLayerPicker;
  let pendingNewGpsPinId=null,temporaryInfoPin=null;
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
      if(result.__plateChoice)showPlateSelection(result.__plateChoice);
      else if(result.__plateEntry)void choosePlateResult(result.__plateEntry);
      else if(result.__featureType)void chooseGeometryResult(result);
      else choosePlace(result);
    },
    onCancel:()=>{searchForm.cancel();cancelGeometrySearch();},
    titleOf:result=>result.__plateChoice?result.choiceTitle:
      result.__plateEntry?result.label:result.__featureType?
      (result.name||result.tags?.name||result.display_name?.split(",")[0]||"Unbenannt"):
      placeDomain.title(result),
    detailOf:result=>result.__plateChoice?result.choiceDetail:
      result.__plateEntry?
      (result.status==="historic"?"Historischer Code · ":
        result.status==="unknown"?"Heutige Vergabe ungeprüft · ":"")+
        result.country+" · "+(result.jurisdictionVerified?
          "Zulassungsgebiet: "+result.registrationArea+
          (result.namesakePlace?" · namensgebender Ort: "+result.namesakePlace:""):
          result.jurisdictionEvidence==="secondary"?
            "Zulassungsgebiet aus Sekundärquelle, amtlich ungeprüft · "+result.admin:
            result.admin)+
        (result.source==="community-check-2026"?" · Regionscode aus Referenzliste":"")+
        " · geografische Verortung":
      result.__featureType?
      (result.detail||result.display_name||result.type||"OpenStreetMap"):
      placeDomain.detail(result),
    kindOf:result=>result.__plateEntry||result.__plateChoice||result.__featureType?
      null:placeDomain.kind(result),
    featureIconOf:result=>result.__plateChoice?
      (result.kind==="point"?"pin":"area"):
      result.__plateEntry?"plate":result.__featureType==="river"?"river":
      result.__featureType==="lake"?"lake":
      result.__featureType?"area":null,
    icons:window.Pin2MapIcons,
    duplicateCoordinates:results=>results.some(r=>r.__featureType||r.__plateEntry||r.__plateChoice)?[]:
      placeDomain.duplicateCoordinates(results)
  });
  const palette=window.Pin2MapLayerPalette;
  const layerView = new window.Pin2MapLayerView({
    getElement:$,document,
    onVisibility:(id,visible)=>{
      filterOps.setLayerVisible(state,id,visible);
      save();renderLayers();renderMarkers();renderGeometry();renderPinPanel();
      fitVisibleProject.fit({project:state,pinFilter,currentFilter:currentPinFilter,
        mapPort:mapAdapter,onFit:updatePanelLayout});
    },
    onDelete:id=>deleteLayerOrPrivatePins(id),
    onDeleteContents:id=>{
      if(!layerOps.deleteContents(state,id))return;
      save();renderLayers();renderMarkers();renderGeometry();renderPinPanel();
      showNotice("Alle Objekte der Ebene gelöscht");
    },
    onDeleteLayer:id=>{
      if(!layerOps.removeEntireLayer(state,id))return;
      save();renderLayers();renderMarkers();renderGeometry();renderPinPanel();
      showNotice("Ebene und enthaltene Objekte gelöscht");
    },
    onRename:(id,name,color,colorIndex)=>{
      if(!layerOps.renameAndColor(state,id,name,color,cleanText,palette.hex)){
        showNotice("Name oder Farbe ungültig oder bereits vergeben");return;
      }
      save();renderLayers();renderMarkers();renderGeometry();renderPinPanel();
    },
    onCreate:(name,color,index)=>{
      const result=layerCreation.createConfigured(name,color,index);
      if(!result)return;
      renderGeometry();layerView.start(null);showNotice("Ebene hinzugefügt");
    },
    getPalette:()=>palette.colors(state).standard,
    getNextIndex:()=>palette.nextLayerColorIndex(state),
    getSuggestedName:()=>window.Pin2MapLayerCreation.suggestedName(),
    onVisibilityCycle:visibleById=>{
      for(const [id,visible] of Object.entries(visibleById))
        filterOps.setLayerVisible(state,id,visible);
      save();renderLayers();renderMarkers();renderGeometry();renderPinPanel();
    },
    onReorder:(fromId,toId)=>{
      if(!layerOps.reorder(state,fromId,toId))return;
      save();renderLayers();renderMarkers();renderGeometry();renderPinPanel();
    },
    onMergeRequest:(selectedIds,targetId)=>{
      const result=layerOps.merge(state,selectedIds,targetId);
      if(!result){showNotice("Ungültige Zusammenführung");return false;}
      save();renderLayers();renderMarkers();renderGeometry();renderPinPanel();
      showNotice("Ebenen erfolgreich zusammengeführt");
      return true;
    }
  });
  const pinLayerPicker = new window.Pin2MapPinLayerPicker({getElement:$,document,withinPanel:true});
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
  const pinNavigation=new window.Pin2MapPinNavigation({
    document,getElement:$,icons:window.Pin2MapIcons,getPin:selectedPin,
    writeText:value=>navigator.clipboard.writeText(value),
    openExternal:url=>window.open(url,"_blank","noopener,noreferrer"),
    onNotice:message=>showNotice(message),
    makeUrl:(mode,pin)=>window.Pin2MapAppleMapsLinks.url(mode,pin)
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
    getAdditionalMenuOpen:()=>!!pinOverlapZoom?.menu||!!featureOverlapZoom?.menu||
      !!noteEditor?.open,
    closeAdditionalMenus:()=>{
      transferController.close();
      mapActionChooser?.close();
      searchTypeMenu?.close();
      gpsLocation?.close();
      platePanel?.close();
      temporaryLayerPicker?.close();
      favoritesPanel?.close();
      geometryEditor?.flush();
      geometryEditor?.close(false);
      pinOverlapZoom?.close();
      featureOverlapZoom?.close();
      pinInfoMenu.close();
      basemapMenu.close();
      pinDetails.closeTransient();
      pinNavigation.close();
      noteEditor.close?.();
      pinLayerPicker.setOpen(false);
    },
    onCancelGeometrySearch:()=>cancelGeometrySearch(),
    onResetPinSelection:()=>{
      if(uiState.selectedPinId!==null){
        uiState.clearSelection();renderMarkers();renderPinPanel();
      }
    },
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
  const projectTransfer=window.Pin2MapProjectTransfer;
  const transferSession=new window.Pin2MapProjectTransferSession({
    transfer:projectTransfer,defaults,
    repairPrivate:project=>window.Pin2MapLayerPalette.repairPrivate(project),
    ensureFeatures:project=>projectFeatures.ensure(project),
    cleanupSearch:project=>placeSearch.cleanup(project),
    getProject:()=>state,setProject:project=>{state=project;},
    getStore:()=>projectStore,writeProject:()=>persistence.writeNow()
  });
  const transferController=new window.Pin2MapProjectTransferController({
    getElement:$,document,windowPort:window,transfer:projectTransfer,
    session:transferSession,getProject:()=>state,
    filterPins:(pin,project)=>pinFilter.isVisible(pin,project.layers,currentPinFilter),
    onCloseOtherMenus:()=>closeAllMapMenus(),
    onSave:()=>persistence.writeNow(),
    onApplied:()=>{
      pinGpxActions.hide();
      uiState.clearSelection();uiState.moveMode=false;
      setTileLayer();
      mapAdapter.setView({center:{lat:state.viewport.lat,lng:state.viewport.lng},
        zoom:state.viewport.zoom},{animate:false});
      renderLayers();renderMarkers();renderGeometry();renderPinPanel();updateLabelButton();
      syncFavoritePanel();
    },
    onNotice:message=>showNotice(message),
    onError:(message,error)=>console.warn(message,error)
  });
  const pinGpxActions=new window.Pin2MapPinGpxActions({
    getElement:$,getPin:selectedPin,
    mapPort:{
      show:chains=>mapAdapter.showAttachedGpx(chains),
      clear:()=>mapAdapter?.clearAttachedGpx?.()
    },
    prepareExport:pin=>window.Pin2MapGpxAttachmentExport.prepare(
      pin,state,projectTransfer.encodeGpx),
    download:(content,name)=>transferController.download(content,"gpx",
      "application/gpx+xml;charset=utf-8",name),
    onNotice:message=>showNotice(message)
  });
  const anyMapMenuOpen=()=>overlayCoordinator.isAnyMapMenuOpen();
  const closeAllMapMenus=()=>overlayCoordinator.closeMapMenus();
  const mapClickCoordinator = new window.Pin2MapMapClickCoordinator({
    isMoveMode:()=>uiState.moveMode||temporaryMove.isActive(),
    previewMove:position=>temporaryMove.isActive()?temporaryMove.previewAt(position):moveController.previewAt(position),
    isSuppressed:()=>gestures.isSuppressed(),
    onTargetAccepted:()=>{
      moveGuide.stop();
      markerView.setRelocationSource(null);
      updateModeUI();
    },
    onOrdinaryClick:position=>{
      if(gestures.consumeDismissedTap())return;
      if(anyMapMenuOpen()){closeAllMapMenus();return;}
      const rect=mapAdapter.getContainer().getBoundingClientRect();
      const xy=mapAdapter.project(position);
      mapActionChooser.open(position,{x:rect.left+xy.x,y:rect.top+xy.y});
    }
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
    onGeometryLayout:()=>{
      if(!geometryEditor?.model)return;
      const item=geometryEditor.model;
      const target=geometryEditor.type==="river"?
        mapAdapter.getRiverLabelTargets().find(t=>t.id===item.id):
        mapAdapter.getAreaLabelTargets().find(t=>t.id===item.id);
      if(!target)return;
      const rect=mapAdapter.getContainer().getBoundingClientRect();
      const xy=mapAdapter.project(target.position);
      geometryEditor.reposition({x:rect.left+xy.x,y:rect.top+xy.y});
    },
    onPersistViewport:()=>persistViewport(),onRenderMarkers:()=>renderMarkers(),
    requestFrame:callback=>requestAnimationFrame(callback),
    cancelFrame:id=>cancelAnimationFrame(id)
  });
  const showNotice = message => uiShell.showNotice(message);
  const persistence = new window.Pin2MapProjectPersistence({
    getProject:()=>state,getStore:()=>projectStore,onError:message=>showNotice(message)
  });
  // Project mutations re-evaluate the live search without moving the map.
  // The microtask runs after the caller has completed its object update.
  const save = () => {
    persistence.save();
    if(objectSearchController.view)queueMicrotask(()=>{
      if(objectSearchController.view)refreshObjectSearch();
    });
  };
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
    const isMatch=(type,id,layerId)=>
      objectSearchController.view?.onlyHits
        ?objectSearchController.view.ids.has(type+":"+id)
        :visible.has(layerId)||!!objectSearchController.view?.ids.has(type+":"+id);
    const layerColors=Object.fromEntries(state.layers.map(l=>[l.id,l.color]));
    mapAdapter.renderProjectGeometry({
      areas:(state.areas||[]).filter(a=>isMatch(a.kind==="lake"?"lakes":"areas",a.id,a.layerId)),
      rivers:(state.rivers||[]).filter(r=>isMatch("rivers",r.id,r.layerId)),
      layerColors,highlightIds:objectSearchController.view?.onlyHits?null:objectSearchController.view?.ids,
      flashIds:activeFlashIds(),
      onAreaLabel:(area,point)=>{
        const hitType=area.kind==="lake"?"lakes":"areas";
        if(!objectSearchController.view?.ids.has(hitType+":"+area.id)&&
          featureOverlapZoom?.handleTap("area",area.id))return;
        openGeometryEditor("area",area,point);
      },
      onRiverLine:(river,point)=>openGeometryEditor("river",river,point)
    });
  }
  function openGeometryEditor(type,item,position){
    if(!geometryEditor)return;
    closeAllMapMenus();
    const xy=mapAdapter.project(position);
    const rect=mapAdapter.getContainer().getBoundingClientRect();
    geometryEditor.show(type,item,state.layers,{x:rect.left+xy.x,y:rect.top+xy.y});
  }
  function saveGeometry(type,id,patch){
    const result=projectFeatures.change(state,type,id,patch,{updatedAt:new Date().toISOString()});
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
    const regular=pinFilter.visiblePins(state.pins,state.layers,currentPinFilter);
    const onlyHits=!!objectSearchController.view?.onlyHits;
    const visible=onlyHits?[]:[...regular],seen=new Set(visible.map(p=>p.id));
    if(objectSearchController.view){
      // The canonical search matches have already been deduplicated by ID.
      // Do not reveal older duplicate records or hidden-layer nonmatches.
      for(const match of objectSearchController.view.matches){
        if(match.type!=="pins"||seen.has(match.id))continue;
        visible.push(match.object);seen.add(match.id);
      }
    }
    pinInfoService.setVisiblePins(temporaryInfoPin?[...visible,temporaryInfoPin.point]:visible);
    markerView.render({
      pins:visible,
      layers:state.layers,selectedPinId:uiState.selectedPinId,
      labelsVisible:state.labelsVisible,flashIds:new Set([...activeFlashIds()].filter(id=>id.startsWith("pins:")).map(id=>id.slice(5))),
      highlightIds:onlyHits?null:
        new Set([...(objectSearchController.view?.ids||[])].filter(id=>id.startsWith("pins:")).map(id=>id.slice(5)))
    });
    renderTemporaryPinInfo();
  }
  function renderTemporaryPinInfo(){
    if(!temporaryInfoPin)return;
    const info=pinInfoService.label(temporaryInfoPin.point);
    mapAdapter?.setTemporaryPinInfo?.(info?window.Pin2MapPinInfoLabel.labelMarkup(info,{
      getIconSvg:name=>window.Pin2MapIcons.svg(name,document).outerHTML
    }):"");
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
      selectedLayerId:selectedPin()?.layerId??null,
      geometryCounts:Object.fromEntries(state.layers.map(layer=>{
        const areas=(state.areas||[]).filter(x=>x.layerId===layer.id);
        const rivers=(state.rivers||[]).filter(x=>x.layerId===layer.id);
        return [layer.id,{areas:areas.length,
          waters:areas.filter(a=>a.kind==="lake").length+rivers.length}];
      }))
    });
  }
  const updatePanelLayout = ()=>mapOverlayLayout.layout();
  const scheduleMapOverlayUpdate = ()=>mapOverlayLayout.schedule();
  const keepSelectedAbovePanel = ()=>mapOverlayLayout.keepVisibleAtOpen();
  function fitAllPins(){
    flushHistoryRecord();
    if(objectSearchController.view){
      fitObjectSearchMatches(objectSearchController.view.matches);
      return;
    }
    fitVisiblePins({
      pins:state.pins,layers:state.layers,filter:currentPinFilter,
      pinFilter,mapPort:mapAdapter,onEmpty:()=>showNotice("Keine sichtbaren Pins vorhanden"),
      onFit:updatePanelLayout
    });
  }
  function renderPinPanel(){
    const pin=selectedPin();
    // A rendered GPX route is independent of the open pin dialog.
    // Only the explicit "Route verbergen" action (or project replacement)
    // removes it from the map.
    pinEditorView.render({
      pin,moving:uiState.moveMode,layerVisible:pin?!!layerById(pin.layerId)?.visible:true,
      onLayout:updatePanelLayout
    });
    pinDetails.render(pin);
    pinNavigation.render(pin);
    pinGpxActions.render(pin);
    if(pin)pinLayerPicker.render({layers:state.layers,selectedLayerId:pin.layerId});
    else pinLayerPicker.setOpen(false);
  }
  function selectPin(id){
    closeAllMapMenus();
    pinOverlapZoom?.close();
    pinSession.select(id);
    if(id===pendingNewGpsPinId){
      pendingNewGpsPinId=null;
      requestAnimationFrame(()=>{
        if(uiState.selectedPinId!==id)return;
        const input=$("pinName");
        if(input&&!$("pinPanel").classList.contains("hidden")){
          input.focus({preventScroll:true});input.select();
        }
      });
    }
  }
  function handleMarkerTap(id){
    if(uiState.moveMode||satelliteInspector.isActive())return;
    // Search hits use the existing overlap zoom/chooser, excluding contextual non-hits.
    if(objectSearchController.view?.ids.has("pins:"+id)){
      pinOverlapZoom.handleTap(id,markerView.visiblePins().filter(
        pin=>objectSearchController.view.ids.has("pins:"+pin.id)));
      return;
    }
    if(featureOverlapZoom?.handleTap("pin",id))return;
    if(pinOverlapZoom)pinOverlapZoom.handleTap(id);
    else selectPin(id);
  }
  function updateModeUI() {
    const picking=(uiState.moveMode||temporaryMove.isActive())&&!moveView.current();
    document.body.classList.toggle("pin-relocation-picking",picking);
    mapAdapter.getContainer().style.cursor = picking ? "crosshair" : "";
  }
  const manualPinLocality=new window.Pin2MapManualPinLocality({
    geocoder,pickName:placeDomain.nearbyLocalityName,
    detailZoom:placeDomain.reversePlaceZoom,
    allowed:()=>state.allowGeocode,
    onName:entry=>{
      if(!entry.savedId)return;
      const pin=pinOps.findPin(state,entry.savedId);
      if(!pin||pin.name!=="Neuer Pin")return;
      pinOps.renamePin(state,pin.id,entry.name,{cleanText});
      save();renderMarkers();
      void dbWrite().catch(()=>showNotice("Pinname konnte nicht gespeichert werden"));
    }
  });
  // Reuse the same preview/guide as the saved-pin workflow; only the
  // transient target state belongs to this dedicated controller.
  const temporaryMove=new window.Pin2MapTemporaryObjectMoveController({
    getMoveMode:()=>uiState.moveMode,
    getPreview:()=>moveView,getGuide:()=>moveGuide,
    closeLayerPicker:()=>temporaryLayerPicker?.close(),
    closePlatePanel:()=>platePanel?.close(),
    invalidateLocality:()=>manualPinLocality.invalidate(),
    updateModeUI:()=>updateModeUI(),
    validatePosition:projectModel.position,
    getZoom:()=>mapAdapter.getViewport().zoom,
    accept:entry=>showObjectPreview(entry),
    resolveName:entry=>manualPinLocality.resolve(entry)
  });
  const objectCreation=window.Pin2MapObjectCreationService({
    pinOperations:pinOps,projectFeatures,
    validatePosition:projectModel.position,cleanText,newId:uid
  });
  const objectAcceptance=new window.Pin2MapObjectAcceptanceController({
    service:objectCreation,getProject:()=>state,getLayer:layerById,privateId:PRIVATE_ID,
    clearPrevious:()=>clearObjectPreview(),
    clearSelection:()=>{uiState.clearSelection();geometryEditor?.close(false);renderPinPanel();},
    onSetGpsPin:id=>{pendingNewGpsPinId=id;},
    onCurrentPin:entry=>manualPinLocality.setCurrent(entry),
    onFlash:(type,id)=>flashNewObject(type,id),
    onMapPoint:point=>mapAdapter.setView({
      center:point,zoom:Math.max(mapAdapter.getViewport().zoom,12)
    },{animate:false}),
    onMapGeometry:created=>mapAdapter.fitGeometry(created),
    onSave:()=>save(),
    onRender:()=>{renderLayers();renderMarkers();renderGeometry();},
    onNotice:message=>showNotice(message),
    onPersist:()=>dbWrite()
  });
  // Immediate adoption into Privat: never reintroduce a confirmation step.
  const showObjectPreview=entry=>objectAcceptance.accept(entry);
  function addPin(lat,lng,name,source="search"){
    if(!Number.isFinite(lat)||Math.abs(lat)>90||
       !Number.isFinite(lng)||Math.abs(lng)>180)return null;
    closeAllMapMenus();
    // Capture the user's original map scale before the preview adapter may
    // automatically zoom in to display the temporary pin.
    const mapZoom=mapAdapter.getViewport().zoom;
    const entry={kind:"point",point:{lat,lng},mapZoom,
      autoNamed:source==="map"&&!name,
      label:name||"Neuer Pin",name:name||"",source,
       preserveViewport:source==="map"};
    const saved=showObjectPreview(entry);
    if(saved&&entry.autoNamed)void manualPinLocality.resolve(entry);
    return saved;
  }
  function commitPin(lat,lng,name){return pinSession.add(lat,lng,name);}

  const geometrySearch=new window.Pin2MapGeometrySearchController({
    getElement:$,getState:()=>state,getMap:()=>mapAdapter,
    areaFinder,riverFinder,riverGeometry,plateSearch,
    cancelPlace:()=>searchForm.cancel(),hideResults:()=>searchView.hide(),
    showResults:(rows,options)=>searchView.show(rows,options),
    message:text=>searchView.message(text),
    showObjectPreview:entry=>showObjectPreview(entry),
    clearObjectPreview:()=>clearObjectPreview(),
    showNotice:message=>showNotice(message)
  });
  const cancelGeometrySearch=()=>geometrySearch.cancelGeometrySearch();
  const findGeometry=(kind,query)=>geometrySearch.findGeometry(kind,query);
  const chooseGeometryResult=result=>geometrySearch.chooseGeometryResult(result);
  const findAreaAt=point=>geometrySearch.findAreaAt(point);
  const findPlateCode=code=>geometrySearch.findPlateCode(code);
  const showPlateSelection=result=>geometrySearch.showPlateSelection(result);
  const choosePlateResult=entry=>geometrySearch.choosePlateResult(entry);
  function clearObjectPreview(){
    temporaryMove.cancel();
    temporaryLayerPicker?.close();
    manualPinLocality.invalidate();
    platePanel?.close();
    gpsLocation?.close();
    mapAdapter?.clearTemporaryPlateArea?.();
    if(temporaryInfoPin){temporaryInfoPin=null;renderMarkers();}
  }
  function createAreaObject(source,kind,nameOverride=null,layerId=PRIVATE_ID){
    const area=objectCreation.createArea(state,source,kind,layerId,nameOverride);
    flashNewObject(kind==="lake"?"lakes":"areas",area.id);
    save();renderLayers();renderGeometry();
    return area;
  }
  const objectSearchController=new window.Pin2MapObjectSearchController({
    document,getElement:$,searchDomain:objectSearch,
    getProject:()=>state,getSpotlight:()=>objectSearchSpotlight,
    getMenu:()=>searchTypeMenu,
    render:()=>{renderMarkers();renderGeometry();},
    onFit:selected=>fitVisibleProject.fit({project:selected,pinFilter,
      currentFilter:currentPinFilter,mapPort:mapAdapter,onFit:updatePanelLayout}),
    cancelPlace:()=>searchForm.cancel(),
    cancelGeometry:()=>cancelGeometrySearch(),
    hidePlaceResults:()=>searchView.hide(),
    updateClear:()=>searchForm.updateClear()
  });
  const resetObjectSearch=()=>objectSearchController.reset();
  const refreshObjectSearch=()=>objectSearchController.refresh();
  const fitObjectSearchMatches=matches=>objectSearchController.fit(matches);
  const runObjectSearch=options=>objectSearchController.run(options);
  const endObjectSearch=()=>objectSearchController.end();
  function runSearchMode(mode,options){
    clearObjectPreview();
    resetObjectSearch();
    if(mode==="objects"){searchTypeMenu.enterSearchMode();searchTypeMenu.execute();return;}
    if(mode==="plate"){findPlateCode($("searchInput").value);return;}
    if(mode==="gps"){gpsLocation?.locate();return;}
    if(mode==="pin"){searchForm.submit();return;}
    void findGeometry(mode,$("searchInput").value);
  }
  const searchMessage = msg => searchView.message(msg);
  const choosePlace = result => searchPinTransfer.choose(result);
  const renderResults = list => searchPinTransfer.present(list);

  const searchForm = new window.Pin2MapSearchFormController({
    getElement:$,
    search:(query,hooks)=>{clearObjectPreview();cancelGeometrySearch();return placeSearch.search(query,{
      state,allowed:state.allowGeocode,
      ...hooks,onCacheWrite:save
    });},
    onResults:renderResults,
    onMessage:searchMessage,
    onInputChange:()=>{
      searchView.hide();cancelGeometrySearch();
      // SearchTypeMenu re-executes after stale place requests are cancelled.
      if(!searchTypeMenu?.searchMode){
        resetObjectSearch();document.body.classList.remove("object-search-mode");
      }
    },
    cancelSearch:()=>placeSearch.cancel()
  });
  const updateLabelButton = () => uiShell.updateLabelButton(state.labelsVisible);
  function bind() {
    transferController.bind();
    pinGpxActions.bind();
    searchForm.bind();
    $("searchClear").addEventListener("click",event=>{
      if(!searchTypeMenu?.searchMode)return;
      // Red X restores the seven creation choices but preserves the query.
      event.preventDefault();event.stopImmediatePropagation();
      resetObjectSearch();
      document.body.classList.remove("object-search-mode");
      searchTypeMenu.returnToStandardChoices();
      searchForm.updateClear();
    },true);
    searchTypeMenu=new window.Pin2MapSearchTypeMenu({
      document,getElement:$,icons:window.Pin2MapIcons,onChoose:runSearchMode,
      onSearch:runObjectSearch,onExit:endObjectSearch,onBeforeOpen:closeAllMapMenus,
      onEdit:()=>{
        resetObjectSearch();document.body.classList.remove("object-search-mode");
        searchForm.updateClear();
      }
    });
    searchTypeMenu.bind();
    pinInfoMenu.bind();
    // Circular map-launchers close competing menus without hiding any other
    // map buttons. The capture handler precedes each launcher's own toggle.
    const mapLauncherSelector=[
      "#favoritesButton","#layersButton","#settingsButton","#transferButton","#basemapButton",
      "#pinInfoButton","#searchTypeButton","#refreshButton",
      "#labelsToggle",".pin-zoom-buttons button"
    ].join(",");
    document.addEventListener("click",event=>{
      const button=event.target?.closest?.(mapLauncherSelector);
      if(!button)return;
      const id=button.id;
      const ownOpen=(id==="favoritesButton"&&favoritesPanel?.open)||
        (id==="layersButton"&&!$("layersPanel").classList.contains("hidden"))||
        (id==="settingsButton"&&!$("settingsPanel").classList.contains("hidden"))||
        (id==="transferButton"&&!$("transferPanel").classList.contains("hidden"))||
        (id==="basemapButton"&&!$("basemapMenu").classList.contains("hidden"))||
        (id==="pinInfoButton"&&!$("pinInfoMenu").classList.contains("hidden"));
      // A second tap on the active launcher still closes its own menu.
      if(!ownOpen)closeAllMapMenus();
    },true);
    $("labelsToggle").addEventListener("click",()=>{state.labelsVisible=!state.labelsVisible;save();renderMarkers();updateLabelButton();});
    $("layersButton").addEventListener("click",()=>{
      if(!$("layersPanel").classList.contains("hidden")){layerView.close();return;}
      overlayCoordinator.closeAll();layerView.show();
    });
    $("settingsButton").addEventListener("click", () => overlayCoordinator.togglePanel("settingsPanel"));
    window.addEventListener("pageshow",()=>{
      $("refreshButton").disabled=false;
      $("refreshButton").removeAttribute("aria-busy");
    });
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
    $("addLayer").addEventListener("click",()=>layerView.footerAction());
    $("layersClose").addEventListener("click",()=>layerView.close());
    $("layersCloseBottom").addEventListener("click",()=>layerView.footerCancel());
    $("layersUnite").addEventListener("click",()=>layerView.beginMerge());
    const colorSettings=new window.Pin2MapColorSettingsView({
      document,getElement:$,palette,
      getProject:()=>state,onChange:()=>save()
    });
    colorSettings.bind();
    const settingsTabs=["General","Interface","Services","Colors"];
    async function updateSettingsStorage(){
      const version=$("settingsProductVersion"),usage=$("settingsStorageUsage");
      version.textContent="Version wird ermittelt …";
      try{
        const worker=await window.Pin2MapPwaRefresh.versionOf(
          navigator.serviceWorker?.controller,window.MessageChannel,1200);
        const response=worker?null:await fetch("./sw.js?version="+Date.now(),{cache:"no-store"});
        const code=worker||(response?.ok?
          window.Pin2MapPwaRefresh.parseVersion(await response.text()):"nicht verfügbar");
        version.textContent=code.replace(/^pin2map-(?:preview|new)-v/,"v");
      }catch{version.textContent="nicht verfügbar";}
      try{
        const estimate=await navigator.storage?.estimate?.();
        const caches=estimate?.usageDetails?.caches;
        const bytes=caches??estimate?.usage;
        if(!Number.isFinite(bytes)){usage.textContent="nicht verfügbar";return;}
        const unit=bytes>=1048576?" MB":" KB",divisor=bytes>=1048576?1048576:1024;
        usage.textContent="ca. "+(bytes/divisor).toLocaleString("de-DE",{maximumFractionDigits:1})+
          unit+(caches===undefined?" (gesamter lokaler Speicher)":"");
      }catch{usage.textContent="nicht verfügbar";}
    }
    const selectSettingsTab=key=>{
      for(const tab of settingsTabs){
        const selected=key===tab;
        $("settings"+tab+"Content").classList.toggle("hidden",!selected);
        $("settings"+tab+"Tab").setAttribute("aria-selected",String(selected));
        $("settings"+tab+"Tab").tabIndex=selected?0:-1;
      }
      if(key==="Colors")colorSettings.render();
      if(key==="General")void updateSettingsStorage();
    };
    for(const tab of settingsTabs)
      $("settings"+tab+"Tab").addEventListener("click",()=>selectSettingsTab(tab));
    $("settingsButton").addEventListener("click",()=>{
      if(!$("settingsPanel").classList.contains("hidden"))selectSettingsTab("General");
    });
    selectSettingsTab("General");

    pinEditorActions.bind();
    pinDetails.bind();
    pinNavigation.bind();
    noteEditor.bind();
    window.Pin2MapObjectDialogCore.bindNoteLaunch({
      textarea:$("pinNotes"),expand:$("pinNotesExpand"),editor:noteEditor,
      getName:()=>selectedPin()?.name||"",
      getNote:()=>selectedPin()?.note||"",
      closeTransient:()=>pinDetails.closeTransient(),
      matchMedia:query=>window.matchMedia(query)
    });
    for(const id of ["deletePin","movePin","pinLayerTrigger","closePin"]){
      $(id).addEventListener("click",()=>pinDetails.closeTransient());
    }
    $("movePin").addEventListener("click",()=>moveController.begin());
    $("cancelMove").addEventListener("click",()=>temporaryMove.isActive()?temporaryMove.cancel():moveController.cancel());
    $("confirmMove").addEventListener("click",()=>temporaryMove.isActive()?temporaryMove.confirm():moveController.confirm());
    pinDeleteDialog.bind();

    mapAdapter.onMapClick(position=>{
      if(satelliteInspector.isActive()){satelliteInspector.pick(position);return;}
      // Move-target acceptance must take precedence over pin ghost-click
      // suppression; MapClickCoordinator already enforces this contract.
      mapClickCoordinator.handle(position);
    },{allowNonSurface:()=>uiState.moveMode||temporaryMove.isActive()||satelliteInspector.isActive()});

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
    // Preserve personalized Privat colors; migrate only legacy default gray.
    window.Pin2MapLayerPalette.repairPrivate(state);
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
      onPin:point=>addPin(point.lat,point.lng,"","map"),
      onArea:point=>void findAreaAt(point)
    });
    mapActionChooser.bind();
    gpsLocation=new window.Pin2MapGpsLocationController({
      document,getElement:$,geolocation:navigator.geolocation,
      mapPort:mapAdapter,onNotice:showNotice,
      // A valid GPS fix is immediately saved as a normal Privat pin.
      onAccept:(point,name)=>addPin(point.lat,point.lng,name,"gps")
    });
    gpsLocation.bind();
    // Selecting a layer is the ONLY commit action. Merely pressing the
    // green preview check opens the isolated layer menu without saving.
    temporaryLayerPicker=new window.Pin2MapTemporaryLayerPicker({
      document,icons:window.Pin2MapIcons,
      getLayers:()=>state.layers,
      onCreate:()=>layerCreation.create(),
      onChoose:(entry,layerId)=>{
        const layer=layerById(layerId);
        if(!layer)return;
        // The preview remains untouched unless a real layer was selected.
        clearObjectPreview();
        // Quick save never leaves a previously selected editor open.
        uiState.clearSelection();
        geometryEditor?.close(false);
        renderPinPanel();
        if(entry.kind==="point"){
          const name=entry.referencePlace?
            entry.label+" – "+entry.referencePlace+" (Ersatzort)":entry.name||entry.label;
          const pin=pinOps.createPin(state,{
            id:uid(),lat:entry.point.lat,lng:entry.point.lng,name,layerId
          },{validatePosition:projectModel.position,cleanText});
          if(entry.source==="gps")pendingNewGpsPinId=pin.id;
          save();renderLayers();renderMarkers();
        }else if(entry.kind==="river"){
          projectFeatures.createRiver(state,{
            id:uid(),name:entry.label,chains:entry.chains,createdAt:new Date().toISOString()
          },layerId);
          save();renderLayers();renderGeometry();
        }else createAreaObject({name:entry.label,geojson:entry.geojson},
          entry.featureKind||"area",null,layerId);
        if(!layer.visible)showNotice("Objekt in ausgeblendeter Ebene „"+layer.name+"“ gespeichert");
        void dbWrite().catch(()=>showNotice("Objekt konnte nicht gespeichert werden"));
      }
    });
    temporaryLayerPicker.bind();
    platePanel=new window.Pin2MapLicensePlatePanel({
      document,getElement:$,icons:window.Pin2MapIcons,mapPort:mapAdapter,
      onRemove:()=>clearObjectPreview(),
      onAccept:(entry,anchor)=>temporaryLayerPicker.show(entry,state.layers,anchor),
      onMove:entry=>temporaryMove.begin(entry)
    });
    platePanel.bind();
    gestures=window.Pin2MapMapGestureController({
      mapAdapter,
      onSurfacePointerDown:()=>{
        if(!anyMapMenuOpen())return false;
        closeAllMapMenus();return true;
      },
      getBasemap:()=>state.basemap,
      isMoveMode:()=>uiState.moveMode||temporaryMove.isActive(),
      isInspectMode:()=>satelliteInspector.isActive(),
      selectPin:handleMarkerTap,addPin,renderMarkers,persistViewport,updatePanelLayout,
      scheduleFrame:requestAnimationFrame,
      vibrate:duration=>{if(navigator.vibrate)navigator.vibrate(duration);}
    });
    mapAdapter.setTemporaryPinGestureHandler((marker,onTap,zoomMarker)=>
      gestures.attachMarkerLongPress(marker,null,{
        onTap,transient:true,zoomMarker
      }),()=>gestures.isSuppressed());
    markerView=new window.Pin2MapPinMarkerView.PinMarkerView({
      mapAdapter,cleanText,defaultColor:COLORS[0],
      getInfoLabel:pin=>pinInfoService.label(pin),
      formatInfo:info=>window.Pin2MapPinInfoLabel.labelMarkup(info,{
        getIconSvg:name=>window.Pin2MapIcons.svg(name,document).outerHTML
      }),
      onInfoClick:id=>selectPin(id),
      onSelect:id=>{if(gestures.isSuppressed()||uiState.moveMode)return;handleMarkerTap(id);},
      attachGesture:(marker,id)=>gestures.attachMarkerLongPress(marker,id)
    })
    objectSearchSpotlight=new window.Pin2MapObjectSearchSpotlight.ObjectSearchSpotlight({
      document,mapPort:mapAdapter,
      getTargets:()=>[
        ...markerView.hitTargets(),...mapAdapter.getAreaLabelTargets(),
        ...mapAdapter.getRiverLabelTargets()
      ].filter(item=>objectSearchController.view?.ids.has(
        (item.type==="pin"?"pins":item.type==="river"?"rivers":
          item.kind==="lake"?"lakes":"areas")+":"+item.id))
    });
;
    featureOverlapZoom=new window.Pin2MapFeatureOverlapZoom.FeatureOverlapZoom({
      mapPort:mapAdapter,
      getTargets:()=>[...markerView.hitTargets(),...mapAdapter.getAreaLabelTargets()],
      getMaxZoom:()=>state.basemap==="topo"?17:19,
      onSelect:(type,id)=>{
        if(type==="pin"){selectPin(id);return;}
        const area=(state.areas||[]).find(item=>item.id===id);
        if(area){
          const marker=mapAdapter.getAreaLabelTargets().find(t=>t.id===id);
          if(marker)openGeometryEditor("area",area,marker.position);
        }
      },
      onBeforeZoom:()=>closeAllMapMenus(),
      onHistoryChange:()=>{persistViewport();setTimeout(flushHistoryRecord,0);},
      document,getElement:$
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
      onPosition:position=>temporaryMove.isActive()?temporaryMove.previewAt(position):moveController.previewAt(position)
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
      onReorder:(from,to)=>{
        if(!favorites.reorder(state,from,to))return;
        save();syncFavoritePanel();
      },
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
    // Observe only completed initialization: handlers, project and map views are ready.
    document.documentElement.dataset.pin2mapReady="true";
    if("serviceWorker" in navigator && (location.protocol==="https:" || ["localhost","127.0.0.1"].includes(location.hostname)))navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{});
  }
  document.addEventListener("DOMContentLoaded",init);
})();