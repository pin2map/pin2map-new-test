"use strict";
(function(root){
 const {dbUrl,walking}=root.Pin2MapTransitJourney;
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
  constructor({document:doc,getElement,icons,getPin,onQuery,onSelect,onLegSelect,open,colors}){
   Object.assign(this,{doc,el:getElement,icons,getPin,onQuery,onSelect,onLegSelect,open,colors});
  }
  bind(){
   for(const id of ["transitDate","transitClock","transitWhen","transitVehicle"])
    this.el(id).addEventListener("change",()=>{
     const local=this.el("transitDate").value+"T"+this.el("transitClock").value;
     this.onQuery({time:new Date(local).getTime(),arriveBy:this.el("transitWhen").value==="arrive",
      vehicle:this.el("transitVehicle").value});
    });
   this.el("transitDb").addEventListener("click",()=>{
    const {startId,targetId,transit}=this.snapshot;
    const url=dbUrl(this.getPin(startId),this.getPin(targetId),
     this.el("transitDate").value+"T"+this.el("transitClock").value,transit.query.arriveBy);
    if(url)this.open(url);
   });
  }
  label(journey){
   return time(journey.start,journey.start)+"–"+time(journey.end,journey.start)+" • "+duration(journey.durationSeconds);
  }
  option(journey){
   const content=this.doc.createElement("span");
   content.className="transit-choice";
   const icon=journey.busShare===null?"route":journey.busShare>.3?"bus":"train-high-speed";
   const glyph=this.icons.svg(icon,this.doc);
   glyph.classList.add("transit-"+journey.quality);
   content.setAttribute("aria-label",quality[journey.quality]+", "+this.label(journey));
   content.append(glyph,this.label(journey));
   if(journey.busShare===null)content.title="Busanteil unbekannt";
   return content;
  }
  render(snapshot){
   this.snapshot=snapshot;
   const {query,journeys,recovery}=snapshot.transit;
   const selected=journeys[snapshot.selectedVariant];
   this.el("transitDate").value=date.format(query.time);
   this.el("transitClock").value=clock.format(query.time);
   this.el("transitDateLabel").textContent=displayDate.format(query.time);
   this.el("transitClockLabel").textContent=clock.format(query.time);
   this.el("transitWhen").value=query.arriveBy?"arrive":"depart";
   this.el("transitVehicle").value=query.vehicle;
   const status=snapshot.loading?"Verbindungen werden gesucht …":snapshot.failed?"Fahrplanauskunft nicht erreichbar":
    selected?this.label(selected):"Keine durchgehende Verbindung gefunden";
   this.el("routeSummary").textContent=status;
   this.el("routeSummary").classList.toggle("car-route-unavailable",snapshot.failed);
   const summary=this.el("transitSelected");
   summary.replaceChildren(selected?this.option(selected):this.doc.createTextNode("Verbindungen"));
   const options=this.el("transitAlternatives");
   options.replaceChildren(...journeys.map((item,index)=>{
    const button=this.doc.createElement("button");button.type="button";
    button.setAttribute("aria-pressed",String(index===snapshot.selectedVariant));
    button.append(this.option(item));
    button.addEventListener("click",()=>{
     this.el("transitPicker").open=false;this.onSelect(index);summary.focus();
    });
    return button;
   }));
   this.el("transitPicker").classList.toggle("transit-picker-empty",!journeys.length);
   if(!journeys.length)this.el("transitPicker").open=false;
   const note=[];
   if(selected?.critical){
    const {leg,available,walkMinutes,reportedWalk,slack,reserve}=selected.critical;
    const planned=reportedWalk>0?" (Fahrplanauskunft: "+Math.round(reportedWalk)+" min)":"";
    const remaining=slack<0?Math.ceil(-slack)+" min fehlen bereits für den Umstiegsweg":
     Math.floor(slack)+" min Reserve übrig, empfohlen sind "+reserve+" min";
    note.push("Kritischer Umstieg in "+(leg.from?.name||"der Haltestelle")+" – "+
     Math.floor(available)+" min zwischen Ankunft und Abfahrt, etwa "+walkMinutes+
     " min für Weg und Einstieg"+planned+". "+remaining+".");
   }
   if(selected?.late)note.push(query.arriveBy?"Ankunft außerhalb des Zeitfensters von ±60 Minuten":"Ankunft an einem anderen Tag");
   if(recovery)note.push(recovery.unknown?"Folgeanschluss nicht ermittelt":
    "Bei verpasstem Anschluss mögliche Ankunft "+time(recovery.end,query.time)+(recovery.late?" · nach Zielzeit":""));
   this.el("transitRisk").textContent=note.join(" · ");
   const list=this.el("routeLegs");
   list.replaceChildren(...snapshot.legs.map((leg,index)=>{
    const button=this.doc.createElement("button");button.type="button";
    button.className="car-route-leg transit-leg";button.dataset.leg=String(index);
    button.style.setProperty("--leg-color",this.colors[index%this.colors.length]);
    if(walking(leg.mode))button.classList.add("transit-leg-walk");
    const [icon,kind]=transport[leg.mode]||["route","Verkehrsmittel nicht angegeben"];
    const station=place=>[
     ({START:"Start",END:"Ziel"})[place?.name]||place?.name||"Haltestelle nicht angegeben",
     place?.track?"Gleis "+place.track:""].filter(Boolean).join(" · ");
    const text=(slot,value,tag="span")=>{
     const item=this.doc.createElement(tag);item.className=slot;item.textContent=value;return item;
    };
    const glyph=this.icons.svg(icon,this.doc);glyph.classList.add("transit-leg-icon");
    const destination=this.icons.svg("arrow-right",this.doc);destination.classList.add("transit-leg-arrow");
    const line=walking(leg.mode)?kind:leg.line?kind+" "+leg.line:
     [kind,leg.operator,"Linie nicht angegeben"].filter(Boolean).join(" · ");
    const title=line+(leg.headsign?" · Ri. "+leg.headsign:"");
    button.append(text("transit-leg-number",index+1),
     text("transit-leg-depart",time(leg.start,selected.start),"strong"),glyph,
     text("transit-leg-title",title,"strong"),text("transit-leg-duration",duration(leg.durationSeconds)),
     text("transit-leg-from",station(leg.from)),text("transit-leg-arrive",time(leg.end,selected.start),"strong"),
     destination,text("transit-leg-to",station(leg.to)));
    button.disabled=!leg.geometry;
    button.addEventListener("click",()=>this.onLegSelect(index));return button;
   }));
  }
 }
 root.Pin2MapTransitRoutePanel=TransitRoutePanel;
})(typeof window!=="undefined"?window:globalThis);
