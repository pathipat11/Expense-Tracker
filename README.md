# Expense-Tracker-API

A full‑stack **Personal Finance & Expense Tracking System** built with **Django REST Framework** and **Next.js**.
This project is designed as a real‑world, production‑style application covering authentication, transactions, budgets, reports, AI insights, and more.

---

## ✨ Features Overview

### 🔐 Authentication & Users

* JWT authentication with **access + refresh token**
* Refresh token stored securely in **HttpOnly Cookie**
* Automatic token refresh & retry on frontend (Axios interceptor)
* User profile with:

  * Base currency
  * Language
  * Timezone

---

### 💼 Wallets

* Create / edit / delete wallets
* Wallet types: Cash, Bank, Credit Card, E‑Wallet
* Each wallet has its own currency
* Opening balance support
* **Currency & opening balance are locked** once transactions exist

---

### 💸 Transactions

* Expense, Income, Transfer (In / Out)
* Currency conversion using daily FX rates
* Auto‑calculated base currency amount
* Attach receipt image (upload first or later)
* Soft delete support

#### Filters & UX

* Filter by:

  * Month
  * Type
  * Wallet
  * Category
* Client‑side pagination
* Receipt attach flow via URL (`?receipt_url=...`)

---

### 📂 Categories

* Expense / Income categories
* Parent‑child hierarchy
* User‑scoped (per account)

---

### 🧾 Receipt Upload

* Upload receipt images
* Preview before upload
* Stored in `/media/receipts/YYYY/MM/`
* Attach to existing or new transaction

---

### 📊 Budgets

* Monthly budgets
* Budget scopes:

  * Total budget
  * Category‑specific budget
* Budget status calculation:

  * Spent
  * Remaining
  * Percent used
* Alert flags (80% / 100%)

---

### 📈 Reports

* Income vs Expense trends
* Interval support:

  * Daily
  * Weekly
  * Monthly
* Auto‑filled missing dates for smooth charts

---

### 🤖 AI Insights

* Monthly AI‑generated spending summary
* Automatic fallback when API key is missing
* Stored AI results for reuse

---

### 🔁 Recurring Transactions

* Daily / Weekly / Monthly recurring rules
* Interval support (every N days/weeks/months)
* Auto‑generated transactions (ready for cron/job)

---

## 🏗 Tech Stack

### Backend

* **Python 3 / Django 6**
* Django REST Framework
* PostgreSQL
* Django Filters
* SimpleJWT (with refresh token rotation & blacklist)
* DRF Spectacular (Swagger / OpenAPI)

### Frontend

* **Next.js (App Router)**
* TypeScript
* Tailwind CSS
* Axios
* Zustand (auth state)
* Client‑side pagination & filtering

---

## 🔐 Authentication Flow

1. User logs in → access token returned + refresh cookie set
2. Frontend stores access token in memory
3. API requests attach `Authorization: Bearer <token>`
4. On `401`:

   * Auto call `/auth/refresh/`
   * Retry original request
5. If refresh fails → redirect to `/login`

---

## 📁 Project Structure (Backend)

```
finance/
├── models.py          # Wallets, Transactions, Budgets, AI, Recurring
├── serializers.py     # DRF serializers & validation rules
├── views_transactions.py
├── views_budgets.py
├── views_recurring.py
├── pagination.py

users/
├── views.py           # Login / Refresh / Logout / Me
├── serializers.py

config/
├── settings.py
├── urls.py
```

---

## 📁 Project Structure (Frontend)

```
src/
├── app/
│   ├── transactions/
│   ├── wallets/
│   ├── budgets/
│   ├── reports/
│   ├── insights/
│   ├── receipts/
│   └── auth/
│
├── components/
│   ├── AuthGuard.tsx
│   ├── AppShell.tsx
│   └── forms/
│
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── transactions.ts
│   ├── budgets.ts
│   ├── wallets.ts
│   └── categories.ts
│
├── store/
│   └── auth.ts
```

---

## ⚙️ Environment Variables

### Backend (`.env`)

```
DJANGO_SECRET_KEY=...
DJANGO_DEBUG=True
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=5432
OPENAI_API_KEY=...
```

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 🚀 Getting Started

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
npm install
npm run dev
```

---

## 🎯 Project Goals

* Practice **real‑world backend architecture**
* Build a **production‑ready API**
* Demonstrate **secure JWT auth with refresh flow**
* Cover complete finance workflow:

  * Wallet → Transaction → Budget → Report → AI Insight

---

## 📌 Future Improvements

* Server‑side pagination for large datasets
* Cron job for recurring transactions
* Budget alert notifications
* OCR for receipt auto‑fill
* Multi‑user shared wallets

---

## 👤 Author

**Pathipat Mattra**
Intern / Full‑Stack Developer

---

> This project was built as part of a learning journey and internship‑style real‑world system design practice.
