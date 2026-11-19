/* On-demand vector detection. No imports or network requests until explicitly called.
   Independent of Leaflet; never touches persistent pin/layer state. */
let glPromise=null;
async function getGL(){
  if(!glPromise)glPromise=import("https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs");
  return glPromise;
}
const layers=new Set(["water","park","landuse","landcover"]);
// Leaflet uses a 256px world at zoom 0; MapLibre GL uses 512px.
// For identical on-screen scale, MapLibre's camera must be one zoom lower.
export const leafletToMapLibreZoom=zoom=>Math.max(-2,Math.min(21,Number(zoom)-1));
function decode(id){
  if(!Number.isSafeInteger(id)||id<12)return null;
  const kind={2:"way",3:"relation"}[id%10];
  return kind?{type:kind,id:Math.floor(id/10)}:null;
}
function nameParts(props={}){
  return {local:props.name||null,international:props.name_int||null,
    de:props["name:de"]||props.name_de||null,
    en:props["name:en"]||props.name_en||null};
}
function merged(a,b){
  for(const key of ["local","international","de","en"])a[key] ||= b[key];
  return a;
}
export class VectorDetection {
  constructor(){this.map=null;this.root=null;this.count=0;this.totalMs=0;this.pending=null;this.generation=0;}
  async open(position,zoom){
    if(this.map)return;
    if(this.pending)return this.pending;
    const generation=this.generation;
    this.pending=(async()=>{
      const gl=await getGL();
      if(generation!==this.generation)throw Error("Vektorerkennung wurde deaktiviert");
      const root=document.createElement("div");root.className="vector-detection-surface";
      root.setAttribute("aria-hidden","true");
      // Keep the renderer at real on-screen dimensions even while transparent.
      // Off-viewport WebGL canvases may not render queried pixels reliably.
      const host=document.getElementById("map");
      if(!host)throw Error("Leaflet-Kartencontainer nicht gefunden");
      host.prepend(root);this.root=root;
      const map=new gl.Map({container:root,style:"https://tiles.openfreemap.org/styles/liberty",
        center:[position.lng,position.lat],zoom:leafletToMapLibreZoom(zoom),interactive:false,
        attributionControl:false,fadeDuration:0,pitch:0,bearing:0});
      this.map=map;await this.waitIdle(20000);
    })();
    try{await this.pending}catch(error){if(generation===this.generation)this.close();throw error}
    finally{this.pending=null}
  }
  waitIdle(timeout=20000){
    const map=this.map;
    return new Promise((resolve,reject)=>{
      if(!map)return reject(Error("Vektorkarte nicht verfügbar"));
      let ended=false;
      const timer=setTimeout(()=>finish(Error("Vektorkacheln nicht rechtzeitig geladen")),timeout);
      const idle=()=>finish(),fail=event=>finish(event?.error||Error("Vektorkartenfehler"));
      function finish(error){
        if(ended)return;ended=true;clearTimeout(timer);map.off("idle",idle);map.off("error",fail);
        error?reject(error):resolve();
      }
      map.on("idle",idle);map.on("error",fail);
      if(map.loaded())finish();
    });
  }
  async identify(position,zoom){
    const start=performance.now();
    await this.open(position,zoom);
    const m=this.map;
    m.jumpTo({center:[position.lng,position.lat],zoom:leafletToMapLibreZoom(zoom)});
    await this.waitIdle();
    const point=m.project([position.lng,position.lat]);
    // Query style features only after CSS + map resize + idle. Track unfiltered
    // counts so a missing source layer is distinguishable from an empty tile.
    const raw=m.queryRenderedFeatures([point.x,point.y]);
    const hits=raw.filter(f=>layers.has(f.sourceLayer));
    const diagnostic={rawFeatures:raw.length,matchingLayers:hits.length,
      mapLibreZoom:m.getZoom(),canvasSize:[m.getCanvas().width,m.getCanvas().height]};
    const entries=new Map();
    for(const f of hits){
      const osm=decode(f.id);
      if(!osm||entries.has(f.id))continue;
      entries.set(f.id,{osm,featureId:f.id,layer:f.sourceLayer,
        classification:f.properties?.class||null,names:nameParts(f.properties)});
    }
    for(const sourceLayer of ["water_name","park"]){
      try{
        for(const f of m.querySourceFeatures("openmaptiles",{sourceLayer})){
          const matched=entries.get(f.id);
          if(matched)merged(matched.names,nameParts(f.properties));
        }
      }catch(_){/* some styles may not expose this source layer */}
    }
    // A probe in the visible renderer must restore Leaflet's camera immediately.
    // Otherwise a click recentres the displayed vector map while the pins stay fixed.
    if(this.root?.classList.contains("is-visible")&&this.getVisibleViewport){
      const viewport=this.getVisibleViewport();
      if(viewport)this.sync(viewport.position,viewport.zoom);
    }
    const elapsedMs=Math.round(performance.now()-start);
    this.count++;this.totalMs+=elapsedMs;
    return {candidates:[...entries.values()],elapsedMs,diagnostic};
  }
  async display(container,position,zoom){
    await this.open(position,zoom);
    // Reuse the *same* WebGL context for visual map and hit-testing.
    if(!this.map||!this.root)throw Error("MapLibre nicht verfügbar");
    container.prepend(this.root);
    this.root.classList.add("is-visible");
    this.root.removeAttribute("aria-hidden");
    this.map.resize();
    this.sync(position,zoom);
    await this.waitIdle(22000);
  }
  hide(){
    if(!this.root||!this.map)return;
    this.root.classList.remove("is-visible");
    this.root.setAttribute("aria-hidden","true");
    this.map.resize();
  }
  sync(position,zoom){
    if(!this.map)return;
    this.map.jumpTo({center:[position.lng,position.lat],zoom:leafletToMapLibreZoom(zoom),bearing:0,pitch:0});
  }
  setPolygonOverlay(geometry){
    if(!this.map)return false;
    const ids={source:"pin2map-polygon-source",fill:"pin2map-polygon-fill",line:"pin2map-polygon-outline"};
    if(!geometry){this.clearPolygonOverlay();return true;}
    if(!["Polygon","MultiPolygon"].includes(geometry.type))
      throw new Error("Flächengeometrie erforderlich");
    const data={type:"Feature",properties:{},geometry};
    const source=this.map.getSource(ids.source);
    if(source){source.setData(data);return true;}
    this.map.addSource(ids.source,{type:"geojson",data});
    this.map.addLayer({id:ids.fill,type:"fill",source:ids.source,
      paint:{"fill-color":"#7642b5","fill-opacity":0.20}});
    this.map.addLayer({id:ids.line,type:"line",source:ids.source,
      paint:{"line-color":"#7642b5","line-width":3}});
    return true;
  }
  clearPolygonOverlay(){
    if(!this.map)return;
    for(const id of ["pin2map-polygon-outline","pin2map-polygon-fill"])
      if(this.map.getLayer(id))this.map.removeLayer(id);
    if(this.map.getSource("pin2map-polygon-source"))
      this.map.removeSource("pin2map-polygon-source");
  }
  setLanguage(language){
    if(!this.map)return 0;
    const order={
      de:["name_de","name_int","name_en","name"],
      en:["name_en","name_int","name","name_de"],
      international:["name_int","name_en","name","name_de"],
      local:["name","name_int","name_en","name_de"]
    }[language]||["name","name_int","name_en","name_de"];
    const field=["coalesce",...order.map(key=>["get",key])];
    let count=0;
    const style=this.map.getStyle();
    for(const layer of style?.layers||[]){
      if(layer.type!=="symbol")continue;
      const original=layer.layout?.["text-field"];
      // Preserve road refs, house numbers and non-name-driven labels.
      if(original===undefined||!JSON.stringify(original).includes("name"))continue;
      try{this.map.setLayoutProperty(layer.id,"text-field",field);count++}
      catch(_){/* style may have special expressions not covered by generic name labels */}
    }
    return count;
  }
  close(){
    this.generation++;
    try{this.map?.remove()}catch(_){}
    this.map=null;this.root?.remove();this.root=null;
  }
}
