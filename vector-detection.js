/* On-demand vector detection. No imports or network requests until explicitly called.
   Independent of Leaflet; never touches persistent pin/layer state. */
let glPromise=null;
async function getGL(){
  if(!glPromise)glPromise=import("https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs");
  return glPromise;
}
const layers=new Set(["water","park","landuse","landcover"]);
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
  constructor(){this.map=null;this.root=null;this.count=0;this.totalMs=0;}
  async open(position,zoom){
    if(this.map)return;
    const gl=await getGL();
    const root=document.createElement("div");root.className="vector-detection-surface";
    root.setAttribute("aria-hidden","true");
    document.body.append(root);this.root=root;
    try{
      const map=new gl.Map({container:root,style:"https://tiles.openfreemap.org/styles/liberty",
        center:[position.lng,position.lat],zoom:Math.min(zoom,14),interactive:false,
        attributionControl:false,fadeDuration:0,pitch:0,bearing:0});
      this.map=map;
      await this.waitIdle(20000);
    }catch(error){this.close();throw error;}
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
    m.jumpTo({center:[position.lng,position.lat],zoom:Math.min(zoom,14)});
    await this.waitIdle();
    const point=m.project([position.lng,position.lat]);
    const hits=m.queryRenderedFeatures([point.x,point.y]).filter(f=>layers.has(f.sourceLayer));
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
    const elapsedMs=Math.round(performance.now()-start);
    this.count++;this.totalMs+=elapsedMs;
    return {candidates:[...entries.values()],elapsedMs};
  }
  close(){
    try{this.map?.remove()}catch(_){}
    this.map=null;this.root?.remove();this.root=null;
  }
}
