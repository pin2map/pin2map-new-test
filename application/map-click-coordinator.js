"use strict";
/* Map click decisions only: relocation must precede long-press click suppression.
 * No Leaflet, DOM, persistence or pin mutation in this application use case. */
(function(root){
  class MapClickCoordinator{
    constructor({isMoveMode,previewMove,isSuppressed,onTargetAccepted,onOrdinaryClick}){
      if([isMoveMode,previewMove,isSuppressed,onTargetAccepted,onOrdinaryClick]
        .some(fn=>typeof fn!=="function"))throw new TypeError("Map click ports required");
      this.isMoveMode=isMoveMode;
      this.previewMove=previewMove;
      this.isSuppressed=isSuppressed;
      this.onTargetAccepted=onTargetAccepted;
      this.onOrdinaryClick=onOrdinaryClick;
    }
    handle(position){
      // A deliberate move target is never swallowed by a previous long press.
      if(this.isMoveMode()){
        if(this.previewMove(position))this.onTargetAccepted();
        return;
      }
      if(this.isSuppressed())return;
      this.onOrdinaryClick();
    }
  }
  root.Pin2MapMapClickCoordinator=MapClickCoordinator;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapClickCoordinator;
})(typeof window!=="undefined"?window:globalThis);
