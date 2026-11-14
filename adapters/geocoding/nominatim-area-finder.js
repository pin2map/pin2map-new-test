"use strict";
/* Nominatim area/lake finder. Exact predecessor name matching/aliases and
 * polygon-only filtering, with a rate-limited injectable transport.
 * A provider is configured only after user-enabled geocoding consent.
 */
(function(root){
  function normalize(value){
    return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
      .toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
  }
  function variants(query){
    const n=normalize(query),v=[query];
    const mountainAliases={
      alpen:["Alps","Alpen (Gebirge)","European Alps"],
      anden:["Andes","Andes Mountains","Cordillera de los Andes"],
      "rocky mountains":["Rocky Mountains","Rockies","Rocky Mountain Range"],
      rockies:["Rocky Mountains","Rockies"],
      "sierra nevada":["Sierra Nevada California","Sierra Nevada Spain","Sierra Nevada mountain range"],
      hindukusch:["Hindu Kush","Hindukush","Hindu Kush Mountains"],
      hindukush:["Hindu Kush","Hindukusch","Hindu Kush Mountains"],
      apennin:["Apennine Mountains","Apennines","Appennini"],
      apenninen:["Apennine Mountains","Apennines","Appennini"],
      ural:["Ural Mountains","Uralgebirge"],
      himalaya:["Himalayas","Himalaya Mountains"]
    };
    if(mountainAliases[n])v.push(...mountainAliases[n]);
    if(/^(wuste|desert) /.test(n))v.push(query.replace(/^(wüste|wueste|wuste|desert)\s+/i,""));
    if(/\bsahara\b/.test(n))v.push("Sahara Desert","Sahara");
    if(/\bgobi\b/.test(n))v.push("Gobi Desert","Gobi","Desert of Gobi");
    if(/^(see|lake) /.test(n))v.push(query.replace(/^(see|lake)\s+/i,""));
    if(/^(meer|sea) /.test(n))v.push(query.replace(/^(meer|sea)\s+/i,""));
    return v.filter((x,i)=>x&&v.findIndex(y=>normalize(x)===normalize(y))===i);
  }
  function matches(candidate,terms){
    const names=[candidate.name];
    if(candidate.namedetails)for(const key of Object.keys(candidate.namedetails)){
      if(/^(name|official_name|short_name|alt_name)(:.*)?$/.test(key))
        names.push(candidate.namedetails[key]);
    }
    const vals=names.map(normalize).filter(Boolean);
    return terms.some(term=>{
      const n=normalize(term);
      return n&&vals.some(v=>v===n||v.split(" ").includes(n)||
        (n.split(" ").includes(v)&&v.length>=5));
    });
  }
  function lakeCandidate(x){
    const cls=String(x.class||x.category||"").toLowerCase(),
      type=String(x.type||"").toLowerCase();
    return /^(water|natural|place|landuse)$/.test(cls)||/lake|reservoir|water/.test(type);
  }
  function mountainQuery(s){return /\b(alpen|anden|rocky mountains|rockies|sierra nevada|himalaya|ural|gebirge|mountain range)\b/i.test(s);}
  function mountainCandidate(x){
    const cls=String(x.class||x.category||"").toLowerCase(),
      type=String(x.type||"").toLowerCase();
    return cls==="natural"&&/^(mountain_range|ridge|mountain|peak|massif)$/.test(type)||
      cls==="place"&&/^(region|locality)$/.test(type)&&/mountain|range|gebirge/i.test(String(x.display_name||""));
  }
  class NominatimAreaFinder{
    constructor({fetchImpl,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),minimumIntervalMs=1100}={}){
      if(typeof fetchImpl!=="function")throw new TypeError("Fetch transport required");
      this.fetch=fetchImpl;this.now=now;this.sleep=sleep;
      this.minimumIntervalMs=minimumIntervalMs;
      this.lastRequest=-Infinity;
    }
    async request(url,signal){
      const elapsed=this.now()-this.lastRequest;
      if(elapsed<this.minimumIntervalMs)await this.sleep(this.minimumIntervalMs-elapsed);
      if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
      this.lastRequest=this.now();
      const response=await this.fetch(url,{headers:{"Accept-Language":"de"},signal});
      if(!response.ok)throw Error("Flächensuche – HTTP "+response.status);
      return response.json();
    }
    async hierarchyAt(point,{signal}={}){
      const params=new URLSearchParams({format:"jsonv2",addressdetails:"1",zoom:"18",
        lat:String(point.lat),lon:String(point.lng)});
      const result=await this.request("https://nominatim.openstreetmap.org/reverse?"+params,signal);
      const address=result.address||{},seen=new Set(),rows=[];
      function add(kind,name,detail){
        if(!name||seen.has(kind+"|"+name))return;
        seen.add(kind+"|"+name);rows.push({kind,name,detail});
      }
      if(result.name)add(result.type||result.category||"OSM-Objekt",result.name,
        "OSM "+(result.osm_type||"")+" "+(result.osm_id||""));
      for(const key of ["neighbourhood","quarter","suburb","city_district","borough",
        "village","town","city","municipality","county","state_district","region","state","country"])
        if(address[key])add(key,address[key],key);
      return {rows,countryCode:address.country_code||""};
    }
    async findContaining(entry,point,{countryCode="",signal}={}){
      const delta=3,params=new URLSearchParams({
        format:"jsonv2",polygon_geojson:"1",addressdetails:"1",limit:"50",dedupe:"0",
        q:entry.name,
        viewbox:[point.lng-delta,point.lat+delta,point.lng+delta,point.lat-delta].join(","),
        bounded:"1"
      });
      if(countryCode)params.set("countrycodes",countryCode.toLowerCase());
      const results=await this.request("https://nominatim.openstreetmap.org/search?"+params,signal);
      const geometry=root.Pin2MapAreaGeometry;
      const sameName=x=>String(x.name||x.display_name?.split(",")[0]||"")
        .toLocaleLowerCase()===entry.name.toLocaleLowerCase();
      const candidates=(Array.isArray(results)?results:[]).filter(x=>
        x.osm_id&&["relation","way"].includes(x.osm_type)&&sameName(x)&&
        geometry.containsPoint(x.geojson,point.lng,point.lat));
      candidates.sort((a,b)=>Number(b.addresstype===entry.kind)-Number(a.addresstype===entry.kind));
      return candidates[0]||null;
    }
    async find(query,{kind="area",signal,onProgress=()=>{}}={}){
      if(!["area","lake"].includes(kind))throw new RangeError("Unknown geometry search type");
      const name=String(query||"").trim();
      if(!name)return [];
      const terms=variants(name),seen=new Set(),found=[];
      for(let i=0;i<terms.length;i++){
        if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
        onProgress({phase:"name",step:i+1,total:terms.length});
        const params=new URLSearchParams({
          format:"jsonv2",polygon_geojson:"1",addressdetails:"1",namedetails:"1",
          dedupe:"0",limit:"25",q:terms[i]
        });
        let result;
        try{result=await this.request("https://nominatim.openstreetmap.org/search?"+params,signal);}
        catch(error){if(signal?.aborted||error?.name==="AbortError")throw error;if(i===terms.length-1&&!found.length)throw error;continue;}
        for(const x of Array.isArray(result)?result:[]){
          if(!["Polygon","MultiPolygon"].includes(x.geojson?.type)||!matches(x,terms))continue;
          if(kind==="lake"&&!lakeCandidate(x))continue;
          if(kind==="area"&&mountainQuery(name)&&!mountainCandidate(x))continue;
          const key=String(x.osm_type)+":"+String(x.osm_id);
          if(seen.has(key))continue;
          seen.add(key);found.push(x);
        }
        if(found.length)break;
      }
      return found;
    }
  }
  const api=Object.freeze({NominatimAreaFinder,normalize,variants,matches,lakeCandidate});
  root.Pin2MapNominatimAreaFinder=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
