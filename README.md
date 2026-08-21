# KisanConnect Marketplace Platform 🌾

KisanConnect is a direct-to-market digital platform designed for hackathons and demo presentations. It connects rural farmers and FPOs directly with consumers and bulk commercial buyers, bypassing traditional middlemen commissions.

---

## 🚀 Key Features

### 🔐 1. Role-Based JWT Auth & Sandbox OTP
* **Farmer, Consumer, Bulk Buyer, and Admin** roles.
* Sign-up triggers a simulated **OTP verification flow** (sent via SMS stub to terminal console).
* A master sandbox OTP (`123456`) allows seamless demo sign-ups.

### 🍅 2. Direct Marketplace & Details Modal
* Consumers can search produce, sort by price/freshness, and filter by **pincode** or **district**.
* Product cards render a **dynamic freshness percentage indicator** computed from harvest and expiry dates.
* Crop details expand to show farmer information and nested customer reviews with average ratings.

### 📊 3. Farmer Dashboard & Demand Aggregation
* **Real-time statistics** for total earnings, pending orders, and active listings.
* **Crop Inventory CRUD**: Quickly add new listings with categories, units, and harvest/expiry dates.
* **Mandi Pricing Benchmark Index**: A Recharts bar chart comparing the farmer's listing price against wholesale Mandi rates and retail market rates (visualizing the middleman-free savings margin).
* **30-Day Sales Demand Aggregation**: An area chart displaying aggregated volume trend logs, including a code placeholder (`TODO: [ML Model Integration]`) where an ARIMA/Prophet/LSTM model can be connected.

### 🤝 4. Bulk Buyer Portal & Counter-Bidding
* Industrial buyers can request wholesale volume pricing.
* Interactive negotiation table handles bidding status transitions (`pending` ➔ `counter_offered` ➔ `accepted` / `rejected`).
* Accepting a counter-offer automatically creates a pending order, leading directly to sandbox checkout.

### 🚚 5. Rule-Based Pincode Logistics
* When an order payment is confirmed, the logistics matching service assigns a regional carrier.
* The assignment is **load-balanced** (selecting the partner with the least active deliveries in that pincode/district) and calculates shipping distances.

### 💳 6. Razorpay Sandbox Gateway Simulator
* Built-in sandbox gateway modal verifying cryptographic signature callback mocks for successful or failed simulated payments.

---

## 🔑 Demo User Credentials

All passwords are automatically configured. You can log in using these accounts to showcase different platform views:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `adminpassword` | Approves pending KYC farmer applications and monitors diagnostic logs. |
| **Farmer (Verified)** | `farmer1` | `farmerpassword` | Manages active tomato/potato listings, views earnings, and reviews demand trends. |
| **Farmer (Verified)** | `farmer2` | `farmerpassword` | Manages wheat/onion listings and responds to wholesale quote negotiations. |
| **Farmer (Pending)** | `farmer_pending` | `farmerpassword` | Simulates a newly registered farmer waiting for KYC verification. |
| **Consumer** | `consumer1` | `consumerpassword` | Browses marketplace, adds produce to basket, pays via Razorpay, and tracks shipments. |
| **Bulk Buyer** | `bulk_buyer1` | `buyerpassword` | Initiates volume contract negotiations and purchases wholesale yields. |

---

## 🛠️ Tech Stack

* **Backend**: Django, Django REST Framework, SimpleJWT, SQLite, drf-spectacular (OpenAPI 3 / Swagger).
* **Frontend**: React (Vite), React Router v7, Context API, Axios, Tailwind CSS v4, Lucide Icons, Recharts.
* **Orchestration**: Docker & Docker Compose.

---

## 🏃 Running the Application

### Method A: Native Setup (Local Development)

#### 1. Setup Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py seed_db
python manage.py runserver
```
*API will run at: `http://127.0.0.1:8000/`*  
*Swagger docs at: `http://127.0.0.1:8000/api/docs/`*

#### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
*Vite web server will run at: `http://localhost:5173/`*

---

### Method B: Containerized Setup (Single Command)

We have containerized both services. Ensure Docker is running and execute:

```bash
docker-compose up --build
```

* Backend healthchecks run automatically.
* Once the backend is healthy, the React server starts.
* Open `http://localhost:5173` to explore the system!
