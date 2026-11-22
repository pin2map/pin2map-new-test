"use strict";
/* Map input priority and pin-move command bindings. The coordinator owns
 * event sequencing but receives only injected adapter/use-case callbacks.
 * No map engine, persistence or project-state access. */
(function(root){
  class MapInteractionController{
    constructor({getElement,closeTransient,onMoveBegin,isTemporaryMoveActive,
      onTemporaryMoveCancel,onRegularMoveCancel,onTemporaryMoveConfirm,
      onRegularMoveConfirm,onMapClick,isSatellitePicking,onSatellitePick,
      onRegularMapClick,attachLongPress}){
      const callbacks=[getElement,closeTransient,onMoveBegin,isTemporaryMoveActive,
        onTemporaryMoveCancel,onRegularMoveCancel,onTemporaryMoveConfirm,
        onRegularMoveConfirm,onMapClick,isSatellitePicking,onSatellitePick,
        onRegularMapClick,attachLongPress];
      if(callbacks.some(fn=>typeof fn!=="function"))
        throw new TypeError("Map interaction ports required");
      Object.assign(this,{getElement,closeTransient,onMoveBegin,isTemporaryMoveActive,
        onTemporaryMoveCancel,onRegularMoveCancel,onTemporaryMoveConfirm,
        onRegularMoveConfirm,onMapClick,isSatellitePicking,onSatellitePick,
        onRegularMapClick,attachLongPress});
      this.handlers=[];this.buttonsBound=false;this.mapBound=false;this.longPressBound=false;
    }
    bindPinMoveButtons(){
      if(this.buttonsBound)return;
      this.buttonsBound=true;
      const listen=(id,handler)=>{
        const node=this.getElement(id);
        node.addEventListener("click",handler);
        this.handlers.push({node,handler});
      };
      for(const id of ["deletePin","movePin","pinLayerTrigger","closePin"])
        listen(id,()=>this.closeTransient());
      listen("movePin",()=>this.onMoveBegin());
      listen("cancelMove",()=>this.isTemporaryMoveActive()?
        this.onTemporaryMoveCancel():this.onRegularMoveCancel());
      listen("confirmMove",()=>this.isTemporaryMoveActive()?
        this.onTemporaryMoveConfirm():this.onRegularMoveConfirm());
    }
    bindMapClick(){
      if(this.mapBound)return;
      this.mapBound=true;
      // Satellite picking wins; the delegated map-click coordinator retains
      // move-target priority over pin ghost-click suppression.
      this.onMapClick(position=>{
        if(this.isSatellitePicking()){this.onSatellitePick(position);return;}
        this.onRegularMapClick(position);
      });
    }
    bindLongPress(){
      if(this.longPressBound)return;
      this.longPressBound=true;
      this.attachLongPress();
    }
    disposeButtons(){
      for(const {node,handler} of this.handlers)node.removeEventListener("click",handler);
      this.handlers=[];this.buttonsBound=false;
    }
  }
  root.Pin2MapMapInteractionController=MapInteractionController;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapInteractionController;
})(typeof window!=="undefined"?window:globalThis);
