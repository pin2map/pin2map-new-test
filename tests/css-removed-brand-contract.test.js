"use strict";
/* The floating search-only header must not regain obsolete branding styles.
 * Branding in the metadata/title does not imply an on-screen brand element.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
test("unused brand selectors are absent from the search-only header CSS",()=>{
  assert.doesNotMatch(css,/\.brand\b/);
  assert.doesNotMatch(html,/class=["'][^"']*\bbrand\b/);
  assert.match(html,/<header class="topbar">/);
  assert.match(html,/<form id="searchForm" class="search"/);
});
