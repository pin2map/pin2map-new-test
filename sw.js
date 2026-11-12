/* pin2map NEW PWA: offline app shell and on-demand, previously viewed OSM tiles.
   Tile policy: no prefetch, bulk download or offline-area download. */
const CACHE='pin2map-new-v145';
const TILE_CACHE='pin2map-viewed-osm-tiles-v1';
const TILE_META_CACHE='pin2map-viewed-osm-tile-metadata-v1';
const FALLBACK_TILE_TTL=7*24*60*60*1000; // Provider minimum when response headers are inaccessible.
const CORE=[
  "./",
  "./index.html",
  "./domain/project-model.js",
  "./domain/pin-filter.js",
  "./application/pin-operations.js",
  "./application/pin-session.js",
  "./application/filter-operations.js",
  "./application/fit-visible-pins.js",
  "./application/project-persistence.js",
  "./application/project-hydration.js",
  "./application/layer-operations.js",
  "./application/layer-creation.js",
  "./application/pin-move-controller.js",
  "./application/map-click-coordinator.js",
  "./domain/place-search.js",
  "./adapters/geocoding/nominatim-geocoder.js",
  "./application/place-search-service.js",
  "./application/search-pin-transfer.js",
  "./adapters/weather/open-meteo-pin-info.js",
  "./adapters/weather/nasa-power-climatology.js",
  "./adapters/weather/nasa-power-precipitation.js",
  "./adapters/weather/monthly-sun-times.js",
  "./adapters/weather/pin-info-provider.js",
  "./application/pin-info-service.js",
  "./ui/pin-info-label.js",
  "./ui/pin-info-menu.js",
  "./ui/layer-view.js",
  "./ui/bulk-delete-dialog.js",
  "./ui/pin-delete-dialog.js",
  "./ui/pin-layer-picker.js",
  "./adapters/storage/indexeddb-project-store.js",
  "./ui/shell.js",
  "./ui/map-overlay-coordinator.js",
  "./ui/basemap-menu.js",
  "./adapters/esri-imagery-metadata.js",
  "./ui/satellite-inspector.js",
  "./ui/lucide-icons.js",
  "./ui/map-control-feedback.js",
  "./ui/pwa-refresh.js",
  "./ui/search-results.js",
  "./ui/search-form.js",
  "./ui/ui-state.js",
  "./ui/pin-editor.js",
  "./ui/pin-editor-actions.js",
  "./ui/map-gesture-controller.js",
  "./ui/pin-marker-view.js",
  "./ui/pin-move-preview.js",
  "./ui/pin-move-guide.js",
  "./ui/pin-panel-positioner.js",
  "./ui/map-overlay-layout.js",
  "./map-adapter-leaflet.js",
  "./app.js",
  "./styles.css",
  "./manifest.webmanifest"
];
const LEAFLET=[
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
/* GitHub Pages and upstream caches may hold the unqualified /preview/
   URL longer than the new deployment. The release tag is an app-shell
   cache key, never appended to map tiles or third-party URLs. */
const releaseURL=input=>{
  const url=new URL(input,self.registration.scope);
  if(url.origin===self.location.origin)url.searchParams.set('__p2m_release',CACHE);
  return url.href;
};
const isOsmTile=url=>url.protocol==='https:' &&
  url.hostname==='tile.openstreetmap.org' &&
  /^\/\d+\/\d+\/\d+\.png$/.test(url.pathname);


/* Browser image tile requests normally produce opaque (no-cors) responses.
   Opaque headers cannot be read, so use OSM's >=7-day fallback. If response
   headers are readable, honour their actual freshness/expiry directives. */
function tileFreshUntil(response,now){
  if(response.type==='opaque')return now+FALLBACK_TILE_TTL;
  const headers=response.headers;
  const control=(headers.get('Cache-Control')||'').toLowerCase();
  if(/(?:^|,)\s*no-store(?:,|$)/.test(control))return null; // Do not store.
  if(/(?:^|,)\s*(no-cache|must-revalidate)(?:,|$)/.test(control))return now;
  const maxAge=control.match(/(?:^|,)\s*(?:s-maxage|max-age)\s*=\s*(\d+)/);
  const dateMs=Date.parse(headers.get('Date')||'');
  const ageSeconds=Number(headers.get('Age')||0);
  const elapsed=Number.isFinite(dateMs)?Math.max(0,now-dateMs):0;
  const age=Number.isFinite(ageSeconds)?Math.max(0,ageSeconds*1000):0;
  if(maxAge){
    const freshness=Number(maxAge[1])*1000-Math.max(age,elapsed);
    return now+Math.max(0,freshness);
  }
  const expires=Date.parse(headers.get('Expires')||'');
  if(Number.isFinite(expires))return Math.max(now,expires);
  return now+FALLBACK_TILE_TTL;
}
function tileMetadataKey(request){
  // Separate same-origin metadata keys: no duplicate image bodies.
  const key=new URL('./__tile-cache-metadata',self.registration.scope);
  key.searchParams.set('tile',request.url);
  return key.href;
}
async function previouslyViewedTile(request){
  const tiles=await caches.open(TILE_CACHE);
  const cached=await tiles.match(request);
  if(!cached)return null;
  const meta=await caches.open(TILE_META_CACHE);
  const record=await meta.match(tileMetadataKey(request));
  if(!record)return {response:cached,fresh:false}; // V17 migration: revalidate online.
  try{
    const {freshUntil}=await record.json();
    return {response:cached,fresh:Number.isFinite(freshUntil)&&Date.now()<freshUntil};
  }catch(e){
    return {response:cached,fresh:false};
  }
}
async function rememberViewedTile(request,response){
  const until=tileFreshUntil(response,Date.now());
  if(until===null){
    const tiles=await caches.open(TILE_CACHE);
    const meta=await caches.open(TILE_META_CACHE);
    await Promise.all([tiles.delete(request),meta.delete(tileMetadataKey(request))]);
    return; // Honour Cache-Control: no-store, including previously cached tiles.
  }
  const tiles=await caches.open(TILE_CACHE);
  const meta=await caches.open(TILE_META_CACHE);
  // Store the response body first; an absent metadata entry is always stale.
  await tiles.put(request,response.clone());
  await meta.put(tileMetadataKey(request),
    new Response(JSON.stringify({freshUntil:until}),{
      headers:{'Content-Type':'application/json'}
    }));
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // An install either caches the complete offline shell (including Leaflet)
    // or fails, leaving the previous service worker available.
    // Use a small bounded parallel pool: serial downloads can exceed the
    // refresh activation timeout on mobile networks. The install still fails
    // atomically if any required asset cannot be cached.
    const assets=[
      ...CORE.map(path=>({url:path,leaflet:false})),
      ...LEAFLET.map(url=>({url,leaflet:true}))
    ];
    let next=0;
    await Promise.all(Array.from({length:Math.min(6,assets.length)},async()=>{
      while(next<assets.length){
        const {url,leaflet}=assets[next++];
        const request=leaflet
          ?new Request(url,{mode:'cors',cache:'reload'})
          :new Request(releaseURL(url),{cache:'no-store'});
        const response=await fetch(request);
        if(!response.ok)throw Error('Offline app asset failed: '+url);
        await cache.put(url,response);
      }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(name=>name.startsWith('pin2map-new-')&&name!==CACHE)
      .map(name=>caches.delete(name))
  )).then(()=>self.clients.claim()));
});
self.addEventListener('message',event=>{
  if(event.data?.type==='GET_VERSION'){
    event.ports?.[0]?.postMessage({version:CACHE});
  }else if(event.data?.type==='SKIP_WAITING'){
    self.skipWaiting();
  }
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  // Leaflet is served from the installation cache even when offline.
  if(LEAFLET.includes(url.href)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const cached=await cache.match(url.href);
      if(cached)return cached;
      const response=await fetch(request);
      if(response.ok)await cache.put(url.href,response.clone());
      return response;
    })());
    return;
  }

  // Cache-first for *fresh* previously viewed tiles only. Expired tiles
  // use the browser's normal HTTP cache/revalidation (ETag/Last-Modified).
  // No cache-busting headers or proactive downloads are sent to OSM.
  if(isOsmTile(url)){
    event.respondWith((async()=>{
      const entry=await previouslyViewedTile(request);
      if(entry?.fresh)return entry.response;
      try{
        const response=await fetch(request); // default HTTP cache and conditional validation.
        if(response.ok||response.type==='opaque'){
          try{await rememberViewedTile(request,response);}catch(e){
            // Quota errors must not block normal live map display.
          }
        }
        return response;
      }catch(error){
        // Offline: return the same previously viewed tile, even if expired.
        return entry?.response || Response.error();
      }
    })());
    return;
  }

  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const canonical=new URL(url.pathname,self.location.origin);
    try{
      // Force a fresh release-specific URL online, but retain the canonical
      // offline fallback for installed PWAs and plain /preview/ visits.
      const response=await fetch(new Request(releaseURL(request.url),request),{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      try{await cache.put(canonical.href,response.clone());}catch(e){}
      return response;
    }catch(error){
      const fallback=await cache.match(canonical.href) ||
        (request.mode==='navigate' ? await cache.match('./index.html'):null);
      if(fallback)return fallback;
      return Response.error();
    }
  })());
});