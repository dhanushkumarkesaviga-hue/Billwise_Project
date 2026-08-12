# BillWise Backend (Spring Boot)

A standalone Spring Boot REST API for the BillWise React frontend: invoice
CRUD, GST deadline tracking, JWT-secured role based login, and a real
Gemini-powered AI Copilot chat with MongoDB-persisted data.

## Stack
- Java 17, Spring Boot 3.3
- Spring Web, Spring Data **MongoDB**, Bean Validation
- **Spring Security + JWT** (io.jsonwebtoken / jjwt) for role based auth
- Google Gemini API (`gemini-1.5-flash`, free tier) for the AI Copilot

## 1. Prerequisites
- JDK 17+
- Maven (your college network sometimes blocks Maven Central — use your
  mobile hotspot for the first `mvn` build if downloads fail)
- MongoDB running locally (or an Atlas connection string)
- A free Gemini API key: https://aistudio.google.com/app/apikey

## 2. Database setup
No manual schema step needed — MongoDB creates the `billwise_db` database
and its collections (`invoices`, `gst_deadlines`, `chat_messages`, `users`)
automatically on first write.

Start MongoDB locally, e.g.:
```bash
# Docker is the easiest way if you don't already have Mongo installed
docker run -d --name billwise-mongo -p 27017:27017 mongo:7
```

Demo invoices/deadlines (the same ones that used to live in
`mockInvoices.js` / `gstDeadlines.js`) and three demo user logins are
seeded automatically on first startup if those collections are empty —
see `DataSeeder.java`.

**Demo logins (change/remove before deploying anywhere real):**
| Username     | Password       | Role       |
|--------------|----------------|------------|
| `admin`      | `Admin@123`      | ADMIN      |
| `accountant` | `Accountant@123` | ACCOUNTANT |
| `viewer`     | `Viewer@123`     | VIEWER     |

## 3. Configure secrets (don't hardcode these)
Set environment variables before running:
```bash
export MONGODB_URI="mongodb://localhost:27017/billwise_db"
export JWT_SECRET="a-long-random-string-at-least-32-characters"
export GEMINI_API_KEY=your_gemini_api_key
```
On Windows (PowerShell):
```powershell
$env:MONGODB_URI="mongodb://localhost:27017/billwise_db"
$env:JWT_SECRET="a-long-random-string-at-least-32-characters"
$env:GEMINI_API_KEY="your_gemini_api_key"
```
Defaults live in `src/main/resources/application.properties` for local dev
convenience — replace `jwt.secret` with a real random value before you ever
deploy this anywhere reachable.

## 4. Run
```bash
mvn spring-boot:run
```
The API starts on **http://localhost:8080**.

## 5. Authentication & roles

Every `/api/**` route (except `/api/auth/**`) now requires a valid JWT in
an `Authorization: Bearer <token>` header. Three roles are supported:

| Role         | Can do                                                             |
|--------------|---------------------------------------------------------------------|
| `ADMIN`      | Everything: create/update/approve invoices **and** delete them      |
| `ACCOUNTANT` | Create, update, approve/flag/mark-paid invoices. Cannot delete      |
| `VIEWER`     | Read-only: dashboard, invoice list, GST/ITC views, deadlines, chat   |

### Auth endpoints
| Method | Path                | Description                                              |
|--------|---------------------|------------------------------------------------------------|
| POST   | `/api/auth/register` | `{username, email, password, role?}` → creates a user (role defaults to `VIEWER`) and returns a token |
| POST   | `/api/auth/login`    | `{username, password}` → returns `{token, username, email, role, expiresInMs}` |
| GET    | `/api/auth/me`       | Returns the caller's username/role for the token in the `Authorization` header |

Example login:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```
Then call any protected endpoint with the returned token:
```bash
curl http://localhost:8080/api/invoices \
  -H "Authorization: Bearer <token>"
```

## 6. Endpoints

### Invoices (all require a valid token; roles noted where restricted)
| Method | Path                        | Roles                     | Description                          |
|--------|------------------------------|----------------------------|---------------------------------------|
| GET    | `/api/invoices`              | any                        | List all invoices                     |
| GET    | `/api/invoices/{id}`         | any                        | Get one invoice                       |
| POST   | `/api/invoices`               | ADMIN, ACCOUNTANT          | Create invoice (e.g. after OCR scan)  |
| PUT    | `/api/invoices/{id}`         | ADMIN, ACCOUNTANT          | Full update                           |
| PATCH  | `/api/invoices/{id}/status`  | ADMIN, ACCOUNTANT          | Quick update `{status, paymentStatus}`|
| DELETE | `/api/invoices/{id}`         | ADMIN only                 | Delete invoice                        |
| GET    | `/api/invoices/stats`        | any                        | Dashboard aggregates                  |
| POST   | `/api/invoices/classify`     | ADMIN, ACCOUNTANT          | AI category classification            |

### GST Deadlines
| Method | Path              | Roles | Description                          |
|--------|-------------------|-------|----------------------------------------|
| GET    | `/api/deadlines`  | any   | All deadlines, with live `daysRemaining` |

### AI Copilot (Gemini)
| Method | Path                              | Roles | Description                         |
|--------|-------------------------------------|-------|--------------------------------------|
| POST   | `/api/copilot/chat`                | any   | `{message, sessionId}` → AI reply    |
| GET    | `/api/copilot/history/{sessionId}` | any   | Replay saved chat history            |
| DELETE | `/api/copilot/history/{sessionId}` | any   | Clear a conversation                 |

The copilot grounds every answer in **real numbers pulled from the database**
(total spend, eligible/blocked ITC, flagged invoices) — the model is only
used to explain and phrase the answer, never to invent financial figures.

## 7. Wiring up the React frontend
The included `billwise-app` frontend already has a login screen and attaches
the JWT to every request (see its own README/`src/api.js`). Point it at this
API via `VITE_API_BASE` (defaults to `http://localhost:8080/api`).

CORS is already configured for `http://localhost:5173` (Vite's default dev
port) in `SecurityConfig.java` — add your deployed frontend's origin there
too when you deploy.

## 8. Notes
- OCR stays 100% client-side (`tesseract.js` in the browser) — no backend
  change needed there. Once a scan completes, `POST` the extracted fields to
  `/api/invoices` to persist it (requires ADMIN/ACCOUNTANT).
- Passwords are hashed with BCrypt (`spring-security-crypto`), never stored
  or logged in plaintext.
- Tokens are stateless JWTs (HS256) valid for 24h by default
  (`jwt.expiration-ms`). There's no refresh-token flow yet — once a token
  expires the frontend simply asks the user to log in again.
- If/when you fold this into an existing microservices setup (Eureka +
  gateway), add `spring-cloud-starter-netflix-eureka-client`, an
  `eureka.client.service-url.defaultZone` property, and route
  `/api/invoices/**` etc. through the gateway instead of hitting port 8080
  directly.
