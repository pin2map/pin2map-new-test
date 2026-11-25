"use strict";
/* Fixed-size routing toolbar and stages. Strictly DOM only: all routing,
 * storage, map and external Apple actions arrive as injected callbacks.
 */
(function(root){
 const profileMenus={car:"routeProfileMenu",bicycle:"routeBikeMenu",pedestrian:"routeWalkMenu"};
 const fixedMenus={routeTimes:"routeTimesMenu",routeWaypoints:"routeWaypointMenu"};
 const menuIds=[...Object.values(profileMenus),...Object.values(fixedMenus),"routeVariants"];
 const fmtDistance=m=>m<1000?Math.round(m)+" m":Math.round(m/1000)+" km";
 const variantDistance=new Intl.NumberFormat("de-DE",{maximumFractionDigits:1});
 const fmtTime=s=>{const m=Math.round(s/60),h=Math.floor(m/60);return (h?h+" h ":"")+ (m%60)+" min";};
 class CarRoutePanel {
  constructor({document:doc,getElement,icons,getPin,onMode,onActiveProfile,onVariantSelect,variantColors,onLegSelect,onEnd,confirmEnd,onReverse,onAll,onOrder,onTimeProfile,readTimeFactors,writeTimeFactors,onOptions,onApple,onToggle,onLayoutChange,onShowNotice}){
   if(!doc||!getElement||!icons)throw new TypeError("Route panel UI dependencies required");
   Object.assign(this,{doc,el:getElement,icons,getPin,onMode,onActiveProfile,onVariantSelect,variantColors,onLegSelect,onEnd,confirmEnd,onReverse,onAll,onOrder,onTimeProfile,readTimeFactors,writeTimeFactors,onOptions,onApple,onToggle,onLayoutChange,onShowNotice});
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
   for(const [id,name] of Object.entries(fixedMenus))
    this.el(id).addEventListener("click",()=>this.toggleSubmenu(id,name));
   this.el("routeSettings").addEventListener("click",()=>
    this.toggleSubmenu("routeSettings",profileMenus[this.snapshot.mode]));
   this.el("routeTolls").addEventListener("click",()=>{
    if(this.snapshot.mode!=="car")this.toggleSubmenu("routeTolls","routeVariants");
    else this.onToggle("tolls");
   });
   for(const button of this.doc.querySelectorAll("[data-active-profile]"))
    button.addEventListener("click",()=>{this.closeMenus();this.onActiveProfile(button.dataset.activeProfile);});
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
  toggleSubmenu(trigger,id){
   const menu=this.el(id),opening=menu.classList.contains("hidden");
   this.closeMenus();
   if(opening){menu.classList.remove("hidden");this.el(trigger).setAttribute("aria-expanded","true");}
  }
  closeMenus(){
   for(const id of menuIds)this.el(id).classList.add("hidden");
   for(const id of ["routeSettings","routeTimes","routeWaypoints","routeTolls"]){
    const button=this.el(id);
    if(button.hasAttribute("aria-expanded"))button.setAttribute("aria-expanded","false");
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
     if(id==="pinRouteWaypoint"){
      const icon=active?"minus":"plus";
      if(b.dataset.pinIcon!==icon)this.icons.mount(b,icon);
      const label=active?"Zwischenziel entfernen":"Als Zwischenziel hinzufügen";
      b.setAttribute("aria-label",label);b.title=label;
     }
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
   for(const id of ["routeTimes","routeApple"])this.el(id).disabled=snapshot.mode!=="car";
   const menu=profileMenus[snapshot.mode],settings=this.el("routeSettings"),tolls=this.el("routeTolls");
   settings.setAttribute("aria-controls",menu);
   const bicycle=snapshot.mode==="bicycle",car=snapshot.mode==="car";
   tolls.disabled=!car&&snapshot.variants.length<2;
   const tollIcon=car?"circle-euro":"route";
   if(tolls.dataset.pinIcon!==tollIcon)this.icons.mount(tolls,tollIcon);
   if(!car){
    tolls.removeAttribute("aria-pressed");
    tolls.setAttribute("aria-controls","routeVariants");
    tolls.setAttribute("aria-expanded",String(!this.el("routeVariants").classList.contains("hidden")));
    tolls.setAttribute("aria-label","Routenalternativen auswählen");
   }else{
    tolls.removeAttribute("aria-expanded");tolls.removeAttribute("aria-controls");
    tolls.setAttribute("aria-pressed",String(car&&snapshot.avoidTolls));
    tolls.setAttribute("aria-label","Ohne Maut ein- oder ausschalten");
   }
   for(const button of this.el(menu).querySelectorAll("button")){
    const active=car?button.dataset.carProfile===snapshot.profile:button.dataset.activeProfile===snapshot.activeProfile;
    button.setAttribute("aria-pressed",String(active));
    if(active)this.showChoice("routeSettings",button,car?"Routencharakter wählen":bicycle?"Fahrradtyp":"Fußprofil");
   }
   const title=this.el("routeSummary");
   title.classList.toggle("car-route-unavailable",snapshot.failed);
   const failures={car:"Keine Autoroute verfügbar",bicycle:"Keine Fahrradroute verfügbar",pedestrian:"Keine Fußroute verfügbar"};
   const ascent=Number.isFinite(snapshot.ascentMeters)?" · "+Math.round(snapshot.ascentMeters)+" Hm":"";
   title.textContent=snapshot.failed?failures[snapshot.mode]:snapshot.loading?"Route wird berechnet …":
    fmtDistance(snapshot.distanceMeters)+" · ca. "+fmtTime(snapshot.durationSeconds)+ascent;
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
   this.renderVariants(snapshot);
   const legs=this.el("routeLegs");legs.replaceChildren();
   snapshot.legs.forEach((leg,index)=>{
    const row=this.doc.createElement("button");row.type="button";
    row.className="car-route-leg";row.dataset.leg=String(index);
    row.addEventListener("click",()=>{
     this.selectLeg(index);
     this.onLegSelect?.(index);
    });
    const dot=this.doc.createElement("span");dot.className="car-route-dot";dot.style.background=snapshot.variants.length?this.variantColors[snapshot.selectedVariant]:["#ff3930","#1987f5","#27a855","#fa9b22","#8754bf"][index%5];
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
  renderVariants(snapshot){
   const list=this.el("routeVariants");
   if(snapshot.mode!=="car"&&!snapshot.variants.length){list.classList.add("hidden");this.el("routeTolls").setAttribute("aria-expanded","false");}
   list.replaceChildren(...snapshot.variants.map((variant,index)=>{
    const button=this.doc.createElement("button");button.type="button";
    button.className="car-route-variant-choice";
    button.setAttribute("aria-pressed",String(index===snapshot.selectedVariant));
    button.addEventListener("click",()=>{this.closeMenus();this.onVariantSelect(index);this.el("routeTolls").focus();});
    const dot=this.doc.createElement("span");dot.className="car-route-dot";
    dot.style.background=this.variantColors[index];dot.setAttribute("aria-hidden","true");
    const distance=variant.distanceMeters<1000?fmtDistance(variant.distanceMeters):
     variantDistance.format(variant.distanceMeters/1000)+" km";
    const label=distance+" · "+fmtTime(variant.durationSeconds)+
     (Number.isFinite(variant.ascentMeters)?" · "+Math.round(variant.ascentMeters)+" Hm":"");
    button.append(dot,"Route "+(index+1)+" · "+label);
    return button;
   }));
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
