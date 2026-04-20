# StudySync

A collaborative study scheduling platform for college students. StudySync helps students coordinate study sessions, see when friends are available, and organize group study time — all from a shared calendar view.

---

## What We're Building

StudySync solves the problem of disorganized study coordination. Instead of texting back and forth to find a time, students can see their friends' schedules, create shared study blocks, join study groups, and stay in sync — across web today, and mobile in the future.

**Roadmap:**
- **Phase 1 (current):** Web app with mock data — UI/UX, core scheduling flows
- **Phase 2:** Backend integration — real auth, database, live presence/status
- **Phase 3:** Mobile app (React Native / Expo) sharing core business logic with the web

---

## Current Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Calendar | FullCalendar 6 (daygrid, timegrid, interaction) |
| Linting | ESLint 9 |
| Data | Mock data (local JS files) |

---

## Current Features

- **Weekly calendar view** — study blocks displayed by time slot across the week
- **Course sidebar** — color-coded enrolled courses
- **Friend presence** — see friends' real-time status (Available / Studying / Busy)
- **Study groups** — create and browse shared study groups
- **Study block creation** — create new blocks with title, course, time, and participants
- **Multi-participant blocks** — invite friends to a shared study session
- **Search** — find friends and groups from the right panel

---

## Getting Started

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173` by default.

```bash
npm run build    # production build
npm run preview  # preview production build locally
npm run lint     # run ESLint
```

---

## Project Structure

```
src/
├── components/       # UI components
│   ├── Header.jsx
│   ├── StudyCalendar.jsx
│   ├── CoursesSidebar.jsx
│   ├── RightPanel.jsx
│   ├── CreateBlockModal.jsx
│   └── Avatar.jsx
├── data/             # Mock data (temporary — to be replaced by API)
│   ├── courses.js
│   ├── users.js
│   ├── groups.js
│   └── studyBlocks.js
├── App.jsx
├── main.jsx
└── index.css
```
