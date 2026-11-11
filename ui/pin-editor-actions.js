"use strict";
/* Pin editor input bindings only; all mutations are injected application callbacks. */
(function(root){
  class PinEditorActions{
    constructor({getElement,cleanText,onNameChange,onLayerChange,onShowLayer}){
      if([getElement,cleanText,onNameChange,onLayerChange,onShowLayer].some(fn=>typeof fn!=="function"))
        throw new TypeError("Pin editor action callbacks required");
      this.element=getElement;
      this.cleanText=cleanText;
      this.onNameChange=onNameChange;
      this.onLayerChange=onLayerChange;
      this.onShowLayer=onShowLayer;
      this.listeners=[];
    }
    bind(){
      if(this.listeners.length)return;
      const attach=(id,type,handler)=>{
        const target=this.element(id);
        target.addEventListener(type,handler);
        this.listeners.push({target,type,handler});
      };
      attach("pinName","input",e=>this.onNameChange(e.target.value));
      attach("pinName","blur",e=>{e.target.value=this.cleanText(e.target.value);});
      attach("pinLayer","change",e=>this.onLayerChange(e.target.value));
      attach("showPinLayer","click",()=>this.onShowLayer());
    }
    dispose(){
      this.listeners.forEach(({target,type,handler})=>target.removeEventListener(type,handler));
      this.listeners=[];
    }
  }
  root.Pin2MapPinEditorActions=PinEditorActions;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinEditorActions;
})(typeof window!=="undefined"?window:globalThis);
