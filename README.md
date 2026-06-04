# HYROX Coach

A mobile-first training log and AI coach for HYROX athletes.  
Built with **Next.js 14 App Router**, **Supabase**, **Tailwind CSS**, and the **Anthropic Claude API**.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (Postgres + RLS) |
| AI | Anthropic Claude (claude-opus-4-5 / claude-haiku-4-5) |
| Charts | Recharts |
| Icons | Lucide React |

---

## Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/your-username/hyrox-coach.git
cd hyrox-coach
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open **SQL Editor**.
3. Paste the entire contents of `supabase-schema.sql` and click **Run**.
4. Both tables (`session_logs` and `garmin_logs`) will be created with indexes, triggers, and RLS policies.

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon` `public` key |
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |

> ⚠️ **Never commit `.env.local` to version control.** It is already in `.gitignore`.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.  
The app redirects to `/today` by default.

### 6. Type-check

```bash
npm run type-check
```

---

## Project Structure

```
hyrox-coach/
├── app/
│   ├── api/
│   │   ├── sessions/route.ts     # GET / POST session logs
│   │   ├── garmin/route.ts       # GET / POST / DELETE Garmin entries
│   │   ├── review/route.ts       # POST → Claude weekly review
│   │   └── parse-notes/route.ts  # POST → Claude note insight
│   ├── today/page.tsx            # Today's session (tab 1)
│   ├── week/page.tsx             # Weekly calendar (tab 2)
│   ├── garmin/page.tsx           # Garmin biometrics (tab 3)
│   ├── review/page.tsx           # AI coach review (tab 4)
│   ├── layout.tsx                # Root layout + metadata
│   ├── page.tsx                  # Root → redirects to /today
│   └── globals.css               # Tailwind base + global resets
│
├── components/
│   ├── ui/                       # Reusable primitives (coming with UI spec)
│   ├── SessionCard.tsx           # Session log display card
│   ├── DayCard.tsx               # Compact day card for weekly grid
│   ├── RPESlider.tsx             # 1–10 RPE input slider
│   ├── GarminCard.tsx            # Biometric entry card
│   ├── TabBar.tsx                # Bottom navigation
│   └── StatCard.tsx              # Generic metric display
│
├── lib/
│   ├── supabase.ts               # Typed Supabase client
│   ├── types.ts                  # All TypeScript interfaces
│   └── trainingData.ts           # 56-day Phase 1 plan + helpers
│
├── supabase-schema.sql           # Paste into Supabase SQL Editor
├── .env.local.example            # Environment variable template
├── tailwind.config.ts            # Tailwind + brand colours
├── tsconfig.json
└── package.json
```

---

## API Reference

### `GET /api/sessions`
Returns all session logs. Optional: `?day_key=YYYY-MM-DD` to filter to one day.

### `POST /api/sessions`
Upserts a session log. Body must include `day_key`. Conflicts resolved on `day_key`.

### `GET /api/garmin`
Returns Garmin entries. Optional: `?limit=N` (default 30, max 90).

### `POST /api/garmin`
Upserts a Garmin entry. Body must include `date`. Conflicts resolved on `date`.

### `DELETE /api/garmin?id=<uuid>`
Deletes a single Garmin entry.

### `POST /api/review`
Builds full training context from Supabase, calls **claude-opus-4-5**, returns AI coach review.  
Optional body: `{ "question": "..." }` for a specific question.

### `POST /api/parse-notes`
Calls **claude-haiku-4-5** to parse raw session notes into a 1–2 sentence coach insight.  
Body: `{ "notes": "...", "sessionName": "...", "rpe": 7 }`

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in [vercel.com](https://vercel.com/new).
3. In **Project Settings → Environment Variables**, add all three keys from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
4. Click **Deploy**.

Vercel will auto-deploy on every push to `main`.

---

## Training Plan

Phase 1 spans **June 1 – July 26** (8 weeks, 56 days). The full plan lives in  
`lib/trainingData.ts` as the `PHASE_1` array and is imported directly by the UI —  
no CMS or additional API needed for the training schedule.

Helper functions:
- `isToday(dateStr)` — returns `true` if the date is today
- `getDayKey(day)` — returns the `YYYY-MM-DD` key for a day
- `getTodayDay()` — returns today's `TrainingDay` object (or `undefined`)
- `getWeekDays(week)` — returns all 7 days for a given week number
- `getCurrentWeek()` — returns the current week number (1–8)
