"use strict";
/* Port of predecessor river953Find, river955 scoring, river956 aliases.
 * Network, candidate scoring and geometry resolution stay outside UI/Leaflet.
 * Nominatim requests are serialized; failures are surfaced, never silently
 * converted into saved partial geometry.
 */
(function(root){
  function norm(v){return String(v||"").trim().toLocaleLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/[łŁ]/g,"l").replace(/[-_’']/g," ").replace(/\s+/g," ");}
  function aliases(name){
    const m={
      amazonas:["Rio Amazonas","Amazon River","Amazon","Río Amazonas","Rio Solimões"],
      amazon:["Amazon River","Rio Amazonas","Amazonas"],
      yukon:["Yukon River","Yukon"],youkon:["Yukon","Yukon River"],
      "gelber fluss":["黄河","Huang He","Huanghe","Yellow River"],
      dordogne:["La Dordogne","Dordogne"],
      dnjeper:["Dnipro","Dnieper","Дніпро","Dnepr","Dnjepr"],
      dnjepr:["Dnipro","Dnieper","Дніпро","Dnepr","Dnjeper"],
      dnieper:["Dnipro","Дніпро","Dnieper"],dnipro:["Дніпро","Dnipro","Dnieper"],
      jangtse:["Yangtze","Yangtze River","Chang Jiang","长江"],
      yangtse:["Yangtze","Yangtze River","Chang Jiang","长江"],
      mississippi:["Mississippi River","Mississippi"],
      missisippi:["Mississippi River","Mississippi"],
      mississipi:["Mississippi River","Mississippi"],
      weser:["Weser"],wisla:["Wisła","Vistula","Weichsel"],
      weichsel:["Wisła","Vistula"],vistula:["Wisła","Weichsel"]
    };
    let n=String(name||"").trim(),a=[n];
    a.push(...(m[n.toLocaleLowerCase()]||[]));
    if(n.includes(" "))a.push(n.replace(/\s+/g,"-"));
    if(n.includes("-"))a.push(n.replace(/-/g," "));
    if(/^l['’]/i.test(n))a.push(n.replace(/^l['’]/i,""));
    if(!/^(la|le|les) /i.test(n)&&!/^l['’]/i.test(n))
      a.push("La "+n,"Le "+n,"Les "+n,"L'"+n);
    if(/^l['’]/i.test(n))a.push("L’"+n.slice(2));
    if(n)a.push("Rio "+n,"Río "+n,n+" River",n+" å",n+" älv",n+" rivière");
    return a.filter((v,i)=>v&&a.findIndex(x=>norm(x)===norm(v))===i);
  }
  function tagNames(tags){
    const names=[];
    for(const key of Object.keys(tags||{})){
      if(key==="name"||["alt_name","official_name","int_name","short_name","old_name","loc_name"].includes(key)||key.startsWith("name:")){
        for(const raw of String(tags[key]).split(/[;,/]/)){
          const name=raw.trim();if(name&&!names.includes(name))names.push(name);
        }
      }
    }
    return names;
  }
  function nameScore(tags,names){
    let score=0;
    for(let i=0;i<names.length;i++){
      const needle=norm(names[i]);
      for(const name of tagNames(tags)){
        const a=norm(name);
        if(a===needle)score=Math.max(score,i===0?140:120);
        else if(a.includes(needle)&&needle.length>3)score=Math.max(score,70);
        else if(needle.includes(a)&&a.length>3)score=Math.max(score,55);
      }
    }
    return score;
  }
  function kindScore(tags){
    const w=String(tags?.waterway||"").toLowerCase();
    if(w==="river")return 25;
    if(w==="stream")return 18;
    if(w==="canal")return -35;
    return 0;
  }
  function distance(lat,lon,center){
    if(!center||!Number.isFinite(lat)||!Number.isFinite(lon))return 1e9;
    const dx=(lon-center.lng)*Math.cos(center.lat*Math.PI/180),dy=lat-center.lat;
    return Math.sqrt(dx*dx+dy*dy);
  }
  class OsmWatercourseFinder{
    constructor({fetchImpl,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),
      minimumNominatimIntervalMs=1100}={}){
      if(typeof fetchImpl!=="function")throw new TypeError("Fetch transport required");
      this.fetch=fetchImpl;this.now=now;this.sleep=sleep;
      this.minimumNominatimIntervalMs=minimumNominatimIntervalMs;this.lastNominatim=-Infinity;
    }
    async json(url,{signal,label="Abfrage"}={}){
      if(url.startsWith("https://nominatim.openstreetmap.org/")){
        const wait=this.minimumNominatimIntervalMs-(this.now()-this.lastNominatim);
        if(wait>0)await this.sleep(wait);
        this.lastNominatim=this.now();
      }
      if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
      const response=await this.fetch(url,{headers:{"Accept":"application/json"},signal});
      if(!response.ok)throw Error(label+" – HTTP "+response.status);
      return response.json();
    }
    async find(name,{signal,onProgress=()=>{},center}={}){
      const names=aliases(name).slice(0,7),candidates=new Map(),errors=[];
      function add(id,tags,source,lat,lon,display,osmType="relation"){
        if(!id||!tags)return;
        if(osmType==="relation"&&tags.type!=="waterway")return;
        if(osmType==="way"&&!/^(river|stream|canal|drain|ditch)$/.test(String(tags.waterway||"")))return;
        const ns=nameScore(tags,names);
        if(ns<=0)return;
        const d=distance(Number(lat),Number(lon),center);
        const proximity=d<.5?20:d<2?12:d<8?5:0;
        const score=ns+kindScore(tags)+proximity+(osmType==="relation"?18:0);
        const key=osmType+":"+id;
        if(!candidates.has(key)||score>candidates.get(key).score)
          candidates.set(key,{id,osmType,tags,score,nameScore:ns,source,lat:Number(lat),lon:Number(lon),display:display||""});
      }
      for(let i=0;i<names.length;i++){
        onProgress({phase:"names",step:i+1,total:names.length});
        try{
          const params=new URLSearchParams({q:names[i],format:"jsonv2",limit:"40",addressdetails:"1",extratags:"1"});
          const results=await this.json("https://nominatim.openstreetmap.org/search?"+params,{signal,label:"Namenssuche"});
          for(const x of (Array.isArray(results)?results:[]).slice(0,30)){
            const ot=x.osm_type;
            if(!["relation","way"].includes(ot)||!x.osm_id)continue;
            try{
              const data=await this.json("https://api.openstreetmap.org/api/0.6/"+ot+"/"+encodeURIComponent(x.osm_id)+".json",{signal,label:"Gewässer prüfen"});
              const found=data.elements?.find(e=>e.type===ot&&String(e.id)===String(x.osm_id));
              if(found)add(x.osm_id,found.tags,"Nominatim",x.lat,x.lon,x.display_name,ot);
            }catch(err){if(signal?.aborted)throw err;errors.push(String(err.message||err));}
          }
        }catch(err){if(signal?.aborted)throw err;errors.push(String(err.message||err));}
      }
      if(![...candidates.values()].some(c=>c.osmType==="relation")){
        onProgress({phase:"alternative"});
        const pattern=names.map(n=>n.replace(/[.*+?^\u0024{}()|[\]\\]/g,"\\$&")).join("|");
        const q='[out:json][timeout:30];(relation["type"="waterway"]["name"~"('+pattern+')",i];way["waterway"~"^(river|stream|canal|drain|ditch)$"]["name"~"('+pattern+')",i];);out center tags 100;';
        for(const server of ["https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter"]){
          try{
            const data=await this.json(server+"?data="+encodeURIComponent(q),{signal,label:"Alternative Flusssuche"});
            for(const x of data.elements||[])if(["relation","way"].includes(x.type))
              add(x.id,x.tags,"Overpass",x.center?.lat,x.center?.lon,"",x.type);
            if(candidates.size)break;
          }catch(err){if(signal?.aborted)throw err;errors.push(String(err.message||err));}
        }
      }
      const list=[...candidates.values()].sort((a,b)=>b.nameScore-a.nameScore||b.score-a.score||Number(a.id)-Number(b.id));
      if(!list.length)throw Error("Kein passendes Gewässer gefunden"+(errors.length?" · "+errors.at(-1):""));
      return list;
    }
    async resolve(candidate,{query,signal,onProgress=()=>{}}={}){
      let selected=candidate;
      if(candidate.osmType==="way"){
        try{
          onProgress({phase:"parent"});
          const parents=await this.json("https://api.openstreetmap.org/api/0.6/way/"+encodeURIComponent(candidate.id)+"/relations.json",{signal,label:"Übergeordnete Flussrelation"});
          const names=aliases(query||candidate.tags?.name||"");
          const related=(parents.elements||[]).filter(e=>e.type==="relation"&&e.tags?.type==="waterway"&&nameScore(e.tags,names)>=100);
          related.sort((a,b)=>nameScore(b.tags,names)-nameScore(a.tags,names));
          if(related.length)selected={id:related[0].id,osmType:"relation",tags:related[0].tags};
        }catch(err){if(signal?.aborted)throw err;}
      }
      onProgress({phase:"geometry"});
      const type=selected.osmType==="way"?"way":"relation";
      const url="https://api.openstreetmap.org/api/0.6/"+type+"/"+encodeURIComponent(selected.id)+"/full.json";
      return {match:selected,data:await this.json(url,{signal,label:"Flussverlauf"})};
    }
  }
  const api=Object.freeze({OsmWatercourseFinder,aliases,tagNames,nameScore,kindScore,norm});
  root.Pin2MapOsmWatercourseFinder=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
