import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import './index.css'
import './App.css'
import ProductionErrorBoundary from './components/common/ProductionErrorBoundary.jsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ProductionErrorBoundary>
            <ConvexProvider client={convex}>
                <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
                    <App />
                </BrowserRouter>
            </ConvexProvider>
        </ProductionErrorBoundary>
    </StrictMode>,
)
