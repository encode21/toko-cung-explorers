# Grosir drawer fixture

Run `node scripts/check-grosir-browser.mjs` from the project root. The check mounts the actual gameplay HUD, right drawer, shared modal input lock, basket actions, and kiosk queue. World/account requests use the existing offline HUD and warung transports; no live account or payments are accessed.

The fixture starts inside Toko Cung at the real kiosk position, with empty stock and synthetic Kas. `window.openGrosir()` uses the production kiosk entry point. `window.resetGrosir()` resets the offline scenario. `window.resetGrosir("tokocung-retry")` returns the existing one-failure purchasing scenario.

One multiplier cycles 1→2→3→4→5→1 and is checked against the actual added basket quantity.

Layout coverage includes 1440×900 desktop, 858×398 reference, 740×360 landscape, a reduced 858×398 world inside a 1280×800 browser, and narrow 390×844 fallback. Checks hit-test the multiplier/add/basket controls to catch clipping, verify the left basket remains in the dialog focus scope, and confirm hidden scrollbars retain working keyboard and horizontal wheel scrolling.

Default screenshots are written to `../previews/kiosk`; set `GROSIR_QA_OUTPUT` to choose another directory.
