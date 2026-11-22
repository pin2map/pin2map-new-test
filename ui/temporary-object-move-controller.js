"use strict";
/* Transient point relocation: shares the saved-pin move preview and guide.
 * No project data changes occur before the existing acceptance callback. */
(function(root){
 class TemporaryObjectMoveController{
  constructor({getMoveMode,getPreview,getGuide,closeLayerPicker,closePlatePanel,
    invalidateLocality,updateModeUI,validatePosition,getZoom,accept,resolveName}){
   Object.assign(this,{getMoveMode,getPreview,getGuide,closeLayerPicker,
     closePlatePanel,invalidateLocality,updateModeUI,validatePosition,getZoom,
     accept,resolveName});
   this.entry=null;
  }
  isActive(){return this.entry!==null;}
  begin(entry){
   if(entry?.kind!=="point"||this.getMoveMode()||this.isActive())return false;
   this.closeLayerPicker();
   this.closePlatePanel();
   this.invalidateLocality();
   this.entry=entry;
   this.getPreview().clear();
   this.getGuide().start({lat:entry.point.lat,lng:entry.point.lng});
   this.updateModeUI();
   return true;
  }
  previewAt(position){
   if(!this.entry)return false;
   this.getPreview().show(position,{lat:this.entry.point.lat,lng:this.entry.point.lng});
   return true;
  }
  cancel(){
   if(!this.entry)return false;
   this.entry=null;
   this.getGuide().stop();
   this.getPreview().clear();
   this.updateModeUI();
   return true;
  }
  confirm(){
   const preview=this.getPreview();
   if(!this.entry||!preview.current())return false;
   const entry=this.entry;
   let position;
   try{
    const point=preview.current();
    position=this.validatePosition(point.lat,point.lng);
   }catch(_error){return false;}
   this.cancel();
   entry.point=position;
   // Name resolution uses the zoom at the newly selected target.
   entry.mapZoom=this.getZoom();
   if(entry.autoNamed){entry.name="";entry.label="Neuer Pin";}
   this.accept(entry);
   if(entry.autoNamed)void this.resolveName(entry);
   return true;
  }
 }
 root.Pin2MapTemporaryObjectMoveController=TemporaryObjectMoveController;
 if(typeof module!=="undefined"&&module.exports)module.exports=TemporaryObjectMoveController;
})(typeof window!=="undefined"?window:globalThis);
