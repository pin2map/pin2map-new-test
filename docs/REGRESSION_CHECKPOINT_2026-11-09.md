# Integrationsprüfung – technischer Zwischenstand (2026-11-09)

**Repository/Branch:** `pin2map/pin2map-new-test` · `feature/leaflet-modular-core`.

## Tatsächlich kontrolliert

- Die sechs vorhandenen fachlichen Testdateien `layer-operations`, `place-search`, `map-gesture-controller`, `pin-overlays`, `pin-panel-positioner` und `pin-move-controller` wurden in einer isolierten JavaScript-Testumgebung mit Ersatzobjekten für Browser-APIs ausgeführt: **38/38 Tests erfolgreich**. Das ist ein **isolierter Kompatibilitätslauf**, kein vollständiger `node --test`-Lauf und kein Browsernachweis.
- Lokale Skripte in `index.html` und obligatorischer Service-Worker-App-Shell abgeglichen: **21/21 Skripte enthalten**. Cache-Version: `pin2map-new-v24`.
- Syntax von Browser-Smoke-Skript, App und Service Worker geprüft.
- Der bestehende `tests/browser-smoke.cjs` wurde erweitert: Nach Pin-Persistenz wird die Sichtbarkeit der privaten Ebene im **echten Browser** ausgeblendet und wieder eingeblendet; der Pin muss verschwinden/erscheinen, ohne seine Koordinaten zu ändern.
- Bei Browser-Testfehlern wird ein Screenshot `browser-smoke-failure.png` erzeugt. Der CI-Workflow speichert ihn mit `actions/upload-artifact@v4`.

## Noch ausdrücklich offen

Ein erfolgreich ausgeführter **realer Chromium-End-to-End-Lauf** konnte aus der angeschlossenen GitHub-Schnittstelle nicht verifiziert werden. Die angebotene Workflow-Abfrage liefert nur PR-zugehörige Läufe; für den abgefragten Commit wurden keine solchen Läufe gefunden. Dies **belegt weder Erfolg noch Fehlschlag** des Push-Workflows. Aus der lokalen Umgebung war kein vollständiger GitHub-Checkout über das Netzwerk möglich.

Die folgenden Qualitätsgates bleiben deshalb offen:
1. `node --test tests/*.test.js` im echten Node-Prozess auf dem vollständigen Checkout,
2. `chromium-smoke` in GitHub Actions einschließlich Pin-Interaktion, Layer-Toggle, IndexedDB und PWA-Offline-Neustart,
3. manuelle iOS-/Android-Prüfung der langen Berührung, Pin-Zoom- und Dialograndbedingungen.

Der zusätzliche Browser-Test und die Screenshots ermöglichen eine konkrete Fehleranalyse beim nächsten ausgeführten CI-Lauf. **Kein Merge nach main**, die stabile Referenz bleibt unangetastet. Keine vorzeitige Freigabe für die nächste UI-Entwicklungsphase.
