"use strict";
/* Fixed-size routing toolbar and stages. Strictly DOM only: all routing,
 * storage, map and external Apple actions arrive as injected callbacks.
 */
(function(root){
 const fmtDistance=m=>m<1000?Math.round(m)+" m":Math.round(m/1000)+" km";
 const fmtTime=s=>{const m=Math.round(s/60),h=Math.floor(m/60);return (h?h+" h ":"")+ (m%60)+" min";};
 class CarRoutePanel {
  constructor({document:doc,getElement,icons,getPin,onEnd,onReverse,onAll,onOptions,onApple,onToggle,onHide,onShowNotice}){
   if(!doc||!getElement||!icons)throw new TypeError("Route panel UI dependencies required");
   Object.assign(this,{doc,el:getElement,icons,getPin,onEnd,onReverse,onAll,onOptions,onApple,onToggle,onHide,onShowNotice});
   this.snapshot=null;this.visible=true;
  }
  bind(){
   this.el("routeEnd").addEventListener("click",()=>this.onEnd());
   this.el("routeReverse").addEventListener("click",()=>this.onReverse());
   this.el("routeAll").addEventListener("click",()=>this.onAll());
   this.el("routeFixed").addEventListener("click",()=>this.onShowNotice("FIX: Reihenfolge der Zwischenziele bleibt unverändert."));
   this.el("routeOptimize").addEventListener("click",()=>this.onShowNotice("OPT: Optimierung wird als eigenes Inkrement ergänzt."));
   this.el("routeApple").addEventListener("click",()=>this.onApple());
   this.el("routePanelHide").addEventListener("click",()=>this.setVisible(false));
   this.el("routePanelToggle").addEventListener("click",()=>this.setVisible(!this.visible));
   for(const [id,name]of [["routeSettings","profiles"],["routeTimes","times"]]){
    this.el(id).addEventListener("click",()=>this.toggleSubmenu(name));
   }
   this.el("routeTolls").addEventListener("click",()=>this.onToggle("tolls"));
   for(const b of this.el("routeProfileMenu").querySelectorAll("[data-car-profile]"))
    b.addEventListener("click",()=>{this.onOptions({profile:b.dataset.carProfile});this.closeMenus();});
   for(const b of this.el("routeTimesMenu").querySelectorAll("[data-time-profile]"))
    b.addEventListener("click",()=>{this.onShowNotice("Zeitprofil „"+b.textContent+"“ ist noch kein freigegebener Berechnungsfaktor.");this.closeMenus();});
   this.doc.addEventListener("keydown",e=>{if(e.key==="Escape")this.closeMenus();});
   this.icons.decorate?.(this.doc);
  }
  toggleSubmenu(which){
   for(const [id,name]of [["routeProfileMenu","profiles"],["routeTimesMenu","times"]])
    this.el(id).classList.toggle("hidden",which!==name||!this.el(id).classList.contains("hidden"));
  }
  closeMenus(){for(const id of ["routeProfileMenu","routeTimesMenu"])this.el(id).classList.add("hidden");}
  setVisible(shown){
   this.visible=Boolean(shown);this.closeMenus();
   const active=!!this.snapshot?.ready;
   this.el("carRoutePanel").classList.toggle("hidden",!active||!this.visible);
   const button=this.el("routePanelToggle");this.el("routeToggleHolder").classList.toggle("hidden",!active);
   button.setAttribute("aria-pressed",String(active&&this.visible));
   button.setAttribute("aria-label",this.visible?"Routingdialog ausblenden":"Routingdialog einblenden");
   this.onHide?.(!this.visible);
  }
  syncPinButtons(pin){
   if(!pin)return;
   for(const [id,active]of [["pinRouteStart",pin.id===this.snapshot?.startId],
      ["pinRouteTarget",pin.id===this.snapshot?.targetId],
      ["pinRouteWaypoint",this.snapshot?.waypointIds.includes(pin.id)]]){
     const b=this.el(id);if(!b)continue;b.classList.toggle("is-active",Boolean(active));
     b.setAttribute("aria-pressed",String(Boolean(active)));
   }
  }
  render(snapshot){
   this.snapshot=snapshot;const active=!!snapshot?.ready;
   this.el("carRoutePanel").classList.toggle("hidden",!active||!this.visible);
   const toggle=this.el("routePanelToggle");toggle.classList.toggle("hidden",!active);
   toggle.setAttribute("aria-pressed",String(active&&this.visible));
   if(!active){this.closeMenus();return;}
   const title=this.el("routeSummary");
   title.textContent=snapshot.loading?"🚗 Route wird berechnet …":snapshot.legs.length?
     "🚗 "+fmtDistance(snapshot.distanceMeters)+" · ca. "+fmtTime(snapshot.durationSeconds):
     "🚗 Route nicht verfügbar";
   this.el("routeTolls").classList.toggle("is-active",snapshot.avoidTolls);
   this.el("routeTolls").setAttribute("aria-pressed",String(snapshot.avoidTolls));
   for(const b of this.el("routeProfileMenu").querySelectorAll("[data-car-profile]"))
    b.setAttribute("aria-pressed",String(b.dataset.carProfile===snapshot.profile));
   const legs=this.el("routeLegs");legs.replaceChildren();
   snapshot.legs.forEach((leg,index)=>{
    const row=this.doc.createElement("div");row.className="car-route-leg";row.dataset.leg=String(index);
    const dot=this.doc.createElement("span");dot.className="car-route-dot";dot.style.background=["#ff3930","#1987f5","#27a855","#fa9b22","#8754bf"][index%5];
    const from=this.getPin(leg.fromId),to=this.getPin(leg.toId);
    const label=this.doc.createElement("span");label.textContent=(index+1)+". "+(from?.name||"Pin")+" → "+(to?.name||"Pin")+" · "+fmtDistance(leg.distanceMeters)+" · "+fmtTime(leg.durationSeconds);
    row.append(dot,label);legs.append(row);
   });
   if(!snapshot.legs.length&&!snapshot.loading)legs.textContent="Keine Strecke verfügbar. Start und Ziel prüfen.";
  }
  focusLeg(index){
   this.setVisible(true);const row=this.el("routeLegs").querySelector('[data-leg="'+index+'"]');
   row?.scrollIntoView?.({block:"nearest"});row?.classList.add("car-route-selected-leg");
  }
 }
 const api=Object.freeze({CarRoutePanel,fmtDistance,fmtTime});
 root.Pin2MapCarRoutePanel=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
