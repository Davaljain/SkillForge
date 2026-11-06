# SkillForge

AI-powered career development platform for students.  
Stack: **Next.js 14** · **Express** · **MongoDB + Mongoose** · **JWT** · **Tailwind CSS**

---

## Quick start

### Prerequisites
- Node.js 18+
- MongoDB running locally **or** a MongoDB Atlas URI

### 1. Backend
```bash
cd backend
cp ../.env.example .env          # edit MONGODB_URI and JWT_SECRET
npm install
npm run seed                      # seeds careers, skills, questions
npm run dev                       # starts on http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
# create frontend/.env.local:
#   NEXT_PUBLIC_API=http://localhost:4000
npm run dev                       # starts on http://localhost:3000
```

---

## Production build
```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm start
```

---

## MongoDB Atlas (cloud)
1. Create a free cluster at https://cloud.mongodb.com
2. Click **Connect → Drivers** and copy your connection string
3. Set `MONGODB_URI` in `backend/.env` to that string
4. Run `npm run seed` once

---

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/signup | — | Register |
| POST | /auth/login | — | Login → JWT |
| GET | /me | ✓ | Current user + career |
| PUT | /profile | ✓ | Update profile fields |
| GET | /careers | — | List all careers |
| POST | /career/select | ✓ | Set target career |
| GET | /skills | — | All skills |
| POST | /skills/self-report | ✓ | Bulk set skill levels (onboarding) |
| GET | /skill-profile | ✓ | User's skill levels |
| GET | /gaps | ✓ | Computed skill gaps |
| GET | /readiness | ✓ | Career readiness score |
| GET | /roadmap | ✓ | Adaptive roadmap |
| POST | /roadmap/module/:skillId/complete | ✓ | Mark module done |
| POST | /assessments/start | ✓ | Start assessment |
| POST | /assessments/submit | ✓ | Submit answers → updates skill |
| GET | /missions/today | ✓ | Today's missions (auto-generated) |
| POST | /missions/:id/complete | ✓ | Tick mission done |
| POST | /mentor/chat | ✓ | AI career mentor chat |
| GET | /mentor/history | ✓ | Last 20 mentor messages |
| POST | /interview/start | ✓ | Start AI interview session |
| POST | /interview/answer | ✓ | Submit answer, get feedback + next Q |
| GET | /interview/sessions | ✓ | Past interview sessions |
| GET | /projects | ✓ | Recommended projects based on gaps |
| POST | /jobs/analyze | ✓ | Analyze a job description |
| POST | /resume/analyze | ✓ | Upload + analyze PDF/DOCX resume |
| POST | /github/analyze | ✓ | Analyze public GitHub profile |

---

## Tests
```bash
cd backend && npm test
```

## Added in the latest pass
- `GET /readiness` returns a transparent breakdown (skills, projects, DSA, resume, GitHub, interview); unmeasured areas are excluded from the score.
- `GET /assessments/history`, `GET /focus`, `POST /projects/complete`; `GET /roadmap` now includes lesson plans.
- `/playground`: JavaScript runs in a sandboxed Web Worker in the browser with a 3-second timeout; nothing executes on the server.
