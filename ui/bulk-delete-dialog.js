"use strict";
/* Confirmation presentation only: no pin mutation, storage or map dependencies. */
(function(root){
  class BulkDeleteDialog{
    constructor({getElement,onConfirm}){
      if(typeof getElement!=="function"||typeof onConfirm!=="function")
        throw new TypeError("Bulk deletion dialog callbacks required");
      this.element=getElement;
      this.onConfirm=onConfirm;
      this.pendingId=null;
      this.dialog=this.element("bulkDialog");
      this.onClose=()=>{
        const id=this.pendingId;
        this.pendingId=null;
        if(id!==null && this.dialog.returnValue==="confirm")this.onConfirm(id);
      };
      this.dialog.addEventListener("close",this.onClose);
    }
    show(id,info){
      if(!info||!info.allowed||!info.layer||typeof info.count!=="number")
        throw new TypeError("Allowed deletion details required");
      if(this.dialog.open)throw new Error("Confirmation dialog already open");
      this.element("bulkTitle").textContent=info.privateOnly
        ?"Alle Pins in Privat löschen?":"Ebene „"+info.layer.name+"“ löschen?";
      this.element("bulkDescription").textContent=info.privateOnly
        ?"Die Ebene Privat bleibt bestehen. "+info.count+" Pins werden gelöscht."
        :"Die Ebene und "+info.count+" zugeordnete Pins werden gelöscht.";
      this.dialog.returnValue="cancel";
      this.pendingId=id;
      try{this.dialog.showModal();}
      catch(error){this.pendingId=null;throw error;}
    }
    dispose(){
      this.dialog.removeEventListener("close",this.onClose);
      this.pendingId=null;
    }
  }
  root.Pin2MapBulkDeleteDialog=BulkDeleteDialog;
  if(typeof module!=="undefined"&&module.exports)module.exports=BulkDeleteDialog;
})(typeof window!=="undefined"?window:globalThis);
