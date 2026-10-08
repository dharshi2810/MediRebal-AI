# MEDIREBAL AI
### AI-Powered Cross-Hospital Resource Rebalancing & Emergency Coordination Platform

**Hackathon Track:** `HN-AI-05: Cross-Hospital Resource Rebalance`  
**Technology Stack:** React + TypeScript + Node.js/Express + MongoDB Atlas + Google Gemini + Render-Ready + Progressive Web App (PWA)

---

## 1. Problem Statement & Vision

During local and district-level healthcare surges in urban hubs like Chennai, resource bottlenecks (such as oxygen cylinder depletion, ICU bed saturation, and doctor shortages) frequently cause critical delays. Concurrently, nearby healthcare facilities often possess substantial surplus capacity that goes unutilized due to lack of real-time visibility and inter-hospital coordination.

**MediRebal AI** solves this with a two-sided district-level network:
1. **Public Users & Patients:** Rapid emergency multi-hospital requests (Oxygen, ICU/Emergency Beds, Ambulances, Specialists), interactive Chennai live map, appointment booking, and live response tracking.
2. **Hospital Administrators:** Live resource monitoring, bed occupancy calculators, specialist shift scheduling, ML shortage prediction, and the core **Cross-Hospital Resource Rebalancing Workflow**.

---

## 2. Core Rebalancing Workflow (HN-AI-05)

$$\text{PREDICT} \longrightarrow \text{DETECT SURPLUS} \longrightarrow \text{RECOMMEND TRANSFER} \longrightarrow \text{HOSPITAL APPROVAL} \longrightarrow \text{RESOURCE TRANSFER}$$

1. **ML Trend Prediction:** Real-time Linear Regression trained on historical oxygen consumption readings (80/20 train/test split) calculates depletion rate ($m$), time-to-critical threshold, risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and model validation metrics ($MAE$, $RMSE$, $R^2$).
2. **District Surplus Detection:** Analyzes all 5 Chennai hubs to distinguish **Shortage Hospitals** (e.g., *Rajiv Gandhi Govt General Hospital - Central*) from **Surplus Donors** (e.g., *Fortis Malar Hospital - Adyar* with 185+ units and 18h buffer).
3. **Optimized Transfer Recommendations:** The backend algorithm calculates exact transferable quantities, priority, deadlines, and road transit times.
4. **Gemini Clinical Logistics Explanations:** Server-side Google Gemini (`gemini-3.8-flash`) synthesizes concise, human-readable operational justifications based solely on verified metrics (without medical diagnosis or calculation fabrication).
5. **Two-Way Hospital Transfer Execution:** Recipient initiates request $\to$ Donor hospital accepts/rejects $\to$ Resource marked `in_transit` $\to$ Recipient confirms delivery and MongoDB inventory is automatically rebalanced!

---

## 3. Technology Architecture

```
                       +---------------------------------------+
                       |           MEDIREBAL CLIENT            |
                       |  - React 19 + TypeScript + Vite       |
                       |  - Tailwind CSS + Mobile-First UI     |
                       |  - Leaflet Chennai OpenStreetMap      |
                       |  - PWA Service Worker + Manifest      |
                       +-------------------+-------------------+
                                           |
                              REST API / JSON (Bearer JWT)
                                           |
                                           v
+-------------------------------------------------------------------------------+
|                             EXPRESS FULL-STACK BACKEND                        |
|                                                                               |
|  [Auth Middleware & RBAC]      [Live Simulator Engine]    [Linear Regression] |
|   - PUBLIC_USER / HOSPITAL_ADMIN  - Rapid depletion vs surplus - MAE, RMSE, R²|
|                                                                               |
|  [Rebalancing Optimizer]       [Server-Side Gemini AI]    [Audit Logger]      |
|   - Deficit vs Surplus match     - gemini-3.8-flash         - Real-time audit |
+-----------------------+-------------------------------+-----------------------+
                        |                               |
                        v                               v
             +---------------------+       +-----------------------+
             |    MongoDB Atlas    |       |   Google Gemini API   |
             | Database: medirebal |       |  (Server-Side Only)   |
             +---------------------+       +-----------------------+
```

---

## 4. MongoDB Atlas Collections (`medirebal`)

| Collection | Description & Key Indexes |
|---|---|
| `users` | User credentials, role (`PUBLIC_USER`, `HOSPITAL_ADMIN`), assigned `hospital_id`. Unique index on `email`. |
| `hospitals` | Hospital metadata, GPS coordinates, phone numbers, overview counts. Index on `hospital_id`. |
| `resources` | Live resource stocks (oxygen cylinders, concentrators, ventilators). |
| `resource_readings` | Time-series readings recorded every simulation tick. Indexes on `hospital_id`, `resource_type`, `timestamp`. |
| `beds` | Breakdown by General Beds, ICU Beds, Emergency Beds, Isolation Beds. |
| `doctors` | Specialist shift hours, phone, department, availability status. |
| `nurses` | Nursing shifts, ICU/Emergency categories, on-duty status. |
| `departments` | Emergency, Cardiology, Pulmonology, Neurology, etc. |
| `ambulances` | Vehicle IDs, drivers, standby status (`available`, `on_trip`). |
| `appointments` | Booked patient consultations. Indexes on `hospital_id`, `date`. |
| `emergency_requests` | Multi-hospital SOS requests. Index on `status`. |
| `transfer_requests` | Cross-hospital resource transfers. Index on `status`. |
| `predictions` | ML model statistics ($MAE$, $RMSE$, $R^2$), future stock horizons. |
| `notifications` | In-app alerts for users and hospital staff. Index on `user_id`. |
| `audit_logs` | Immutable audit trail for login, resource updates, transfers. |

---

## 5. Demo Chennai Hospitals (Simulated Dataset)

1. **H001: Rajiv Gandhi Government General Hospital (Chennai Central)**
   - *Lat:* 13.0827, *Lng:* 80.2707
   - *Profile:* High casualty volume. In demo mode, exhibits **rapid oxygen depletion** ($\approx -4.2\text{ units/hr}$) heading towards critical threshold ($30\text{ units}$).
2. **H002: Apollo Hospitals (Anna Nagar)**
   - *Lat:* 13.0878, *Lng:* 80.2096 | Stable stock ($120\text{ cyl}$), $50\text{ available beds}$.
3. **H003: Fortis Malar Hospital (Adyar)**
   - *Lat:* 13.0067, *Lng:* 80.2575 | **High Surplus Donor** ($185\text{ cyl}$), $85\text{ available beds}$, ideal donor for H001.
4. **H004: Prashanth Super Speciality Hospital (Velachery)**
   - *Lat:* 12.9759, *Lng:* 80.2212 | Moderate usage, $90\text{ cyl}$.
5. **H005: Hindu Mission Hospital (Tambaram)**
   - *Lat:* 12.9249, *Lng:* 80.1268 | Limited stock, $80\text{ cyl}$.

---

## 6. Demo Credentials for Evaluation

Judges can switch roles with 1 click using the top **Demo Switcher** banner, or log in manually:

| Role | Email | Password | Assigned Hospital / Hub |
|---|---|---|---|
| **Public User (Patient)** | `patient@medirebal.org` | `patient123` | Anna Nagar, Chennai |
| **Hospital Admin (Central)** | `admin.central@medirebal.org` | `hospital123` | **H001** (Shortage Hospital) |
| **Hospital Admin (Adyar)** | `admin.adyar@medirebal.org` | `hospital123` | **H003** (Surplus Donor Hospital) |
| **Hospital Admin (Anna Nagar)**| `admin.annanagar@medirebal.org`| `hospital123` | **H002** |
| **Hospital Admin (Velachery)** | `admin.velachery@medirebal.org`| `hospital123` | **H004** |
| **Hospital Admin (Tambaram)**  | `admin.tambaram@medirebal.org` | `hospital123` | **H005** |

---

## 7. REST API Documentation

### Authentication
- `POST /api/auth/register` - Create public user account
- `POST /api/auth/login` - Authenticate public user or hospital admin
- `GET /api/auth/me` - Current user profile
- `GET /api/auth/demo-users` - Demo accounts directory

### Hospitals & Live Resources
- `GET /api/hospitals` - Query hospitals (filters: `area`, `search`, `resource`, `userLat`, `userLng`)
- `GET /api/hospitals/:id` - Complete hospital overview with departments, beds, and staff
- `PUT /api/hospitals/:id` - Update hospital profile
- `GET /api/resources/:hospitalId` - Live resource levels
- `PUT /api/resources/:hospitalId` - Update stock (appends time-series reading & recalculates ML prediction)
- `GET /api/resources/history/:hospitalId` - Retrieve time-series readings

### Cross-Hospital Rebalancing & ML
- `GET /api/rebalance/district-analysis` - District-wide shortage vs surplus analysis & ranked transfer recommendations
- `GET /api/predictions` - ML predictions and accuracy statistics for all hubs
- `POST /api/transfers` - Dispatch inter-hospital transfer request
- `PUT /api/transfers/:id` - Progress transfer status (`accepted` $\to$ `in_transit` $\to$ `delivered`)

### Emergency Multi-Hospital Dispatch
- `POST /api/emergency-requests` - Broadcast emergency request to multiple selected hospitals
- `GET /api/emergency-requests` - User's requests or hospital's incoming requests
- `PUT /api/emergency-requests/:id` - Accept/reject emergency request

### Appointments & Staff
- `POST /api/appointments` - Book slot (with double-booking prevention)
- `GET /api/appointments` - View upcoming/past consultations
- `GET /api/doctors/:hospitalId` - Doctor staff list
- `POST /api/doctors` - Add new doctor
- `PUT /api/beds/:hospitalId` - Update bed occupancy

---

## 8. Local Setup & Deployment

### Environment Variables (`.env`)
Create a `.env` file based on `.env.example`:

```bash
# MongoDB Atlas Connection
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/medirebal?retryWrites=true&w=majority"

# Google Gemini API Key (Server-Side)
GEMINI_API_KEY="your_gemini_api_key"

# JWT Secret
JWT_SECRET="medirebal_super_secure_jwt_key_2026"

PORT=3000
```

> **Note on Resilient Fallback:** If `MONGODB_URI` is not provided or network is offline during evaluation, the server automatically boots a resilient in-memory MongoDB-compatible document store pre-seeded with all 5 Chennai hubs, so every feature works immediately with zero crashes.

### Run Locally
```bash
# Install dependencies
npm install

# Start full-stack dev server (Express + Vite)
npm run dev

# Open in browser
http://localhost:3000
```

### Production Build & Render Deployment
```bash
# Build frontend assets
npm run build

# Start production full-stack server
npm run start
```

**Render Configuration:**
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **Environment Variables:** Set `MONGODB_URI`, `GEMINI_API_KEY`, `JWT_SECRET`, `NODE_ENV=production`

---

## 9. Future Android App Architecture

The system is built **API-first**. A future native Kotlin/Jetpack Compose Android application will communicate directly with the exact same `/api/*` REST endpoints using Retrofit and Bearer JWTs, without direct database coupling.
