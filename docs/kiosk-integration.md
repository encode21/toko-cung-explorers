# Iware kiosk

The modeled portrait 32-inch kiosk sits inside the front retail area at `[2.2, 0.06, 0.5]`, facing the store interior. Screen dimensions approximate a 32-inch 16:9 panel (0.3985 × 0.7084 m); housing and pedestal follow the supplied photo, not manufacturer CAD. Placement remains clear of the doorway, promo island and existing NPC paths.

Click the model, press F nearby, or use the mobile interaction button to open the kiosk. The popup contains only a title/close control and `https://kiosk.tokocung.com/` in an iframe. Opening uses the existing overlay movement lock. Closing destroys the iframe and returns to the world. No kiosk content is copied or proxied.

## External framing requirement

The live kiosk currently returns `X-Frame-Options: SAMEORIGIN` (verified with HTTP response headers and an actual browser embed). Since the world is hosted at `https://world.tokocung.com`, browsers block its frame. This cannot be fixed by the world application's iframe markup.

On the kiosk server / CDN:

1. Remove the `X-Frame-Options: SAMEORIGIN` header for the embeddable kiosk response.
2. Set/merge a Content-Security-Policy with:

   ```http
   Content-Security-Policy: frame-ancestors 'self' https://world.tokocung.com
   ```

3. Add exact development/preview origins only if those deployments need embedding. Ensure no second CSP or CDN header still denies the parent origin.

Changing CORS headers does not enable iframe embedding. The kiosk server configuration is outside this repository and has not been modified.

## Validation

- Desktop: actual 3D model click opens the iframe dialog; F opens through the existing nearby interaction; close button and Escape restore overlay state; iframe unmounts when closed.
- Mobile emulation (390 × 844): reachable interaction button, popup within viewport, 44 px close control.
- Model screenshot reviewed against the supplied reference. Actual live iframe remains blocked by the remote framing policy; successful embedded kiosk rendering is not claimed.
- Temporary local browser fixture substituted auth/Realtime only, not the iframe response. Fixture files were removed after verification.
- Typecheck, changed-file lint and production build run before handoff.

Local screenshots and script: `/tmp/toko-time-qa/kiosk*`.
