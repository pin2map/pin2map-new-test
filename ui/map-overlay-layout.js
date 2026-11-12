"use strict";
/* Frame-coalesced overlay layout and map viewport event orchestration.
 * Pin panel geometry and relocation preview stay in their existing views.
 * Map engine, storage and gesture state are supplied exclusively as ports. */
(function(root){
  class MapOverlayLayoutCoordinator{
    constructor({mapPort,windowPort,getPin,isMoving,isMarkerPressActive,
      panelPositioner,movePreview,onPersistViewport,onRenderMarkers,
      requestFrame=callback=>root.requestAnimationFrame(callback),
      cancelFrame=id=>root.cancelAnimationFrame(id)}){
      if(!mapPort||typeof mapPort.on!=="function"||
        !panelPositioner||typeof panelPositioner.layout!=="function"||
        typeof panelPositioner.keepVisibleAtOpen!=="function"||
        !movePreview||typeof movePreview.positionBar!=="function"||
        !windowPort||typeof windowPort.addEventListener!=="function"||
        [getPin,isMoving,isMarkerPressActive,onPersistViewport,onRenderMarkers,
         requestFrame,cancelFrame].some(fn=>typeof fn!=="function"))
        throw new TypeError("Map overlay layout ports required");
      this.map=mapPort;this.window=windowPort;
      this.getPin=getPin;this.isMoving=isMoving;
      this.isMarkerPressActive=isMarkerPressActive;
      this.panel=panelPositioner;this.preview=movePreview;
      this.onPersistViewport=onPersistViewport;this.onRenderMarkers=onRenderMarkers;
      this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;
      this.frame=null;this.bound=false;
      this.onMove=()=>this.schedule();
      this.onMoveEnd=()=>{
        this.onPersistViewport();
        if(!this.isMarkerPressActive())this.onRenderMarkers();
        this.schedule();
      };
      this.onZoomEnd=()=>{
        if(!this.isMarkerPressActive())this.onRenderMarkers();
        this.schedule();
      };
      this.onViewportResize=()=>this.schedule();
      this.onResize=()=>{
        this.map.invalidateSize();
        this.onRenderMarkers();
        this.schedule();
      };
    }
    layout(){
      this.panel.layout({pin:this.getPin(),moving:this.isMoving()});
    }
    keepVisibleAtOpen(){
      // This may pan only on initial opening, never during move/zoom frames.
      this.panel.keepVisibleAtOpen({pin:this.getPin(),moving:this.isMoving()});
    }
    schedule(){
      if(this.frame!==null)return;
      this.frame=this.requestFrame(()=>{
        this.frame=null;
        this.layout();
        this.preview.positionBar();
      });
    }
    bind(){
      if(this.bound)return;
      this.bound=true;
      this.map.on("move",this.onMove);
      this.map.on("moveend",this.onMoveEnd);
      this.map.on("zoomend",this.onZoomEnd);
      this.window.addEventListener("resize",this.onResize);
      this.window.visualViewport?.addEventListener?.("resize",this.onViewportResize);
      this.window.visualViewport?.addEventListener?.("scroll",this.onViewportResize);
    }
    dispose(){
      if(this.bound){
        this.bound=false;
        if(typeof this.map.off==="function"){
          this.map.off("move",this.onMove);
          this.map.off("moveend",this.onMoveEnd);
          this.map.off("zoomend",this.onZoomEnd);
        }
        this.window.removeEventListener("resize",this.onResize);
        this.window.visualViewport?.removeEventListener?.("resize",this.onViewportResize);
        this.window.visualViewport?.removeEventListener?.("scroll",this.onViewportResize);
      }
      if(this.frame!==null){this.cancelFrame(this.frame);this.frame=null;}
    }
  }
  root.Pin2MapMapOverlayLayoutCoordinator=MapOverlayLayoutCoordinator;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapOverlayLayoutCoordinator;
})(typeof window!=="undefined"?window:globalThis);
