# 🛡️ Kushal Kumawat | Biyani Digital Campus System (BDCS)

[![LIVE DEPLOYMENT](https://img.shields.io/badge/LIVE%20DEPLOYMENT-BDCS--PORTAL-blueviolet?style=for-the-badge&logo=vercel)](https://bdcs-livid.vercel.app/)
[![BUILD](https://img.shields.io/badge/BUILD-OPTIMIZED-green?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![SECURITY](https://img.shields.io/badge/SECURITY-A+%20RATED-brightgreen?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![LICENSE](https://img.shields.io/badge/LICENSE-MIT-lightgrey?style=for-the-badge)](./LICENSE)

---

> "Bridging the Gap Between Traditional Education Management and Advanced Web Engineering."

[LinkedIn](https://linkedin.com/in/kushal-ku) • [Source Code](https://github.com/Kushal96499/BDCS) • [Institutional Website](https://www.biyanicolleges.org/)

---

## 💎 The Engineering Philosophy

In the current era of digital transformation, **BDCS** serves as a **Privacy-First Institutional Hub**. Built during my 3rd year of BCA at Biyani Group of Colleges, this system replaces legacy, boxy management tools with a high-craft, resilient environment. By leveraging **Progressive Web App (PWA)** protocols and **Real-time Database Synchronization**, BDCS ensures that campus data is secure, fast, and accessible even under challenging network conditions.

### Core Strategic Pillars:
*   **PWA Resilience**: Offline-first architecture using Workbox strategies (`StaleWhileRevalidate`, `CacheFirst`).
*   **RBAC Architecture**: Strict Role-Based Access Control enforced at both Frontend (React Router) and Backend (Firebase Security Rules).
*   **Immersive UX**: High-performance UI utilizing **Glassmorphism** and `Framer Motion` for a "Neo-Campus" feel.
*   **Data Integrity**: Robust state management and real-time backend synchronization via **Convex** and **Firebase**.

---

## 🏗️ Technical Architecture & Workflow

The system utilizes a distributed architecture designed for low latency and high availability across all campus roles.

```mermaid
graph TD
    %% User Layer
    User((User/Student/Staff)) -->|HTTPS/PWA| SW{Service Worker}
    
    %% Resilience Layer
    SW -->|Cache First| Cache[(Workbox Cache)]
    SW -->|Network First| Vite[Vite Powered React Core]
    
    %% Application Core
    subgraph "Application Core (React 18)"
        Vite --> UI[Neo-Campus UI / Framer Motion]
        UI --> RBAC{RBAC Guard}
    end
    
    %% Security & Logic
    RBAC -->|Authorize| FBAuth[Firebase Auth]
    RBAC -->|Validated Request| Logic[Business Services / Logic]
    
    %% Persistence Layer
    subgraph "Persistence & Real-time Layer"
        Logic -->|Sync| Convex[Convex Real-time DB]
        Logic -->|Document Storage| FBStore[Firebase Firestore/Storage]
    end
    
    %% Deployment
    Convex -.->|Edge Sync| Vercel((Vercel Edge))
    Vite -.->|Deployed on| Vercel

    %% Styling
    style User fill:#f9f9f9,stroke:#333,stroke-width:2px
    style Vite fill:#646cff,color:#fff,stroke-width:2px
    style SW fill:#ff9900,color:#fff
    style Convex fill:#222,color:#fff
    style FBAuth fill:#ffca28,color:#000
    style RBAC fill:#e31e24,color:#fff
```

*Flow: User → Service Worker (PWA Shell) → React Core → Multi-cloud Persistence (Convex/Firebase)*

---

## 🚀 Interactive Feature Matrix

| Domain | Capabilities | Technology Stack |
| :--- | :--- | :--- |
| **Admin Control** | Global Settings, Campus Hierarchy, Course/Department Master | `React`, `Firebase`, `TailwindCSS` |
| **Academic Ledger** | Promotion States (Promoted/Backlogged), Grad Status, Semantic Tracking | `BatchPromotionService`, `Convex` |
| **Faculty Ops** | Real-time Attendance, Result Publishing, Bulk Student Uploads | `XLSX Engine`, `Lucide React` |
| **Student Hub** | Academic Timeline, Test History, Personal Project Showcase | `Framer Motion`, `React Dynamic Routes` |
| **PWA Engine** | Installation Prompt, Offline Recovery Shell, Aggressive Pre-caching | `Vite-PWA`, `Workbox` |

---

## 📂 Project Organization

```text
├── .github/            # CI/CD Workflows
├── public/             # Static Assets & PWA Icons
├── src/
│   ├── components/     # Atomized UI components (Common, Admin, Student)
│   ├── layouts/        # Role-based Portal Frameworks (5 Distinct Layouts)
│   ├── services/       # Core Business Logic & API Handlers
│   ├── hooks/          # Custom Context Hooks (Auth, Connectivity)
│   ├── config/         # System Configurations (Firebase, PWA)
│   └── App.jsx         # Global Route Orchestration & Connectivity Monitor
├── vite.config.js      # PWA Workbox Strategies & Build Optimization
└── tailwind.config.js  # "Neo-Campus" Design System Tokens
```

---

## 📸 Interface Showcase

*(High-resolution screenshots demonstrating the premium UI/UX)*

| 📱 Immersive Dashboard | 🔐 Secure Management |
| :---: | :---: |
| <img width="1915" height="892" alt="Image" src="https://github.com/user-attachments/assets/17385f4a-bb94-43ae-9b65-bb2aa7097e4a" /> | <img width="1912" height="908" alt="Image" src="https://github.com/user-attachments/assets/dd63c971-dede-4f8d-b918-6aaab10a5cdb" /> |

---

## 🛡️ Institutional Security Protocol

This project is built exclusively for the **Biyani Digital Campus System**. Access to the source code and configuration is governed by strict institutional privacy standards.
- **Data Isolation**: Multi-tenant isolation for campus-specific data.
- **Audit Logs**: Comprehensive tracking of all administrative actions.
- **Zero-Trust**: Every request is validated via Firebase Authentication UIDs.

---

## 👤 Development Lead

**Kushal Kumawat**  
*Lead Full-Stack Developer | BCA 3rd Year*  
**Biyani Group of Colleges**

Expert in architecting secure, full-stack ecosystems. I specialize in bridging the gap between high-performance web development and robust institutional security.

---
*Built for the future of Biyani Digital Campus.*
