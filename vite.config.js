import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Biyani Digital Campus System',
                short_name: 'BDCS',
                description: 'Digital Campus System for Biyani Group of Colleges',
                theme_color: '#ee1b24',
                background_color: '#ffffff',
                display: 'standalone',
                icons: [
                    {
                        src: '/assets/biyani-logo.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/assets/biyani-logo.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: '/assets/biyani-logo.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                disableDevLogs: true,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'images-cache',
                            expiration: {
                                maxEntries: 50
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            networkTimeoutSeconds: 5
                        }
                    }
                ]
            },
            devOptions: {
                enabled: false
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
