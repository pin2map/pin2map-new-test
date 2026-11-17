"use strict";
/* Create-layer workflow. Prompt and presentation are injected UI callbacks;
 * the existing layer operations remain the sole mutation authority. */
(function(root){
  class LayerCreation{
    // One local-time default for inline layer editing and transient-object creation.
    // A fresh Date at each opening preserves the actual current hour.
    static suggestedName(date=new Date()){
      const two=value=>String(value).padStart(2,"0");
      return two(date.getDate())+"."+two(date.getMonth()+1)+"."+
        date.getFullYear()+"-"+two(date.getHours());
    }
    constructor({getProject,operations,askName,createId,cleanText,colors,onNotice,onRender,onSave}){
      if([getProject,askName,createId,cleanText,onNotice,onRender,onSave].some(fn=>typeof fn!=="function")||
        !operations||typeof operations.nextName!=="function"||typeof operations.create!=="function"||
        !Array.isArray(colors))throw new TypeError("Layer creation ports required");
      this.getProject=getProject;this.operations=operations;this.askName=askName;
      this.createId=createId;this.cleanText=cleanText;this.colors=colors;
      this.onNotice=onNotice;this.onRender=onRender;this.onSave=onSave;
    }
    createConfigured(name,color,index){
      const state=this.getProject();
      const palette=root.Pin2MapLayerPalette;
      if(!palette||!palette.hex(color))throw new RangeError("Ungültiger HEX-Farbwert");
      let layer;
      try{
        layer=this.operations.create(state,{id:this.createId(),name,
          cleanText:this.cleanText,colors:[color]});
      }catch(error){
        this.onNotice(error.message==="Duplicate layer name"?
          "Der Ebenenname ist bereits vergeben":"Ebene konnte nicht erstellt werden");
        return null;
      }
      palette.recordLayer(state,layer,index);
      this.onRender();this.onSave();return layer;
    }
    create(){
      const state=this.getProject();
      const name=this.askName(LayerCreation.suggestedName());
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
