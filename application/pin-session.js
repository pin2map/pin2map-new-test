"use strict";
/* Pin creation and selection workflow. Domain mutations are delegated to
 * pin-operations; renderer, overlays and persistence are injected ports. */
(function(root){
  class PinSession{
    constructor({getProject,getSelectedPinId,uiState,pinOps,privateLayerId,
      createId,validatePosition,cleanText,getLayer,
      overlays,cancelMove,onModeChange,onRenderMarkers,onRenderLayers,onRenderPanel,
      scheduleSelectionLayout,onSave,onNotice}){
      if([getProject,getSelectedPinId,createId,validatePosition,cleanText,getLayer,
        cancelMove,onModeChange,onRenderMarkers,onRenderLayers,onRenderPanel,
        scheduleSelectionLayout,onSave,onNotice].some(fn=>typeof fn!=="function")||
        !uiState||!pinOps||!overlays||typeof privateLayerId!=="string")
        throw new TypeError("Pin session ports required");
      this.getProject=getProject;this.getSelectedPinId=getSelectedPinId;
      this.uiState=uiState;this.pinOps=pinOps;this.privateLayerId=privateLayerId;
      this.createId=createId;this.validatePosition=validatePosition;
      this.cleanText=cleanText;this.getLayer=getLayer;
      this.overlays=overlays;this.cancelMove=cancelMove;
      this.onModeChange=onModeChange;this.onRenderMarkers=onRenderMarkers;
      this.onRenderLayers=onRenderLayers;this.onRenderPanel=onRenderPanel;
      this.scheduleSelectionLayout=scheduleSelectionLayout;
      this.onSave=onSave;this.onNotice=onNotice;
    }
    select(id){
      if(this.getSelectedPinId()===id){this.overlays.closeAll();return;}
      // Pin selection replaces competing overlays before changing selection.
      this.overlays.preparePinSelection();
      this.cancelMove();
      this.uiState.selectPin(id);
      this.onModeChange();this.onRenderMarkers();this.onRenderLayers();this.onRenderPanel();
      this.scheduleSelectionLayout();
    }
    add(lat,lng,name){
      if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
      const layerId=this.privateLayerId;
      const pin=this.pinOps.createPin(this.getProject(),
        {id:this.createId(),lat,lng,name,layerId},
        {validatePosition:this.validatePosition,cleanText:this.cleanText});
      this.onSave();
      this.select(pin.id);
      const layer=this.getLayer(layerId);
      if(!layer.visible)this.onNotice("Pin in ausgeblendeter Ebene „"+layer.name+"“ gespeichert");
      return pin;
    }
  }
  root.Pin2MapPinSession=PinSession;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinSession;
})(typeof window!=="undefined"?window:globalThis);
