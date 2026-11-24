"use strict";
/* Fixed-size routing toolbar and stages. Strictly DOM only: all routing,
 * storage, map and external Apple actions arrive as injected callbacks.
 */
(function(root){
 const menus=[["routeSettings","routeProfileMenu"],["routeTimes","routeTimesMenu"],["routeWaypoints","routeWaypointMenu"]];
 const fmtDistance=m=>m<1000?Math.round(m)+" m":Math.round(m/1000)+" km";
 const fmtTime=s=>{const m=Math.round(s/60),h=Math.floor(m/60);return (h?h+" h ":"")+ (m%60)+" min";};
 class CarRoutePanel {
  constructor({document:doc,getElement,icons,getPin,onMode,onLegSelect,onEnd,confirmEnd,onReverse,onAll,onOrder,onTimeProfile,readTimeFactors,writeTimeFactors,onOptions,onApple,onToggle,onLayoutChange,onShowNotice}){
   if(!doc||!getElement||!icons)throw new TypeError("Route panel UI dependencies required");
   Object.assign(this,{doc,el:getElement,icons,getPin,onMode,onLegSelect,onEnd,confirmEnd,onReverse,onAll,onOrder,onTimeProfile,readTimeFactors,writeTimeFactors,onOptions,onApple,onToggle,onLayoutChange,onShowNotice});
   this.snapshot=null;this.visible=true;
  }
  bind(){
   this.el("routeEnd").addEventListener("click",()=>{if(this.confirmEnd())this.onEnd();});
   for(const button of this.doc.querySelectorAll("[data-route-mode]"))
    button.addEventListener("click",()=>{this.closeMenus();this.onMode(button.dataset.routeMode);});
   this.el("routeReverse").addEventListener("click",()=>this.onReverse());
   this.el("routeAll").addEventListener("click",()=>this.chooseWaypoints("all"));
   this.el("routeFixed").addEventListener("click",()=>this.chooseWaypoints("fixed"));
   this.el("routeOptimize").addEventListener("click",()=>this.chooseWaypoints("optimal"));
   this.el("routeApple").addEventListener("click",()=>this.onApple());
   this.el("routePanelHide").addEventListener("click",()=>this.setVisible(false));
   this.el("routePanelToggle").addEventListener("click",()=>this.setVisible(!this.visible));
   for(const [id,name] of menus){
    this.el(id).addEventListener("click",()=>this.toggleSubmenu(name));
   }
   this.el("routeTolls").addEventListener("click",()=>this.onToggle("tolls"));
   for(const b of this.el("routeProfileMenu").querySelectorAll("[data-car-profile]"))
    b.addEventListener("click",()=>{this.onOptions({profile:b.dataset.carProfile});this.closeMenus();});
   for(const b of this.el("routeTimesMenu").querySelectorAll("[data-time-profile]"))
    b.addEventListener("click",()=>{this.onTimeProfile(b.dataset.timeProfile);this.closeMenus();});
   this.doc.addEventListener("keydown",e=>{if(e.key==="Escape")this.closeMenus();});
   const fields=[...this.doc.querySelectorAll("[data-route-time-factor]")];
   const stored=this.readTimeFactors();
   for(const field of fields){
    const factor=stored[field.dataset.routeTimeFactor];
    if(Number.isFinite(factor)&&factor>=0.1&&factor<=5)field.value=String(factor);
    field.addEventListener("change",()=>{
     if(!field.value||!field.validity.valid){field.value=field.defaultValue;return;}
     field.defaultValue=field.value;
     this.writeTimeFactors(Object.fromEntries(fields.map(input=>[input.dataset.routeTimeFactor,input.valueAsNumber])));
    });
    field.defaultValue=field.value;
   }
   this.icons.decorate?.(this.doc);
  }
  chooseWaypoints(choice){
   this.preferAll=choice==="all";
   if(this.preferAll)this.onAll();
   else this.onOrder(choice);
   this.showWaypointChoice();
   this.closeMenus();
  }
  showChoice(triggerId,item,label){
   const trigger=this.el(triggerId);
   const name=label+": "+item.textContent.trim();
   if(trigger.getAttribute("aria-label")===name)return;
   trigger.replaceChildren(item.firstElementChild.cloneNode(true));
   trigger.setAttribute("aria-label",name);
  }
  showWaypointChoice(){
   const id=this.preferAll&&this.snapshot.allVisibleActive?"routeAll":
    this.snapshot.order==="optimal"?"routeOptimize":"routeFixed";
   this.showChoice("routeWaypoints",this.el(id),"Zwischenziele");
  }
  toggleSubmenu(which){
   const opening=this.el(which).classList.contains("hidden");
   for(const [trigger,id] of menus){
    const open=opening&&id===which;
    this.el(id).classList.toggle("hidden",!open);
    this.el(trigger).setAttribute("aria-expanded",String(open));
   }
  }
  closeMenus(){
   for(const [trigger,id] of menus){
    this.el(id).classList.add("hidden");
    this.el(trigger).setAttribute("aria-expanded","false");
   }
  }
  setVisible(shown){
   this.visible=Boolean(shown);this.closeMenus();
   const active=!!this.snapshot?.ready;
   this.el("carRoutePanel").classList.toggle("hidden",!active||!this.visible);
   const button=this.el("routePanelToggle");this.el("routeToggleHolder").classList.toggle("hidden",!active);
   button.setAttribute("aria-pressed",String(active&&this.visible));
   button.setAttribute("aria-label",this.visible?"Routingdialog ausblenden":"Routingdialog einblenden");
   this.onLayoutChange?.();
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
   const toggle=this.el("routePanelToggle");this.el("routeToggleHolder").classList.toggle("hidden",!active);
   toggle.setAttribute("aria-pressed",String(active&&this.visible));
   if(!active){this.closeMenus();return;}
   const icon={car:"car",bicycle:"bike",pedestrian:"footprints"}[snapshot.mode]||"car";
   if(this.el("routeModeIcon").dataset.pinIcon!==icon)this.icons.mount(this.el("routeModeIcon"),icon);
   if(this.el("routePanelToggle").dataset.pinIcon!==icon)this.icons.mount(this.el("routePanelToggle"),icon);
   for(const button of this.doc.querySelectorAll("[data-route-mode]")){
    const active=button.dataset.routeMode===snapshot.mode;
    button.classList.toggle("is-active",active);
    button.setAttribute("aria-pressed",String(active));
   }
   for(const id of ["routeSettings","routeTolls","routeTimes","routeApple"])this.el(id).disabled=snapshot.mode!=="car";
   const title=this.el("routeSummary");
   title.textContent=snapshot.loading?"Route wird berechnet …":snapshot.legs.length?
     ""+fmtDistance(snapshot.distanceMeters)+" · ca. "+fmtTime(snapshot.durationSeconds):
     snapshot.mode==="bicycle"?"Keine geprüfte Fahrradroute verfügbar":"Route nicht verfügbar";
   this.el("routeAll").classList.toggle("is-active",snapshot.allVisibleActive);
   this.el("routeAll").setAttribute("aria-pressed",String(Boolean(snapshot.allVisibleActive)));
   for(const [id,order] of [["routeFixed","fixed"],["routeOptimize","optimal"]]){
    const b=this.el(id);
    b.disabled=snapshot.waypointIds.length<2;
    b.classList.toggle("is-active",snapshot.order===order);
    b.setAttribute("aria-pressed",String(snapshot.order===order));
   }
   this.showWaypointChoice();
   for(const b of this.el("routeTimesMenu").querySelectorAll("[data-time-profile]")){
    const active=b.dataset.timeProfile===snapshot.timeProfile;
    b.setAttribute("aria-pressed",String(active));
    if(active)this.showChoice("routeTimes",b,"Zeitprofil auswählen");
   }
   this.el("routeTolls").classList.toggle("is-active",snapshot.avoidTolls);
   this.el("routeTolls").setAttribute("aria-pressed",String(snapshot.avoidTolls));
   for(const b of this.el("routeProfileMenu").querySelectorAll("[data-car-profile]")){
    const active=b.dataset.carProfile===snapshot.profile;
    b.setAttribute("aria-pressed",String(active));
    if(active)this.showChoice("routeSettings",b,"Routencharakter wählen");
   }
   const legs=this.el("routeLegs");legs.replaceChildren();
   snapshot.legs.forEach((leg,index)=>{
    const row=this.doc.createElement("button");row.type="button";
    row.className="car-route-leg";row.dataset.leg=String(index);
    row.addEventListener("click",()=>{
     this.selectLeg(index);
     this.onLegSelect?.(index);
    });
    const dot=this.doc.createElement("span");dot.className="car-route-dot";dot.style.background=["#ff3930","#1987f5","#27a855","#fa9b22","#8754bf"][index%5];
    const from=this.getPin(leg.fromId),to=this.getPin(leg.toId);
    const origin=leg.fromId?(from?.name||"Pin"):(leg.ferry?"Abfahrtshafen":"Ankunftshafen");
    const destination=leg.toId?(to?.name||"Pin"):(leg.ferry?"Ankunftshafen":"Abfahrtshafen");
    const crossing=leg.ferry?"Fähre"+(leg.ferryName?" "+leg.ferryName:"")+" · ":"";
    const label=this.doc.createElement("span");
    label.textContent=(index+1)+". "+crossing+origin+" → "+destination+" · "+
     fmtDistance(leg.distanceMeters)+" · "+(leg.ferry?"ca. ":"")+fmtTime(leg.durationSeconds);
    row.append(dot,label);legs.append(row);
   });
   if(!snapshot.legs.length&&!snapshot.loading)legs.textContent="Keine Strecke verfügbar. Start und Ziel prüfen.";
  }
  focusLeg(index){
   if(!this.visible)this.setVisible(true);
   this.selectLeg(index);
  }
  selectLeg(index){
   const list=this.el("routeLegs");
   for(const item of list.querySelectorAll(".car-route-selected-leg"))item.classList.remove("car-route-selected-leg");
   const row=list.querySelector('[data-leg="'+index+'"]');
   row?.scrollIntoView?.({block:"nearest"});row?.classList.add("car-route-selected-leg");
  }
 }
 const api=Object.freeze({CarRoutePanel,fmtDistance,fmtTime});
 root.Pin2MapCarRoutePanel=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
