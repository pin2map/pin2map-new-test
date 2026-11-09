"use strict";
/* Pointer gestures only: no pin persistence, domain mutations, provider calls,
 * or map-framework globals. Map operations flow through the adapter interface.
 * Callback dependencies preserve the existing UI semantics. */
(function(root){
  function createMapGestureController({
    mapAdapter,getBasemap,isMoveMode,selectPin,addPin,
    renderMarkers,persistViewport,updatePanelLayout,
    scheduleFrame, vibrate=()=>{}, now=()=>Date.now(),
    setTimer=setTimeout,clearTimer=clearTimeout
  }){
    if(!mapAdapter||typeof isMoveMode!=="function"||typeof addPin!=="function")
      throw new TypeError("Gesture adapter and callbacks required");
    let longPressTimer=null,longPressStart=null,suppressMapClickUntil=0;
    const activePointers=new Set();
    let lastTouchStartAt=0,markerPressTimer=null,markerPressStart=null;
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
        if(navigator.vibrate)navigator.vibrate(15);
      },550);
    },{passive:false});
  }

  function cancelLongPress() {
    clearTimer(longPressTimer);
    longPressTimer = null;
    longPressStart = null;
  }
  function attachLongPress() {
    const container = mapAdapter.getContainer();
    const isMapSurface = target => mapAdapter.isMapSurface(target);
    container.addEventListener("pointerdown", e => {
      activePointers.add(e.pointerId);
      if(e.pointerType==="touch"||e.pointerType==="pen")lastTouchStartAt=DateNow();
      cancelLongPress();
      if (isMoveMode() || e.button !== 0 || !isMapSurface(e.target) || activePointers.size !== 1) return;
      longPressStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
      // Long press works for touch and mouse. Right click remains an alternative.
      longPressTimer = setTimer(() => {
        if (!longPressStart || activePointers.size !== 1) return;
        const start = longPressStart;
        cancelLongPress();
        suppressFor(850);
        const rect = container.getBoundingClientRect();
        const point = {x:start.x - rect.left, y:start.y - rect.top};
        const where = mapAdapter.unproject(point);
        const pin = addPin(where.lat, where.lng, "");
        if (pin) {
          vibrate(15);
          scheduleFrame(updatePanelLayout);
        }
      }, 650);
    }, { passive: true });
    container.addEventListener("pointermove", e => {
      if (longPressStart && e.pointerId === longPressStart.id && Math.hypot(e.clientX - longPressStart.x, e.clientY - longPressStart.y) > 10) cancelLongPress();
    }, { passive: true });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      container.addEventListener(type, e => {
        activePointers.delete(e.pointerId);
        if (!longPressStart || e.pointerId === longPressStart.id) cancelLongPress();
      }, { passive: true });
    }
    mapAdapter.on("dragstart zoomstart", cancelLongPress);
    // Native desktop context menu is replaced by pin creation. Touch uses the timer above.
    container.addEventListener("contextmenu", e => {
      if(!isMapSurface(e.target))return;
      e.preventDefault();
      // iOS may synthesize contextmenu after a long touch; only create once.
      if(DateNow()-lastTouchStartAt<2400 || DateNow()<suppressMapClickUntil)return;
      if(isMoveMode())return;
      const rect=container.getBoundingClientRect();
      const location=mapAdapter.unproject({x:e.clientX-rect.left,y:e.clientY-rect.top});
      addPin(location.lat,location.lng,"");
      suppressFor(750);
    });
  }

    return Object.freeze({
      attachMarkerLongPress,attachLongPress,
      isSuppressed:()=>DateNow()<suppressMapClickUntil,
      isMarkerPressActive:()=>!!markerPressStart
    });
  }
  root.Pin2MapMapGestureController=createMapGestureController;
  if(typeof module!=="undefined"&&module.exports)module.exports=createMapGestureController;
})(typeof window!=="undefined"?window:globalThis);
