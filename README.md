# MonoPOS — Modern Offline-Ready Cloud Retail POS

> High-performance, offline-capable Point of Sale (POS) system built with **React 19**, **TypeScript**, **Tailwind CSS v4**, **Shadcn UI**, and **Firebase**. Features universal camera vision scanning, US and international barcode lookups, Bluetooth thermal receipt printing, soundbox audio payment announcements, and Tally ERP sales export.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Firebase%20Hosting-emerald?style=for-the-badge&logo=firebase)](https://gen-lang-client-0282731279.web.app)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-purple?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

---

## 🌐 Live Application
- **Live URL**: [https://gen-lang-client-0282731279.web.app](https://gen-lang-client-0282731279.web.app)
- **Repository**: [https://github.com/Sanketpatel109/pos1](https://github.com/Sanketpatel109/pos1)

---

## ✨ Key Features

### 📷 Universal Camera & Barcode Scanner
- **Dual Vision Engine**:
  - **Native Hardware Vision** (`window.BarcodeDetector`): Ultra-fast (<5ms) sub-frame hardware barcode & QR detection.
  - **Universal Fallback Engine** (`html5-qrcode`): Seamless scanning across legacy devices, laptops, and older Android/iOS browsers.
- **Cross-Browser & Multi-Device Compatibility**:
  - Validated across **iPhone (iOS Safari & Chrome)**, Android, iPads, tablets, laptops, and desktops.
  - Front / Back camera switcher.
  - 1x / 2x digital zoom toggle for small or distant barcodes.
  - Hardware flashlight / torch toggle.
  - Interactive audio-haptic scan feedback.

### 🇺🇸 US & Global Product Barcode Lookup
- **Normalized Multi-Registry Engine**:
  - **US Products**: Auto-normalizes 12-digit UPC-A, 8-digit UPC-E, and 13-digit EAN variants.
  - **US Open Food Facts** (`us.openfoodfacts.org`): Instant recognition of hundreds of thousands of US groceries, drinks, snacks, and packaged foods.
  - **Global Registries**: Open Food Facts (Global), Open Beauty Facts (cosmetics/personal care), Open Products Facts (general merchandise), and India Open Food Facts (`890` GS1 prefix).
- **Auto-Extraction**:
  - Automatically identifies product name, brand, department category, product image, packaging tier, and US imperial (`fl oz`, `oz`, `gal`, `lb`) or metric (`ml`, `g`, `pcs`) units.
  - Live product card preview with 1-tap **"Add to Bill"** or **"Save to POS"**.

### 📦 Multi-Pack & Packaging Tier Bundling
- Automatically parses multi-pack patterns (e.g. *"Pack of 6"*, *"12-pack"*, *"Case of 24"*, *"Box of 12"*, *"6x330ml"*).
- Separates bundle quantities from clean base product titles for clear invoices.

### 💳 Checkout & Payment Options
- Fast 1-tap item search, category filtering, and quick billing.
- Supports Cash, UPI QR code generation, Card, Khata / Store Credit, and Split payments.
- **Soundbox Voice Audio**: Multilingual audio payment announcements (*"Received ₹250 on UPI"*).

### 🖨️ Thermal Printing & Hardware Support
- Direct ESC/POS printing over **Bluetooth** and **USB**.
- 58mm and 80mm thermal receipt formats with customizable store logos and tax summaries.

### 📊 Accounting & Tally Export
- **Tally Prime & ERP 9 XML Export**: Generates compliant XML sales vouchers for accounting reconciliation.
- Comprehensive CSV / Excel sales logs and profit analysis.

### ⚡ Offline First PWA
- Progressive Web App with service worker caching.
- Operates offline seamlessly with automatic synchronization when reconnected.

---

## 🛠️ Tech Stack
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Hosting**: [Firebase](https://firebase.google.com/) (Firestore & Firebase Hosting)
- **Scanning**: Hardware Vision `BarcodeDetector` API + `html5-qrcode`

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ / 20+ / 24+
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/Sanketpatel109/pos1.git
cd pos1

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build & Linting
```bash
# Run TypeScript typecheck
npm run lint

# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📋 Engineering Guidelines
See [`AGENTS.md`](./AGENTS.md) for repository architecture rules, strict Shadcn UI requirements, and coding conventions.

---

## 📄 License
Private & Proprietary. All rights reserved.
