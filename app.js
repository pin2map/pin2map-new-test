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
  const recentObjectFlash=new window.Pin2MapRecentObjectFlash({
    now:()=>Date.now(),
    schedule:(callback,ms)=>setTimeout(callback,ms),
    onExpire:()=>{renderMarkers();renderGeometry();}
  });
  const activeFlashIds=()=>recentObjectFlash.activeIds();
  function flashNewObject(type,id){recentObjectFlash.flash(type,id);}
  let projectStore, state = defaults(), mapAdapter, markerView, moveView, moveGuide, panelPositioner, moveController;
  const uiState = new window.Pin2MapUIState();
  let gestures,pinOverlapZoom,featureOverlapZoom,favoritesPanel;
  let mapActionChooser,geometryEditor,searchTypeMenu,gpsLocation,platePanel,temporaryLayerPicker;
   let routeSession=null,routePanel=null,routeMapView=null;
   let routeGuideSession=null;
   let renderRouteGuides=()=>{};
  let pendingNewGpsPinId=null,temporaryInfoPin=null;
  const favorites=window.Pin2MapMapFavorites;
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
    onRouteAction:kind=>{
      const pin=selectedPin();if(!pin||!routeSession)return;
      routeSession.endpoint(kind,pin.id);
      uiState.clearSelection();
      renderMarkers();
      renderPinPanel();
    },
    onWaypointAction:()=>{
      const pin=selectedPin();if(!pin||!routeSession)return;
      routeSession.waypoint(pin.id);uiState.clearSelection();renderMarkers();renderPinPanel();
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
    getFavoritesOpen:()=>!!favoritesPanel?.open,
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
      routeSession?.clear();
      renderLayers();renderMarkers();renderGeometry();renderPinPanel();renderRouteGuides();updateLabelButton();
      favoritesController.sync();
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
  const mapHistoryController=new window.Pin2MapMapViewHistoryController({
    History:window.Pin2MapMapViewHistory.MapViewHistory,
    mapPort:{
      getViewport:()=>mapAdapter.getViewport(),
      setView:(view,options)=>mapAdapter.setView(view,options),
      updateZoomHistory:availability=>mapAdapter.updateZoomHistory(availability),
      addZoomControls:handlers=>mapAdapter.addZoomControls(handlers),
      onMoveEnd:handler=>mapAdapter.on("moveend zoomend",handler)
    },
    loadHistory:()=>projectStore?.loadViewHistory(),
    saveHistory:value=>projectStore?.saveViewHistory(value),
    onNotice:message=>showNotice(message),
    onFitAll:()=>fitAllPins(),
    onBeforeNavigate:()=>{pinOverlapZoom?.close();overlayCoordinator.closeAll();},
    onPersistViewport:()=>persistViewport(),
    setTimer:(callback,delay)=>setTimeout(callback,delay),
    clearTimer:id=>clearTimeout(id)
  });
  function flushHistoryRecord(){mapHistoryController.flush();}
  function navigateMapHistory(direction){mapHistoryController.navigate(direction);}
  const favoritesController=new window.Pin2MapMapFavoritesController({
    document,getElement:$,icons:window.Pin2MapIcons,
    Panel:window.Pin2MapMapFavoritesPanel,favorites,
    getProject:()=>state,
    getVisiblePins:()=>pinFilter.visiblePins(state.pins,state.layers,currentPinFilter),
    mapPort:{
      getSize:()=>mapAdapter.getSize(),
      getViewport:()=>mapAdapter.getViewport(),
      project:pin=>mapAdapter.project(pin),
      setView:(viewport,options)=>mapAdapter.setView(viewport,options)
    },
    onSave:()=>save(),
    onRenderProject:()=>{renderLayers();renderMarkers();renderPinPanel();},
    onStopSatellite:()=>satelliteInspector.stop(),
    onSetBasemap:()=>setTileLayer(),
    onFlushHistory:()=>flushHistoryRecord(),
    onPersistViewport:()=>persistViewport(),
    onBeforeOpen:()=>{overlayCoordinator.closeAll();pinInfoMenu.close();pinOverlapZoom.close();},
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
  const objectPresentation=new window.Pin2MapProjectObjectPresentation({
    getProject:()=>state,
    getSearchView:()=>objectSearchController.view,
    getPinFilter:project=>pinFilter.visiblePins(project.pins,project.layers,currentPinFilter),
    getSelectedPinId:()=>uiState.selectedPinId,
    getTemporaryInfoPin:()=>temporaryInfoPin,
    getFlashIds:activeFlashIds,
    mapPort:{
      renderProjectGeometry:options=>mapAdapter?.renderProjectGeometry?.(options),
      setTemporaryPinInfo:markup=>mapAdapter?.setTemporaryPinInfo?.(markup)
    },
    getMarkerView:()=>markerView,
    pinInfoService,
    getPinInfoMarkup:info=>window.Pin2MapPinInfoLabel.labelMarkup(info,{
      getIconSvg:name=>window.Pin2MapIcons.svg(name,document).outerHTML
    }),
    onAreaLabel:(area,point)=>openGeometryEditor("area",area,point),
    onRiverLine:(river,point)=>openGeometryEditor("river",river,point),
    getAreaOverlapHandler:()=>featureOverlapZoom?.handleTap.bind(featureOverlapZoom)
  });
  function renderGeometry(){objectPresentation.renderGeometry();}
  function openGeometryEditor(type,item,position){
    if(!geometryEditor)return;
    closeAllMapMenus();
    const xy=mapAdapter.project(position);
    const rect=mapAdapter.getContainer().getBoundingClientRect();
    geometryEditor.show(type,item,state.layers,{x:rect.left+xy.x,y:rect.top+xy.y});
  }
  const geometryMutations=new window.Pin2MapGeometryMutationSession({
    features:projectFeatures,getProject:()=>state,
    now:()=>new Date().toISOString(),
    onSave:()=>save(),onRender:()=>renderGeometry(),
    onNotice:message=>showNotice(message)
  });
  function saveGeometry(type,id,patch){return geometryMutations.change(type,id,patch);}
  function deleteGeometry(type,id){geometryMutations.remove(type,id);}
  function renderMarkers(){objectPresentation.renderMarkers();}
  function renderTemporaryPinInfo(){objectPresentation.renderTemporaryPinInfo();}
  function deleteLayerOrPrivatePins(id) {
    const info=layerOps.deletionInfo(state,id,PRIVATE_ID);
    if(!info)return;
    if(!info.allowed){showNotice("Keine privaten Pins vorhanden");return;}
    bulkDeleteDialog.show(id,info);
  }
  const layerDeletion=new window.Pin2MapLayerDeletionSession({
    operations:layerOps,getProject:()=>state,privateId:PRIVATE_ID,
    onRemovedPins:ids=>{
      if(uiState.selectedPinId&&ids.includes(uiState.selectedPinId))uiState.selectedPinId=null;
    },
    onSave:()=>save(),
    onRender:()=>{renderLayers();renderMarkers();renderGeometry();renderPinPanel();},
    onNotice:message=>showNotice(message)
  });
  function confirmBulkDeletion(id){layerDeletion.confirm(id);}
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
    if(routeMapView?.fit())return;
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
  // Pin presentation, selection, search-hit and overlap priorities are owned
  // by one UI coordinator. app.js supplies only the active use-case ports.
  const pinSelection=new window.Pin2MapPinSelectionController({
    getPin:selectedPin,getLayer:layerById,getLayers:()=>state.layers,
    getMoveMode:()=>uiState.moveMode,getSelectedId:()=>uiState.selectedPinId,
    getSearchIds:()=>objectSearchController.view?.ids,
    isSatelliteActive:()=>satelliteInspector.isActive(),
    getVisiblePins:()=>markerView.visiblePins(),
    getPinOverlap:()=>pinOverlapZoom,getFeatureOverlap:()=>featureOverlapZoom,
    closeMapMenus:closeAllMapMenus,selectPinUseCase:id=>pinSession.select(id),
    takeGpsFocusId:id=>{
      if(id!==pendingNewGpsPinId)return false;
      pendingNewGpsPinId=null;return true;
    },
    scheduleFrame:callback=>requestAnimationFrame(callback),getElement:$,
    renderEditor:options=>pinEditorView.render(options),
    renderDetails:pin=>pinDetails.render(pin),
    renderNavigation:pin=>pinNavigation.render(pin),
    renderGpxActions:pin=>pinGpxActions.render(pin),
    renderLayerPicker:options=>pinLayerPicker.render(options),
    closeLayerPicker:()=>pinLayerPicker.setOpen(false),
    onLayout:()=>updatePanelLayout()
  });
  function renderPinPanel(){pinSelection.render();routePanel?.syncPinButtons(selectedPin());}
  function selectPin(id){pinSelection.select(id);}
  function handleMarkerTap(id){pinSelection.handleMarkerTap(id);}
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
  const pinEntry=new window.Pin2MapPinEntryCoordinator({
    closeMapMenus:()=>closeAllMapMenus(),
    getMapZoom:()=>mapAdapter.getViewport().zoom,
    accept:entry=>showObjectPreview(entry),
    resolveAutoName:entry=>manualPinLocality.resolve(entry)
  });
  function addPin(lat,lng,name,source="search"){return pinEntry.create(lat,lng,name,source);}
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
  const mapInteraction=new window.Pin2MapMapInteractionController({
    getElement:$,
    closeTransient:()=>pinDetails.closeTransient(),
    onMoveBegin:()=>moveController.begin(),
    isTemporaryMoveActive:()=>temporaryMove.isActive(),
    onTemporaryMoveCancel:()=>temporaryMove.cancel(),
    onRegularMoveCancel:()=>moveController.cancel(),
    onTemporaryMoveConfirm:()=>temporaryMove.confirm(),
    onRegularMoveConfirm:()=>moveController.confirm(),
    onMapClick:handler=>mapAdapter.onMapClick(handler,{
      allowNonSurface:()=>uiState.moveMode||temporaryMove.isActive()||satelliteInspector.isActive()
    }),
    isSatellitePicking:()=>satelliteInspector.isActive(),
    onSatellitePick:position=>satelliteInspector.pick(position),
    onRegularMapClick:position=>mapClickCoordinator.handle(position),
    attachLongPress:()=>gestures.attachLongPress()
  });
  const updateLabelButton = () => uiShell.updateLabelButton(state.labelsVisible);
  const mapViewControls=new window.Pin2MapMapViewControls({
    getElement:$,document,
    getLabelsVisible:()=>state.labelsVisible,
    setLabelsVisible:visible=>{state.labelsVisible=visible;},
    onSave:()=>save(),
    onRenderMarkers:()=>renderMarkers(),
    onUpdateLabelButton:()=>updateLabelButton(),
    layerView,overlayCoordinator,
    onToggleSettings:()=>overlayCoordinator.togglePanel("settingsPanel"),
    getGeocodeEnabled:()=>state.allowGeocode,
    setGeocodeEnabled:enabled=>{state.allowGeocode=enabled;},
    readLocalPreference:key=>localStorage.getItem(key),
    writeLocalPreference:(key,value)=>localStorage.setItem(key,value)
  });

  const appLifecycle=new window.Pin2MapAppLifecycleController({
    windowTarget:window,documentTarget:document,getElement:$,
    onRefresh:()=>window.Pin2MapPwaRefresh.refresh({
      button:$("refreshButton"),save:dbWrite,showNotice
    }),
    onHidden:()=>{flushHistoryRecord();persistence.flushOnHidden();}
  });
  function bind() {
    transferController.bind();
    pinGpxActions.bind();
    searchForm.bind();
    searchTypeMenu=new window.Pin2MapSearchTypeMenu({
      document,getElement:$,icons:window.Pin2MapIcons,onChoose:runSearchMode,
      onSearch:runObjectSearch,onExit:endObjectSearch,onBeforeOpen:closeAllMapMenus,
      onClearStart:()=>{
        resetObjectSearch();document.body.classList.remove("object-search-mode");
      },
      onClearFinish:()=>searchForm.updateClear(),
      onEdit:()=>{
        resetObjectSearch();document.body.classList.remove("object-search-mode");
        searchForm.updateClear();
      }
    });
    searchTypeMenu.bind();
    pinInfoMenu.bind();
    // Launcher capture and same-button toggle semantics live in the UI owner.
    overlayCoordinator.bindMapLaunchers();
    mapViewControls.bindMapButtons();
    appLifecycle.bindRefresh();
    overlayCoordinator.bind();
    basemapMenu.bind();
    satelliteInspector.bind();
    mapViewControls.bindSettingsAndLayerActions();
    const colorSettings=new window.Pin2MapColorSettingsView({
      document,getElement:$,palette,
      getProject:()=>state,onChange:()=>save()
    });
    colorSettings.bind();
    const settingsTabs=new window.Pin2MapSettingsTabsController({
      getElement:$,
      renderColors:()=>colorSettings.render(),
      versionOf:(controller,MessageChannel,timeout)=>window.Pin2MapPwaRefresh.versionOf(controller,MessageChannel,timeout),
      parseVersion:code=>window.Pin2MapPwaRefresh.parseVersion(code),
      getWorkerController:()=>navigator.serviceWorker?.controller,
      getMessageChannel:()=>window.MessageChannel,
      fetchWorker:(url,options)=>fetch(url,options),
      estimateStorage:()=>navigator.storage?.estimate?.()
    });
    settingsTabs.bind();

    pinEditorActions.bind();
    pinDetails.bind();
    routePanel?.bind();
    pinNavigation.bind();
    noteEditor.bind();
    window.Pin2MapObjectDialogCore.bindNoteLaunch({
      textarea:$("pinNotes"),expand:$("pinNotesExpand"),editor:noteEditor,
      getName:()=>selectedPin()?.name||"",
      getNote:()=>selectedPin()?.note||"",
      closeTransient:()=>pinDetails.closeTransient(),
      matchMedia:query=>window.matchMedia(query)
    });
    mapInteraction.bindPinMoveButtons();
    pinDeleteDialog.bind();

    mapInteraction.bindMapClick();
    mapInteraction.bindLongPress();
    mapOverlayLayout.bind();
    appLifecycle.bindVisibility();
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
    const routingCore=new window.Pin2MapRouting.RoutingService();
    routingCore.register("car",new window.Pin2MapCarRouting.CarRoutingProvider({fetchImpl:window.fetch.bind(window)}));
    const activePlan=new window.Pin2MapActiveCarRoute.ActiveCarRoute();
    const routePinById=id=>pinOps.findPin(state,id);
    routeGuideSession=new window.Pin2MapRouteGuideSession.RouteGuideSession({
      getGuides:()=>state.routeGuides,
      setGuides:guides=>{state.routeGuides=guides;save();},
      makeId:uid,onChange:()=>renderRouteGuides()
    });
    routeMapView=new window.Pin2MapCarRouteMapView.CarRouteMapView({
      mapPort:mapAdapter,
      scheduleFrame:callback=>requestAnimationFrame(callback),
      getLayout:()=>({
        map:$("map").getBoundingClientRect(),
        obstacles:[...document.querySelectorAll(".topbar,#app > button,#routePanelToggle,#carRoutePanel,#map .leaflet-control")]
          .filter(element=>element.getClientRects().length&&getComputedStyle(element).visibility==="visible")
          .map(element=>element.getBoundingClientRect())
      }),
      onLineClick:index=>routePanel?.focusLeg(index),
      confirmRemove:message=>window.confirm(message),
      onGuideRemoveRequest:id=>routeGuideSession.remove(id)
    });
    const routeTimeKey="pin2map-route-time-factors:"+location.pathname;
    const readRouteTimeFactors=()=>{
      try{return JSON.parse(localStorage.getItem(routeTimeKey))||{};}catch{return {};}
    };
    routePanel=new window.Pin2MapCarRoutePanel.CarRoutePanel({
      document,getElement:$,icons:window.Pin2MapIcons,getPin:routePinById,
      onEnd:()=>{routeSession.clear();renderPinPanel();},
      confirmEnd:()=>window.confirm("Routing wirklich beenden?"),
      onReverse:()=>{routeSession.reverse();renderPinPanel();},
      onOrder:order=>routeSession.setOrder(order),
      onTimeProfile:profile=>routeSession.setTimeProfile(profile),
      readTimeFactors:readRouteTimeFactors,
      writeTimeFactors:factors=>{
        routeSession.setTimeFactors(factors);
        try{localStorage.setItem(routeTimeKey,JSON.stringify(factors));}catch{}
      },
      onAll:()=>{
        const pins=markerView.visiblePins().filter(pin=>mapAdapter.containsPoint(pin));
        const result=routeSession.toggleVisible(pins.map(pin=>pin.id));
        showNotice(result.active?result.count+" sichtbare Pins als Zwischenziele übernommen.":
          "Direkte Route ohne Zwischenziele.");
      },
      onOptions:opts=>{try{routeSession.options(opts);}catch(e){showNotice(String(e.message));}},
      onToggle:()=>{
        const current=routeSession.snapshot();
        try{routeSession.options({avoidTolls:!current.avoidTolls});}
        catch(e){showNotice(String(e.message));}
      },
      onApple:()=>{
        const route=routeSession.snapshot();
        const start=routePinById(route.startId),target=routePinById(route.targetId);
        if(!start||!target)return;
        if(route.waypointIds.length)showNotice("Apple Karten übernimmt hier nur Start und Ziel, keine Zwischenziele.");
        window.open(window.Pin2MapAppleMapsLinks.routeUrl(start,target),"_blank","noopener,noreferrer");
      },
      onLayoutChange:()=>routeMapView.scheduleFit(),onShowNotice:showNotice
    });
    routeSession=new window.Pin2MapCarRouteSession.CarRouteSession({
      plan:activePlan,getPin:routePinById,
      calculate:request=>routingCore.calculate({mode:"car",...request}),
      onChange:snapshot=>{routeMapView.render(snapshot);renderMarkers();routePanel.render(snapshot);
        routePanel.syncPinButtons(selectedPin());},
      onError:showNotice,timeFactors:readRouteTimeFactors()
    });
    renderRouteGuides=()=>routeMapView?.guides(routeGuideSession.list());
    renderRouteGuides();
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
      onArea:point=>void findAreaAt(point),
      onGuide:point=>{
        routeGuideSession.add(point);
        showNotice("Richtungsflagge gesetzt. Ihre weiche Streckenführung wird als nächstes ergänzt.");
      }
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
      getRouteSnapshot:()=>routeSession?.snapshot(),
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
    await mapHistoryController.initialize();
    favoritesPanel=favoritesController.bind();
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