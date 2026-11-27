"use strict";
(function(root){
  const weather={
    sun:"Sonnig","cloud-sun":"Sonne und Wolken",moon:"Klar",
    cloud:"Bedeckt","cloud-rain":"Regen","cloud-sun-rain":"Sonne und Regenschauer",
    "cloud-drizzle":"Nieselregen","cloud-snow":"Schnee","cloud-lightning":"Gewitter","cloud-fog":"Nebel"
  };
  const hours=["00","07","13","19"];
  function condition(code,isDay){
    if(isDay===0&&code===0)return "moon";
    if(isDay===0&&(code===1||code===2))return "cloud";
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
  const amount=new Intl.NumberFormat("de-DE",{maximumFractionDigits:1});
  const wholeNumber=new Intl.NumberFormat("de-DE",{maximumFractionDigits:0});
  const shortDays=["So","Mo","Di","Mi","Do","Fr","Sa"];
  function windyLink({lat,lng},date){
    const coordinates=[lat.toFixed(5),lng.toFixed(5)].join(",");
    return "https://www.windy.com/"+coordinates.replace(",","/")+"?"+date+"-12,"+coordinates+",11";
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
      if(cached&&Date.now()-cached.time<900000){this.render(cached.data,pin);return;}
      const request=this.request=new AbortController();
      this.status("Wettervorhersage wird geladen …");
      try{
        const data=await this.load({lat,lng},{signal:request.signal});
        if(request.signal.aborted)return;
        this.render(data,pin);
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
    temperature(value,suffix=""){
      const rounded=Math.round(value);
      const text=Number.isFinite(value)?String(rounded).replace("-","−")+suffix:"–";
      return element(this.doc,"span",text,root.Pin2MapPinInfoLabel.temperatureClass(value));
    }
    range(min,max){
      const range=element(this.doc,"span",undefined,"pin-weather-range");
      range.append(this.temperature(min,"°")," / ",this.temperature(max,"°"));
      return range;
    }
    render({current={},daily,hourly},pin){
      const doc=this.doc;
      const block=element(doc,"div",undefined,"pin-weather-card");
      const summary=element(doc,"div",undefined,"pin-weather-card pin-weather-current");
      const line=element(doc,"div",undefined,"pin-weather-current-line");
      const temp=element(doc,"strong",undefined,"pin-weather-now");
      temp.append(this.temperature(current.temperature_2m)," °C");
      line.append(temp);
      const icon=condition(current.weather_code,current.is_day);
      if(icon)line.append(this.icons.svg(icon,doc));
      const feels=element(doc,"span");
      feels.append("Gefühlt: ",this.temperature(current.apparent_temperature)," °C");
      line.append(feels,this.range(daily.temperature_2m_min?.[0],daily.temperature_2m_max?.[0]));
      const detail=element(doc,"div",undefined,"pin-weather-current-line");
      detail.append(element(doc,"span",[weather[icon],"Wind "+wind(current.wind_speed_10m,current.wind_direction_10m)].filter(Boolean).join(" · ")));
      if(current.time)detail.append(element(doc,"time",current.time.slice(11,16)));
      summary.append(line,detail);
      const table=element(doc,"table");
      const header=table.createTHead().insertRow();
      for(const name of ["Tag","Min/Max","0:00","7:00","13:00","19:00","mm","km/h"]){
        const th=element(doc,"th",name);
        th.scope="col";
        if(name==="Min/Max")th.title="Tageshöchstwert / Tagestiefstwert";
        if(name==="km/h")th.title="Maximale Böe / mittlere Windgeschwindigkeit";
        header.append(th);
      }
      const body=table.createTBody();
      const positions=new Map(),dailyWind=new Map();
      hourly?.time?.forEach((time,index)=>{
        positions.set(time,index);
        const speed=hourly.wind_speed_10m?.[index];
        if(!Number.isFinite(speed))return;
        const day=time.slice(0,10);
        const stats=dailyWind.get(day)||{sum:0,count:0};
        stats.sum+=speed;
        stats.count++;
        dailyWind.set(day,stats);
      });
      daily.time.slice(0,7).forEach((day,i)=>{
        const row=body.insertRow(),date=new Date(day+"T12:00:00Z");
        const dayLabel=shortDays[date.getUTCDay()];
        const dateLabel=day.slice(8,10)+"."+day.slice(5,7)+".";
        const link=element(doc,"a",undefined,"pin-weather-day");
        link.href=windyLink(pin,day);
        link.target="_blank";
        link.rel="noopener noreferrer";
        link.setAttribute("aria-label","Windy für "+dayLabel+" "+dateLabel+" öffnen");
        link.append(element(doc,"strong",dayLabel),element(doc,"time",dateLabel));
        link.lastChild.dateTime=day;
        row.insertCell().append(link);
        row.addEventListener("click",event=>{if(!link.contains(event.target))link.click();});
        const extremes=element(doc,"span",undefined,"pin-weather-pair");
        extremes.append(this.temperature(daily.temperature_2m_max?.[i],"°"),this.temperature(daily.temperature_2m_min?.[i],"°"));
        row.insertCell().append(extremes);
        for(const hour of hours){
          const index=positions.get(day+"T"+hour+":00");
          const symbol=condition(hourly?.weather_code?.[index],hourly?.is_day?.[index]);
          const sample=element(doc,"span",undefined,"pin-weather-sample");
          if(symbol){
            const svg=this.icons.svg(symbol,doc);
            svg.setAttribute("role","img");
            svg.setAttribute("aria-label",weather[symbol]);
            svg.removeAttribute("aria-hidden");
            sample.append(svg);
          }else sample.append(element(doc,"span","–"));
          sample.append(this.temperature(hourly?.temperature_2m?.[index],"°"));
          row.insertCell().append(sample);
        }
        const rain=daily.precipitation_sum?.[i];
        row.insertCell().textContent=Number.isFinite(rain)?amount.format(rain):"–";
        const wind=element(doc,"span",undefined,"pin-weather-pair");
        const gust=daily.wind_gusts_10m_max?.[i],stats=dailyWind.get(day);
        wind.append(element(doc,"strong",Number.isFinite(gust)?wholeNumber.format(gust):"–"),
          element(doc,"span",stats?wholeNumber.format(stats.sum/stats.count):"–"));
        row.insertCell().append(wind);
      });
      block.append(table);
      this.region.replaceChildren(summary,block);
    }
  }
  root.Pin2MapPinWeather={View,renderLegend};
  if(typeof module!=="undefined"&&module.exports)module.exports={condition,windyLink};
})(typeof window!=="undefined"?window:globalThis);
