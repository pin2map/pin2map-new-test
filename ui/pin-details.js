"use strict";
/* Inline pin notes plus a viewport-level URL popover. Pure DOM presentation;
 * project mutation, persistence and navigation are injected by app.js. */
(function(root){
 class PinDetails{
  constructor({getElement,document:doc,onNote,onUrl,onWikipedia,onLayout}){
   if([getElement,onNote,onUrl,onWikipedia,onLayout].some(v=>typeof v!=="function")||!doc)
    throw new TypeError("Pin detail ports required");
   this.el=getElement;this.document=doc;this.onNote=onNote;this.onUrl=onUrl;
   this.onWikipedia=onWikipedia;this.onLayout=onLayout;
   this.pinId=null;this.mode="notes";this.urlSnapshot="";
   // Popover must escape the map-clipped dialog just like the layer menu.
   const popup=this.el("pinUrlBlock");
   if(doc.body?.append)doc.body.append(popup);
   this.onViewportChange=()=>{if(this.mode==="url")this.positionPopup();};
   doc.defaultView?.addEventListener?.("resize",this.onViewportChange);
   doc.defaultView?.visualViewport?.addEventListener?.("resize",this.onViewportChange);
   doc.defaultView?.visualViewport?.addEventListener?.("scroll",this.onViewportChange);
  }
  positionPopup(){
   const win=this.document.defaultView, popup=this.el("pinUrlBlock");
   if(!win||!this.el("pinUrlButton").getBoundingClientRect)return;
   const rect=this.el("pinUrlButton").getBoundingClientRect();
   const vv=win.visualViewport;
   const left=vv?.offsetLeft||0,top=vv?.offsetTop||0;
   const width=vv?.width||win.innerWidth,height=vv?.height||win.innerHeight;
   const margin=12,gap=8;
   const desired=Math.min(260,width-margin*2);
   popup.style.width=desired+"px";
   const popupHeight=popup.offsetHeight||158;
   const above=rect.top-top-margin-gap;
   const below=top+height-rect.bottom-margin-gap;
   const useAbove=above>=popupHeight||above>below;
   popup.style.left=Math.max(left+margin,
    Math.min(rect.left,left+width-desired-margin))+"px";
   popup.style.top=Math.max(top+margin,
    Math.min(top+height-popupHeight-margin,
     useAbove?rect.top-gap-popupHeight:rect.bottom+gap))+"px";
  }
  show(mode){
   this.mode=mode;
   this.el("pinUrlBlock").classList.toggle("hidden",mode!=="url");
   this.el("pinUrlButton").setAttribute("aria-expanded",String(mode==="url"));
   if(mode==="url")this.positionPopup();
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
  normalizedUrl(raw){
   try{
    if(!raw.trim())return null;
    const url=new URL(raw.trim());
    return ["https:","http:"].includes(url.protocol)?url.href:null;
   }catch(e){return null;}
  }
  refreshUrlOpen(){
   const valid=this.normalizedUrl(this.el("pinUrl").value.trim());
   const button=this.el("pinUrlOpen");
   button.disabled=!valid;
   button.classList.toggle("has-url",Boolean(valid));
  }
  closeTransient(){
   if(this.mode!=="notes"){
    this.el("pinUrl").value=this.urlSnapshot;
    this.show("notes");
   }
  }
  bind(){
   this.el("pinNotes").addEventListener("input",event=>this.onNote(event.target.value));
   this.el("pinNotes").addEventListener("focus",()=>this.onLayout(true));
   this.el("pinUrl").addEventListener("focus",()=>this.onViewportChange());
   // Keep selected marker/dialog visible after iOS keyboard changes.
   this.document.defaultView?.visualViewport?.addEventListener?.("resize",()=>{
    if(this.document.activeElement===this.el("pinNotes"))this.onLayout(true);
   });
   this.el("pinUrl").addEventListener("input",()=>this.refreshUrlOpen());
   this.el("pinUrlButton").addEventListener("click",()=>{
    if(this.mode==="url"){this.closeTransient();return;}
    this.el("pinUrl").value=this.urlSnapshot;
    this.show("url");this.refreshUrlOpen();
   });
   this.el("pinUrlCancel").addEventListener("click",()=>this.closeTransient());
   this.el("pinUrlSave").addEventListener("click",()=>{
    const value=this.el("pinUrl").value.trim();
    if(value&&!this.normalizedUrl(value)){
     this.el("pinUrl").setCustomValidity("Bitte eine gültige HTTP(S)-URL eingeben");
     this.el("pinUrl").reportValidity();this.el("pinUrl").setCustomValidity("");return;
    }
    this.urlSnapshot=value;this.onUrl(value);this.show("notes");
   });
   this.el("pinUrlOpen").addEventListener("click",()=>{
    const value=this.normalizedUrl(this.el("pinUrl").value);
    if(value)root.open(value,"_blank","noopener,noreferrer");
   });
   this.el("pinWikipedia").addEventListener("click",()=>{this.closeTransient();this.onWikipedia();});
   this.document.addEventListener?.("pointerdown",event=>{
    if(this.mode==="url"&&!event.target.closest?.("#pinUrlBlock,#pinUrlButton"))
     this.closeTransient();
   });
   this.document.addEventListener?.("keydown",event=>{
    if(this.mode==="url"&&event.key==="Escape"){
     event.preventDefault();this.closeTransient();this.el("pinUrlButton").focus?.();
    }
   });
   // Routing and weather placeholders intentionally have NO handlers.
  }
 }
 root.Pin2MapPinDetails=PinDetails;
 if(typeof module!=="undefined"&&module.exports)module.exports=PinDetails;
})(typeof window!=="undefined"?window:globalThis);
