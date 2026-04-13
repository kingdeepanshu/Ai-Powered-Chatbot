# 🚀 AI API SaaS Backend (Chat + API Keys + Payments)

## 📌 Overview

This project is a **production-ready AI SaaS backend** that allows users to generate API keys, consume AI chat APIs, and track usage with token-based billing.

It solves the problem of building a **scalable AI backend with authentication, rate limiting, usage tracking, and payment integration**.

---

## ⚙️ Features

### 🔐 Authentication

* User signup & login with JWT
* Secure password hashing (bcrypt)

### 🔑 API Key System

* Generate unique API keys (`sk_...`)
* Hashed storage for security
* Usage & quota tracking

### 🤖 AI Chat System

* Chat completion API
* Streaming responses (SSE)
* Context trimming (token-based memory control)
* Function calling support (tools)

### ⚡ Rate Limiting

* Global limiter (100 requests / 15 min)
* AI-specific limiter (10 req / min)

### 📊 Usage Tracking

* Token usage per request
* Usage history stored in DB
* Aggregated usage stats API

### 💳 Payments (Razorpay)

* Create payment orders
* Webhook verification
* Auto credit API usage on payment

### 📡 Streaming Support

* Real-time AI responses via Server-Sent Events (SSE)

### 🧠 Smart Memory Handling

* Token estimation
* Automatic trimming of old messages

---

## 🧱 Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Mongoose)
* **Authentication:** JWT, bcryptjs
* **AI Integration:** OpenAI SDK (Groq / compatible APIs)
* **Payments:** Razorpay
* **Security:** Crypto, Rate Limiting
* **Streaming:** SSE (Server-Sent Events)

---

## 🔌 API Endpoints

### 🔐 Auth

POST /signup
POST /login

---

### 🔑 API Keys

POST /create-key
GET /my-keys

---

### 🤖 AI Chat

POST /chat
POST /chat-stream

---

### 📜 Chat History

GET /history/:userId

---

### 📊 Usage

GET /usage
GET /usage-stats

---

### 💳 Payments

POST /create-order
POST /webhook

---

### 🩺 Health

GET /health
GET /

---

## 📸 Screenshots

[bleh bleh]
[bleh bleh]
[bleh bleh]

---

## ▶️ Demo

Live link: [bleh bleh]

---

## 🧠 How it works

1. User signs up and logs in 🔐
2. User generates an API key 🔑
3. API key is used to access AI endpoints 🤖
4. Chat messages are stored and trimmed intelligently 🧠
5. Token usage is tracked per request 📊
6. Rate limits prevent abuse ⚡
7. Payments increase API usage quota 💳
8. Webhook verifies payment securely 🔔

---

## 🛠️ Run Locally

### 1️⃣ Clone repo

```bash
git clone <your-repo-url>
cd project-folder
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Setup environment variables

```env
PORT=5000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

OPENAI_API_KEY=your_api_key
AI_BASE_URL=https://api.groq.com/openai/v1
```

### 4️⃣ Start server

```bash
npm start
```

---

## ⚠️ Important Notes

* Webhook uses raw body → do not change middleware order
* API keys are hashed → cannot be retrieved again
* Rate limiting is applied to prevent abuse
* Streaming uses SSE → frontend must support it

---

## 📌 Future Improvements

* Redis caching ⚡
* Stripe integration 💳
* Dashboard UI 📊
* Multi-model support 🤖
* Team-based API keys 👥

---

## 👨‍💻 Author

Dev Karan

---

## ⭐ If you like this project

Give it a star ⭐ and use it in your portfolio 🚀
