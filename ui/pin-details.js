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
      const vv=doc.defaultView?.visualViewport;
      const offset=vv?.offsetTop||0;
      const popup=this.el("pinUrlBlock");
      const desired=this.keyboardAnchor.top+offset-this.keyboardAnchor.visualOffsetTop;
      popup.style.top=Math.max(offset+8,Math.min(desired,
        offset+(vv?.height||doc.defaultView?.innerHeight||600)-popup.offsetHeight-8))+"px";
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
   const panel=this.el("pinPanel").getBoundingClientRect();
   const trigger=this.el("pinUrlButton").getBoundingClientRect();
   const vv=win.visualViewport;
   const viewLeft=vv?.offsetLeft||0,viewTop=vv?.offsetTop||0;
   const viewWidth=vv?.width||win.innerWidth,viewHeight=vv?.height||win.innerHeight;
   const margin=12,panelInset=10,gap=8;
   const width=Math.max(180,Math.min(260,panel.width-panelInset*2,viewWidth-margin*2));
   popup.style.width=width+"px";
   const popupHeight=popup.offsetHeight||158;
   // Panel-owned horizontal placement: never float beside the pin panel.
   const panelLeft=panel.left+panelInset,panelRight=panel.right-panelInset;
   const idealLeft=panelRight-width;
   const left=Math.max(viewLeft+margin,Math.min(idealLeft,
     viewLeft+viewWidth-width-margin));
   popup.style.left=Math.max(panelLeft,Math.min(left,panelRight-width))+"px";
   // Overlay the note/navigation content, leaving footer buttons exposed.
   const preferredTop=trigger.top-gap-popupHeight;
   const upper=viewTop+margin;
   const lower=viewTop+viewHeight-popupHeight-margin;
   popup.style.top=Math.max(upper,Math.min(preferredTop,Math.max(upper,lower)))+"px";
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
   const next=Boolean(enabled);
   const panel=this.el("pinPanel");
   const region=panel.querySelector?.(".pin-detail-region");
   if(next&&!this.weatherMode&&region){
    // Measure navigation and notes before either is hidden; do not guess a pixel height.
    const nav=panel.querySelector(".pin-navigation-row").getBoundingClientRect();
    const notes=region.getBoundingClientRect();
    region.style.setProperty("--pin-weather-middle-height",Math.max(0,notes.bottom-nav.top)+"px");
    region.style.setProperty("--pin-weather-middle-top",nav.top+"px");
   }
   this.weatherMode=next;
   panel.classList.toggle("pin-weather-mode",this.weatherMode);
   this.el("pinNotesBlock").classList.toggle("hidden",this.weatherMode);
   this.el("pinWeatherBlock").classList.toggle("hidden",!this.weatherMode);
   this.el("pinWeather").classList.toggle("is-active",this.weatherMode);
   this.el("pinWeather").setAttribute("aria-pressed",String(this.weatherMode));
   this.el("pinWeather").setAttribute("aria-label",this.weatherMode?"Pin Notizen anzeigen":"Wetteransicht anzeigen");
   this.el("pinDetailTitle").textContent=this.weatherMode?"Wetter":"Pin Notizen";
   if(this.weatherMode&&region){
    // Match the top border of the original routing fieldsets precisely.
    const expected=Number.parseFloat(region.style.getPropertyValue("--pin-weather-middle-top"));
    const actual=region.getBoundingClientRect().top;
    if(Number.isFinite(expected)&&Number.isFinite(actual))
     region.style.marginTop=(Number.parseFloat(getComputedStyle(region).marginTop)||0)+(expected-actual)+"px";
   }else if(region){
    region.style.removeProperty("margin-top");
   }
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
