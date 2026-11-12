"use strict";
/* Temporary pin detail region. UI only; mutations/storage and navigation
 * are injected callbacks. The notes editor remains mounted during URL use. */
(function(root){
 class PinDetails{
  constructor({getElement,document:doc,onNote,onUrl,onWikipedia,onLayout}){
   if([getElement,onNote,onUrl,onWikipedia,onLayout].some(v=>typeof v!=="function")||!doc)throw new TypeError("Pin detail ports required");
   this.el=getElement;this.document=doc;this.onNote=onNote;this.onUrl=onUrl;
   this.onWikipedia=onWikipedia;this.onLayout=onLayout;
   this.pinId=null;this.mode="notes";this.urlSnapshot="";
  }
  show(mode){
   this.mode=mode;
   this.el("pinNotesBlock").classList.toggle("hidden",mode!=="notes");
   this.el("pinUrlBlock").classList.toggle("hidden",mode!=="url");
   this.el("pinUrlButton").setAttribute("aria-expanded",String(mode==="url"));
   this.onLayout();
  }
  render(pin){
   if(!pin){this.pinId=null;this.show("notes");return;}
   if(this.pinId!==pin.id){
    this.pinId=pin.id;this.urlSnapshot=String(pin.url||"");
    this.el("pinNotes").value=String(pin.note||"");
    this.el("pinUrl").value=this.urlSnapshot;
    this.show("notes");
   }else{
    const notes=this.el("pinNotes"),url=this.el("pinUrl");
    if(this.document.activeElement!==notes)notes.value=String(pin.note||"");
    if(this.mode!=="url"&&this.document.activeElement!==url){
     this.urlSnapshot=String(pin.url||"");url.value=this.urlSnapshot;
    }
   }
   this.refreshUrlOpen();
  }
  refreshUrlOpen(){
   const value=this.el("pinUrl").value.trim();
   const valid=this.normalizedUrl(value);
   const button=this.el("pinUrlOpen");
   button.disabled=!valid;
   button.classList.toggle("has-url",Boolean(valid));
  }
  normalizedUrl(raw){
   try{
    if(!raw.trim())return null;
    const url=new URL(raw.trim());
    return ["https:","http:"].includes(url.protocol)?url.href:null;
   }catch(e){return null;}
  }
  bind(){
   this.el("pinNotes").addEventListener("input",event=>this.onNote(event.target.value));
   this.el("pinNotes").addEventListener("focus",()=>this.onLayout(true));
   this.el("pinUrl").addEventListener("focus",()=>this.onLayout(true));
   // On iPhone the visual viewport often shrinks only AFTER focus.
   // Reapply the existing one-shot pin visibility correction on keyboard resize.
   this.document.defaultView?.visualViewport?.addEventListener("resize",()=>{
    if([this.el("pinNotes"),this.el("pinUrl")].includes(this.document.activeElement))
     this.onLayout(true);
   });
   this.el("pinUrl").addEventListener("input",()=>this.refreshUrlOpen());
   this.el("pinUrlButton").addEventListener("click",()=>{
    if(this.mode==="url"){this.show("notes");return;}
    this.el("pinUrl").value=this.urlSnapshot;
    this.show("url");this.refreshUrlOpen();
   });
   this.el("pinUrlCancel").addEventListener("click",()=>{
    this.el("pinUrl").value=this.urlSnapshot;this.show("notes");
   });
   this.el("pinUrlSave").addEventListener("click",()=>{
    const value=this.el("pinUrl").value.trim();
    if(value&&!this.normalizedUrl(value)){this.el("pinUrl").setCustomValidity("Bitte eine gültige HTTP(S)-URL eingeben");this.el("pinUrl").reportValidity();this.el("pinUrl").setCustomValidity("");return;}
    this.urlSnapshot=value;
    this.onUrl(value);this.show("notes");
   });
   this.el("pinUrlOpen").addEventListener("click",()=>{
    const value=this.normalizedUrl(this.el("pinUrl").value);
    if(value)root.open(value,"_blank","noopener,noreferrer");
   });
   this.el("pinWikipedia").addEventListener("click",()=>{this.show("notes");this.onWikipedia();});
   // Disabled future feature stays inert; do not attach action to pinWeather.
  }
  closeTransient(){if(this.mode!=="notes"){this.el("pinUrl").value=this.urlSnapshot;this.show("notes");}}
 }
 root.Pin2MapPinDetails=PinDetails;
 if(typeof module!=="undefined"&&module.exports)module.exports=PinDetails;
})(typeof window!=="undefined"?window:globalThis);
