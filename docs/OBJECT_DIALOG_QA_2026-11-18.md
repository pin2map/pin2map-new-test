# Qualitätssicherung der vier Objekt-Dialoge – 18. November 2026

## Verbindliche Quellen und Scope

Gilt für den **Bearbeitungsdialog gespeicherter** Pins, Flächen, Seen und Flüsse (nicht für isolierte Listenverwaltung oder das temporäre Vorschau-Schnellspeichern). Primärvertrag: [OBJECT_DIALOG_FOUNDATION_CONTRACT_2026-11-16.md](OBJECT_DIALOG_FOUNDATION_CONTRACT_2026-11-16.md), dort ausdrücklich zugelassene Ausnahmen **A01–A08**. Ergänzend [CSS_ARCHITEKTURREGELN.md](CSS_ARCHITEKTURREGELN.md), [MODULARCHITEKTUR.md](MODULARCHITEKTUR.md) und spätere Grundentscheidungen. Verbindliche neue Nutzergrenzen: kein Unterdialog über der unteren Aktionszeile; derselbe Look-and-Feel-Vertrag auf iPhone, iPad und Desktop, außer ausdrücklich genehmigte Ausnahmen.

**Reproduzierbare geprüfte Version:** `pin2map-new-v261` / veröffentlichte Preview `pin2map-preview-v261`. **Funktionscommit:** `a370970117d84b4d67d32903d5156c177b277c9e`. Isolierte Preview: https://pin2map.github.io/pin2map-new-test/preview/ .

## Befunde und fachliche Korrekturen

**B1 – Overlay der Ebenenwahl verdeckte potenziell Footer (behoben und getestet):** Der gemeinsame `ObjectDialogCore.layerMenuLayout` nutzte für lange Ebenenlisten zuvor die Unterkante des Gesamtpanels, ohne `footer.top` als harte Grenze zu verwenden. `popupBottom` wird nun für alle vier Objektarten auf `footer.top - 8` begrenzt. Die Listenhöhe verwendet allein den verfügbaren Raum oberhalb des Footers; bei vielen Ebenen scrollt das Menü intern. Der Hauptdialog wird nicht vergrößert/verschoben. Ein Test `menu.bottom <= panel.bottom` alleine ist ausdrücklich nicht hinreichend.

**B2 – CSS-Drift der Oberfläche (behoben und getestet):** Die Geometrieoberflächen verwendeten andere sichtbare Schatten, Rahmenfarben und Innenabstände als der Pin-Referenzdialog. Die wirksamen `getComputedStyle`-Eigenschaften für Hintergrund, Rahmenfarbe/-breite, Radius, Schatten und die vier Paddings werden jetzt in `tests/object-dialog-browser.cjs` **gegen die tatsächlich wirksamen Pin-Werte** geprüft. Der alte `.pin-panel`-Selektor mit `border-radius:13px!important` setzt die Pin-Rundung auch dann auf 13px, wenn ein späteres `#pinPanel`-Stylesheet 15px aufführt; der Geometrie-Dialog wurde an die gerenderte Referenz 13px angepasst. **Verbleibende CSS-Kaskaden-Altlast:** Den widersprüchlichen, nicht wirksamen späteren 15px-Wert/den alten wichtigen Owner noch komponentenbezogen bereinigen, ohne dadurch den abgenommenen Pin zu verändern.

**B3 – Fehlende harte Footer-Regression (behoben und getestet):** Neue Playwright-Prüfungen messen die tatsächlichen Rechtecke vor/nach Öffnung des Ebenenmenüs, `menu.bottom <= footer.top`, die Hit-Targets sämtlicher Footer-Buttons via `elementFromPoint` und das erneute Schließen mit dem Ebenen-Schalter. Für Pin wird zusätzlich die URL-Popup-Unterkante mit der eigenen Footer-Oberkante verglichen; Geometrie-URL wurde bereits in `tests/object-dialog-browser.cjs` und `tests/geometry-popup-browser.cjs` geprüft.

## Prüfmatrix

| Vertragsbereich | Pin | Fläche | See | Fluss | Nachweis |
| --- | --- | --- | --- | --- | --- |
| Gemeinsamer Struktureigentümer, korrekte Fachlegenden | automatisiert OK | automatisiert OK | automatisiert OK | automatisiert OK | `tests/object-dialog-architecture.test.js`, `tests/object-dialog-browser.cjs` |
| Gemeinsame Ebenenwahl: Filter, Reset, Unsichtbarstatus und Auswahl | automatisiert OK | automatisiert OK | automatisiert OK | automatisiert OK | `tests/pin-layer-picker.test.js`, `tests/object-dialog-browser.cjs` |
| Viele Ebenen: Menü scrollbar, keine Verdeckung, Auswahl der letzten Zeile | automatisiert OK (8) | automatisiert OK (18) | automatisiert OK (18) | automatisiert OK (18) | `tests/pin-dialog-visual.cjs`, `tests/geometry-layer-webkit-regression.cjs` |
| Footer frei, Buttons hit-testbar und Schalter schließt erneut | automatisiert OK | automatisiert OK | automatisiert OK | automatisiert OK | reale Chromium- und WebKit-Messungen; aktiver PWA-Worker |
| Außenmaße beim Ebenen-Öffnen unverändert | automatisiert OK | automatisiert OK | automatisiert OK | automatisiert OK | Pin-/Geometrie-Browsertests |
| URL-Popup über dem Footer, sichere URL, Abbruch/Speicherung | automatisiert OK | automatisiert OK | automatisiert OK | automatisiert OK | Pin-Visualbrowser, Geometrie-Objektbrowser und URL-DOM-Tests |
| Gemeinsame Notizbearbeitung und separate Note-Editor-Ausnahme A07 | automatisiert OK | automatisiert OK | automatisiert OK | automatisiert OK | Pin-/Geometrie-Browser und DOM-Tests |
| Gemeinsame Löschbestätigung, Schutz vor unbeabsichtigter Löschung | automatisiert OK | automatisiert OK | automatisiert OK | automatisiert OK | `tests/object-dialog-browser.cjs`, `tests/geometry-editor-parity.test.js`, Pin-Löschtests |
| Computed Look-and-Feel gegen Pin-Referenz, responsive Oberfläche | Referenzbrowser OK | automatisiert OK | automatisiert OK | automatisiert OK | Chrome 390/820/1280, Pin 320/375/768 und separater Desktop-Lauf |
| Individuelle reale iPhone-Safari-PWA mit **bestehendem Nutzerprojekt** | **offen** | **offen** | **offen** | **offen** | Echte Geräteabnahme erforderlich |
| Individuelle iPad-PWA/-Touch-Abnahme | **offen** | **offen** | **offen** | **offen** | Echte Geräteabnahme erforderlich |

**Echte WebKit-Messungen (18 Ebenen, alle drei Geometrietypen):** iPhone 320px: Menü 284×246px, Footer-Abstand 7px; iPhone 390px: 354×246px, Abstand 7px; iPad 820px: 370×246px, Abstand 7px. In allen Fällen `sameFrame=true`, `footerToggleReachable=true`, `allFooterReachable=true`, `footerToggleCloses=true` und die letzte Auswahlzeile anklickbar. Im Chromium-Pin-Test: iPhone 320px Pinpanel 304×380.28px, Ebenenmenü 284×252.19px; iPhone 375px Pinpanel 359×380.28px, Menü 339×252.19px; iPad 768px Pinpanel 390×380.28px, Menü 370×252.19px. Bei acht Ebenen intern scrollbar. Dies sind Testumgebungen, keine unabhängige Bedienung am Nutzergerät.

## Freigabegates des exakten Commits

- [Modular Core Checks – Node und kompletter Chromiumlauf #44274852636](https://github.com/pin2map/pin2map-new-test/actions/runs/44274852636): **completed/success**.
- [Leaflet modular architecture gates #44274852731](https://github.com/pin2map/pin2map-new-test/actions/runs/44274852731): **completed/success**.
- [Unabhängiges Safari/WebKit-Regression-Gate #44274852658](https://github.com/pin2map/pin2map-new-test/actions/runs/44274852658): **completed/success**.
- [Deployment mit WebKit-Preflight, HTTPS-Live-Chromium und WebKit-Postpublish #44274852672](https://github.com/pin2map/pin2map-new-test/actions/runs/44274852672): **alle drei Jobs completed/success**; Preview und Service-Worker-Version geprüft.

## Offene Punkte und Grenzen der Aussage

1. Die reale iPhone-Safari-PWA mit dem konkreten vorhandenen Projekt und dessen Update-/Cachehistorie wurde nicht durch den Assistenten bedient. Die früher gemeldete `Dachsteingebirge`-Schlitzanzeige darf erst nach erneutem persönlichem Gerätestest als endgültig behoben gelten. Testfälle: Pin, Dachsteingebirge-Fläche, See und Fluss; Ebenenauswahl mit vielen Ebenen; Unterdialog schließt via denselben Schalter, Footer bleibt unversehrt.
2. Echte iPad-Safari-/Home-Screen-PWA und Keyboard-/Safe-Area-Sonderlagen bleiben für diese Version als manuelle Abnahme gesondert offen.
3. Die verbleibenden konkurrierenden CSS-Altselektoren und der B38-CSS-Restauftrag sind nicht pauschal „fertig“. Der neue Browserstilvergleich sichert die aktuell sichtbaren Oberflächenwerte ab; es ist keine vollständige CSS-Codebereinigung.
4. Die QS sagt nichts über das Verhalten externer geografischer Suche, Provider-Datenqualität oder die gesonderte Listendialogfamilie aus.
5. **`main`, `reference/*`, IndexedDB, persönliche Pins/Ebenen und Kachelcaches unverändert.**



## Nachtrag: echte Gerätebefunde und v262-Korrektur (18. November 2026)

**Vorrangige reale Nutzerbefunde zu v261:** iPad: Pin „Mole“ OK; Fläche/See/Fluss-Ebenenauswahl überdeckt Header, Fluss-/Geometrielabel zu weit entfernt. iPhone: Pin „Sedlitz“ OK; Fluss „Schwarze Elster“ und See „Sedlitzer See“ mit zu großem Abstand Dialog–Label. Desktop: Fläche „Kyritz-Ruppiner Heide“ und Fluss „Elbe“ mit überdeckter Titelzeile, freischwebender Spitze und zu großem Abstand; Pin „Kyritz“ OK. Der Desktop-Aktualisieren-Button blieb transparent; das ist **kein** unabhängiger Nachweis, welche Service-Worker-Version tatsächlich aktiviert ist.

**Neue Vertragsanforderungen O01–O04**, nachlesbar im Primärvertrag: (1) jedes interne Menü der unteren Funktionsleiste liegt vollständig **unter der Objekt-Titelzeile und über dem Footer**, ohne Panel-Änderung, (2) der Filter inklusive Reset entfällt **nur aus den Ebenen-Unterdialogen der vier Objekt-Bearbeitungsdialoge**, die Liste ist direkt und scrollbar, (3) die Spitze des Geometrieeditors ist ein absolut positioniertes Kind des Panels und mit `bottom:-14px` an dessen **laufend tatsächliche** Unterkante gebunden; sie kann sich nicht bei Clamping, Layoutänderung oder Öffnen der Ebenenauswahl abkoppeln, (4) Fläche/See/Fluss verwenden `clampedObjectAnchor(...offset=30)` statt des **unveränderten** Pin-Ankers `anchorGeometry(...offset=94)`, mit einer 15px-Spitze etwa 15px Abstand vom projizierten Objektlabel-Anker (bei ausreichendem Viewportraum). Die ersten Diagnoseläufe zeigten vor der CSS-Nachführung tatsächlich eine 16px-Fehlpositionierung der Geometriespitze durch eine veraltete `offsetHeight`-Messung; behoben, nicht nur Tests abgeschwächt. Die Dreiecksoberkante überlappt die Dialogunterkante jetzt um ~2px ohne Lücke.

**Automatisierte Freigabe v262:** Funktionscommit `59466cb71cba943a7efb1419a98b327fba4267fb`; App `pin2map-new-v262`, Preview-Worker **tatsächlich** `pin2map-preview-v262` gemäß postpublizierter PWA-Regressionsprüfung. Alle folgenden Workflows für denselben Commit **completed/success**:
- [Node-/Chromium-QS #44286440675](https://github.com/pin2map/pin2map-new-test/actions/runs/44286440675)
- [Leaflet-Architektur #44286440678](https://github.com/pin2map/pin2map-new-test/actions/runs/44286440678)
- [Unabhängige WebKit-/Chromium-Geometrie-QS #44286440730](https://github.com/pin2map/pin2map-new-test/actions/runs/44286440730)
- [Pages Preview + WebKit vor/nach Veröffentlichung #44286440743](https://github.com/pin2map/pin2map-new-test/actions/runs/44286440743)
- [Entwicklungs-Preview](https://pin2map.github.io/pin2map-new-test/preview/)

**Live-Messwerte des veröffentlichten Service-Worker-Tests:** 18 synthetische Ebenen, iPhone 390: Geometrie-Ebenenmenü Breite 354px, Höhe 179px, oberer Rand 279,59px bei Headerunterkante 270,59px (9px frei), unterer Rand 458,59px bei Footeroberkante 465,59px (7px frei). `tipAttached=true`, Ebenenbuttons hit-testbar, letzte Ebene nach Scrollen auswählbar. Alle drei Geometrietypen auf iPhone 320/390 und iPad WebKit+Chromium bestanden; Pin Browser-QS auf 320/375/iPad/Desktop bestanden. Die alte Filterzeile ist im Objektpicker-DOM nicht mehr vorhanden; separate temporäre Ebenenwahl blieb unverändert.

**Abnahmegrenze:** Die persönlichen Screenshots dokumentieren fehlerhafte **v261**-Gerätebefunde. Ob v262 auf genau denselben iPhone-/iPad-/Desktop-Installationen visuell akzeptiert wird, ist **noch nicht durch neue Nutzerscreenshots bestätigt**. Kein Schluss von Linux-WebKit auf reale Safari-PWA mit historischem Cache. Ebenfalls nicht als separate UI-Abnahme bestätigt: das transparente Desktop-Refresh-Symbol; maßgeblicher technischer Versionsnachweis ist der aktiv geprüfte `pin2map-preview-v262`-Worker. Kein Eingriff in Nutzerdaten, `main`, `reference/*`.
