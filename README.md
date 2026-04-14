# Biyani Digital Campus System (BDCS)

A modern, comprehensive, and Gen-Z focused web application for managing the digital campus ecosystem at Biyani. This platform serves students, faculty, and administration with dedicated features such as attendance tracking, result management, project showcases, event notifications, and a responsive Gen-Z aesthetic user interface.

## 🚀 Features

- **🎓 Multi-Role Access Control:** Custom portals for Students, HODs, Administration, and Super Admins.
- **📈 Academic Progression System:** Advanced semantic ledger tracking for backlogs, promotion states (Promoted, Back-Promoted, Not-Promoted), and graduation status.
- **📝 Live Attendance & Continuous Assessment:** Real-time dashboards visualizing student attendance metrics and test scores.
- **✨ Gen-Z Mobile-First UI/UX:** High-craft frontend design utilizing Glassmorphism, tailored Framer Motion animations, "Neo-Campus Playful"bento grids, and a native-app-like mobile floating dock interface.
- **☁️ Cloud Backend Architecture:** Fully integrated with Firebase (Authentication, Firestore, Storage) with secure production rules.

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, React Router DOM
- **UI/Styling:** Tailwind CSS, Framer Motion, Vanilla CSS (Custom Keyframes & Variables)
- **Backend/Database:** Firebase Configuration (Authentication + Cloud Firestore)
- **Design System:** Custom BDCS guidelines focusing on minimal, bold typography, Biyani-red accents, and soft glass-pane UI.

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- Firebase Project Setup 

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/bdcs-app.git
cd bdcs-app
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory and add your Firebase configuration:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```
*(Note: `.env.local` is ignored by git for security purposes. Never commit your secrets.)*

### 3. Running the App
Start the development server:
```bash
npm run dev
```

## 🔒 Security Best Practices

This repository is configured to keep credentials safe:
- `firebase-config.js` is set to read from `.env` files.
- The `.gitignore` prevents `.env`, `.env.local`, and `node_modules` from being pushed to the remote repository.
- Firestore Security Rules restrict writes to HODs and super-admins, while students are secured by Auth UID isolation for sensitive personal data queries.

## 🤝 Contribution
When contributing to BDCS:
- Ensure you test features on both mobile and desktop viewports.
- Maintain the established 'Neo-Campus' layout identity.
- Write backend calls via designated service files (e.g., `batchPromotionService.js`).

---
*Built for Biyani Digital Campus System by the Student & IT Council.*
