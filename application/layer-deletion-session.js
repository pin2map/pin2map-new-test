"use strict";
/* Transaction-shaped layer/pin deletion coordination. Object ownership
 * changes are use-case rules; rendering, selection and persistence are ports. */
(function(root){
 class LayerDeletionSession{
  constructor({operations,getProject,privateId,onRemovedPins,onSave,onRender,onNotice}={}){
   if(!operations||typeof operations.deleteLayerOrPins!=="function"||
      typeof getProject!=="function"||!privateId||
      [onRemovedPins,onSave,onRender,onNotice].some(fn=>typeof fn!=="function"))
     throw new TypeError("Layer deletion ports required");
   Object.assign(this,{operations,getProject,privateId,onRemovedPins,onSave,onRender,onNotice});
  }
  confirm(id){
   const project=this.getProject();
   const result=this.operations.deleteLayerOrPins(project,id,this.privateId);
   if(!result)return null;
   this.onRemovedPins(result.removedPinIds);
   // Geometry is never orphaned by deleting its former layer.
   // Private-pin deletion does not move other private geometry.
   if(!result.privateOnly)
    for(const obj of [...(project.areas||[]),...(project.rivers||[])])
     if(obj.layerId===id)obj.layerId=this.privateId;
   this.onSave();
   this.onRender();
   this.onNotice(result.privateOnly?"Private Pins gelöscht":"Ebene und Pins gelöscht");
   return result;
  }
 }
 root.Pin2MapLayerDeletionSession=LayerDeletionSession;
 if(typeof module!=="undefined"&&module.exports)module.exports=LayerDeletionSession;
})(typeof window!=="undefined"?window:globalThis);
