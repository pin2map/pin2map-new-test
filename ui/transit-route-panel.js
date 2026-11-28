"use strict";
(function(root){
 const {dbUrl,walking,readableLocalName}=root.Pin2MapTransitJourney;
 const clock=new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"});
 const date=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit"});
 const days=(from,to)=>Math.round((Date.parse(date.format(to))-Date.parse(date.format(from)))/86400000);
 function time(time,reference){
  const offset=days(reference,time);
  return clock.format(time)+(offset?" ("+(offset>0?"+":"")+offset+")":"");
 }
 function duration(seconds){
  const minutes=Math.round(seconds/60),hours=Math.floor(minutes/60);
  return (hours?hours+" h ":"")+minutes%60+" min";
 }
 const displayDate=new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
 const transport={
  WALK:["footprints","Fußweg"],FOOT:["footprints","Fußweg"],
  TRAM:["tram-front","Straßenbahn"],SUBWAY:["tram-front","U-Bahn"],METRO:["tram-front","Métro"],
  BUS:["bus","Bus"],COACH:["bus","Fernbus"],FERRY:["ship","Fähre"],
  HIGHSPEED_RAIL:["train-high-speed","Fernzug"],LONG_DISTANCE:["train-high-speed","Fernzug"],
  NIGHT_RAIL:["train-front","Nachtzug"],SUBURBAN:["train-front","S-Bahn"],
  REGIONAL_RAIL:["train-front","Regionalzug"],REGIONAL_FAST_RAIL:["train-front","Regionalzug"],
  RAIL:["train-front","Zug"],FUNICULAR:["train-front","Standseilbahn"],AERIAL_LIFT:["cable-car","Seilbahn"]
 };
 const quality={green:"Günstig",yellow:"Verspätete Ankunft",red:"Kritisch oder außerhalb des Zeitfensters"};
 class TransitRoutePanel{
  constructor({document:doc,getElement,icons,getPin,onQuery,onSelect,onLegSelect,onContinue,onCompare,open,colors}){
   Object.assign(this,{doc,el:getElement,icons,getPin,onQuery,onSelect,onLegSelect,onContinue,onCompare,open,colors});
  }
  bind(){
   const panel=this.el("carRoutePanel");
   panel.addEventListener("scroll",()=>this.syncSticky());
   this.el("transitStickyButton").addEventListener("click",()=>panel.scrollTo({top:0,behavior:"instant"}));
   const nativeTime=this.el("transitClock"),desktopTime=this.el("transitClockDesktop");
   const update=()=>{
    const local=this.el("transitDate").value+"T"+nativeTime.value;
    const query={time:new Date(local).getTime(),arriveBy:this.el("transitWhen").value==="arrive"};
    const current=this.snapshot?.transit?.query;
    if(Number.isFinite(query.time)&&(query.time!==current?.time||query.arriveBy!==current?.arriveBy))this.onQuery(query);
   };
   for(const id of ["transitDate","transitClock","transitWhen"])this.el(id).addEventListener("change",update);
   desktopTime.addEventListener("blur",()=>{
    const match=/^([0-9]{1,2}):?([0-9]{2})$/.exec(desktopTime.value.trim());
    if(match&&Number(match[1])<24&&Number(match[2])<60){
     nativeTime.value=match[1].padStart(2,"0")+":"+match[2];update();
    }
    desktopTime.value=nativeTime.value;
   });
   desktopTime.addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();desktopTime.blur();}
   });
   this.el("transitNow").addEventListener("click",()=>this.onQuery({time:Date.now(),arriveBy:false}));
   const picker=this.el("transitPicker"), summary=this.el("transitSelected");
   picker.addEventListener("keydown",event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
    if(event.key==="Escape"&&picker.open){
     event.preventDefault();picker.open=false;summary.focus();return;
    }
    const direction={ArrowDown:1,ArrowUp:-1}[event.key];
    if(!direction)return;
    const buttons=[...this.el("transitAlternatives").querySelectorAll("button")];
    if(!buttons.length)return;
    const current=buttons.indexOf(event.target);
    if(current<0&&event.target!==summary)return;
    event.preventDefault();
    picker.open=true;
    const selected=this.snapshot.selectedVariant;
    const index=current<0?selected:Math.max(0,Math.min(buttons.length-1,current+direction));
    buttons[index].focus();
   });
   const list=this.el("routeLegs");
   list.addEventListener("keydown",event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
    const direction={ArrowDown:1,ArrowUp:-1}[event.key];
    if(!direction)return;
    const buttons=[...list.querySelectorAll(".transit-leg")];
    const current=buttons.indexOf(event.target);
    if(current<0)return;
    event.preventDefault();
    const next=buttons[current+direction];
    if(next){next.focus({preventScroll:true});next.click();}
   });
   this.el("transitDb").addEventListener("click",()=>{
    const {startId,targetId,transit}=this.snapshot;
    const url=dbUrl(this.getPin(startId),this.getPin(targetId),
     this.el("transitDate").value+"T"+this.el("transitClock").value,transit.query.arriveBy);
    if(url)this.open(url);
   });
  }
  syncSticky(){
   const panel=this.el("carRoutePanel"),row=panel.querySelector(".car-route-primary");
   this.el("transitSticky").classList.toggle("hidden",!panel.classList.contains("transit-route-active")||
    !this.el("transitStickyDeparture").textContent||row.getBoundingClientRect().bottom>panel.getBoundingClientRect().top);
  }
  label(journey){
   return time(journey.start,journey.start)+"–"+time(journey.end,journey.start)+" • "+duration(journey.durationSeconds);
  }
  option(journey){
   const content=this.doc.createElement("span");
   content.className="transit-choice";
   const icon=journey.busShare===null?"route":journey.busShare>.3?"bus":"train-front";
   const glyph=this.icons.svg(icon,this.doc);
   glyph.classList.add("transit-"+journey.quality);
   content.setAttribute("aria-label",quality[journey.quality]+", "+this.label(journey));
   content.append(glyph,this.label(journey));
   if(journey.busShare===null)content.title="Busanteil unbekannt";
   return content;
  }
  comparisonControl(comparison){
   const block=this.doc.createElement("div");
   block.className="transit-comparison";
   for(const [mode,name] of [["original","Original"],["alternative","Alternative"]]){
    const button=this.doc.createElement("button");button.type="button";
    const journey=comparison[mode];
    button.textContent=name+" · Ankunft "+time(journey.end,journey.start);
    button.setAttribute("aria-pressed",String(comparison.active===mode));
    button.addEventListener("click",()=>this.onCompare(mode));
    block.append(button);
   }
   return block;
  }
  render(snapshot){
   this.snapshot=snapshot;
   const {query,journeys,recovery,progress,comparison,continuing,continuationMessage,continuationIndex}=snapshot.transit;
   const selected=snapshot.transit.active||journeys[snapshot.selectedVariant];
   const endpoint=(id,stop)=>{const pin=this.getPin(id);return pin?.address||pin?.name||readableLocalName(stop?.name);};
   this.el("transitStickyDeparture").textContent=selected?
    clock.format(selected.start)+" "+endpoint(snapshot.startId,selected.legs[0]?.from):"";
   this.el("transitStickyArrival").textContent=selected?
    clock.format(selected.end)+" "+endpoint(snapshot.targetId,selected.legs.at(-1)?.to):"";
   this.syncSticky();
   this.el("transitDate").value=date.format(query.time);
   this.el("transitClock").value=clock.format(query.time);
   this.el("transitDateLabel").textContent=displayDate.format(query.time);
   this.el("transitClockLabel").textContent=clock.format(query.time);
   this.el("transitWhen").value=query.arriveBy?"arrive":"depart";
   if(this.doc.activeElement!==this.el("transitClockDesktop"))this.el("transitClockDesktop").value=clock.format(query.time);
   const status=snapshot.loading?"Verbindungen werden gesucht …":snapshot.failed?"Fahrplanauskunft nicht erreichbar":
    selected?this.label(selected):query.arriveBy?"Keine durchgehende Verbindung gefunden":"Keine passende Abfahrt innerhalb von 120 Minuten";
   this.el("routeSummary").textContent=status;
   const received=progress?.received||0;
   const phase=progress?.phase;
   const activity=phase==="stops"?"Haltestellen entlang der Richtungsflaggen werden gesucht …":
    phase==="access"?"Fußwege zu Bahnhöfen werden geprüft …":
    phase==="review"?(received===1?"Ein Ergebnis wird geprüft …":received?received+" Ergebnisse werden geprüft …":"Fahrplanauskunft hat geantwortet …"):
    (progress?.requests>1?"Weitere Verbindungen werden angefragt …":"Fahrplanauskunft wird angefragt …");
   const progressBlock=this.el("transitSearchActivity");
   progressBlock.classList.toggle("hidden",!snapshot.loading);
   const progressText=this.el("transitSearchPhase");
   if(progressText.textContent!==activity)progressText.textContent=activity;
   const count=this.el("transitSearchCount");
   count.textContent=received&&phase!=="review"?(received===1?"1 Ergebnis empfangen":received+" Ergebnisse empfangen"):"";
   count.classList.toggle("hidden",!count.textContent);
   this.el("routeSummary").classList.toggle("car-route-unavailable",snapshot.failed&&!snapshot.loading);
   const summary=this.el("transitSelected");
   summary.replaceChildren(selected?this.option(selected):this.doc.createTextNode("Verbindungen"));
   const options=this.el("transitAlternatives");
   if(this.renderedJourneys!==journeys){
    this.renderedJourneys=journeys;
    options.replaceChildren(...journeys.map((item,index)=>{
     const button=this.doc.createElement("button");button.type="button";
     button.append(this.option(item));
     button.addEventListener("click",()=>{
      this.el("transitPicker").open=false;this.onSelect(index);summary.focus();
     });
     return button;
    }));
   }
   [...options.children].forEach((button,index)=>
    button.setAttribute("aria-pressed",String(index===snapshot.selectedVariant)));
   this.el("transitPicker").classList.toggle("transit-picker-empty",!journeys.length);
   if(!journeys.length)this.el("transitPicker").open=false;
   const list=this.el("routeLegs");
   const focused=list.contains(this.doc.activeElement)?this.doc.activeElement.dataset.leg:null;
   const rows=snapshot.legs.flatMap((leg,index)=>{
    const row=this.doc.createElement("div");row.className="transit-leg-row";
    const button=this.doc.createElement("button");button.type="button";
    button.className="car-route-leg transit-leg";button.dataset.leg=String(index);
    button.style.setProperty("--leg-color",walking(leg.mode)?root.Pin2MapCarRouteMapView.TRANSIT_WALK_COLOR:this.colors[index%this.colors.length]);
    if(walking(leg.mode))button.classList.add("transit-leg-walk");
    const [icon,kind]=transport[leg.mode]||["route","Verkehrsmittel nicht angegeben"];
    const station=place=>[
     ({START:"Start",END:"Ziel"})[place?.name]||readableLocalName(place?.name)||"Haltestelle nicht angegeben",
     place?.track?"Gleis "+place.track:""].filter(Boolean).join(" · ");
    const text=(slot,value,tag="span")=>{
     const item=this.doc.createElement(tag);item.className=slot;item.textContent=value;return item;
    };
    const glyph=this.icons.svg(icon,this.doc);glyph.classList.add("transit-leg-icon");
    const destination=this.icons.svg("arrow-right",this.doc);destination.classList.add("transit-leg-arrow");
    const line=walking(leg.mode)?kind:leg.line||
     [kind,leg.operator,"Linie nicht angegeben"].filter(Boolean).join(" · ");
    const meters=walking(leg.mode)&&leg.measured&&Number.isFinite(leg.distanceMeters)?
     " · "+Math.round(leg.distanceMeters).toLocaleString("de-DE")+" m":"";
    const title=line+(leg.headsign?" · Ri. "+readableLocalName(leg.headsign):"")+meters;
    const transfer=selected.transfers.find(item=>
     (item.leg.index-item.previous.index>1?item.leg.index-1:item.leg.index)===index);
    const transferWindow=transfer&&walking(leg.mode)?transfer:null;
    const singleWalk=transferWindow&&transferWindow.leg.index-transferWindow.previous.index===2;
    const marker=transfer?.critical?this.icons.svg("triangle-exclamation-point",this.doc):text("transit-leg-number",index+1);
    if(transfer?.critical){
     button.classList.add("transit-leg-critical");
     marker.classList.add("transit-leg-warning");
     marker.setAttribute("role","img");marker.removeAttribute("aria-hidden");
     marker.setAttribute("aria-label","Kritischer Umstieg");
     const {available,walkMinutes,reserve}=transfer;
     const note=Math.floor(available)+" min verfügbar · "+walkMinutes+" min für Weg und Einstieg · "+reserve+" min Reserve empfohlen";
     const followUp=transfer===selected.critical&&recovery&&!recovery.unknown?
      " · Mögliche Ankunft bei verpasstem Anschluss "+time(recovery.end,query.time):"";
     button.title=note+followUp;
    }
    if(transferWindow&&!transfer.critical)button.title=Math.floor(transferWindow.available)+" min verfügbar · "+
     duration(leg.durationSeconds)+" Fußweg laut Fahrplan";
    button.append(marker,text("transit-leg-depart",time(singleWalk?transferWindow.previous.end:leg.start,selected.start),"strong"),glyph,
     text("transit-leg-title",transferWindow?"Umstieg · "+title:title,"strong"),
     text("transit-leg-duration",transferWindow?duration(Math.floor(Math.max(0,transferWindow.available))*60):duration(leg.durationSeconds)),
     text("transit-leg-from",station(leg.from)),text("transit-leg-arrive",time(singleWalk?transferWindow.leg.start:leg.end,selected.start),"strong"),
     destination,text("transit-leg-to",station(leg.to)));
    button.addEventListener("click",()=>{button.focus({preventScroll:true});this.onLegSelect(index);});
    row.append(button);
    const onward=selected.transfers.find(item=>item.leg.index===index);
    if(onward?.previous.to?.stopId){
     const menu=this.doc.createElement("details");menu.className="transit-transfer-menu";
     const trigger=text("transit-transfer-trigger","","summary");
     trigger.setAttribute("aria-label","Anschluss verpasst");trigger.title="Anschluss verpasst";
     trigger.append(this.icons.svg("chevrons-right",this.doc));menu.append(trigger);
     const choices=this.doc.createElement("div");choices.className="transit-transfer-choices";
     for(const delay of [5,10,15,20,30,45,60,90]){
      const action=text("transit-transfer-delay","+"+delay+" min","button");
      action.type="button";action.disabled=continuing;
      action.addEventListener("click",()=>this.onContinue(index,{delay}));
      choices.append(action);
     }
     menu.append(choices);row.append(menu);
    }
    const items=comparison?.branch===index?[this.comparisonControl(comparison),row]:[row];
    if(continuationMessage&&continuationIndex===index){
     const feedback=text("transit-continuation-feedback",continuationMessage,"div");
     feedback.setAttribute("role","status");items.push(feedback);
    }
    return items;
   });
   list.replaceChildren(...rows);
   if(focused!=null)list.querySelector('.transit-leg[data-leg="'+focused+'"]')?.focus({preventScroll:true});
  }
 }
 root.Pin2MapTransitRoutePanel=TransitRoutePanel;
})(typeof window!=="undefined"?window:globalThis);
