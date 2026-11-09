"use strict";
/*
 * Ephemeral UI state only. Does not own project data or persist anything.
 * Application events drive this controller; Leaflet/DOM remain outside.
 */
(function(root){
  class UIState {
    constructor(){this.selectedPinId=null;this.moveMode=false;}
    selectPin(id){
      if(typeof id!=="string"||!id)throw new TypeError("Pin ID required");
      this.selectedPinId=id;
      this.moveMode=false;
    }
    clearSelection(){this.selectedPinId=null;this.moveMode=false;}
    enterMove(){
      if(this.selectedPinId===null)throw new Error("Cannot move without a selected pin");
      this.moveMode=true;
    }
    leaveMove(){this.moveMode=false;}
    snapshot(){return Object.freeze({selectedPinId:this.selectedPinId,moveMode:this.moveMode});}
  }
  root.Pin2MapUIState=UIState;
  if(typeof module!=="undefined"&&module.exports)module.exports=UIState;
})(typeof window!=="undefined"?window:globalThis);
