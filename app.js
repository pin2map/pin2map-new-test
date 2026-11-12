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
  const currentPinFilter = pinFilter.createFilter();
  let projectStore, state = defaults(), mapAdapter, markerView, moveView, moveGuide, panelPositioner, moveController;
  const uiState = new window.Pin2MapUIState();
  let gestures;
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
    onChoose:result=>choosePlace(result),
    onCancel:()=>searchForm.cancel(),
    titleOf:result=>placeDomain.title(result),
    detailOf:result=>placeDomain.detail(result),
    kindOf:result=>placeDomain.kind(result),
    duplicateCoordinates:results=>placeDomain.duplicateCoordinates(results)
  });
  const layerView = new window.Pin2MapLayerView({
    getElement:$,document,
    onVisibility:(id,visible)=>{filterOps.setLayerVisible(state,id,visible);save();renderLayers();renderMarkers();renderPinPanel();},
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
      pinOps.updateDetails(state,p.id,{note:value});save();
    },
    onUrl:value=>{
      const p=selectedPin();if(!p)return;
      pinOps.updateDetails(state,p.id,{url:value});save();
    },
    onWikipedia:()=>{
      const name=selectedPin()?.name?.trim();if(!name){showNotice("Bitte zuerst einen Pin-Namen eingeben");return;}
      const url="https://de.wikipedia.org/w/index.php?search="+encodeURIComponent(name);
      window.open(url,"_blank","noopener,noreferrer");
    },
    onLayout:focus=>{
      updatePanelLayout();
      if(focus)requestAnimationFrame(keepSelectedAbovePanel);
    }
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
  const updatePanelLayout = ()=>mapOverlayLayout.layout();
  const scheduleMapOverlayUpdate = ()=>mapOverlayLayout.schedule();
  const keepSelectedAbovePanel = ()=>mapOverlayLayout.keepVisibleAtOpen();
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
  function selectPin(id){pinSession.select(id);}
  function updateModeUI() {
    const picking=uiState.moveMode&&!moveView.current();
    document.body.classList.toggle("pin-relocation-picking",picking);
    mapAdapter.getContainer().style.cursor = picking ? "crosshair" : "";
  }
  function addPin(lat,lng,name){return pinSession.add(lat,lng,name);}

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
    onInputChange:()=>searchView.hide(),
    cancelSearch:()=>placeSearch.cancel()
  });
  const updateLabelButton = () => uiShell.updateLabelButton(state.labelsVisible);
  function bind() {
    searchForm.bind();
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
    $("allowGeocode").checked = state.allowGeocode;
    $("allowGeocode").addEventListener("change", e => { state.allowGeocode = e.target.checked; save(); });
    $("addLayer").addEventListener("click",()=>layerCreation.create());

    pinEditorActions.bind();
    $("movePin").addEventListener("click",()=>moveController.begin());
    $("cancelMove").addEventListener("click",()=>moveController.cancel());
    $("confirmMove").addEventListener("click",()=>moveController.confirm());
    pinDeleteDialog.bind();

    mapAdapter.onMapClick(position=>{
      if(satelliteInspector.isActive()){satelliteInspector.pick(position);return;}
      pinInfoMenu.close();mapClickCoordinator.handle(position);
    });

    gestures.attachLongPress();
    mapOverlayLayout.bind();
    document.addEventListener("visibilitychange", () => { if(document.visibilityState==="hidden")persistence.flushOnHidden(); });
  }
  async function init() {
    if(!window.L){$("notice").textContent="Die Kartenbibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen."; $("notice").classList.remove("hidden");return;}
    let savedProject;
    try {projectStore=await window.Pin2MapIndexedDBProjectStore.open();savedProject=await projectStore.loadProject();}
    catch(e){showNotice("IndexedDB nicht verfügbar – Änderungen können verloren gehen");}
    state=window.Pin2MapProjectHydration.hydrate(savedProject,{
      defaults,privateLayerId:PRIVATE_ID,cleanupSearch:project=>placeSearch.cleanup(project)
    });
    mapAdapter=window.Pin2MapLeafletAdapter.mount("map",{center:{lat:state.viewport.lat,lng:state.viewport.lng},zoom:state.viewport.zoom});
    gestures=window.Pin2MapMapGestureController({
      mapAdapter,
      getBasemap:()=>state.basemap,
      isMoveMode:()=>uiState.moveMode,
      isInspectMode:()=>satelliteInspector.isActive(),
      selectPin,addPin,renderMarkers,persistViewport,updatePanelLayout,
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
    setTileLayer();bind();renderLayers();renderMarkers();renderPinPanel();updateModeUI();updateLabelButton();
    if("serviceWorker" in navigator && (location.protocol==="https:" || ["localhost","127.0.0.1"].includes(location.hostname)))navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{});
  }
  document.addEventListener("DOMContentLoaded",init);
})();