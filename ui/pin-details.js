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
   this.pinId=null;this.mode="notes";this.urlSnapshot="";this.weatherMode=false;
   this.keyboardAnchor=null;
   // Popover must escape the map-clipped dialog just like the layer menu.
   const popup=this.el("pinUrlBlock");
   if(doc.body?.append)doc.body.append(popup);
   this.onViewportChange=()=>{
    if(this.mode!=="url")return;
    if(this.keyboardAnchor){
      // During iOS keyboard presentation the visual viewport shrinks and can
      // scroll. Never recompute the popup against the keyboard's smaller size.
      // Keep the same visual position by compensating only viewport scrolling.
      const offset=doc.defaultView?.visualViewport?.offsetTop||0;
      this.el("pinUrlBlock").style.top=
        (this.keyboardAnchor.top+offset-this.keyboardAnchor.visualOffsetTop)+"px";
      return;
    }
    this.positionPopup();
   };
   doc.defaultView?.addEventListener?.("resize",this.onViewportChange);
   doc.defaultView?.visualViewport?.addEventListener?.("resize",this.onViewportChange);
   doc.defaultView?.visualViewport?.addEventListener?.("scroll",this.onViewportChange);
  }
  positionPopup(){
   const win=this.document.defaultView, popup=this.el("pinUrlBlock");
   if(!win||!this.el("pinUrlButton").getBoundingClientRect)return;
   const rect=this.el("pinPanel").getBoundingClientRect();
   const vv=win.visualViewport;
   const left=vv?.offsetLeft||0,top=vv?.offsetTop||0;
   const width=vv?.width||win.innerWidth,height=vv?.height||win.innerHeight;
   const margin=12,gap=8;
   const desired=Math.min(260,width-margin*2);
   popup.style.width=desired+"px";
   const popupHeight=popup.offsetHeight||158;
   // Anchor to the PIN PANEL, never to a button which moves when keyboard
   // or optional content changes. Place beside panel when space permits.
   const roomRight=left+width-margin-rect.right;
   const roomLeft=rect.left-left-margin;
   const idealLeft=roomRight>=desired+gap?rect.right+gap:
     roomLeft>=desired+gap?rect.left-gap-desired:
     rect.right-desired;
   popup.style.left=Math.max(left+margin,Math.min(idealLeft,left+width-desired-margin))+"px";
   const panelTop=rect.top+Math.min(72,rect.height*.18);
   const visibleTop=Math.max(top+margin,Math.min(panelTop,top+height-popupHeight-margin));
   popup.style.top=visibleTop+"px";
  }
  show(mode){
   this.mode=mode;
   this.el("pinUrlBlock").classList.toggle("hidden",mode!=="url");
   this.el("pinUrlButton").setAttribute("aria-expanded",String(mode==="url"));
   this.el("pinUrlButton").classList.toggle("is-active",mode==="url");
   if(mode==="url")this.positionPopup();
   else this.keyboardAnchor=null;
  }
  render(pin){
   if(!pin){this.pinId=null;this.show("notes");return;}
   if(this.pinId!==pin.id){
    this.pinId=pin.id;this.urlSnapshot=String(pin.url||"");
    this.el("pinNotes").value=String(pin.note||"");
    this.el("pinUrl").value=this.urlSnapshot;
    this.show("notes");
    this.setWeather(false);
   }else{
    const notes=this.el("pinNotes"),url=this.el("pinUrl");
    if(this.document.activeElement!==notes)notes.value=String(pin.note||"");
    if(this.mode!=="url"&&this.document.activeElement!==url){
     this.urlSnapshot=String(pin.url||"");url.value=this.urlSnapshot;
    }
   }
   this.refreshUrlOpen();
   this.el("pinUrlButton").classList.toggle("has-url",Boolean(String(pin.url||"").trim()));
   // GPX UI is future-only until a concrete persisted track association exists.
   const hasGpx=Boolean(pin.gpxKey||pin.gpxTrackId||pin.gpxFileId||pin.gpxRef);
   this.el("pinGpxActions")?.classList.toggle("hidden",!hasGpx);
  }
  setWeather(enabled){
   this.weatherMode=Boolean(enabled);
   this.el("pinNotesBlock").classList.toggle("hidden",this.weatherMode);
   this.el("pinWeatherBlock").classList.toggle("hidden",!this.weatherMode);
   this.el("pinWeather").classList.toggle("is-active",this.weatherMode);
   this.el("pinWeather").setAttribute("aria-pressed",String(this.weatherMode));
   this.el("pinWeather").setAttribute("aria-label",this.weatherMode?"Pin Notizen anzeigen":"Wetteransicht anzeigen");
   this.el("pinDetailTitle").textContent=this.weatherMode?"Wetter":"Pin Notizen";
   this.onLayout(false);
  }
  normalizedUrl(raw){
   try{
    if(!raw.trim())return null;
    const url=new URL(raw.trim());
    // Browser/deep-link schemes are data, not executable page code.
    // Block script, data and local file URLs; permit mailto, obsidian,
    // tel and other externally handled protocols.
    const scheme=url.protocol.toLowerCase();
    if(["javascript:","data:","vbscript:","file:","blob:","about:"].includes(scheme))return null;
    return /^[a-z][a-z0-9+.-]*:$/.test(scheme)?url.href:null;
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
   this.el("pinUrl").addEventListener("focus",()=>{
    if(this.mode!=="url")return;
    const popup=this.el("pinUrlBlock");
    this.keyboardAnchor={
      top:Number.parseFloat(popup.style.top)||popup.getBoundingClientRect().top,
      visualOffsetTop:this.document.defaultView?.visualViewport?.offsetTop||0
    };
   });
   this.el("pinUrl").addEventListener("blur",()=>{
    // Reposition on the next explicit open/resize, not while the keyboard
    // animation is still active.
    this.keyboardAnchor=null;
   });
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
   this.el("pinUrlSave").addEventListener("click",()=>{
    const value=this.el("pinUrl").value.trim();
    if(value&&!this.normalizedUrl(value)){
     this.el("pinUrl").setCustomValidity("Bitte eine gültige URL mit sicherem Protokoll eingeben");
     this.el("pinUrl").reportValidity();this.el("pinUrl").setCustomValidity("");return;
    }
    this.urlSnapshot=value;this.onUrl(value);this.show("notes");
    this.el("pinUrlButton").classList.toggle("has-url",Boolean(value));
   });
   this.el("pinUrlOpen").addEventListener("click",()=>{
    const value=this.normalizedUrl(this.el("pinUrl").value);
    if(value)root.open(value,"_blank","noopener,noreferrer");
   });
   this.el("pinWikipedia").addEventListener("click",()=>{this.closeTransient();this.onWikipedia();});
   this.el("pinWeather").addEventListener("click",()=>{this.closeTransient();this.setWeather(!this.weatherMode);});
   this.document.addEventListener?.("pointerdown",event=>{
    if(this.mode==="url"&&!event.target.closest?.("#pinUrlBlock,#pinUrlButton"))
     this.closeTransient();
   });
   this.document.addEventListener?.("keydown",event=>{
    if(this.mode==="url"&&event.key==="Escape"){
     event.preventDefault();this.closeTransient();this.el("pinUrlButton").focus?.();
    }
   });
   // Routing/GPX transport controls intentionally have NO handlers.
  }
 }
 root.Pin2MapPinDetails=PinDetails;
 if(typeof module!=="undefined"&&module.exports)module.exports=PinDetails;
})(typeof window!=="undefined"?window:globalThis);
