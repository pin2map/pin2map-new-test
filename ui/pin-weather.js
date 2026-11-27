"use strict";
(function(root){
  const weather={
    "clear-night":["Klar","klar"],
    sun:["Sonnig","Sonne"],"cloud-sun":["Sonne und Wolken","Sonne und Wolken"],
    cloud:["Bedeckt","bewölkt"],"cloud-rain":["Regen","Regen"],
    "cloud-sun-rain":["Sonne und Regenschauer","Schauer"],"cloud-drizzle":["Nieselregen","Nieselregen"],
    "cloud-snow":["Schnee","Schnee"],"cloud-lightning":["Gewitter","Gewitter"],"cloud-fog":["Nebel","Nebel"]
  };
  function condition(code){
    if(code===0)return "sun";
    if(code===1||code===2)return "cloud-sun";
    if(code===3)return "cloud";
    if(code===45||code===48)return "cloud-fog";
    if(code>=51&&code<=57)return "cloud-drizzle";
    if(code>=61&&code<=67)return "cloud-rain";
    if(code>=71&&code<=77||code===85||code===86)return "cloud-snow";
    if(code>=80&&code<=82)return "cloud-sun-rain";
    if(code>=95&&code<=99)return "cloud-lightning";
    return null;
  }
  function hourlyByDay(hourly){
    const days=new Map();
    hourly?.time?.forEach((time,index)=>{
      const code=hourly.weather_code?.[index];
      const icon=hourly.is_day?.[index]===0&&code===0?"clear-night":condition(code);
      if(!icon)return;
      const date=time.slice(0,10);
      if(!days.has(date))days.set(date,new Map());
      const counts=days.get(date);
      counts.set(icon,(counts.get(icon)||0)+1);
    });
    return days;
  }
  const oneDecimal=new Intl.NumberFormat("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});
  const amount=new Intl.NumberFormat("de-DE",{maximumFractionDigits:1});
  const weekday=new Intl.DateTimeFormat("de-DE",{weekday:"long",timeZone:"UTC"});
  const shortDays=["So","Mo","Di","Mi","Do","Fr","Sa"];
  function precipitation(rain,showers,snow){
    const liquid=[rain,showers].filter(Number.isFinite);
    const mm=liquid.reduce((sum,value)=>sum+value,0);
    if(snow>0)return [mm>0?amount.format(mm)+" mm":null,amount.format(snow)+" cm"].filter(Boolean).join(", ");
    return liquid.length?oneDecimal.format(mm)+" mm":"–";
  }
  function wind(speed,degrees){
    const points=["N","NO","O","SO","S","SW","W","NW"];
    if(!Number.isFinite(speed))return "–";
    const direction=Number.isFinite(degrees)&&speed>0?points[((Math.round(degrees/45)%8)+8)%8]+" ":"";
    return direction+Math.round(speed)+" km/h";
  }
  const scale=[
    [-16,"Schwarz","−16 °C und kälter"],[-6,"Königsblau","−15 °C bis −6 °C"],
    [0,"Hellblau","−5 °C bis 0 °C"],[12,"Dunkelgrün","1 °C bis 12 °C"],
    [18,"Grün","13 °C bis 18 °C"],[26,"Sand / Ocker","19 °C bis 26 °C"],
    [32,"Rot","27 °C bis 32 °C"],[33,"Violett","33 °C und wärmer"]
  ];
  function element(doc,tag,value,className){
    const node=doc.createElement(tag);
    if(value!==undefined)node.textContent=value;
    if(className)node.className=className;
    return node;
  }
  function renderLegend(legend){
    const doc=legend.ownerDocument;
    legend.replaceChildren(...scale.map(([value,name,range])=>{
      const row=element(doc,"div");
      const title=element(doc,"dt",name);
      const swatch=element(doc,"span",undefined,root.Pin2MapPinInfoLabel.temperatureClass(value));
      swatch.setAttribute("aria-hidden","true");
      title.prepend(swatch);
      row.append(title,element(doc,"dd",range));
      return row;
    }));
  }
  class View{
    constructor({region,load,icons}){
      Object.assign(this,{region,load,icons,doc:region.ownerDocument});
      this.cache=new Map();
    }
    hide(){
      this.request?.abort();
      this.request=null;
      this.key=null;
    }
    status(message){
      const node=element(this.doc,"div",message,"pin-weather-status");
      node.setAttribute("role","status");
      this.region.replaceChildren(node);
      return node;
    }
    async show(pin){
      const {lat,lng}=pin;
      const key=lat+","+lng;
      if(key===this.key)return;
      this.hide();
      this.key=key;
      const cached=this.cache.get(key);
      if(cached&&Date.now()-cached.time<900000){this.render(cached.data);return;}
      const request=this.request=new AbortController();
      this.status("Wettervorhersage wird geladen …");
      try{
        const data=await this.load({lat,lng},{signal:request.signal});
        if(request.signal.aborted)return;
        this.render(data);
        if(this.cache.size>=32)this.cache.delete(this.cache.keys().next().value);
        this.cache.set(key,{time:Date.now(),data});
      }catch{
        if(request.signal.aborted)return;
        const status=this.status("Wetterdaten konnten nicht geladen werden.");
        const retry=element(this.doc,"button","Erneut versuchen");
        retry.type="button";
        retry.addEventListener("click",()=>{this.hide();this.show(pin);},{once:true});
        status.after(retry);
      }
    }
    temperature(value,signed=false){
      const rounded=Math.round(value);
      const text=Number.isFinite(value)?(signed&&rounded>0?"+":"")+String(rounded).replace("-","−"):"–";
      return element(this.doc,"span",text,root.Pin2MapPinInfoLabel.temperatureClass(value));
    }
    range(min,max){
      const range=element(this.doc,"span",undefined,"pin-weather-range");
      range.append(this.temperature(min,true)," | ",this.temperature(max,true)," °C");
      return range;
    }
    render({current={},daily,hourly}){
      const doc=this.doc;
      const block=element(doc,"div",undefined,"pin-weather-card");
      const summary=element(doc,"div",undefined,"pin-weather-current");
      const line=element(doc,"div",undefined,"pin-weather-current-line");
      const temp=element(doc,"strong",undefined,"pin-weather-now");
      temp.append(this.temperature(current.temperature_2m)," °C");
      line.append(temp);
      const icon=current.is_day===0&&current.weather_code===0?"clear-night":condition(current.weather_code);
      if(icon)line.append(this.icons.svg(icon==="clear-night"?"moon":icon,doc));
      const feels=element(doc,"span");
      feels.append("Gefühlt: ",this.temperature(current.apparent_temperature)," °C");
      line.append(feels,this.range(daily.temperature_2m_min?.[0],daily.temperature_2m_max?.[0]));
      const detail=element(doc,"div",undefined,"pin-weather-current-line");
      detail.append(element(doc,"span",[weather[icon]?.[0],"Wind "+wind(current.wind_speed_10m,current.wind_direction_10m)].filter(Boolean).join(" · ")));
      if(current.time)detail.append(element(doc,"time",current.time.slice(11,16)));
      summary.append(line,detail);
      const table=element(doc,"table");
      const header=table.createTHead().insertRow();
      for(const name of ["Tag","Temperatur","Wetter","Niederschlag","Wind"]){
        const th=element(doc,"th",name);
        th.scope="col";
        header.append(th);
      }
      const body=table.createTBody(),counts=hourlyByDay(hourly);
      daily.time.slice(0,7).forEach((day,i)=>{
        const row=body.insertRow(),date=new Date(day+"T12:00:00Z");
        const name=i===0?"Heute ("+shortDays[date.getUTCDay()]+")":i===1?"Morgen ("+shortDays[date.getUTCDay()]+")":weekday.format(date);
        const dayCell=row.insertCell();
        dayCell.append(element(doc,i===0?"strong":"span",name+" "+day.slice(8,10)+"."+day.slice(5,7)+"."));
        row.insertCell().append(this.range(daily.temperature_2m_min?.[i],daily.temperature_2m_max?.[i]));
        const conditions=[...(counts.get(day)||[])].sort((a,b)=>b[1]-a[1]);
        const cell=row.insertCell(),dominant=conditions.find(([symbol])=>symbol!=="clear-night")?.[0]||conditions[0]?.[0];
        const visual=element(doc,"span",undefined,"pin-weather-condition");
        if(dominant)visual.append(this.icons.svg(dominant==="clear-night"?"moon":dominant,doc));
        visual.append(conditions.map(([symbol,hours])=>hours+" h "+weather[symbol][1]).join(", ")||"–");
        cell.append(visual);
        row.insertCell().textContent=precipitation(daily.rain_sum?.[i],daily.showers_sum?.[i],daily.snowfall_sum?.[i]);
        row.insertCell().textContent=wind(daily.wind_speed_10m_max?.[i],daily.wind_direction_10m_dominant?.[i]);
      });
      block.append(summary,table);
      this.region.replaceChildren(block);
    }
  }
  root.Pin2MapPinWeather={View,renderLegend};
  if(typeof module!=="undefined"&&module.exports)module.exports={condition,hourlyByDay,precipitation,wind};
})(typeof window!=="undefined"?window:globalThis);
