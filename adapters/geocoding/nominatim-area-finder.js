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
  // Overpass is_in returns named enclosing OSM areas, not merely postal
  // address components. Only genuine area-bearing thematic features are
  // eligible; buildings, roads and point POIs must never be offered.
  function thematicKind(tags){
    const boundary=String(tags.boundary||"").toLowerCase();
    const place=String(tags.place||"").toLowerCase();
    if(["island","islet","archipelago"].includes(place))return "island";
    if(["national_park","protected_area","nature_reserve"].includes(boundary)||
       tags.leisure==="nature_reserve"||tags.protect_class)return "protected_area";
    if(tags.landuse==="military"||tags.military||
       ["military","restricted_area"].includes(boundary))return "restricted_area";
    if(["administrative","political"].includes(boundary))return "administrative";
    if(tags.natural==="water"||["lake","reservoir","pond"].includes(tags.water)||
       tags.landuse==="reservoir")return "lake";
    if(tags.natural==="wetland")return "natural_area";
    if(tags.landuse==="forest"||tags.natural==="wood")return "natural_area";
    if(["region","locality"].includes(place))return "region";
    return null;
  }
  function overpassRow(item){
    const tags=item.tags||{},kind=thematicKind(tags),name=tags["name:de"]||tags.name;
    // Overpass 0.7.57+ returns closed ways unchanged but relation areas use
    // virtual IDs offset by 3,600,000,000. Older area-way offsets are also
    // recognized. Resolve to a real OSM identity before Nominatim lookup.
    const id=Number(item.id);
    if(!kind||!name||!Number.isSafeInteger(id)||id<=0)return null;
    let osmType=item.type,osmId=id;
    if(item.type==="area"){
      if(id>=3600000000){osmType="relation";osmId=id-3600000000;}
      else if(id>=2400000000){osmType="way";osmId=id-2400000000;}
      else return null;
    }
    if(!["relation","way"].includes(osmType)||osmId<=0)return null;
    return {kind,name,detail:kind,osmId,osmType,fromContainingArea:true};
  }
  // Public global Overpass nodes can reject browser requests. Regional
  // endpoints with documented coverage are preferred where available;
  // never send a coordinate to a region-only server outside its coverage.
  function areaProviders(point){
    const lat=Number(point.lat),lng=Number(point.lng);
    const europe=lat>=34&&lat<=72&&lng>=-25&&lng<=45;
    const northAmerica=lat>=7&&lat<=84&&lng>=-169&&lng<=-50;
    if(europe)return ["https://ovp.dresel.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass-api.de/api/interpreter"];
    if(northAmerica)return ["https://ovp.dresel.systems/api-na/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass-api.de/api/interpreter"];
    // Global coverage: direct browser GET to maps.mail.ru returned named
    // polygons for Rio in the real HTTPS diagnostic; other public instances
    // refused or timed out. A worldwide source must never be replaced with a
    // regional extract that silently returns an empty set.
    return ["https://maps.mail.ru/osm/tools/overpass/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass-api.de/api/interpreter"];
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
    async hierarchyAt(point,{signal,onPartial=()=>{}}={}){
      const params=new URLSearchParams({format:"jsonv2",addressdetails:"1",zoom:"18",
        lat:String(point.lat),lon:String(point.lng)});
      const result=await this.request("https://nominatim.openstreetmap.org/reverse?"+params,signal);
      const address=result.address||{},seen=new Set(),rows=[];
      let extraUnavailable=false;
      function add(row){
        if(!row?.name)return;
        const key=row.osmId?row.osmType+":"+row.osmId:row.kind+"|"+normalize(row.name);
        if(seen.has(key))return;
        seen.add(key);rows.push(row);
      }
      // A reverse address is only a partial administrative description,
      // not a spatial inventory of the polygons covering the point.
      for(const key of ["country","state","region","state_district","county",
        "municipality","city","town","village","hamlet","locality","island"])
        if(address[key])add({kind:key,name:address[key],detail:key});
      // A reverse result can itself identify a named area (e.g. an island).
      const reverseTags={boundary:result.class==="boundary"?result.type:"",
        place:result.class==="place"?result.type:"",
        natural:result.class==="natural"?result.type:"",
        leisure:result.class==="leisure"?result.type:"",
        landuse:result.class==="landuse"?result.type:""};
      const reverseKind=thematicKind(reverseTags);
      if(reverseKind&&result.name&&["way","relation"].includes(result.osm_type))
        add({kind:reverseKind,name:result.name,detail:reverseKind,
          osmType:result.osm_type,osmId:Number(result.osm_id)});
      // Render the established address hierarchy immediately. External
      // spatial enrichment may be delayed by Overpass rate limits.
      onPartial({rows:rows.slice(),countryCode:address.country_code||""});
      if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
      // Keep Nominatim reverse requests governed by request()'s limiter.
      // Optional Overpass providers run in parallel, independently of that
      // Nominatim limiter, with at most two concurrent provider requests.
      const queryPrefix=[
        "[out:json][timeout:45];is_in(",Number(point.lat),",",Number(point.lng),")->.inside;(",
        'area.inside["boundary"~"^(national_park|protected_area|nature_reserve|military|restricted_area)$"];',
        'area.inside["place"~"^(island|islet|archipelago|region|locality)$"];',
        'area.inside["natural"="water"];',
        'area.inside["natural"~"^(wetland|wood)$"];',
        'area.inside["water"~"^(lake|reservoir|pond)$"];',
        'area.inside["landuse"~"^(military|reservoir|forest)$"];',
        'area.inside["military"~"^(training_area|range|danger_area)$"];',
        'area.inside["leisure"="nature_reserve"];',
        'area.inside["protect_class"];',
        'area.inside["boundary"="administrative"];'
      ].join("");
      const countryCode=address.country_code||"";
      const providers=areaProviders(point);
      let succeeded=0,foundExtra=false;
      const applyItems=elements=>{
        let changed=false;
        for(const item of elements){
          const row=overpassRow(item);
          if(!row)continue;
          // If the same administrative or island name was reverse-geocoded,
          // enrich its existing row with the exact polygon identity.
          const existing=rows.find(x=>x.osmId&&x.osmType===row.osmType&&
            x.osmId===row.osmId)||
            rows.find(x=>x.kind===row.kind&&normalize(x.name)===normalize(row.name))||
            (["administrative","island"].includes(row.kind)
              ?rows.find(x=>normalize(x.name)===normalize(row.name)):null);
          if(existing){
            if(!existing.osmId){
              existing.osmType=row.osmType;existing.osmId=row.osmId;
              if(row.kind==="island")existing.fromContainingArea=true;
              changed=true;
            }
            continue;
          }
          const count=rows.length;
          add(row);
          if(rows.length>count){changed=true;foundExtra=true;}
        }
        if(changed&&!signal?.aborted)
          onPartial({rows:rows.slice(),countryCode});
      };
      const fetchProvider=async endpoint=>{
        if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
        const regional=endpoint.includes("dresel.systems");
        const query=queryPrefix+(regional
          ?")->.found;(way(pivot.found);rel(pivot.found););out tags;"
          :")->.found;.found out tags;");
        const controller=new AbortController();
        const cancel=()=>controller.abort();
        signal?.addEventListener("abort",cancel,{once:true});
        const timeoutMs=regional?12000:endpoint.includes("maps.mail.ru")?32000:24000;
        const timer=setTimeout(cancel,timeoutMs);
        try{
          const response=await this.fetch(endpoint+"?"+new URLSearchParams({data:query}),
            {headers:{"Accept-Language":"de"},signal:controller.signal});
          if(!response.ok)throw Error("Flächensuche – HTTP "+response.status);
          const body=await response.json();
          if(!Array.isArray(body?.elements)||body.remark)
            throw Error("Ungültige oder unvollständige Gebietsantwort");
          if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
          succeeded++;
          applyItems(body.elements);
          return true;
        }catch(error){
          if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
          return false;
        }finally{
          clearTimeout(timer);signal?.removeEventListener("abort",cancel);
        }
      };
      // Start two independent public providers together. Only if they
      // produce no new candidate do we consult a third provider, protecting
      // fair-use capacity against unnecessary requests.
      try{
        await Promise.all(providers.slice(0,2).map(fetchProvider));
        if(signal?.aborted)throw Object.assign(new Error("Aborted"),{name:"AbortError"});
        if(!foundExtra&&providers[2])await fetchProvider(providers[2]);
      }catch(error){
        if(signal?.aborted||error?.name==="AbortError")throw error;
      }
      extraUnavailable=succeeded===0;
      return {rows,countryCode:address.country_code||"",extraUnavailable};
    }
    async findContaining(entry,point,{countryCode="",signal}={}){
      // Do not restrict a state/country polygon to a six-degree bounding box:
      // for New South Wales, for example, the polygon extends well beyond
      // such a box, especially when a user clicks near its eastern boundary.
      // That bounded search silently removed the correct candidate.
      // A spatial Overpass candidate already has an exact OSM identity.
      // Nominatim lookup avoids text-search ranking, duplicate place names
      // and result-limit omissions, while keeping polygon output identical
      // to the ordinary search box.
      if(entry.osmId&&["way","relation"].includes(entry.osmType)){
        const params=new URLSearchParams({format:"jsonv2",polygon_geojson:"1",
          addressdetails:"1",namedetails:"1",osm_ids:
            (entry.osmType==="relation"?"R":"W")+entry.osmId});
        try{
          const lookedUp=await this.request(
            "https://nominatim.openstreetmap.org/lookup?"+params,signal);
          const exact=(Array.isArray(lookedUp)?lookedUp:[]).find(x=>
            x.osm_type===entry.osmType&&String(x.osm_id)===String(entry.osmId)&&
            ["Polygon","MultiPolygon"].includes(x.geojson?.type));
          if(exact)return exact;
        }catch(error){
          if(signal?.aborted||error?.name==="AbortError")throw error;
          // Fall through to the ordinary polygon text search.
        }
      }
      const params=new URLSearchParams({
        format:"jsonv2",polygon_geojson:"1",addressdetails:"1",
        namedetails:"1",limit:"50",dedupe:"0",q:entry.name
      });
      if(countryCode)params.set("countrycodes",countryCode.toLowerCase());
      const results=await this.request(
        "https://nominatim.openstreetmap.org/search?"+params,signal);
      const geometry=root.Pin2MapAreaGeometry;
      const sameName=x=>matches(x,[entry.name])||
        normalize(x.display_name?.split(",")[0])===normalize(entry.name);
      const candidates=(Array.isArray(results)?results:[]).filter(x=>
        x.osm_id&&["relation","way"].includes(x.osm_type)&&
        ["Polygon","MultiPolygon"].includes(x.geojson?.type)&&sameName(x));
      const typeMatches=x=>{
        const addressType=String(x.addresstype||x.type||"").toLowerCase();
        const adminLevel=String(x.extratags?.admin_level||"");
        if(entry.kind==="state")return addressType==="state"||adminLevel==="4";
        if(entry.kind==="country")return addressType==="country"||adminLevel==="2";
        if(entry.kind==="county")return addressType==="county"||adminLevel==="6";
        if(entry.kind==="city")return ["city","municipality"].includes(addressType);
        if(["town","village","hamlet","locality","island"].includes(entry.kind))
          return addressType===entry.kind||
            normalize(x.address?.[entry.kind])===normalize(entry.name);
        return addressType===entry.kind;
      };
      const scored=candidates.map(candidate=>({
        candidate,
        contains:geometry.containsPoint(candidate.geojson,point.lng,point.lat),
        exact:entry.osmId&&String(candidate.osm_id)===String(entry.osmId)&&
          candidate.osm_type===entry.osmType,
        kindMatch:typeMatches(candidate)
      }));
      scored.sort((a,b)=>Number(b.exact)-Number(a.exact)||
        Number(b.contains)-Number(a.contains)||
        Number(b.kindMatch)-Number(a.kindMatch));
      if(scored[0]?.contains||scored[0]?.exact)return scored[0].candidate;
      // The reverse geocoder ALREADY resolved the clicked point to this
      // administrative hierarchy. If its name and country identify exactly
      // one admin polygon, prefer that explicit user selection even if the
      // polygon returned by Nominatim is simplified at a coastline/border.
      // Never use this fallback for unnamed or ambiguous local features.
      const adminKinds=new Set(["state","country","county","state_district",
        "region","municipality","city","town","village","hamlet","locality","island"]);
      const adminMatches=scored.filter(x=>x.kindMatch);
      if(adminKinds.has(entry.kind)&&countryCode&&adminMatches.length===1){
        return adminMatches[0].candidate;
      }
      return null;
    }
    async findPlace(query,{countryCode="",signal}={}){
      const params=new URLSearchParams({
        format:"jsonv2",addressdetails:"1",limit:"8",q:String(query||"")
      });
      if(countryCode)params.set("countrycodes",countryCode.toLowerCase());
      const response=await this.request(
        "https://nominatim.openstreetmap.org/search?"+params,signal);
      return (Array.isArray(response)?response:[]).filter(x=>
        Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon))&&
        String(x.address?.country_code||"").toUpperCase()===countryCode.toUpperCase());
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
  const api=Object.freeze({NominatimAreaFinder,normalize,variants,matches,lakeCandidate,
    thematicKind,overpassRow,areaProviders});
  root.Pin2MapNominatimAreaFinder=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
