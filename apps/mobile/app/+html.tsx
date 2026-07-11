import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML shell for the DreamCloud web/PWA build.
 * This file is only used during `expo export --platform web`.
 * It adds PWA meta tags, the web manifest link, and service worker registration.
 * `ScrollViewStyleReset` injects the Expo/React-Native-Web body reset CSS.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover + user-scalable=no gives a native-app feel on iOS */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />

        {/* ── PWA ───────────────────────────────────────────────── */}
        <meta name="theme-color" content="#0F0F23" />
        <meta name="application-name" content="DreamCloud" />
        <link rel="manifest" href="/manifest.json" />

        {/* ── Apple PWA ─────────────────────────────────────────── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DreamCloud" />
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* ── Favicon ───────────────────────────────────────────── */}
        <link rel="icon" href="/favicon.ico" />

        <title>DreamCloud</title>

        {/* ── Service Worker ────────────────────────────────────── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');});}`,
          }}
        />

        {/* ── Global error fallback (catches hydration errors before React mounts) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var shown=false;
  function showFallback(msg){
    if(shown)return;shown=true;
    var r=document.getElementById('root');
    if(!r)return;
    r.innerHTML='<div style="position:fixed;inset:0;background:#060614;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;font-family:system-ui;text-align:center">'
      +'<div style="font-size:32px;margin-bottom:16px">⚠</div>'
      +'<p style="color:rgba(232,232,255,.9);font-size:1.1rem;margin:0 0 8px">Bir şeyler ters gitti</p>'
      +'<p style="color:rgba(232,232,255,.35);font-size:.8rem;margin:0 0 24px">'+msg+'</p>'
      +'<button onclick="caches.keys().then(function(k){return Promise.all(k.map(function(c){return caches.delete(c)}))}).then(function(){location.reload()})" '
      +'style="background:rgba(108,99,255,.15);border:1px solid rgba(108,99,255,.4);color:rgba(200,192,255,.9);padding:12px 28px;border-radius:12px;cursor:pointer;font-size:.85rem">Önbelleği Temizle ve Yenile</button>'
      +'</div>';
  }
  window.addEventListener('error',function(e){showFallback(e.message||'Bilinmeyen hata');});
  window.addEventListener('unhandledrejection',function(e){showFallback((e.reason&&e.reason.message)||'Promise hatası');});
})();
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
