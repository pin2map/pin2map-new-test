"use strict";
/*
 * First migration seam: renderer-independent viewport and event operations.
 * This file is deliberately separate from app.js. In this incremental phase,
 * Leaflet pins, tile layers, map controls and gestures still use Leaflet
 * directly. The existing user experience must not change.
 *
 * Public coordinates: {lat, lng}; screen points: {x, y}.
 * Routing geometry (future): GeoJSON coordinates [lng, lat].
 */
(function (root) {
  function latLng(position) {
    if (Array.isArray(position)) return {lat: Number(position[0]), lng: Number(position[1])};
    return {lat: Number(position.lat), lng: Number(position.lng)};
  }
  function xy(point) {
    if (Array.isArray(point)) return {x: Number(point[0]), y: Number(point[1])};
    return {x: Number(point.x), y: Number(point.y)};
  }
  class LeafletMapAdapter {
    constructor(map) {
      if (!map || typeof map.getCenter !== "function") throw new TypeError("Leaflet map required");
      this.map = map;
    }
    getViewport() {
      const center=this.map.getCenter();
      return {center:{lat:center.lat,lng:center.lng},zoom:this.map.getZoom()};
    }
    getContainer() { return this.map.getContainer(); }
    getSize() {
      const size=this.map.getSize();
      return {x:size.x,y:size.y};
    }
    project(position) {
      const p=this.map.latLngToContainerPoint(latLng(position));
      return {x:p.x,y:p.y};
    }
    unproject(position) {
      const p=this.map.containerPointToLatLng(xy(position));
      return {lat:p.lat,lng:p.lng};
    }
    panBy(position,options={}) {
      const p=xy(position);
      this.map.panBy([p.x,p.y],options);
    }
    setView(viewport,options={}) {
      const center=latLng(viewport.center);
      this.map.setView([center.lat,center.lng],viewport.zoom,options);
    }
    fitBounds(bounds,options={}) {
      const pairs=bounds.map(pair=>[latLng(pair).lat,latLng(pair).lng]);
      this.map.fitBounds(pairs,options);
    }
    zoomIn() { this.map.zoomIn(); }
    zoomOut() { this.map.zoomOut(); }
    invalidateSize() { this.map.invalidateSize(); }
    on(event,callback) {
      this.map.on(event,callback);
      return ()=>this.map.off(event,callback);
    }
    destroy() { this.map.remove(); }
  }
  root.Pin2MapLeafletAdapter=LeafletMapAdapter;
})(window);
