// noinspection JSUnusedGlobalSymbols

import { defineConfig } from 'vite'
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
    base : '',
    plugins : [
        VitePWA({
            workbox: {
                maximumFileSizeToCacheInBytes: 10000000,
            },
            registerType : 'autoUpdate',
            includeAssets : [
                'favicon.ico',
                'apple-touch-icon.png',
                'safari-pinned-tab.svg',
                'favicon-32x32.png',
                'favicon-16x16.png',
                'browserconfig.xml',
                'mstile-150x150.png',
            ],
            manifest : {
                "name": "WhatF***Words",
                "short_name": "WFW",
                "description": "Show positions in words and coordinates",
                "icons": [
                    {
                        "src": "android-chrome-192x192.png",
                        "sizes": "192x192",
                        "type": "image/png"
                    },
                    {
                        "src": "android-chrome-512x512.png",
                        "sizes": "512x512",
                        "type": "image/png"
                    }
                ],
                "theme_color": "#e1ebf5",
                "background_color": "#e1ebf5",
                "display": "standalone",
            },
        }),
    ],
});