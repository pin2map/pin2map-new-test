"use strict";
/*
 * Move workflow orchestration. Pin changes happen ONLY on confirm() through
 * the existing pin operations use case. Preview remains a separate UI view.
 * No DOM, renderer internals, storage, or network access in this controller.
 */
(function(root){
  class PinMoveController{
    constructor({uiState,getProject,getSelectedPin,pinOperations,validatePosition,
      preview,onEnter=()=>{},onExit=()=>{},onCommitted=()=>{}}){
      if(!uiState||!getProject||!getSelectedPin||!pinOperations||
        typeof validatePosition!=="function"||!preview)
        throw new TypeError("Move workflow dependencies required");
      this.uiState=uiState;this.getProject=getProject;
      this.getSelectedPin=getSelectedPin;this.pinOperations=pinOperations;
      this.validatePosition=validatePosition;this.preview=preview;
      this.onEnter=onEnter;this.onExit=onExit;this.onCommitted=onCommitted;
      this.pinId=null;
    }
    isActive(){return !!this.uiState.moveMode&&this.pinId!==null;}
    begin(){
      const pin=this.getSelectedPin();
      if(!pin||this.uiState.moveMode)return false;
      this.uiState.enterMove();
      this.pinId=pin.id;
      this.preview.clear();
      this.onEnter();
      return true;
    }
    previewAt(position){
      if(!this.isActive())return false;
      const pin=this.getSelectedPin();
      if(!pin||pin.id!==this.pinId)return false;
      this.preview.show(position,pin);
      return true;
    }
    cancel({committed=false}={}){
      const wasActive=this.isActive()||this.uiState.moveMode;
      this.uiState.leaveMove();
      this.pinId=null;
      this.preview.clear();
      if(wasActive)this.onExit({committed});
      return wasActive;
    }
    confirm(){
      if(!this.isActive())return null;
      const pin=this.getSelectedPin(),position=this.preview.current();
      if(!pin||pin.id!==this.pinId||!position)return null;
      const updated=this.pinOperations.movePin(this.getProject(),this.pinId,position,{
        validatePosition:this.validatePosition
      });
      if(!updated)return null;
      this.cancel({committed:true});
      this.onCommitted(updated);
      return updated;
    }
  }
  root.Pin2MapPinMoveController=PinMoveController;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinMoveController;
})(typeof window!=="undefined"?window:globalThis);
