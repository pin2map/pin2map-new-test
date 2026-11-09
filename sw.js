/* pin2map NEW PWA: offline app shell and on-demand, previously viewed OSM tiles.
   Tile policy: no prefetch, bulk download or offline-area download. */
const CACHE='pin2map-new-v17';
const TILE_CACHE='pin2map-viewed-osm-tiles-v1';
const CORE=['./','./index.html','./app.js','./styles.css','./manifest.webmanifest'];
const LEAFLET=[
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
const isOsmTile=url=>url.protocol==='https:' &&
  url.hostname==='tile.openstreetmap.org' &&
  /^\/\d+\/\d+\/\d+\.png$/.test(url.pathname);

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // An install either caches the complete offline shell (including Leaflet)
    // or fails, leaving the previous service worker available.
    for(const path of CORE){
      const response=await fetch(new Request(path,{cache:'no-store'}));
      if(!response.ok)throw Error('Offline app asset failed: '+path);
      await cache.put(path,response);
    }
    for(const url of LEAFLET){
      const response=await fetch(new Request(url,{mode:'cors',cache:'reload'}));
      if(!response.ok)throw Error('Leaflet offline asset failed: '+url);
      await cache.put(url,response);
    }
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

  // Only tiles requested by Leaflet while the user views a map are stored.
  // No preloading, no programmatic map-area downloads, no request cache busting.
  // Online fetch follows the provider's HTTP cache headers; offline returns
  // the exact matching tile and zoom from Cache Storage, when available.
  if(isOsmTile(url)){
    event.respondWith((async()=>{
      const tiles=await caches.open(TILE_CACHE);
      try{
        const response=await fetch(request);
        if(response.ok||response.type==='opaque'){
          try{await tiles.put(request,response.clone());}catch(e){
            // Storage quota denial must not prevent live map rendering.
          }
        }
        return response;
      }catch(error){
        const cached=await tiles.match(request);
        if(cached)return cached;
        return Response.error();
      }
    })());
    return;
  }

  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const canonical=new URL(url.pathname,self.location.origin);
    try{
      const response=await fetch(new Request(request,{cache:'no-store'}));
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