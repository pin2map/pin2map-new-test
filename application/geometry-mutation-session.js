"use strict";
/* Geometry record mutations are application use cases; map rendering,
 * persistence, timestamp generation and notices remain injected ports. */
(function(root){
 class GeometryMutationSession{
  constructor({features,getProject,now,onSave,onRender,onNotice}={}){
   if(!features||typeof features.change!=="function"||
      typeof features.remove!=="function"||
      [getProject,now,onSave,onRender,onNotice].some(fn=>typeof fn!=="function"))
     throw new TypeError("Geometry mutation ports required");
   Object.assign(this,{features,getProject,now,onSave,onRender,onNotice});
  }
  change(type,id,patch){
   const result=this.features.change(this.getProject(),type,id,patch,
     {updatedAt:this.now()});
   if(result){this.onSave();this.onRender();}
   return result;
  }
  remove(type,id){
   if(this.features.remove(this.getProject(),type,id)){
    this.onSave();
    this.onRender();
    this.onNotice(type==="river"?"Fluss entfernt":"Fläche entfernt");
   }
  }
 }
 root.Pin2MapGeometryMutationSession=GeometryMutationSession;
 if(typeof module!=="undefined"&&module.exports)module.exports=GeometryMutationSession;
})(typeof window!=="undefined"?window:globalThis);
