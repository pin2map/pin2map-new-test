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
    positionOverPanel(){
      const panel=this.element("pinPanel");
      const head=panel?.querySelector?.(".pin-editor-head");
      if(!panel?.getBoundingClientRect||!head?.getBoundingClientRect)return;
      const bounds=panel.getBoundingClientRect();
      const top=head.getBoundingClientRect().bottom+7;
      this.dialog.style.left=bounds.left+"px";
      this.dialog.style.top=top+"px";
      this.dialog.style.width=bounds.width+"px";
      this.dialog.style.height=Math.max(110,bounds.bottom-top)+"px";
    }
    bind(){
      if(this.listeners.length)return;
      const button=this.element("deletePin");
      const onClick=()=>{
        const id=this.getSelectedPinId();
        if(typeof id!=="string"||!id||this.dialog.open)return;
        this.dialog.returnValue="cancel";
        this.pendingId=id;
        // Name is presentation-only and set via textContent, never HTML.
        const name=this.element("pinName")?.value?.trim();
        const nameLabel=this.element("deletePinName");
        if(nameLabel)nameLabel.textContent=name||"Unbenannter Pin";
        this.positionOverPanel();
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
      const win=this.dialog.ownerDocument?.defaultView;
      if(win?.addEventListener){
        const reposition=()=>{if(this.dialog.open)this.positionOverPanel();};
        win.addEventListener("resize",reposition);
        this.listeners.push({node:win,type:"resize",handler:reposition});
      }
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
