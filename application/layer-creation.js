"use strict";
/* Create-layer workflow. Prompt and presentation are injected UI callbacks;
 * the existing layer operations remain the sole mutation authority. */
(function(root){
  class LayerCreation{
    constructor({getProject,operations,askName,createId,cleanText,colors,onNotice,onRender,onSave}){
      if([getProject,askName,createId,cleanText,onNotice,onRender,onSave].some(fn=>typeof fn!=="function")||
        !operations||typeof operations.nextName!=="function"||typeof operations.create!=="function"||
        !Array.isArray(colors))throw new TypeError("Layer creation ports required");
      this.getProject=getProject;this.operations=operations;this.askName=askName;
      this.createId=createId;this.cleanText=cleanText;this.colors=colors;
      this.onNotice=onNotice;this.onRender=onRender;this.onSave=onSave;
    }
    create(){
      const state=this.getProject();
      const name=this.askName(this.operations.nextName(state));
      if(name===null)return null;
      let created;
      try{created=this.operations.create(state,{
        id:this.createId(),name,cleanText:this.cleanText,colors:this.colors
      });}
      catch(error){
        this.onNotice(error.message==="Empty layer name"?"Bitte einen Ebenennamen eingeben":
          error.message==="Duplicate layer name"?"Der Ebenenname ist bereits vergeben":
          "Ebene konnte nicht erstellt werden");
        return null;
      }
      this.onRender();this.onSave();
      return created;
    }
  }
  root.Pin2MapLayerCreation=LayerCreation;
  if(typeof module!=="undefined"&&module.exports)module.exports=LayerCreation;
})(typeof window!=="undefined"?window:globalThis);
