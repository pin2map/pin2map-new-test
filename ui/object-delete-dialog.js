"use strict";
/* One nonmodal, toggleable delete confirmation for every object editor.
 * UI only: confirmation reports the captured immutable object ID. */
(function(root){
 class ObjectDeleteDialog{
  constructor({getElement,getSelectedId,onConfirm,buttonId="deletePin",
    dialogId="deleteDialog",panelId="pinPanel",headerSelector=".pin-editor-head",
    nameId="pinName",nameLabelId="deletePinName",questionId=null,
    objectType=()=>"Pin"}){
   if([getElement,getSelectedId,onConfirm].some(fn=>typeof fn!=="function"))
    throw new TypeError("Object delete dialog dependencies required");
   this.element=getElement;this.getSelectedId=getSelectedId;this.onConfirm=onConfirm;
   this.buttonId=buttonId;this.dialogId=dialogId;this.panelId=panelId;
   this.headerSelector=headerSelector;this.nameId=nameId;
   this.nameLabelId=nameLabelId;this.questionId=questionId;
   this.objectType=objectType;
   this.dialog=this.element(dialogId);this.pendingId=null;this.listeners=[];
  }
  positionOverPanel(){
   const panel=this.element(this.panelId);
   const head=panel?.querySelector?.(this.headerSelector);
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
   const button=this.element(this.buttonId);
   const setOpened=open=>{
    if(root.Pin2MapObjectDialogCore)root.Pin2MapObjectDialogCore.setOpened(button,open);
    else{
     button.setAttribute("aria-expanded",String(open));
     button.classList.toggle("is-active",open);
    }
   };
   setOpened(false);
   const onClick=()=>{
    if(this.dialog.open){this.dialog.close("cancel");return;}
    const id=this.getSelectedId();
    if(typeof id!=="string"||!id)return;
    this.dialog.returnValue="cancel";this.pendingId=id;
    const name=String(this.element(this.nameId)?.value||"").trim();
    const label=this.nameLabelId&&this.element(this.nameLabelId);
    if(label)label.textContent=name||"Unbenannt";
    const question=this.questionId&&this.element(this.questionId);
    if(question)question.textContent=this.objectType()+" „"+(name||"Unbenannt")+"“ wirklich löschen?";
    this.positionOverPanel();
    try{this.dialog.show();setOpened(true);}
    catch(error){this.pendingId=null;setOpened(false);throw error;}
   };
   const onEscape=event=>{
    if(event.key!=="Escape"||!this.dialog.open)return;
    event.preventDefault();this.dialog.close("cancel");
   };
   const onClose=()=>{
    setOpened(false);
    const id=this.pendingId;this.pendingId=null;
    if(id!==null&&this.dialog.returnValue==="confirm")this.onConfirm(id);
   };
   button.addEventListener("click",onClick);
   this.dialog.addEventListener("close",onClose);
   this.listeners=[{node:button,type:"click",handler:onClick},
    {node:this.dialog,type:"close",handler:onClose}];
   const doc=this.dialog.ownerDocument;
   if(doc?.addEventListener){
    doc.addEventListener("keydown",onEscape);
    this.listeners.push({node:doc,type:"keydown",handler:onEscape});
   }
   const win=doc?.defaultView;
   if(win?.addEventListener){
    const reposition=()=>{if(this.dialog.open)this.positionOverPanel();};
    win.addEventListener("resize",reposition);
    this.listeners.push({node:win,type:"resize",handler:reposition});
   }
  }
  close(){if(this.dialog.open)this.dialog.close("cancel");}
  dispose(){
   for(const {node,type,handler} of this.listeners)
    node.removeEventListener(type,handler);
   this.listeners=[];
   const button=this.element(this.buttonId);
   button.setAttribute("aria-expanded","false");
   button.classList.remove("is-active");
   this.pendingId=null;
  }
 }
 root.Pin2MapObjectDeleteDialog=ObjectDeleteDialog;
 if(typeof module!=="undefined"&&module.exports)module.exports=ObjectDeleteDialog;
})(typeof window!=="undefined"?window:globalThis);
