"use strict";
/* Pointer gestures only: no pin persistence, domain mutations, provider calls,
 * or map-framework globals. Map operations flow through the adapter interface.
 * Callback dependencies preserve the existing UI semantics. */
(function(root){
  function createMapGestureController({
    mapAdapter,getBasemap,isMoveMode,isInspectMode=()=>false,selectPin,addPin,
    onSurfacePointerDown=()=>false,
    renderMarkers,persistViewport,updatePanelLayout,
    scheduleFrame, vibrate=()=>{}, now=()=>Date.now(),
    setTimer=setTimeout,clearTimer=clearTimeout
  }){
    if(!mapAdapter||typeof isMoveMode!=="function"||typeof addPin!=="function")
      throw new TypeError("Gesture adapter and callbacks required");
    let suppressMapClickUntil=0,lastDismissAt=0,markerPressTimer=null,markerPressStart=null;
    const DateNow=()=>now();
    const suppressFor=ms=>{suppressMapClickUntil=DateNow()+ms;};
  // Matches the predecessor app: a held pin alternates 18/14 at its on-screen pixel.
  // A tap still opens/closes its editor; dragging a pin never moves it.
  function zoomHeldPin(marker){
    if(!mapAdapter || !mapAdapter.hasOverlay(marker))return;
    const pinPosition=mapAdapter.getMarkerPosition(marker);
    const second=marker._heldZoomClose===true;
    const providerMax=getBasemap()==="topo"?17:19;
    const target=Math.min(second?14:18,providerMax);
    const anchor=mapAdapter.project(pinPosition);
    mapAdapter.zoomAround(pinPosition,target,{animate:false});
    const actual=mapAdapter.project(pinPosition);
    const delta={x:actual.x-anchor.x,y:actual.y-anchor.y};
    if(Math.abs(delta.x)>0.5 || Math.abs(delta.y)>0.5)mapAdapter.panBy(delta,{animate:false});
    marker._heldZoomClose=!second;
    persistViewport();updatePanelLayout();
  }
  function attachMarkerLongPress(marker,id){
    const element=mapAdapter.getMarkerElement(marker);
    if(!element || element.dataset.pinGestureBound)return;
    element.dataset.pinGestureBound="true";
    // Stop Leaflet dragging for touches and mouse presses that begin on a pin.
    mapAdapter.stopMarkerEventPropagation(element);
    element.style.touchAction="none";
    element.addEventListener("pointerdown",event=>{
      if(event.button!==0 || isMoveMode())return;
      event.stopPropagation();
      if(markerPressStart)return;
      const gesture={id:event.pointerId,x:event.clientX,y:event.clientY,
        activated:false,cancelled:false,finished:false,wasDraggable:mapAdapter.isPanEnabled()};
      markerPressStart=gesture;
      if(gesture.wasDraggable)mapAdapter.setPanEnabled(false);
      try{element.setPointerCapture(gesture.id);}catch(_){}
      const cleanup=()=>{
        clearTimer(markerPressTimer);markerPressTimer=null;
        if(markerPressStart===gesture)markerPressStart=null;
        if(gesture.wasDraggable)mapAdapter.setPanEnabled(true);
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
        suppressFor(600);
        cleanup();
        if(tap)selectPin(id);
        else renderMarkers();
      };
      const onCancel=e=>{
        if(e.pointerId!==gesture.id || gesture.finished)return;
        gesture.cancelled=true;cleanup();
      };
      element.addEventListener("pointermove",onMove,{passive:false});
      element.addEventListener("pointerup",onUp,{passive:false});
      element.addEventListener("pointercancel",onCancel);
      element.addEventListener("lostpointercapture",onCancel);
      markerPressTimer=setTimer(()=>{
        if(markerPressStart!==gesture || gesture.finished || gesture.cancelled)return;
        gesture.activated=true;
        suppressFor(900);
        zoomHeldPin(marker);
        vibrate(15);
      },550);
    },{passive:false});
  }

  // A background click owns the small chooser; mouse longpress, right-click,
  // double-click and mobile doubletap are no longer chooser shortcuts.
  // Pin longpress keeps its separate, established zoom-in/out behavior.
  function attachLongPress(){
    const container=mapAdapter.getContainer();
    mapAdapter.disableDoubleClickZoom?.();
    let heldBackground=null;
    container.addEventListener("pointerdown",event=>{
      if(event.button!==0||isMoveMode()||isInspectMode()||
        !mapAdapter.isMapSurface(event.target))return;
      heldBackground={id:event.pointerId,x:event.clientX,y:event.clientY,
        started:DateNow(),moved:false};
      // Check BEFORE document-level outside-click handlers close overlays.
      // Only a NEW click after dismissal may open the chooser.
      if(onSurfacePointerDown())lastDismissAt=DateNow();
      else lastDismissAt=0;
    },true);
    container.addEventListener("pointermove",event=>{
      if(heldBackground?.id===event.pointerId&&
        Math.hypot(event.clientX-heldBackground.x,
          event.clientY-heldBackground.y)>10)heldBackground.moved=true;
    },{passive:true});
    for(const type of ["pointerup","pointercancel","lostpointercapture"]){
      container.addEventListener(type,event=>{
        if(!heldBackground||heldBackground.id!==event.pointerId)return;
        const hold=type==="pointerup"&&!heldBackground.moved&&
          DateNow()-heldBackground.started>=550;
        heldBackground=null;
        // Longtap is RETIRED as a map menu trigger. Browsers sometimes
        // synthesize a regular click after a held release: suppress it.
        if(hold)suppressFor(950);
      },{passive:true});
    }
  }

    return Object.freeze({
      attachMarkerLongPress,attachLongPress,
      consumeDismissedTap:()=>{
        // Leaflet/browser may deliver multiple click events for one pointer
        // gesture. All of them belong to the same dismissal; a NEW
        // pointerdown (above) explicitly resets the latch.
        return lastDismissAt>0&&DateNow()-lastDismissAt<1100;
      },
      isSuppressed:()=>DateNow()<suppressMapClickUntil,
      isMarkerPressActive:()=>!!markerPressStart
    });
  }
  root.Pin2MapMapGestureController=createMapGestureController;
  if(typeof module!=="undefined"&&module.exports)module.exports=createMapGestureController;
})(typeof window!=="undefined"?window:globalThis);
