"use strict";
/* Inline pin notes plus a viewport-level URL popover. Pure DOM presentation;
 * project mutation, persistence and navigation are injected by app.js. */
(function(root){
 class PinDetails{
  constructor({getElement,document:doc,onNote,onUrl,onWikipedia,onLayout,onRouteAction=null}){
   if([getElement,onNote,onUrl,onWikipedia,onLayout].some(v=>typeof v!=="function")||!doc)
    throw new TypeError("Pin detail ports required");
   this.el=getElement;this.document=doc;this.onNote=onNote;this.onUrl=onUrl;
   this.onWikipedia=onWikipedia;this.onLayout=onLayout;this.onRouteAction=onRouteAction;
   this.pinId=null;this.mode="notes";this.urlSnapshot="";this.weatherMode=false;
   this.routingMode=null;
   // The URL overlay is viewport-positioned. Keep it out of the pin
   // panel's stacking/overflow context, exactly as in the reference UI.
   // The shared controller still constrains it to the panel rectangle.
   doc.body?.append?.(this.el("pinUrlBlock"));
   const Url=root.Pin2MapObjectUrlPopup;
   if(!Url)throw new Error("Shared URL popup controller missing");
   this.urlController=new Url({
    document:doc,panel:this.el("pinPanel"),
    header:this.el("pinPanel")?.querySelector?.(".pin-editor-head"),
    footer:this.el("pinPanel")?.querySelector?.(".pin-actions"),
    popup:this.el("pinUrlBlock"),trigger:this.el("pinUrlButton"),
    input:this.el("pinUrl"),save:this.el("pinUrlSave"),open:this.el("pinUrlOpen"),
    getValue:()=>this.urlSnapshot,
    onSave:value=>{this.urlSnapshot=value;this.onUrl(value);},
    onState:open=>{this.mode=open?"url":"notes";}
   });

  }
  positionPopup(){this.urlController.position();}
  show(mode){this.urlController.show(mode==="url");}
  render(pin){
   if(!pin){this.pinId=null;this.show("notes");this.el("pinGpxActions")?.classList.add("hidden");return;}
   if(this.pinId!==pin.id){
    this.pinId=pin.id;this.urlSnapshot=String(pin.url||"");
    this.el("pinNotes").value=String(pin.note||"");
    this.el("pinUrl").value=this.urlSnapshot;
    this.show("notes");
    this.setRouting(null);
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
   const hasGpx=Boolean(pin.gpxAttachment?.chains?.length||pin.gpxKey||pin.gpxTrackId||pin.gpxFileId||pin.gpxRef);
   this.el("pinGpxActions")?.classList.toggle("hidden",!hasGpx);
  }
  setRouting(mode){
   if(mode!==null&&mode!=="start"&&mode!=="target")throw new RangeError("Unsupported routing panel");
   if(mode&&this.weatherMode)this.setWeather(false);
   this.routingMode=mode;
   const region=this.el("pinPanel").querySelector?.(".pin-detail-region");
   region?.classList.toggle("pin-routing-start",mode==="start");
   region?.classList.toggle("pin-routing-target",mode==="target");
   this.el("pinNotesBlock").classList.toggle("hidden",this.weatherMode||Boolean(mode));
   this.el("pinRoutingStartBlock").classList.toggle("hidden",mode!=="start");
   this.el("pinRoutingTargetBlock").classList.toggle("hidden",mode!=="target");
   for(const [id,active] of [["pinRouteStart",mode==="start"],["pinRouteTarget",mode==="target"]]){
    const button=this.el(id);
    button.classList.toggle("is-active",active);
    button.setAttribute("aria-pressed",String(active));
   }
   this.el("pinDetailTitle").textContent=this.weatherMode?"Wetter":mode==="start"?"Routing Start":mode==="target"?"Routing Ziel":"Pin Notizen";
   this.onLayout(false);
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
   if(next&&this.routingMode)this.setRouting(null);
   this.weatherMode=next;
   panel.classList.toggle("pin-weather-mode",this.weatherMode);
   this.el("pinNotesBlock").classList.toggle("hidden",this.weatherMode||Boolean(this.routingMode));
   this.el("pinWeatherBlock").classList.toggle("hidden",!this.weatherMode);
   this.el("pinWeather").classList.toggle("is-active",this.weatherMode);
   this.el("pinWeather").setAttribute("aria-pressed",String(this.weatherMode));
   this.el("pinWeather").setAttribute("aria-label",this.weatherMode?"Pin Notizen anzeigen":"Wetteransicht anzeigen");
   this.el("pinDetailTitle").textContent=this.weatherMode?"Wetter":this.routingMode==="start"?"Routing Start":this.routingMode==="target"?"Routing Ziel":"Pin Notizen";
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
  normalizedUrl(raw){return this.urlController.normalizedUrl(raw);}
  refreshUrlOpen(){this.urlController.refresh();}
  closeTransient(){this.urlController.close();}
  bind(){
   this.el("pinNotes").addEventListener("input",event=>this.onNote(event.target.value));
   this.el("pinNotes").addEventListener("focus",()=>this.onLayout(true));
   this.urlController.bind();
   this.el("pinWikipedia").addEventListener("click",()=>{
    this.closeTransient();this.onWikipedia();
   });
   this.el("pinWeather").addEventListener("click",()=>{
    this.closeTransient();this.setWeather(!this.weatherMode);
   });
   this.el("pinRouteStart").addEventListener("click",()=>{
    this.closeTransient();if(this.onRouteAction){this.setRouting(null);this.onRouteAction("start");}
     else this.setRouting(this.routingMode==="start"?null:"start");
   });
   this.el("pinRouteTarget").addEventListener("click",()=>{
    this.closeTransient();if(this.onRouteAction){this.setRouting(null);this.onRouteAction("target");}
     else this.setRouting(this.routingMode==="target"?null:"target");
   });
   // Waypoint and GPX transport controls remain future-only.
  }
 }
 root.Pin2MapPinDetails=PinDetails;
 if(typeof module!=="undefined"&&module.exports)module.exports=PinDetails;
})(typeof window!=="undefined"?window:globalThis);
