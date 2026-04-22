import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'assets/*'],
            manifest: {
                name: 'Biyani Digital Campus System',
                short_name: 'BDCS',
                description: 'Digital Campus System for Biyani Group of Colleges',
                theme_color: '#ee1b24',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: '/',
                orientation: 'portrait',
                icons: [
                    {
                        src: '/assets/biyani-logo-square.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/assets/biyani-logo-square.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: '/assets/biyani-logo-square.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                // Increase size limit to 4MB to ensure large vendor chunks are pre-cached
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
                cleanupOutdatedCaches: true,
                disableDevLogs: true,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,json,txt,woff2}'],
                navigateFallback: 'index.html',
                navigateFallbackAllowlist: [/^(?!\/__).*/],
                runtimeCaching: [
                    {
                        // Google Fonts Stylesheets
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },
                            cacheableResponse: {
                                statuses: [0, 200] // Allow opaque responses
                            }
                        }
                    },
                    {
                        // Google Fonts Webfonts
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },
                            cacheableResponse: {
                                statuses: [0, 200] // Essential for cross-origin fonts
                            }
                        }
                    },
                    {
                        // Images and Media (Local and Remote)
                        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'images-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Convex DB Data - Aggressive StaleWhileRevalidate
                        urlPattern: /^https:\/\/.*?\.convex\.cloud\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'convex-data-cache',
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 Days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Firebase Firestore Data
                        urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'firebase-data-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 Days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Essential Auth Endpoints (Never Cache)
                        urlPattern: /^https:\/\/www\.googleapis\.com\/identitytoolkit\/.*/i,
                        handler: 'NetworkOnly',
                    },
                    {
                        urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*/i,
                        handler: 'NetworkOnly',
                    }
                ]
            },
            devOptions: {
                enabled: true,
                type: 'module',
                navigateFallback: 'index.html'
            },
            injectRegister: 'auto'
        })
    ],
    server: {
        port: 5173,
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
                    'ui-vendor': ['framer-motion', 'lucide-react'],
                    'react-vendor': ['react', 'react-dom', 'react-router-dom']
                }
            }
        },
        chunkSizeWarningLimit: 1000
    }
})
