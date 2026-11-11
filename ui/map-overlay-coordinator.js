"use strict";
/* Presentation-only map overlay coordination. Project state and map operations
 * are supplied as callbacks; no pin mutation, persistence or Leaflet here. */
(function(root){
  class MapOverlayCoordinator{
    constructor({getElement,document:doc,searchView,uiShell,basemapMenu,getMoveMode,getSelectedPinId,onCancelMove,onClearSelection}){
      if(typeof getElement!=="function"||!doc||!searchView||!uiShell||!basemapMenu||
         [getMoveMode,getSelectedPinId,onCancelMove,onClearSelection].some(fn=>typeof fn!=="function"))
        throw new TypeError("Map overlay coordinator dependencies required");
      this.element=getElement;this.document=doc;
      this.searchView=searchView;this.uiShell=uiShell;this.basemapMenu=basemapMenu;
      this.getMoveMode=getMoveMode;this.getSelectedPinId=getSelectedPinId;
      this.onCancelMove=onCancelMove;this.onClearSelection=onClearSelection;
      this.listeners=[];
    }
    preparePinSelection(){
      this.searchView.hide();
      // Keep the existing panel behavior (selection only hides them).
      this.element("layersPanel").classList.add("hidden");
      this.element("settingsPanel").classList.add("hidden");
      this.basemapMenu.close();
    }
    closeAll(){
      this.searchView.hide();
      this.uiShell.closePanels();
      this.basemapMenu.close();
      this.uiShell.hideNotice();
      const dialog=this.element("deleteDialog");
      if(dialog.open)dialog.close("cancel");
      if(this.getMoveMode())this.onCancelMove();
      // Test state after cancel, exactly as the old composition flow did.
      if(this.getSelectedPinId()!==null||this.getMoveMode())this.onClearSelection();
      const active=this.document.activeElement;
      if(active&&typeof active.blur==="function")active.blur();
    }
    togglePanel(id){
      this.basemapMenu.close();
      this.uiShell.togglePanel(id);
    }
    bind(){
      if(this.listeners.length)return;
      const listen=(node,type,handler)=>{
        node.addEventListener(type,handler);
        this.listeners.push({node,type,handler});
      };
      this.document.querySelectorAll("[data-close]").forEach(button=>
        listen(button,"click",()=>{
          if(button.dataset.close==="pinPanel"){this.closeAll();return;}
          this.uiShell.closePanel(button.dataset.close);
        })
      );
      listen(this.document,"pointerdown",event=>{
        if(this.searchView.isVisible()&&!event.target.closest("#searchResults, #searchForm"))
          this.searchView.hide();
      });
    }
    dispose(){
      for(const {node,type,handler} of this.listeners)node.removeEventListener(type,handler);
      this.listeners=[];
    }
  }
  root.Pin2MapMapOverlayCoordinator=MapOverlayCoordinator;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapOverlayCoordinator;
})(typeof window!=="undefined"?window:globalThis);
