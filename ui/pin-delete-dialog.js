"use strict";
/* Pin-specific adapter over the shared object deletion controller. */
(function(root){
 const Base=root.Pin2MapObjectDeleteDialog||
  (typeof require==="function"?require("./object-delete-dialog.js"):null);
 class PinDeleteDialog extends Base{
  constructor({getElement,getSelectedPinId,onConfirm}){
   super({getElement,getSelectedId:getSelectedPinId,onConfirm,
    buttonId:"deletePin",dialogId:"deleteDialog",panelId:"pinPanel",
    headerSelector:".pin-editor-head",nameId:"pinName",
    nameLabelId:"deletePinName",objectType:()=>"Pin"});
   this.getSelectedPinId=getSelectedPinId;
  }
 }
 root.Pin2MapPinDeleteDialog=PinDeleteDialog;
 if(typeof module!=="undefined"&&module.exports)module.exports=PinDeleteDialog;
})(typeof window!=="undefined"?window:globalThis);
