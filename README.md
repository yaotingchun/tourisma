# TOURISMA
### Malaysia Tourism Spatial & Strategic Intelligence Dashboard

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-black?style=flat&logo=vercel)](https://tourisma-six.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.0-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Gemini 2.5 Flash](https://img.shields.io/badge/Vertex_AI-Gemini_2.5_Flash-4285F4?style=flat&logo=googlecloud)](https://cloud.google.com/vertex-ai)
[![Version](https://img.shields.io/badge/Version-1.0.0-emerald?style=flat)](#1-software-name-and-version-used)

---

## Table of Contents
1. [Software Name and Version Used](#1-software-name-and-version-used)
2. [Step-by-Step Instructions to Open and Navigate the Dashboard](#2-step-by-step-instructions-to-open-and-navigate-the-dashboard)
   - [A. Access the Live Deployed Dashboard](#a-access-the-live-deployed-dashboard-no-installation-required)
   - [B. How to Open and Run the Application Locally](#b-how-to-open-and-run-the-application-locally)
   - [C. How to Navigate the Dashboard Modules](#c-how-to-navigate-the-dashboard-modules)
3. [Additional Requirements, Plugins, and Add-ons](#3-additional-requirements-plugins-and-add-ons)
   - [A. Browser Requirements](#a-browser-requirements)
   - [B. Additional Cloud Services & API Keys](#b-additional-cloud-services--api-keys-for-live-ai-integration)
   - [C. Graceful Offline / Fallback Operation](#c-graceful-offline--fallback-operation)
4. [Notes on Limitations, Assumptions, or Special Considerations](#4-notes-on-limitations-assumptions-or-special-considerations)

---

## 1. Software Name and Version Used

- **Software Name:** Tourisma - Malaysia Tourism Spatial & Strategic Intelligence Dashboard
- **Application Version:** Version 1.0.0 (Web Application)

### Core Software Stack & Runtimes

| Component | Technology / Version | Description |
| :--- | :--- | :--- |
| **Runtime Environment** | Node.js `v20.19.0+` or `v22.12.0+` | Server execution and tooling runtime |
| **Package Manager** | npm `v10.0.0+` | Dependency package management |
| **Bundler & Dev Server**| Vite `8.3.0` | Client build tool & development server |
| **Language / Compiler** | TypeScript `6.0.2` | Strict mode, ES2023 target |
| **UI Icons Library** | Lucide Icons `1.47.0` | Clean icon set |
| **Typography** | Plus Jakarta Sans | Google Fonts web font typography |
| **Cloud & AI Engine** | Google Vertex AI | Gemini 2.5 Flash (`tourisma-decision-engine`) |
| **Location & Places API** | Google Places API (New) | Places Text Search & Place Details v1 |
| **Deployment Platform** | Vercel | Serverless functions & global edge network |

---

## 2. Step-by-Step Instructions to Open and Navigate the Dashboard

### A. Access the Live Deployed Dashboard (No Installation Required)

1. Open your web browser (Chrome, Edge, Firefox, or Safari) and navigate to:
   👉 **[https://tourisma-six.vercel.app/](https://tourisma-six.vercel.app/)**

2. The dashboard loads directly with no setup required. All spatial charts, datasets, and KPI modules are interactive out of the box.

> [!NOTE]
> Live AI features (Compass Copilot generative responses and live review sentiment analysis) depend on Google Cloud API availability on the deployed instance. If these services are rate-limited or temporarily unavailable, the dashboard automatically falls back to deterministic planning narratives (see [Section 3C](#c-graceful-offline--fallback-operation)).

---

### B. How to Open and Run the Application Locally

#### 1. Prerequisites
Ensure Node.js (`v20.19+` or `v22.12+`) and npm are installed on your computer. Verify by running:
```bash
node -v
npm -v
```

#### 2. Install Dependencies
Open a terminal / command prompt in the root directory of the `tourisma` project and run:
```bash
npm install
```

#### 3. Configure Google Credentials (Optional, for Live AI & Places Features)
- Ensure `credentials/google.json` is present in the project folder, **OR** set the environment variable `GOOGLE_CREDENTIALS` with the service account JSON string.
- *Note:* The static dashboard, all spatial charts, datasets, and fallback AI diagnostics run completely out of the box even without credentials.

#### 4. Start the Application
Run the Vite development server:
```bash
npm run dev
```
Vite will start the local development server and display the local URL:
```
http://localhost:5173
```

#### 5. Open the Dashboard
Open your web browser (Chrome, Edge, Firefox, or Safari) and navigate to:
```
http://localhost:5173
```

#### 6. Build for Production / Vercel Preview (Alternative)
- To compile the production bundle:
  ```bash
  npm run build
  ```
- To preview the production bundle locally:
  ```bash
  npm run preview
  ```

---

### C. How to Navigate the Dashboard Modules

Tourisma is organized into a persistent left navigation sidebar and **9 specialized analytical modules**:

#### 1. Navigation Bar & Global Controls
- **Left Sidebar:** Use the left sidebar to switch between analytical modules.
- **Toggle Menu:** Click the hamburger / menu toggle icon at the top left to collapse or expand the navigation sidebar.
- **Top Header:** Displays national summary badges, sync status, and the active planning cycle (`2025-2026`).

#### 2. Module 1: Overview (National Tourism Diagnostics)
- View national macroeconomic tourism performance, international vs. domestic visitor volumes, receipts, and national average length of stay (ALOS).
- Review state-level comparative capacity scores and tourism readiness rankings.

#### 3. Module 2: Tourism Demand
- Analyze visitor arrivals, domestic trip distributions, source market origins, seasonal demand curves, and travel purpose breakdowns.

#### 4. Module 3: Tourism Assets
- Explore the spatial directory of cultural, natural, recreational, and heritage tourism attractions across Peninsular Malaysia, Sabah, and Sarawak.

#### 5. Module 4: Accommodation
- Inspect registered hotel rooms, establishment distributions, average occupancy rates (AOR), and visitor-to-room ratio (VTR) stress indicators.

#### 6. Module 5: Accessibility
- Review spatial transit accessibility, including highway corridor access, distance to international/domestic gateways, and public transport access rates.

#### 7. Module 6: Healthcare Access
- Examine tourism safety infrastructure, including MOH hospital locations, 5km primary care access coverage, bed counts, and Bed Occupancy Rates (BOR).

#### 8. Module 7: Sustainability & Environment
- Evaluate environmental exposure rates, proximity of attractions to national parks, wildlife sanctuaries, and ecological buffer thresholds.

#### 9. Module 8: Tourism Pressure (Scenario Planning)
- Use interactive sliders to adjust **Demand Growth (%)** and **Accommodation Capacity Change (%)** for specific states or Malaysia nationwide.
- Click **"Simulate Scenario"** to view real-time calculations of the Demand-Capacity Gap (pp), projected VTR shifts, and AI-synthesized policy recommendations.

#### 10. Module 9: Destinations (Micro-Level Diagnostics)
- Search for specific destinations (e.g., *"Petronas Twin Towers"*, *"Langkawi"*, *"Batu Caves"*) to inspect localized infrastructure readiness.
- Click on an attraction to load visitor perception audits categorized into 6 infrastructure dimensions:
  - **Accessibility**
  - **Parking**
  - **Facilities**
  - **Cleanliness**
  - **Crowding**
  - **Services**

#### 11. Tourisma Decision Engine ("Compass" AI Copilot)
- Click the circular **Compass Robot** floating button in the bottom-right corner.
- Type any query regarding Malaysian tourism intelligence, spatial planning, infrastructure bottlenecks, or policy recommendations.
- Compass responds using the official 4-step framework:
  1. **Tourism Diagnosis:** *"What is happening?"*
  2. **Key Pressure Areas:** *"Where is the problem?"*
  3. **Evidence:** *"Why does Tourisma say this?"*
  4. **Planning Focus:** *"What should planners investigate?"*

---

## 3. Additional Requirements, Plugins, and Add-ons

### A. Browser Requirements
- Standard modern web browser with ECMAScript 2022+ and CSS Grid support:
  - **Google Chrome** (v110+)
  - **Microsoft Edge** (v110+)
  - **Mozilla Firefox** (v110+)
  - **Apple Safari** (v16.4+)
- **No external browser plugins, Java runtimes, or ActiveX add-ons are required.**

### B. Additional Cloud Services & API Keys (For Live AI Integration)
To enable live generative responses in Compass Copilot and live review sentiment analysis in the Destinations module, Google Cloud APIs are used:
1. **Google Vertex AI API** (`aiplatform.googleapis.com`)
2. **Google Places API (New)** (`places.googleapis.com`)

**Credentials Configuration:**
- **Local:** Place the service account key at `credentials/google.json`.
- **Vercel:** Add the environment variable `GOOGLE_CREDENTIALS` containing the complete JSON key string in **Vercel Project Settings -> Environment Variables**.

### C. Graceful Offline / Fallback Operation
If Google Cloud APIs are unreachable, disabled, or credentials are not supplied, the dashboard automatically invokes built-in algorithmic fallbacks:
- Scenario insights generate deterministic planning narratives.
- All spatial datasets, charts, metrics, and KPI strips remain 100% interactive.

---

## 4. Notes on Limitations, Assumptions, or Special Considerations

1. **Data Baseline & Vintage:**
   - Baseline statistical metrics are compiled from official Malaysian government open data repositories (**DOSM**, **MOTAC**, **MOH**, and **OpenStreetMap**) representing the 2024–2025 statistical reporting window.
   - Data points are pre-indexed into high-performance client-side data stores to ensure rapid, zero-latency dashboard navigation without requiring a database server.

2. **Scenario Simulation Assumptions:**
   - The Tourism Pressure simulation engine applies a deterministic elasticity model correlating percentage shifts in visitor volume against static or adjusted room inventories to compute the Visitor-to-Room (VTR) ratio and Demand-Capacity Gap.
   - Projections represent indicative stress-testing models for planning and capacity sizing rather than macroeconomic econometric forecasts.

3. **AI Copilot Domain Boundaries & Guardrails:**
   - Compass is strictly programmed with domain-specific system instructions focused exclusively on Malaysian tourism, spatial analytics, destination readiness, and urban/regional infrastructure planning.
   - Requests on unrelated domains (general programming, non-tourism finance, trivia) are declined by policy guardrails.

4. **Spatial Geometry & Map Projections:**
   - State-level choropleths, point assets, and route buffers are rendered using SVG and HTML5 Canvas spatial projections optimized for Peninsular and East Malaysia.
   - Minor cartographic generalizations are applied to optimize browser rendering performance across mobile, tablet, and desktop viewports.

5. **Client-Side Single Page Application (SPA) Routing:**
   - Navigation is managed via client-side state transitions. Reloading the page resets the active view to the Overview tab unless specific deep-linking state is stored in local session storage.

---

*Tourisma — Empowering Evidence-Based Spatial Planning & Strategic Intelligence for Malaysia's Tourism Ecosystem.*
