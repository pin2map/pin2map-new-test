/* Offline-first installation, network-first updates. Never cache-bust IndexedDB. */
const CACHE='pin2map-new-v16';
const CORE=['./','./index.html','./app.js','./styles.css','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    // Force fresh HTML, JavaScript and CSS when a new worker installs.
    // If any critical asset fails, installation fails rather than activating
    // a partial version (the previous worker continues to work).
    for(const url of CORE){
      const response=await fetch(new Request(url,{cache:'no-store'}));
      if(!response.ok)throw Error('Asset update failed: '+url);
      await cache.put(url,response);
    }
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key.startsWith('pin2map-new-')&&key!==CACHE).map(key=>caches.delete(key))
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
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      // Bypass the browser's HTTP cache, including for an already cached PWA.
      const response=await fetch(new Request(request,{cache:'no-store'}));
      if(!response.ok)throw Error('HTTP '+response.status);
      const cache=await caches.open(CACHE);
      // Cache canonical paths, not transient refresh query parameters.
      const canonical=new URL(url.pathname,self.location.origin);
      await cache.put(canonical.href,response.clone());
      return response;
    }catch(error){
      const cache=await caches.open(CACHE);
      const canonical=new URL(url.pathname,self.location.origin);
      const fallback=await cache.match(canonical.href) || (request.mode==='navigate' ? await cache.match('./index.html'):null);
      if(fallback)return fallback;
      throw error;
    }
  })());
});