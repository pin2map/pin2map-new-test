"use strict";
/* SPDX/licensing is source-specific; not a legal ruling about derivative works. */
const REGISTRY=Object.freeze([
 {key:"ne-country",kind:"region",license:"Public Domain",
  attribution:"Natural Earth",sourceFile:"geojson/ne_110m_admin_0_countries.geojson",
  identifier:f=>f.properties.ADM0_A3||f.properties.ISO_A3||null,
  name:f=>f.properties.ADMIN||f.properties.NAME||f.properties.name},
 {key:"ne-lake",kind:"water",license:"Public Domain",
  attribution:"Natural Earth",sourceFile:"geojson/ne_110m_lakes.geojson",
  identifier:f=>f.properties.wikidataid&&f.properties.wikidataid!=="-99"?
   f.properties.wikidataid:null,
  name:f=>f.properties.name_en||f.properties.name},
 {key:"ne-protected",kind:"protected",license:"Public Domain",
  attribution:"Natural Earth",sourceFile:"geojson/ne_10m_parks_and_protected_lands_area.geojson",
  identifier:f=>f.properties.unit_code||null,
  name:f=>f.properties.unit_name||f.properties.name},
 {key:"resolve-eco",kind:"ecoregion",license:"CC BY 4.0",
  attribution:"RESOLVE 2017 / Dinerstein et al., Catalogue of Life Gazetteer",
  sourceFile:"teow/features/{ECO_ID}.geojson",
  identifier:f=>String(f.properties.ECO_ID),
  name:f=>f.properties.ECO_NAME}
]);
module.exports=REGISTRY;
