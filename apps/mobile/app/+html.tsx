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
      </head>
      <body>{children}</body>
    </html>
  );
}
