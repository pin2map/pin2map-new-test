"use strict";
/* Offline project transfer. No network, DOM, Leaflet or storage access.
   New format round-trips the complete project. The predecessor's list-based
   .pin2map format and GPX need explicit conversion, never silent geocoding. */
(function(root){
  const clone=x=>JSON.parse(JSON.stringify(x));
  const isObj=x=>!!x&&typeof x==="object"&&!Array.isArray(x);
  const string=x=>String(x??"").trim();
  const id=()=>root.crypto?.randomUUID?.()||"import-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  function point(lat,lng){
    if(lat===null||lng===null||String(lat).trim()===""||String(lng).trim()==="")throw Error("Fehlende Koordinaten");
    lat=Number(lat);lng=Number(lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)
      throw Error("Ungültige Koordinaten");return {lat,lng};
  }
  function safeProject(data){
    if(!isObj(data)||!Array.isArray(data.layers)||!Array.isArray(data.pins))
      throw Error("Die Datei enthält kein gültiges pin2map-Projekt.");
    const project=clone(data);
    if(project.layers.length>10000||project.pins.length>150000||
      (project.areas||[]).length>20000||(project.rivers||[]).length>20000)
      throw Error("Projekt überschreitet die zulässigen Größen.");
    const ids=new Set();
    for(const layer of project.layers){
      if(!isObj(layer)||!string(layer.id)||!string(layer.name)||ids.has(layer.id))
        throw Error("Ungültige oder doppelte Ebene.");
      ids.add(layer.id);
    }
    if(!ids.has("private"))throw Error("Projekt enthält keine private Ebene.");
    const objectIds=new Set();
    for(const [kind,items] of [["Pin",project.pins],["Fläche",project.areas||[]],["Fluss",project.rivers||[]]]){
      if(!Array.isArray(items))throw Error("Ungültige "+kind+"-Sammlung.");
      for(const item of items){
        if(!isObj(item)||!string(item.id)||!ids.has(item.layerId)||objectIds.has(item.id))
          throw Error("Ungültige oder doppelte "+kind+"-ID bzw. Ebene.");
        objectIds.add(item.id);
        if(kind==="Pin"){
          point(item.lat,item.lng);
          if(item.gpxAttachment!==undefined){
            const a=item.gpxAttachment;
            if(!isObj(a)||(a.sourceGpx!==undefined&&
              (typeof a.sourceGpx!=="string"||a.sourceGpx.length>50*1024*1024))||
              !Array.isArray(a.chains)||!a.chains.length||
              !a.chains.every(chain=>Array.isArray(chain)&&chain.length>=2&&chain.every(p=>
              Array.isArray(p)&&p.length>=2&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1]))&&
              Math.abs(Number(p[0]))<=90&&Math.abs(Number(p[1]))<=180)))
              throw Error("Ungültiger GPX-Anhang");
          }
        }
        if(kind==="Fläche"&&(!["area","lake"].includes(item.kind)||
          !["Polygon","MultiPolygon"].includes(item.geometry?.type)||!Array.isArray(item.geometry?.coordinates)))
          throw Error("Ungültige Polygongeometrie.");
        if(kind==="Fluss"&&(!Array.isArray(item.chains)||!item.chains.every(chain=>
          Array.isArray(chain)&&chain.length>=2&&chain.every(p=>Array.isArray(p)&&p.length>=2&&
          Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1]))&&
          Math.abs(Number(p[0]))<=90&&Math.abs(Number(p[1]))<=180))))
          throw Error("Ungültige Flussgeometrie.");
      }
    }
    if(project.favorites!==undefined&&!Array.isArray(project.favorites))
      throw Error("Ungültige Favoriten.");
    return project;
  }
  function fromLegacy(doc,name){
    if(!isObj(doc)||doc.format!=="pin2map"||typeof doc.list!=="string")
      throw Error("Nicht unterstütztes Vorgängerformat.");
    const layers=[{id:"private",name:"Privat",color:"#808080",visible:true}];
    const pins=[],areas=[],unresolved=[];
    const cache=isObj(doc.cache)?doc.cache:{};
    const colors={red:"#e64545",blue:"#326cc2",green:"#16836b",yellow:"#ffd700",
      orange:"#e07c2b",purple:"#865ab8",pink:"#c14d72"};
    const visibility=isObj(doc.categoryVisibility)?doc.categoryVisibility:{};
    let category="Ohne Kategorie",layerId=null;
    function ensureCategory(name,color){
      category=name||"Kategorie";
      const existing=layers.find(l=>l.name===category);
      if(existing){layerId=existing.id;return;}
      layerId=id();
      layers.push({id:layerId,name:category,color:colors[string(color).toLowerCase()]||
        (/^#[0-9a-f]{3,8}$/i.test(string(color))?color:"#326cc2"),
        visible:visibility[category]!==false});
    }
    for(const source of doc.list.replace(/\r/g,"").split("\n")){
      const line=source.trim();if(!line)continue;
      if(line.startsWith("#")){
        const header=line.slice(1).trim();
        const match=header.match(/\[([^\]]+)\]/);
        const remainder=(match?header.replace(match[0],""):header).trim();
        // Match the predecessor parser: optional leading emoji/symbol.
        const parts=remainder.split(/\s+/),named=parts.length>1?parts.slice(1).join(" "):remainder;
        ensureCategory(named,match?.[1]);continue;
      }
      const area=line.startsWith("@"),raw=(area?line.slice(1):line).trim();
      const labelMatch=raw.match(/\s+\((.*)\)\s*$/);
      const query=labelMatch?raw.slice(0,labelMatch.index).trim():raw;
      const name=(labelMatch?.[1]||query).trim();
      const saved=isObj(cache[line])?cache[line]:null;
      if(saved && !area && saved.kind==="pin"){
        try{
          const loc=point(saved.lat,saved.lon);
          if(!layerId)ensureCategory("Ohne Kategorie");
          pins.push({id:id(),lat:loc.lat,lng:loc.lng,name:name.slice(0,120),layerId,
            note:string(saved.note),url:string(saved.pinUrl),
            ...(saved.createdAt?{createdAt:saved.createdAt}:{})});
          continue;
        }catch(_){}
      }
      if(saved && area && saved.kind==="area" &&
        ["Polygon","MultiPolygon"].includes(saved.geometry?.type) &&
        Array.isArray(saved.geometry?.coordinates) && saved.geometry.coordinates.length){
        if(!layerId)ensureCategory("Ohne Kategorie");
        areas.push({id:id(),name:name.slice(0,120),layerId,kind:"area",
          geometry:clone(saved.geometry),note:"",url:""});
        continue;
      }
      const coord=query.match(/^([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)$/);
      if(coord&&!area){
        try{
          const loc=point(coord[1],coord[2]);
          if(!layerId)ensureCategory("Ohne Kategorie");
          pins.push({id:id(),lat:loc.lat,lng:loc.lng,name:name.slice(0,120),layerId});
          continue;
        }catch(_){}
      }
      // A bare place name / @polygon query has no resolved geometry.
      // Preserve the exact source document, and expose the count in the UI.
      unresolved.push(line);
    }
    const viewport=Array.isArray(doc.view?.center)&&doc.view.center.length===2?
      {lat:Number(doc.view.center[0]),lng:Number(doc.view.center[1]),zoom:Number(doc.view.zoom)||6}:null;
    const rivers=[];
    // Restore separately persisted predecessor river geometry.
    for(const legacyRiver of (Array.isArray(doc.rivers)?doc.rivers:[])){
      if(!isObj(legacyRiver)||!Array.isArray(legacyRiver.chains))continue;
      try{
        const chains=legacyRiver.chains.map(chain=>chain.map(p=>{
          const valid=point(p[0],p[1]);return [valid.lat,valid.lng];
        })).filter(chain=>chain.length>=2);
        if(chains.length)rivers.push({id:id(),name:string(legacyRiver.name)||"Fluss (Vorgänger)",
          layerId:"private",chains,note:"",url:""});
      }catch(_){}
    }
    for(const chain of (Array.isArray(doc.gpxTracks)?doc.gpxTracks:[])){
      if(!Array.isArray(chain)||chain.length<2)continue;
      try{
        const valid=chain.map(p=>{const v=point(p[0],p[1]);return [v.lat,v.lng]});
        rivers.push({id:id(),name:"GPX-Track (Vorgänger)",layerId:"private",chains:[valid],note:"",url:""});
      }catch(_){}
    }
    const incoming={layers,pins,areas,rivers,favorites:[],...(viewport?{viewport}:{})};
    // Unconverted legacy categories, rivers and caches must not disappear.
    if(unresolved.length)incoming.legacySources=[{filename:name,original:clone(doc),unresolved}];
    return {project:safeProject(incoming),unresolved:unresolved.length,legacy:true};
  }
  function fromNew(doc){
    if(!isObj(doc)||doc.format!=="pin2map-new"||doc.version!==1)
      throw Error("Nicht unterstützte pin2map-Dateiversion.");
    return {project:safeProject(doc.project),unresolved:0,legacy:false};
  }
  function parseProject(text,name="Projekt.pin2map"){
    if(typeof text!=="string"||text.length>50*1024*1024)throw Error("Datei ist zu groß.");
    const trimmed=text.startsWith("PIN2MAP\n")?text.slice(8):text;
    let doc;try{doc=JSON.parse(trimmed)}catch(_){throw Error("Ungültige pin2map/JSON-Datei.");}
    if(doc?.format==="pin2map-new")return fromNew(doc);
    if(doc?.format==="pin2map")return fromLegacy(doc,name);
    throw Error("Unbekanntes pin2map-Dateiformat.");
  }
  function encodeProject(state){
    const project=safeProject(state);
    return JSON.stringify({format:"pin2map-new",version:1,created:new Date().toISOString(),
      project});
  }
  function merge(base,incoming){
    const current=safeProject(base),other=safeProject(incoming);
    const result=clone(current),layerMap=new Map([["private","private"]]);
    const layerNames=new Set(result.layers.map(l=>l.name.toLocaleLowerCase("de")));
    const allIds=new Set([...result.layers,...result.pins,...(result.areas||[]),...(result.rivers||[])].map(x=>x.id));
    function nextId(){let k=id();while(allIds.has(k))k=id();allIds.add(k);return k;}
    for(const layer of other.layers){
      if(layer.id==="private")continue;
      let name=layer.name,n=2;
      while(layerNames.has(name.toLocaleLowerCase("de")))name=layer.name+" ("+n++ +")";
      layerNames.add(name.toLocaleLowerCase("de"));
      const newId=nextId();layerMap.set(layer.id,newId);
      result.layers.push({...layer,id:newId,name});
    }
    for(const kind of ["pins","areas","rivers"]){
      if(!Array.isArray(result[kind]))result[kind]=[];
      for(const object of (other[kind]||[]))
        result[kind].push({...object,id:nextId(),layerId:layerMap.get(object.layerId)||"private"});
    }
    // Favorites are device/project-owned records. Import without overwriting
    // existing favorites; regenerate their IDs if an ID is present.
    if(!Array.isArray(result.favorites))result.favorites=[];
    for(const favorite of other.favorites||[])
      result.favorites.push({...favorite,...(favorite.id?{id:nextId()}:{})});
    if(other.legacySources?.length)
      result.legacySources=[...(result.legacySources||[]),...clone(other.legacySources)];
    return safeProject(result);
  }
  function gpxRead(text,DOMParserApi=root.DOMParser,{attachTracks=false,filename="Route.gpx"}={}){
    if(!DOMParserApi)throw Error("GPX/XML-Parser nicht verfügbar.");
    const doc=new DOMParserApi().parseFromString(text,"application/xml");
    if(doc.getElementsByTagName("parsererror").length||
      doc.documentElement?.localName?.toLowerCase()!=="gpx")
      throw Error("Ungültige GPX-Datei.");
    const elements=(element,name)=>Array.from(element.getElementsByTagNameNS("*",name));
    const names=el=>elements(el,"name")[0]?.textContent?.trim()||"GPX-Punkt";
    const pins=elements(doc,"wpt").map((w,i)=>{
      const p=point(w.getAttribute("lat"),w.getAttribute("lon"));
      return {id:id(),name:(names(w)||"GPX-Punkt "+(i+1)).slice(0,120),
        ...p,layerId:"private"};
    });
    const rivers=[],attachments=[];
    for(const trk of elements(doc,"trk")){
      const chains=elements(trk,"trkseg").map(seg=>elements(seg,"trkpt").map(pt=>{
        const p=point(pt.getAttribute("lat"),pt.getAttribute("lon"));return [p.lat,p.lng];
      })).filter(chain=>chain.length>=2);
      if(chains.length){
        if(attachTracks)attachments.push({name:names(trk),chains});
        else rivers.push({id:id(),layerId:"private",name:names(trk),chains,note:"",url:""});
      }
    }
    for(const route of elements(doc,"rte")){
      const chain=elements(route,"rtept").map(pt=>{const p=point(pt.getAttribute("lat"),pt.getAttribute("lon"));return [p.lat,p.lng]});
      if(chain.length>=2){
        if(attachTracks)attachments.push({name:names(route),chains:[chain]});
        else rivers.push({id:id(),layerId:"private",name:names(route),chains:[chain],note:"",url:""});
      }
    }
    if(attachTracks){
      for(const track of attachments){
        const first=track.chains[0][0],label=string(filename).replace(/\.gpx$/i,"")||track.name;
        pins.push({id:id(),name:label.slice(0,120),lat:first[0],lng:first[1],
          layerId:"private",gpxAttachment:{filename:String(filename),name:track.name,chains:track.chains,
            ...(attachments.length===1?{sourceGpx:text}:{})}});
      }
    }
    if(!pins.length&&!rivers.length)throw Error("GPX enthält weder Wegpunkte noch Tracks/Routen.");
    return {project:safeProject({layers:[{id:"private",name:"Privat",color:"#808080",visible:true}],
      pins,areas:[],rivers,favorites:[]}),unresolved:0,gpx:true};
  }
  const xmlEscape=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
  function encodeGpx(state){
    const project=safeProject(state);
    const out=['<?xml version="1.0" encoding="UTF-8"?>',
      '<gpx version="1.1" creator="pin2map NEW" xmlns="http://www.topografix.com/GPX/1/1">'];
    for(const p of project.pins)out.push('<wpt lat="'+p.lat+'" lon="'+p.lng+'"><name>'+
      xmlEscape(p.name||"Pin")+'</name></wpt>');
    for(const pin of project.pins){
      const attachment=pin.gpxAttachment;
      if(!attachment?.chains?.length)continue;
      out.push('<trk><name>'+xmlEscape(attachment.name||attachment.filename||pin.name)+'</name>');
      for(const chain of attachment.chains){
        out.push('<trkseg>');
        for(const pt of chain)out.push('<trkpt lat="'+pt[0]+'" lon="'+pt[1]+'"></trkpt>');
        out.push('</trkseg>');
      }
      out.push('</trk>');
    }
    for(const river of project.rivers||[]){
      out.push('<trk><name>'+xmlEscape(river.name)+'</name>');
      for(const chain of river.chains){
        out.push('<trkseg>');
        for(const pt of chain)out.push('<trkpt lat="'+pt[0]+'" lon="'+pt[1]+'"></trkpt>');
        out.push('</trkseg>');
      }
      out.push('</trk>');
    }
    out.push('</gpx>');return out.join("\n");
  }
  function exportSubset(state,{visible=false,filterPins=null}={}){
    const source=safeProject(state);
    // Older NEW builds stored whole predecessor files even when every list
    // entry had already been converted. Avoid carrying those redundant
    // source copies in subsequent exports; retain any unresolved originals.
    if(Array.isArray(source.legacySources)){
      source.legacySources=source.legacySources.filter(entry=>entry?.unresolved?.length);
      if(!source.legacySources.length)delete source.legacySources;
    }
    if(!visible)return source;
    const active=new Set(source.layers.filter(l=>l.visible).map(l=>l.id));
    const project={...source,
      pins:source.pins.filter(pin=>active.has(pin.layerId)&&(!filterPins||filterPins(pin))),
      areas:(source.areas||[]).filter(a=>active.has(a.layerId)),
      rivers:(source.rivers||[]).filter(r=>active.has(r.layerId)),
      favorites:[],
      layers:source.layers.filter(l=>l.id==="private"||active.has(l.id))
    };
    // Legacy raw-source documents cannot be sliced per visible item safely.
    delete project.legacySources;
    return safeProject(project);
  }
  const api=Object.freeze({safeProject,parseProject,encodeProject,merge,gpxRead,encodeGpx,exportSubset});
  root.Pin2MapProjectTransfer=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
