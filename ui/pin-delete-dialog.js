"use strict";
/* Single pin deletion confirmation. UI only: the confirmed pin id is passed
 * to application code. Never mutate project state or persistent data here. */
(function(root){
  class PinDeleteDialog{
    constructor({getElement,getSelectedPinId,onConfirm}){
      if([getElement,getSelectedPinId,onConfirm].some(fn=>typeof fn!=="function"))
        throw new TypeError("Pin delete dialog dependencies required");
      this.element=getElement;
      this.getSelectedPinId=getSelectedPinId;
      this.onConfirm=onConfirm;
      this.dialog=this.element("deleteDialog");
      this.pendingId=null;
      this.listeners=[];
    }
    bind(){
      if(this.listeners.length)return;
      const button=this.element("deletePin");
      const onClick=()=>{
        const id=this.getSelectedPinId();
        if(typeof id!=="string"||!id||this.dialog.open)return;
        this.dialog.returnValue="cancel";
        this.pendingId=id;
        try{this.dialog.showModal();}
        catch(error){this.pendingId=null;throw error;}
      };
      const onClose=()=>{
        const id=this.pendingId;
        this.pendingId=null;
        if(id!==null&&this.dialog.returnValue==="confirm")this.onConfirm(id);
      };
      button.addEventListener("click",onClick);
      this.dialog.addEventListener("close",onClose);
      this.listeners=[{node:button,type:"click",handler:onClick},{node:this.dialog,type:"close",handler:onClose}];
    }
    dispose(){
      for(const {node,type,handler} of this.listeners)node.removeEventListener(type,handler);
      this.listeners=[];
      this.pendingId=null;
    }
  }
  root.Pin2MapPinDeleteDialog=PinDeleteDialog;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinDeleteDialog;
})(typeof window!=="undefined"?window:globalThis);
