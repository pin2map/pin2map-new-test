"use strict";
/* Shared URL editor for pin, area, lake and river. No persistence or map code.
 * One owner for validation, save/open, draft cancellation, toggle, Escape,
 * VisualViewport keyboard compensation, and positioning inside the dialog. */
(function(root){
 class ObjectUrlPopup{
  constructor({document:doc,panel,header,footer,popup,trigger,input,save,open,
    getValue,onSave,onState=()=>{},bindTrigger=true}){
   if(!doc||!popup||!trigger||!input||!save||!open||
      typeof getValue!=="function"||typeof onSave!=="function")
     throw new TypeError("Shared URL editor ports required");
   this.doc=doc;this.panel=panel;this.header=header;this.footer=footer;
   this.popup=popup;this.trigger=trigger;this.input=input;this.save=save;
   this.openButton=open;this.getValue=getValue;this.onSave=onSave;
   this.onState=onState;this.bindTrigger=bindTrigger;
   this.isOpen=false;this.keyboardAnchor=null;this.bound=false;
   this.onViewport=()=>{
    if(this.isOpen)this.position();
   };
   doc.defaultView?.addEventListener?.("resize",this.onViewport);
   doc.defaultView?.visualViewport?.addEventListener?.("resize",this.onViewport);
   doc.defaultView?.visualViewport?.addEventListener?.("scroll",this.onViewport);
  }
  static normalizedUrl(raw){
   return root.Pin2MapObjectDialogCore.normalizedUrl(raw);
  }
  normalizedUrl(raw){return ObjectUrlPopup.normalizedUrl(raw);}
  refresh(){
   const valid=this.normalizedUrl(this.input.value);
   this.openButton.disabled=!valid;
   this.openButton.classList.toggle("has-url",Boolean(valid));
  }
  position(){
   if(!this.panel?.getBoundingClientRect||
      !this.header?.getBoundingClientRect||!this.footer?.getBoundingClientRect)return;
   root.Pin2MapObjectDialogCore.positionPopup({
    panel:this.panel,header:this.header,footer:this.footer,
    popup:this.popup,doc:this.doc,keyboardAnchor:this.keyboardAnchor
   });
  }
  show(open){
   this.isOpen=Boolean(open);
   if(this.isOpen)this.input.value=String(this.getValue()||"");
   else{
    // Discard draft unless explicitly saved; persisted value is authoritative.
    this.input.value=String(this.getValue()||"");
    this.keyboardAnchor=null;
   }
   this.popup.classList.toggle("hidden",!this.isOpen);
   root.Pin2MapObjectDialogCore.setOpened(this.trigger,this.isOpen);
   this.refresh();
   this.onState(this.isOpen);
   if(this.isOpen)this.position();
  }
  toggle(){this.show(!this.isOpen);}
  close(){if(this.isOpen)this.show(false);}
  bind(){
   if(this.bound)return;this.bound=true;
   if(this.bindTrigger)this.trigger.addEventListener("click",()=>this.toggle());
   this.input.addEventListener("input",()=>this.refresh());
   this.input.addEventListener("focus",()=>{
    if(!this.isOpen)return;
    const vv=this.doc.defaultView?.visualViewport;
    this.keyboardAnchor={top:parseFloat(this.popup.style.top)||
      this.popup.getBoundingClientRect?.().top||0,
      visualOffsetTop:vv?.offsetTop||0};
   });
   this.input.addEventListener("blur",()=>{this.keyboardAnchor=null;});
   this.save.addEventListener("click",()=>{
    const value=this.input.value.trim();
    if(value&&!this.normalizedUrl(value)){
     this.input.setCustomValidity("Bitte eine gültige URL mit sicherem Protokoll eingeben");
     this.input.reportValidity();this.input.setCustomValidity("");return;
    }
    this.onSave(value);
    this.trigger.classList.toggle("has-url",Boolean(value));
    this.show(false);
   });
   this.openButton.addEventListener("click",()=>{
    const url=this.normalizedUrl(this.input.value);
    if(url)root.open(url,"_blank","noopener,noreferrer");
   });
   this.doc.addEventListener?.("pointerdown",event=>{
    if(!this.isOpen)return;
    if(event.target===this.trigger||this.trigger.contains?.(event.target)||
       event.target===this.popup||this.popup.contains?.(event.target))return;
    this.close();
   });
   this.doc.addEventListener?.("keydown",event=>{
    if(this.isOpen&&event.key==="Escape"){
     event.preventDefault();event.stopPropagation?.();
     this.close();this.trigger.focus?.();
    }
   });
  }
 }
 root.Pin2MapObjectUrlPopup=ObjectUrlPopup;
 if(typeof module!=="undefined"&&module.exports)module.exports=ObjectUrlPopup;
})(typeof window!=="undefined"?window:globalThis);
