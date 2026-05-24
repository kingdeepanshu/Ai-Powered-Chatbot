# 🚀 AI SaaS Backend Platform

### Prompt Engineering • Streaming AI APIs • Token Analytics • Payments

---

# 📌 Overview

This project is a production-ready AI SaaS backend platform that enables developers to:

* generate secure API keys
* consume AI chat APIs
* stream AI responses in real-time
* create reusable AI prompt templates
* track token usage & model analytics
* estimate AI inference costs
* manage API quotas with payment integration

The system is designed to simulate real-world AI infrastructure used in modern AI developer platforms.

It focuses on scalable backend architecture, observability, streaming systems, prompt engineering, and AI usage analytics.

---

# ⚙️ Features

---

# 🔐 Authentication

* User signup & login with JWT
* Secure password hashing using bcrypt
* Token-based protected routes
* Timing-safe authentication flow

---

# 🔑 API Key Management

* Generate secure API keys (`sk_...`)
* SHA-256 hashed API key storage
* API quota & usage tracking
* API key activation/deactivation support
* Per-user API key limits

---

# 🤖 AI Chat System

* AI chat completion API
* Real-time streaming responses using SSE
* Context-aware conversation history
* Automatic memory trimming based on token estimation
* Multi-conversation support

---

# 🧠 Prompt Engineering System

* Save reusable AI prompt templates
* Dynamic variable injection (`{{variable}}`)
* Run prompts directly through API
* Prompt categories & tags
* Prompt execution analytics

---

# 📊 AI Usage Analytics

* Token usage tracking
* Prompt tokens vs completion tokens
* Model usage analytics
* AI request latency tracking
* Daily aggregated usage statistics
* Cost estimation per AI request

---

# 💳 Payment Integration (Razorpay)

* Razorpay order creation
* Secure webhook verification
* Automatic API quota upgrades after successful payment
* Payment status persistence

---

# ⚡ Rate Limiting

* Global request limiter
* AI-specific request limiter
* Prompt execution limiter
* Abuse prevention middleware

---

# 📡 Streaming Support

* Real-time AI streaming responses
* Server-Sent Events (SSE)
* Chunk-based incremental responses
* Streaming-safe persistence handling

---

# 🧠 Smart Context Management

* Token estimation system
* Automatic conversation trimming
* Optimized AI context window handling

---

# 🛡️ Security Features

* JWT authentication
* Hashed API keys
* Webhook signature verification
* Secure password hashing
* Request validation
* Rate limiting protection

---

# 🧱 Tech Stack

| Category       | Tech                        |
| -------------- | --------------------------- |
| Backend        | Node.js, Express.js         |
| Database       | MongoDB, Mongoose           |
| Authentication | JWT, bcryptjs               |
| AI Integration | OpenAI SDK, Groq API        |
| Payments       | Razorpay                    |
| Security       | Crypto, Express Rate Limit  |
| Streaming      | Server-Sent Events (SSE)    |
| Architecture   | Modular MVC-style structure |

---

# 📂 Project Structure

```txt id="jlwm401"
src/

  config/
  controllers/
  helpers/
  middleware/
  models/
  routes/

server.js
```

---

# 🔌 API Endpoints

---

# 🔐 Authentication

| Method | Endpoint  |
| ------ | --------- |
| POST   | `/signup` |
| POST   | `/login`  |

---

# 🔑 API Keys

| Method | Endpoint      |
| ------ | ------------- |
| POST   | `/create-key` |
| GET    | `/my-keys`    |

---

# 🤖 AI Chat

| Method | Endpoint       |
| ------ | -------------- |
| POST   | `/chat`        |
| POST   | `/chat-stream` |

---

# 🧠 Prompt Templates

| Method | Endpoint           |
| ------ | ------------------ |
| POST   | `/prompts`         |
| GET    | `/prompts`         |
| DELETE | `/prompts/:id`     |
| POST   | `/prompts/:id/run` |

---

# 📜 Chat History

| Method | Endpoint           |
| ------ | ------------------ |
| GET    | `/history/:userId` |

---

# 📊 Usage & Analytics

| Method | Endpoint              |
| ------ | --------------------- |
| GET    | `/usage`              |
| GET    | `/usage-stats`        |
| GET    | `/analytics/overview` |
| GET    | `/analytics/models`   |

---

# 💳 Payments

| Method | Endpoint        |
| ------ | --------------- |
| POST   | `/create-order` |
| POST   | `/webhook`      |

---

# 🩺 Health Check

| Method | Endpoint  |
| ------ | --------- |
| GET    | `/health` |
| GET    | `/`       |

---

# 🧠 How It Works

1. User signs up and logs in 🔐
2. User generates API keys 🔑
3. API key is used to access AI endpoints 🤖
4. Conversations are stored with smart context trimming 🧠
5. AI responses can stream in real-time using SSE 📡
6. Prompt templates can be saved and executed ⚡
7. Token usage and latency are tracked 📊
8. AI inference cost is estimated automatically 💰
9. Rate limiting prevents abuse 🛡️
10. Payments increase API usage quota 💳
11. Webhooks securely verify payments 🔔

---

# 📊 Analytics Supported

The platform tracks:

* Total token usage
* Prompt tokens
* Completion tokens
* Estimated AI costs
* Model-wise usage
* Request counts
* Average latency
* Daily usage statistics

---

# 🛠️ Run Locally

---

## 1️⃣ Clone Repository

```bash id="jlwm402"
git clone <your-repo-url>

cd project-folder
```

---

## 2️⃣ Install Dependencies

```bash id="jlwm403"
npm install
```

---

## 3️⃣ Setup Environment Variables

Create `.env`

```env id="jlwm404"
PORT=5000

MONGO_URI=your_mongodb_uri

JWT_SECRET=your_jwt_secret

OPENAI_API_KEY=your_api_key

AI_BASE_URL=https://api.groq.com/openai/v1

RAZORPAY_KEY_ID=your_key

RAZORPAY_KEY_SECRET=your_secret

RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

ALLOWED_ORIGIN=http://localhost:5173
```

---

## 4️⃣ Start Server

```bash id="jlwm405"
npm start
```

OR

```bash id="jlwm406"
node server.js
```

---

# 📡 Streaming Example (SSE)

```txt id="jlwm407"
event: message
data: {"content":"Hello"}

event: message
data: {"content":" world"}

event: done
data: {}
```

---

# 📸 Screenshots

```txt id="jlwm408"
[ Add dashboard screenshots here ]

[ Add analytics screenshots here ]

[ Add prompt system screenshots here ]
```

---

# ▶️ Demo

```txt id="jlwm409"
Frontend Demo: [ add frontend link ]

Backend API: [ add backend link ]
```

---

# ⚠️ Important Notes

* Webhook uses raw request body
* API keys are hashed and cannot be recovered
* SSE streaming requires frontend EventSource/fetch stream support
* Rate limiting is enabled for AI endpoints
* AI token costs are estimated based on model pricing
* Context trimming prevents oversized AI requests

---

# 🚀 Future Improvements

* Multi-model routing
* Redis caching
* Team workspaces
* Stripe integration
* AI playground UI
* Vector database memory
* Semantic prompt search
* AI agent workflows
* Docker deployment
* Kubernetes scaling

---

# 👨‍💻 Author

### Dev Karan

---

# ⭐ If you like this project

Give it a star ⭐ and use it in your portfolio 🚀
