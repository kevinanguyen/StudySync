# StudySync Plan 1: Foundation + Auth + Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the JS prototype to a TypeScript foundation with Supabase auth, a fully-deployed database schema with RLS, and working login/signup/logout flows. Dashboard remains intact visually but gates behind authentication.

**Architecture:** React + Vite + TypeScript + Tailwind (preserved). React Router v6 for routing, Zustand for app state, Supabase for auth + Postgres + realtime. Vitest for unit tests. Pure time/availability logic in `lib/` with no external deps for testability. Services wrap Supabase queries; components call hooks; hooks call services.

**Tech Stack:** React 19, Vite 5, TypeScript 5, Tailwind 3, FullCalendar 6, React Router 6, Zustand 4, @supabase/supabase-js 2, Vitest 2, @testing-library/react 16.

**Scope:** Spec Phases 1, 2, 3. After this plan lands, a follow-up plan covers Courses + Events + Availability (Phases 4-6), then Friends + Invites + Groups + Chat (Phases 7-10), then Settings + Polish (Phases 11-12).

**Spec reference:** `docs/superpowers/specs/2026-04-20-studysync-mvp-design.md`

---

## File Structure After This Plan

```
StudySync/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Root component with Router
│   │   ├── routes.tsx                 # Route config
│   │   └── ProtectedRoute.tsx         # Auth gate for authenticated routes
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── DashboardPage.tsx          # The 3-column layout shell
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignupForm.tsx
│   │   ├── calendar/
│   │   │   └── StudyCalendar.tsx      # Migrated from .jsx (mock data for now)
│   │   ├── courses/
│   │   │   └── CoursesSidebar.tsx     # Migrated from .jsx
│   │   ├── friends/
│   │   │   └── RightPanel.tsx         # Migrated from .jsx
│   │   ├── groups/                    # Empty, populated in later plans
│   │   ├── layout/
│   │   │   └── Header.tsx             # Migrated from .jsx
│   │   └── shared/
│   │       ├── Avatar.tsx             # Migrated from .jsx
│   │       └── CreateBlockModal.tsx   # Migrated from .jsx
│   ├── hooks/
│   │   └── useAuth.ts                 # Reads from authStore + subscribes to session changes
│   ├── lib/
│   │   ├── supabase.ts                # Supabase client singleton
│   │   └── time.ts                    # Pure time helpers
│   ├── services/
│   │   └── auth.service.ts            # signUp, signIn, signOut, getSession
│   ├── store/
│   │   └── authStore.ts               # Zustand: session, profile, hydrated flag
│   ├── types/
│   │   └── db.ts                      # Generated from Supabase CLI
│   ├── data/                          # Preserved for now (calendar uses mock data)
│   │   ├── courses.js
│   │   ├── users.js
│   │   ├── groups.js
│   │   └── studyBlocks.js
│   ├── main.tsx                       # Entry point
│   └── index.css
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql            # Tables + enums + indexes
│   │   └── 0002_rls.sql               # Row-level security policies
│   └── seed.sql                       # Demo data for dev
├── tests/
│   └── lib/
│       └── time.test.ts
├── .env.example                       # Template for Supabase keys
├── .env.local                         # User-created, gitignored
├── tsconfig.json
├── tsconfig.node.json
├── vitest.config.ts
├── vite.config.ts                     # Updated for TS
└── package.json
```

---

## Task 1: Install TypeScript and convert build config

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Modify: `vite.config.js` → `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install TypeScript**

Run:
```bash
npm install --save-dev typescript@^5.6.0
```

Expected: `typescript` added to devDependencies in package.json.

- [ ] **Step 2: Create tsconfig.json**

Create `/Users/exfi8/Projects/StudySync/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowJs": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client", "node"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Note: `allowJs: true` lets us keep `.js` mock data files working during migration.

- [ ] **Step 3: Create tsconfig.node.json**

Create `/Users/exfi8/Projects/StudySync/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Rename vite.config.js to vite.config.ts**

Run:
```bash
mv vite.config.js vite.config.ts
```

- [ ] **Step 5: Read current vite.config.ts**

Run:
```bash
cat vite.config.ts
```

Expected output: the existing Vite config. It likely just imports React plugin.

- [ ] **Step 6: Update vite.config.ts with path alias**

Replace entire file contents with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 7: Install Node types**

Run:
```bash
npm install --save-dev @types/node
```

- [ ] **Step 8: Add typecheck script to package.json**

Read `package.json`, then modify the `"scripts"` section to include a `typecheck` script. After this step, scripts section must contain:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

- [ ] **Step 9: Verify TypeScript setup**

Run:
```bash
npx tsc --noEmit
```

Expected: no output (success) OR errors about specific `.jsx` files. If errors appear only for files in `src/`, they're expected — we migrate next. If errors mention missing config, review tsconfig.json.

- [ ] **Step 10: Commit**

```bash
git add tsconfig.json tsconfig.node.json vite.config.ts package.json package-lock.json
git rm vite.config.js 2>/dev/null || true
git commit -m "chore: add TypeScript build configuration"
```

---

## Task 2: Install runtime dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install React Router**

Run:
```bash
npm install react-router-dom@^6.28.0
```

- [ ] **Step 2: Install Zustand**

Run:
```bash
npm install zustand@^5.0.0
```

- [ ] **Step 3: Install Supabase client**

Run:
```bash
npm install @supabase/supabase-js@^2.45.0
```

- [ ] **Step 4: Install Vitest and Testing Library**

Run:
```bash
npm install --save-dev vitest@^2.1.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.5.0 @testing-library/user-event@^14.5.2 jsdom@^25.0.0
```

- [ ] **Step 5: Add test script to package.json**

Modify `package.json` scripts section to include:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "typecheck": "tsc --noEmit",
  "test": "vitest",
  "test:run": "vitest run",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

- [ ] **Step 6: Verify installs**

Run:
```bash
npm list react-router-dom zustand @supabase/supabase-js vitest
```

Expected: all 4 packages listed with versions.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install React Router, Zustand, Supabase, Vitest"
```

---

## Task 3: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Create vitest.config.ts**

Create `/Users/exfi8/Projects/StudySync/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 2: Create tests/setup.ts**

Create `/Users/exfi8/Projects/StudySync/tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Create smoke test**

Create `/Users/exfi8/Projects/StudySync/tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('test runner', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run smoke test**

Run:
```bash
npm run test:run
```

Expected: 1 test passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/
git commit -m "chore: set up Vitest with jsdom and Testing Library"
```

---

## Task 4: Create folder structure and move existing components

**Files:**
- Create directories under `src/`
- Move: `src/components/Header.jsx` → `src/components/layout/Header.jsx`
- Move: `src/components/CoursesSidebar.jsx` → `src/components/courses/CoursesSidebar.jsx`
- Move: `src/components/RightPanel.jsx` → `src/components/friends/RightPanel.jsx`
- Move: `src/components/StudyCalendar.jsx` → `src/components/calendar/StudyCalendar.jsx`
- Move: `src/components/CreateBlockModal.jsx` → `src/components/shared/CreateBlockModal.jsx`
- Move: `src/components/Avatar.jsx` → `src/components/shared/Avatar.jsx`

- [ ] **Step 1: Create directory structure**

Run:
```bash
mkdir -p src/app src/pages src/components/auth src/components/calendar src/components/courses src/components/friends src/components/groups src/components/layout src/components/shared src/hooks src/lib src/services src/store src/types src/utils
```

- [ ] **Step 2: Move Header**

Run:
```bash
git mv src/components/Header.jsx src/components/layout/Header.jsx
```

- [ ] **Step 3: Move CoursesSidebar**

Run:
```bash
git mv src/components/CoursesSidebar.jsx src/components/courses/CoursesSidebar.jsx
```

- [ ] **Step 4: Move RightPanel**

Run:
```bash
git mv src/components/RightPanel.jsx src/components/friends/RightPanel.jsx
```

- [ ] **Step 5: Move StudyCalendar**

Run:
```bash
git mv src/components/StudyCalendar.jsx src/components/calendar/StudyCalendar.jsx
```

- [ ] **Step 6: Move CreateBlockModal**

Run:
```bash
git mv src/components/CreateBlockModal.jsx src/components/shared/CreateBlockModal.jsx
```

- [ ] **Step 7: Move Avatar**

Run:
```bash
git mv src/components/Avatar.jsx src/components/shared/Avatar.jsx
```

- [ ] **Step 8: Update imports in existing App.jsx**

Read `src/App.jsx`. Replace its contents with:

```jsx
import Header from './components/layout/Header';
import CoursesSidebar from './components/courses/CoursesSidebar';
import StudyCalendar from './components/calendar/StudyCalendar';
import RightPanel from './components/friends/RightPanel';

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        <CoursesSidebar />
        <StudyCalendar />
        <RightPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Update imports inside moved components**

In `src/components/calendar/StudyCalendar.jsx`, change:
```js
import { getCourse } from '../data/courses';
import { FRIENDS } from '../data/users';
import { INITIAL_STUDY_BLOCKS } from '../data/studyBlocks';
import CreateBlockModal from './CreateBlockModal';
```
To:
```js
import { getCourse } from '../../data/courses';
import { FRIENDS } from '../../data/users';
import { INITIAL_STUDY_BLOCKS } from '../../data/studyBlocks';
import CreateBlockModal from '../shared/CreateBlockModal';
```

In `src/components/courses/CoursesSidebar.jsx`, change:
```js
import { COURSES } from '../data/courses';
import { CURRENT_USER, statusConfig } from '../data/users';
import Avatar from './Avatar';
```
To:
```js
import { COURSES } from '../../data/courses';
import { CURRENT_USER, statusConfig } from '../../data/users';
import Avatar from '../shared/Avatar';
```

In `src/components/friends/RightPanel.jsx`, change:
```js
import { FRIENDS, statusConfig } from '../data/users';
import { GROUPS as GROUPS_DATA } from '../data/groups';
import Avatar from './Avatar';
```
To:
```js
import { FRIENDS, statusConfig } from '../../data/users';
import { GROUPS as GROUPS_DATA } from '../../data/groups';
import Avatar from '../shared/Avatar';
```

In `src/components/shared/CreateBlockModal.jsx`, change:
```js
import { COURSES } from '../data/courses';
import { CURRENT_USER } from '../data/users';
```
To:
```js
import { COURSES } from '../../data/courses';
import { CURRENT_USER } from '../../data/users';
```

In `src/components/shared/Avatar.jsx`, change:
```js
import { statusConfig } from '../data/users';
```
To:
```js
import { statusConfig } from '../../data/users';
```

- [ ] **Step 10: Verify dev server starts**

Run in background:
```bash
npm run dev
```

Expected: Vite starts without errors. If errors about unresolved imports, re-check the paths above.

Kill the dev server after verifying (Ctrl+C).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: reorganize components by domain (layout/calendar/courses/friends/shared)"
```

---

## Task 5: Migrate existing .jsx components to .tsx

**Files:**
- Rename and type: `src/App.jsx` → `src/App.tsx`
- Rename and type: `src/main.jsx` → `src/main.tsx`
- Rename and type: `src/components/layout/Header.jsx` → `src/components/layout/Header.tsx`
- Rename and type: `src/components/shared/Avatar.jsx` → `src/components/shared/Avatar.tsx`
- Rename and type: `src/components/courses/CoursesSidebar.jsx` → `src/components/courses/CoursesSidebar.tsx`
- Rename and type: `src/components/friends/RightPanel.jsx` → `src/components/friends/RightPanel.tsx`
- Rename and type: `src/components/calendar/StudyCalendar.jsx` → `src/components/calendar/StudyCalendar.tsx`
- Rename and type: `src/components/shared/CreateBlockModal.jsx` → `src/components/shared/CreateBlockModal.tsx`

- [ ] **Step 1: Read existing main.jsx**

Run:
```bash
cat src/main.jsx
```

- [ ] **Step 2: Rename main.jsx to main.tsx**

Run:
```bash
git mv src/main.jsx src/main.tsx
```

- [ ] **Step 3: Rename App.jsx to App.tsx**

Run:
```bash
git mv src/App.jsx src/App.tsx
```

- [ ] **Step 4: Update index.html script reference**

Read `index.html`. Find the script tag referencing `/src/main.jsx` and change it to `/src/main.tsx`. Save.

- [ ] **Step 5: Rename Header.jsx to Header.tsx**

Run:
```bash
git mv src/components/layout/Header.jsx src/components/layout/Header.tsx
```

No other changes needed — Header has no props, no state, no dynamic data. TypeScript accepts it as-is.

- [ ] **Step 6: Rename and type Avatar**

Run:
```bash
git mv src/components/shared/Avatar.jsx src/components/shared/Avatar.tsx
```

Then read `src/components/shared/Avatar.tsx`. Replace its contents with:

```tsx
import { statusConfig } from '../../data/users';

type Size = 'sm' | 'md' | 'lg';

interface AvatarUser {
  avatarColor?: string;
  initials?: string;
  status?: keyof typeof statusConfig;
}

interface AvatarProps {
  user?: AvatarUser | null;
  size?: Size;
  showStatus?: boolean;
  className?: string;
}

export default function Avatar({ user, size = 'md', showStatus = false, className = '' }: AvatarProps) {
  const sizes: Record<Size, string> = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const dotSizes: Record<Size, string> = {
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
  };

  const status = user?.status ? statusConfig[user.status] : null;

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white`}
        style={{ backgroundColor: user?.avatarColor || '#6B7280' }}
      >
        {user?.initials || '?'}
      </div>
      {showStatus && status && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-white`}
          style={{ backgroundColor: status.color }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Rename Header, CoursesSidebar, RightPanel, StudyCalendar, CreateBlockModal to .tsx**

Run:
```bash
git mv src/components/courses/CoursesSidebar.jsx src/components/courses/CoursesSidebar.tsx
git mv src/components/friends/RightPanel.jsx src/components/friends/RightPanel.tsx
git mv src/components/calendar/StudyCalendar.jsx src/components/calendar/StudyCalendar.tsx
git mv src/components/shared/CreateBlockModal.jsx src/components/shared/CreateBlockModal.tsx
```

- [ ] **Step 8: Type CreateBlockModal**

Read `src/components/shared/CreateBlockModal.tsx`. Replace its contents with:

```tsx
import { useState, useEffect, useRef } from 'react';
import { COURSES } from '../../data/courses';
import { CURRENT_USER } from '../../data/users';

interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
}

interface TimeInfo {
  startStr: string;
  endStr: string;
  start: Date;
  end: Date;
}

interface Position {
  x: number;
  y: number;
}

interface CreateBlockModalProps {
  position: Position;
  timeInfo: TimeInfo;
  onConfirm: (course: Course) => void;
  onCancel: () => void;
}

export default function CreateBlockModal({ position, timeInfo, onConfirm, onCancel }: CreateBlockModalProps) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const enrolledCourses = COURSES.filter((c: Course) => CURRENT_USER.enrolledCourses.includes(c.id));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  function formatTime(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function handleConfirm() {
    if (!selectedCourse) return;
    onConfirm(selectedCourse);
  }

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    top: Math.min(position.y, window.innerHeight - 300),
    left: Math.min(position.x, window.innerWidth - 240),
  };

  return (
    <div style={modalStyle}>
      <div ref={ref} className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-56">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">Add Study Block</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {timeInfo && (
          <p className="text-[11px] text-gray-500 mb-3">
            {formatTime(timeInfo.startStr)} – {formatTime(timeInfo.endStr)}
          </p>
        )}

        <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Select Course</p>

        <div className="flex flex-col gap-1.5 mb-4">
          {enrolledCourses.map((course: Course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourse(course)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all border ${
                selectedCourse?.id === course.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: course.color }} />
              <div>
                <p className="text-xs font-semibold text-gray-800">{course.code}</p>
                <p className="text-[10px] text-gray-500 leading-tight">{course.name}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!selectedCourse} className={`flex-1 py-1.5 text-xs font-semibold text-white rounded transition-colors ${selectedCourse ? 'bg-[#3B5BDB] hover:bg-[#3451c7]' : 'bg-gray-300 cursor-not-allowed'}`}>
            Add Block
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Type CoursesSidebar**

Read `src/components/courses/CoursesSidebar.tsx`. Add type annotations. Replace its contents with:

```tsx
import { COURSES } from '../../data/courses';
import { CURRENT_USER, statusConfig } from '../../data/users';
import Avatar from '../shared/Avatar';

interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
}

export default function CoursesSidebar() {
  const enrolledCourses = COURSES.filter((c: Course) => CURRENT_USER.enrolledCourses.includes(c.id));

  return (
    <aside className="flex flex-col bg-white border-r border-gray-200" style={{ width: '210px', minWidth: '210px' }}>
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">My Courses</p>
        <div className="flex flex-col gap-1.5">
          {enrolledCourses.map((course: Course) => (
            <div
              key={course.id}
              className="flex items-stretch rounded-md overflow-hidden bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: course.color }} />
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold text-gray-800 leading-tight">{course.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{course.code}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-3 py-3 border-t border-gray-100 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Quick Invite</p>
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        />
        <button className="mt-2 w-full bg-[#3B5BDB] text-white text-sm font-semibold py-2 rounded hover:bg-[#3451c7] transition-colors">
          Send Invite
        </button>
      </div>

      <div className="px-3 py-3 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Avatar user={CURRENT_USER} size="md" showStatus />
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-tight">{CURRENT_USER.name}</p>
            <p className="text-[10px] font-medium" style={{ color: statusConfig[CURRENT_USER.status as keyof typeof statusConfig]?.color }}>
              {statusConfig[CURRENT_USER.status as keyof typeof statusConfig]?.label}
            </p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition-colors p-1" aria-label="Settings">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
```

Note: The Quick Invite card remains for now — it gets removed in a later plan when we add the "+ New Event" CTA.

- [ ] **Step 10: Type RightPanel**

Read `src/components/friends/RightPanel.tsx`. Replace its contents with:

```tsx
import { useState } from 'react';
import { FRIENDS, statusConfig } from '../../data/users';
import { GROUPS as GROUPS_DATA } from '../../data/groups';
import Avatar from '../shared/Avatar';

interface Friend {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  status: keyof typeof statusConfig;
  statusText: string;
}

interface Group {
  id: string;
  name: string;
  memberCount: number | null;
  avatarColor: string;
  initials: string;
}

export default function RightPanel() {
  const [search, setSearch] = useState('');
  const [showMoreFriends, setShowMoreFriends] = useState(false);
  const [showMoreGroups, setShowMoreGroups] = useState(false);

  const lowerSearch = search.toLowerCase();
  const filteredFriends: Friend[] = FRIENDS.filter((f: Friend) => f.name.toLowerCase().includes(lowerSearch));
  const filteredGroups: Group[] = GROUPS_DATA.filter((g: Group) => g.name.toLowerCase().includes(lowerSearch));

  const FRIEND_LIMIT = 4;
  const GROUP_LIMIT = 3;
  const displayedFriends = showMoreFriends ? filteredFriends : filteredFriends.slice(0, FRIEND_LIMIT);
  const displayedGroups = showMoreGroups ? filteredGroups : filteredGroups.slice(0, GROUP_LIMIT);

  return (
    <aside className="flex flex-col bg-white border-l border-gray-200" style={{ width: '210px', minWidth: '210px' }}>
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 border border-gray-200 rounded px-2 py-1.5 bg-gray-50 focus-within:ring-1 focus-within:ring-blue-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none flex-1 min-w-0"
          />
          <button className="bg-[#3B5BDB] rounded p-0.5 flex-shrink-0 hover:bg-[#3451c7] transition-colors" aria-label="Search">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Friends</span>
              <button className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200" aria-label="Add friend">
                +
              </button>
            </div>
            {filteredFriends.length > FRIEND_LIMIT ? (
              <button className="text-[10px] text-[#3B5BDB] font-semibold hover:underline" onClick={() => setShowMoreFriends((v) => !v)}>
                {showMoreFriends ? 'SHOW LESS' : 'SHOW MORE'}
              </button>
            ) : (
              <button className="text-[10px] text-[#3B5BDB] font-semibold hover:underline">SHOW MORE</button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {displayedFriends.map((friend: Friend) => {
              const cfg = statusConfig[friend.status] || statusConfig.available;
              return (
                <div key={friend.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="relative flex-shrink-0">
                    <Avatar user={friend} size="sm" />
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{ backgroundColor: cfg.color }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{friend.name}</p>
                    <p className="text-[10px] truncate" style={{ color: friend.status === 'studying' ? '#6B7280' : cfg.color }}>
                      {friend.statusText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-3 pt-1 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Groups</span>
              <button className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center hover:bg-gray-200 transition-colors leading-none border border-gray-200" aria-label="Create group">
                +
              </button>
            </div>
            {filteredGroups.length > GROUP_LIMIT ? (
              <button className="text-[10px] text-[#3B5BDB] font-semibold hover:underline" onClick={() => setShowMoreGroups((v) => !v)}>
                {showMoreGroups ? 'SHOW LESS' : 'SHOW MORE'}
              </button>
            ) : (
              <button className="text-[10px] text-[#3B5BDB] font-semibold hover:underline">SHOW MORE</button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {displayedGroups.map((group: Group) => (
              <div key={group.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: group.avatarColor }}
                >
                  {group.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{group.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {group.memberCount ? `${group.memberCount} Members` : '# Members'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 11: Type StudyCalendar**

Read `src/components/calendar/StudyCalendar.tsx`. Replace its contents with:

```tsx
import { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventContentArg, DatesSetArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getCourse } from '../../data/courses';
import { FRIENDS } from '../../data/users';
import { INITIAL_STUDY_BLOCKS } from '../../data/studyBlocks';
import CreateBlockModal from '../shared/CreateBlockModal';

interface Block {
  id: string;
  courseId: string;
  title: string;
  start: string;
  end: string;
  ownerId: string;
  participants: string[];
  editable: boolean;
}

interface ModalState {
  position: { x: number; y: number };
  timeInfo: {
    startStr: string;
    endStr: string;
    start: Date;
    end: Date;
  };
}

let blockCounter = 100;

function toFCEvents(blocks: Block[]) {
  return blocks.map((block) => {
    const course = getCourse(block.courseId);
    return {
      id: block.id,
      title: block.title,
      start: block.start,
      end: block.end,
      backgroundColor: course?.color || '#6B7280',
      borderColor: 'transparent',
      textColor: '#ffffff',
      editable: block.editable !== false,
      extendedProps: {
        courseId: block.courseId,
        ownerId: block.ownerId,
        participants: block.participants || [],
        editable: block.editable !== false,
      },
    };
  });
}

interface ParticipantAvatarsProps {
  participants: string[];
}

function ParticipantAvatars({ participants }: ParticipantAvatarsProps) {
  const friends = FRIENDS.filter((f: { id: string }) => participants.includes(f.id));
  if (friends.length === 0) return null;
  return (
    <div className="flex gap-0.5 mt-0.5 flex-wrap">
      {friends.map((f: { id: string; avatarColor: string; initials: string; name: string }) => (
        <div
          key={f.id}
          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-white/60"
          style={{ backgroundColor: f.avatarColor }}
          title={f.name}
        >
          {f.initials}
        </div>
      ))}
    </div>
  );
}

function EventContent({ eventInfo }: { eventInfo: EventContentArg }) {
  const { event } = eventInfo;
  const { participants, editable } = event.extendedProps as { participants: string[]; editable: boolean };
  const isOwned = editable !== false;

  return (
    <div className="h-full flex flex-col px-1 py-0.5 overflow-hidden">
      <span className="font-bold text-[0.68rem] leading-tight truncate">{event.title}</span>
      <div className="flex items-center gap-0.5">
        <span className="text-[0.6rem] opacity-80 leading-tight truncate">{eventInfo.timeText}</span>
        {!isOwned && (
          <span className="text-[0.5rem] bg-white/30 rounded px-0.5 leading-tight flex-shrink-0">shared</span>
        )}
      </div>
      {participants && participants.length > 0 && <ParticipantAvatars participants={participants} />}
    </div>
  );
}

export default function StudyCalendar() {
  const calRef = useRef<FullCalendar>(null);
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_STUDY_BLOCKS as Block[]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [weekRange, setWeekRange] = useState('');

  const fcEvents = toFCEvents(blocks);

  function getModalPosition(jsEvent: MouseEvent | null) {
    if (jsEvent) {
      return {
        x: Math.min(jsEvent.clientX + 10, window.innerWidth - 250),
        y: Math.min(jsEvent.clientY - 20, window.innerHeight - 320),
      };
    }
    const rect = document.querySelector('.fc-timegrid-body')?.getBoundingClientRect();
    return { x: (rect?.left || 300) + 100, y: (rect?.top || 200) + 80 };
  }

  function handleDateSelect(selectInfo: DateSelectArg) {
    setModal({
      position: getModalPosition(selectInfo.jsEvent as MouseEvent | null),
      timeInfo: {
        startStr: selectInfo.startStr,
        endStr: selectInfo.endStr,
        start: selectInfo.start,
        end: selectInfo.end,
      },
    });
    selectInfo.view.calendar.unselect();
  }

  function handleModalConfirm(course: { id: string; code: string }) {
    if (!modal?.timeInfo) return;
    const newBlock: Block = {
      id: `block-new-${++blockCounter}`,
      courseId: course.id,
      title: course.code,
      start: modal.timeInfo.startStr,
      end: modal.timeInfo.endStr,
      ownerId: 'user-dasanie',
      participants: ['user-dasanie'],
      editable: true,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setModal(null);
  }

  function handleEventResize(info: EventResizeDoneArg) {
    const { event } = info;
    setBlocks((prev) =>
      prev.map((b) => (b.id === event.id ? { ...b, start: event.startStr, end: event.endStr } : b))
    );
  }

  function handleEventDrop(info: EventDropArg) {
    const { event } = info;
    setBlocks((prev) =>
      prev.map((b) => (b.id === event.id ? { ...b, start: event.startStr, end: event.endStr } : b))
    );
  }

  function handleDatesSet(dateInfo: DatesSetArg) {
    const start = dateInfo.start;
    const end = new Date(dateInfo.end);
    end.setDate(end.getDate() - 1);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', opts);
    const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    setWeekRange(`${startStr} – ${endStr}`);
  }

  function navPrev() { calRef.current?.getApi().prev(); }
  function navNext() { calRef.current?.getApi().next(); }
  function navToday() { calRef.current?.getApi().today(); }

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 mr-1">This Week</h2>
        <button onClick={navPrev} aria-label="Previous week" className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-500 min-w-[150px] text-center select-none">{weekRange}</span>
        <button onClick={navNext} aria-label="Next week" className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button onClick={navToday} className="ml-auto text-xs text-[#3B5BDB] border border-[#3B5BDB]/40 px-3 py-1 rounded hover:bg-blue-50 transition-colors font-medium">
          Today
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <FullCalendar
          ref={calRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={false}
          allDaySlot={false}
          slotMinTime="08:30:00"
          slotMaxTime="19:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={{ hour: 'numeric', omitZeroMinute: false, meridiem: 'short' }}
          firstDay={1}
          nowIndicator={true}
          selectable={true}
          selectMirror={true}
          editable={true}
          eventResizableFromStart={false}
          events={fcEvents}
          select={handleDateSelect}
          eventResize={handleEventResize}
          eventDrop={handleEventDrop}
          datesSet={handleDatesSet}
          eventContent={(info) => <EventContent eventInfo={info} />}
          height="100%"
          expandRows={true}
          scrollTime="08:45:00"
          dayHeaderContent={(args) => {
            const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
            const dow = args.date.getDay();
            const label = dayNames[dow === 0 ? 6 : dow - 1];
            return (
              <div className={`text-center py-1 ${args.isToday ? 'text-[#3B5BDB]' : 'text-gray-500'}`}>
                <span className="text-[0.68rem] font-bold tracking-widest">{label}</span>
              </div>
            );
          }}
        />
      </div>

      {modal && (
        <CreateBlockModal
          position={modal.position}
          timeInfo={modal.timeInfo}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 12: Run typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors. If errors in mock data `.js` files (since `allowJs` is true), ignore — those are untyped. If errors in our new `.tsx` files, fix before proceeding.

- [ ] **Step 13: Run dev server to verify visual parity**

Run:
```bash
npm run dev
```

Open browser to http://localhost:5173. Expected: app looks identical to pre-migration (blue header, course sidebar with colored stripes, weekly calendar, friends/groups panel). Drag/resize events still works. Kill server after confirming.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "refactor: migrate existing components to TypeScript"
```

---

## Task 6: Write time utilities with tests

**Files:**
- Create: `src/lib/time.ts`
- Create: `tests/lib/time.test.ts`

- [ ] **Step 1: Write failing tests for time utilities**

Create `/Users/exfi8/Projects/StudySync/tests/lib/time.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  startOfWeek,
  endOfWeek,
  rangesOverlap,
  isoToDate,
  dateToIso,
  minutesBetween,
  addMinutes,
} from '@/lib/time';

describe('startOfWeek', () => {
  it('returns Monday 00:00 for a Wednesday input', () => {
    const wed = new Date('2026-04-22T14:30:00');
    const result = startOfWeek(wed);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('returns previous Monday for a Sunday input', () => {
    const sun = new Date('2026-04-26T10:00:00');
    const result = startOfWeek(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(20);
  });

  it('returns the same Monday for a Monday input', () => {
    const mon = new Date('2026-04-20T09:00:00');
    const result = startOfWeek(mon);
    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(0);
  });
});

describe('endOfWeek', () => {
  it('returns Sunday 23:59:59.999 for a Wednesday input', () => {
    const wed = new Date('2026-04-22T14:30:00');
    const result = endOfWeek(wed);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
  });
});

describe('rangesOverlap', () => {
  const a = { start: new Date('2026-04-20T10:00:00'), end: new Date('2026-04-20T12:00:00') };

  it('returns true for exact overlap', () => {
    const b = { start: new Date('2026-04-20T10:00:00'), end: new Date('2026-04-20T12:00:00') };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('returns true for partial overlap (b starts inside a)', () => {
    const b = { start: new Date('2026-04-20T11:00:00'), end: new Date('2026-04-20T13:00:00') };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('returns true for partial overlap (b ends inside a)', () => {
    const b = { start: new Date('2026-04-20T09:00:00'), end: new Date('2026-04-20T11:00:00') };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('returns true when b is entirely inside a', () => {
    const b = { start: new Date('2026-04-20T10:30:00'), end: new Date('2026-04-20T11:30:00') };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it('returns false for adjacent ranges (b starts when a ends)', () => {
    const b = { start: new Date('2026-04-20T12:00:00'), end: new Date('2026-04-20T13:00:00') };
    expect(rangesOverlap(a, b)).toBe(false);
  });

  it('returns false for disjoint ranges', () => {
    const b = { start: new Date('2026-04-20T14:00:00'), end: new Date('2026-04-20T15:00:00') };
    expect(rangesOverlap(a, b)).toBe(false);
  });
});

describe('isoToDate / dateToIso', () => {
  it('round-trips an ISO string to Date and back', () => {
    const iso = '2026-04-20T14:30:00.000Z';
    const date = isoToDate(iso);
    expect(date.toISOString()).toBe(iso);
    expect(dateToIso(date)).toBe(iso);
  });
});

describe('minutesBetween', () => {
  it('returns positive minutes when end > start', () => {
    const start = new Date('2026-04-20T10:00:00');
    const end = new Date('2026-04-20T10:45:00');
    expect(minutesBetween(start, end)).toBe(45);
  });

  it('returns 0 for equal times', () => {
    const d = new Date('2026-04-20T10:00:00');
    expect(minutesBetween(d, d)).toBe(0);
  });

  it('rounds to nearest minute', () => {
    const start = new Date('2026-04-20T10:00:00');
    const end = new Date('2026-04-20T10:00:30');
    expect(minutesBetween(start, end)).toBe(1);
  });
});

describe('addMinutes', () => {
  it('adds minutes without mutating the input', () => {
    const start = new Date('2026-04-20T10:00:00');
    const result = addMinutes(start, 30);
    expect(result.getMinutes()).toBe(30);
    expect(start.getMinutes()).toBe(0);
  });

  it('handles negative minutes', () => {
    const start = new Date('2026-04-20T10:00:00');
    const result = addMinutes(start, -30);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm run test:run -- tests/lib/time.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/time'".

- [ ] **Step 3: Implement time utilities**

Create `/Users/exfi8/Projects/StudySync/src/lib/time.ts`:

```ts
export interface TimeRange {
  start: Date;
  end: Date;
}

export function startOfWeek(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function isoToDate(iso: string): Date {
  return new Date(iso);
}

export function dateToIso(d: Date): string {
  return d.toISOString();
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60000);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm run test:run -- tests/lib/time.test.ts
```

Expected: all 15 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/time.ts tests/lib/time.test.ts
git commit -m "feat: add time utilities with unit tests"
```

---

## Task 7: Set up Supabase client and environment

**Files:**
- Create: `.env.example`
- Create: `src/lib/supabase.ts`
- Modify: `.gitignore` (ensure `.env.local` ignored — already handled by `.env*.local` pattern, verify)

- [ ] **Step 1: Create .env.example**

Create `/Users/exfi8/Projects/StudySync/.env.example`:

```
# Supabase
# Find these in your Supabase project dashboard: Settings → API
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

- [ ] **Step 2: Verify .gitignore ignores .env.local**

Read `.gitignore` and confirm it contains `.env*.local` or `.env.local`. If not, add `.env.local` to it. (Our .gitignore from earlier already has `.env*.local` — verify with `grep`.)

Run:
```bash
grep -E '\.env' .gitignore
```

Expected: output includes `.env` and `.env*.local` patterns.

- [ ] **Step 3: Create Supabase client**

Create `/Users/exfi8/Projects/StudySync/src/lib/supabase.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env.local and fill in your Supabase project URL and anon key.'
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

- [ ] **Step 4: Create stub types file**

Create `/Users/exfi8/Projects/StudySync/src/types/db.ts`:

```ts
// Stub — replaced by `npx supabase gen types typescript` after schema is deployed.
// Permissive shape so the Supabase client compiles against any table name
// without type errors during bootstrapping. Real types enforce shape later.
type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      [K: string]: GenericTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
```

- [ ] **Step 5: Commit**

```bash
git add .env.example src/lib/supabase.ts src/types/db.ts
git commit -m "feat: add Supabase client with env validation"
```

---

## Task 8: Create Supabase project and populate .env.local (MANUAL STEP)

**Files:**
- Create (user, locally): `.env.local`

This task requires the user (project owner) to perform browser-based actions. Subagents executing this plan should pause here and prompt the user.

- [ ] **Step 1: User creates Supabase project**

Prompt to user:
> "Go to https://supabase.com, sign up or log in, and create a new project named 'StudySync'. Choose a strong database password and save it somewhere (1Password, etc.). Select the closest region to you. Free tier is fine."

- [ ] **Step 2: User copies credentials**

Prompt to user:
> "In the Supabase dashboard, go to Project Settings → API. Copy the 'Project URL' and the 'anon public' key. Paste them into a new file at the project root named `.env.local`, matching the format of `.env.example`."

- [ ] **Step 3: Verify .env.local exists and has both values**

Run:
```bash
test -f .env.local && echo "file exists" || echo "MISSING .env.local"
grep VITE_SUPABASE_URL .env.local | head -1
grep VITE_SUPABASE_ANON_KEY .env.local | head -1
```

Expected: file exists; both env vars present with non-placeholder values.

- [ ] **Step 4: Disable email confirmation for dev (user action)**

Prompt to user:
> "In Supabase dashboard → Authentication → Providers → Email: disable 'Confirm email' for dev so we can test signup without an email round-trip. We'll re-enable it before production."

- [ ] **Step 5: No commit (nothing to track)**

`.env.local` is gitignored. This task produces no commit.

---

## Task 9: Write database schema migration

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

- [ ] **Step 1: Create migration directory**

Run:
```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write schema migration**

Create `/Users/exfi8/Projects/StudySync/supabase/migrations/0001_schema.sql`:

```sql
-- StudySync schema — migration 0001

-- ENUMS
create type user_status as enum ('available', 'studying', 'busy');
create type event_visibility as enum ('private', 'friends', 'group');
create type participant_status as enum ('pending', 'accepted', 'declined', 'maybe');
create type friendship_status as enum ('pending', 'accepted');
create type group_role as enum ('owner', 'admin', 'member');

-- PROFILES (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,
  school_email text not null,
  major text,
  grad_year int,
  avatar_color text not null default '#6B7280',
  initials text not null,
  status user_status not null default 'available',
  status_text text,
  created_at timestamptz not null default now()
);

-- COURSES (globally shared, unique by code)
create table courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  default_color text not null default '#3B5BDB',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ENROLLMENTS (per-user metadata for a course)
create table enrollments (
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  color text,
  instructor text,
  joined_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- CLASS MEETINGS (per-user recurring schedule)
create table class_meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- GROUPS
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  course_id uuid references courses(id) on delete set null,
  avatar_color text not null default '#6366F1',
  initials text not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- GROUP MEMBERS
create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- EVENTS (study sessions)
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course_id uuid references courses(id) on delete set null,
  owner_id uuid not null references profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  description text,
  visibility event_visibility not null default 'private',
  group_id uuid references groups(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

-- EVENT PARTICIPANTS
create table event_participants (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status participant_status not null default 'pending',
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (event_id, user_id)
);

-- FRIENDSHIPS (user_id < friend_id is enforced in service layer)
create table friendships (
  user_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  requested_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id < friend_id)
);

-- MESSAGES (group chat)
create table messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- INDEXES
create index idx_events_owner_start on events (owner_id, start_at);
create index idx_events_range on events (start_at, end_at);
create index idx_event_participants_user on event_participants (user_id, status);
create index idx_messages_group_time on messages (group_id, created_at desc);
create index idx_enrollments_user on enrollments (user_id);
create index idx_enrollments_course on enrollments (course_id);
create index idx_class_meetings_user_dow on class_meetings (user_id, day_of_week);
create index idx_friendships_user_status on friendships (user_id, status);
create index idx_friendships_friend_status on friendships (friend_id, status);

-- PROFILE AUTO-CREATION TRIGGER
-- When a new auth.users row is created (on signup), create a matching profiles row.
-- The extra fields (name, username, initials) come from user_metadata passed at signup.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, name, username, school_email, initials, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.email,
    coalesce(new.raw_user_meta_data->>'initials', upper(substr(coalesce(new.raw_user_meta_data->>'name', new.email), 1, 2))),
    coalesce(new.raw_user_meta_data->>'avatar_color', '#3B5BDB')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 3: Commit the migration**

```bash
git add supabase/migrations/0001_schema.sql
git commit -m "feat: add database schema migration"
```

---

## Task 10: Write RLS policies migration

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

- [ ] **Step 1: Write RLS migration**

Create `/Users/exfi8/Projects/StudySync/supabase/migrations/0002_rls.sql`:

```sql
-- StudySync RLS policies — migration 0002

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table courses enable row level security;
alter table enrollments enable row level security;
alter table class_meetings enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;
alter table friendships enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table messages enable row level security;

-- =========================================================
-- PROFILES
-- =========================================================
-- Any authenticated user can read profiles (needed for friend search, participant display).
-- Users can only insert/update their own profile.
create policy "profiles_select_all_authenticated"
  on profiles for select to authenticated using (true);

create policy "profiles_insert_own"
  on profiles for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_own"
  on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- =========================================================
-- COURSES
-- =========================================================
-- Globally discoverable — any authenticated user can read and insert.
-- No update/delete policies in MVP (courses are immutable once created).
create policy "courses_select_all"
  on courses for select to authenticated using (true);

create policy "courses_insert_any"
  on courses for insert to authenticated with check (created_by = auth.uid());

-- =========================================================
-- ENROLLMENTS
-- =========================================================
-- User manages their own enrollments; friends sharing a course can see who else is enrolled.
create policy "enrollments_select_own_or_friend_in_same_course"
  on enrollments for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from enrollments e2
      where e2.user_id = auth.uid() and e2.course_id = enrollments.course_id
    ) and exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and ((f.user_id = auth.uid() and f.friend_id = enrollments.user_id)
          or (f.friend_id = auth.uid() and f.user_id = enrollments.user_id))
    )
  );

create policy "enrollments_insert_own"
  on enrollments for insert to authenticated with check (user_id = auth.uid());

create policy "enrollments_update_own"
  on enrollments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "enrollments_delete_own"
  on enrollments for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- CLASS MEETINGS
-- =========================================================
-- Owner can read; friends enrolled in the same course can read (for availability checks).
create policy "class_meetings_select_own_or_friend_in_same_course"
  on class_meetings for select to authenticated using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from enrollments e
        where e.user_id = auth.uid() and e.course_id = class_meetings.course_id
      )
      and exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and ((f.user_id = auth.uid() and f.friend_id = class_meetings.user_id)
            or (f.friend_id = auth.uid() and f.user_id = class_meetings.user_id))
      )
    )
  );

create policy "class_meetings_insert_own"
  on class_meetings for insert to authenticated with check (user_id = auth.uid());

create policy "class_meetings_update_own"
  on class_meetings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "class_meetings_delete_own"
  on class_meetings for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- EVENTS
-- =========================================================
-- Complex SELECT: owner OR participant OR group member OR friend-in-same-course with visibility=friends.
create policy "events_select_visible"
  on events for select to authenticated using (
    owner_id = auth.uid()
    or exists (
      select 1 from event_participants p
      where p.event_id = events.id
        and p.user_id = auth.uid()
        and p.status in ('pending', 'accepted', 'maybe')
    )
    or (
      events.group_id is not null and exists (
        select 1 from group_members gm
        where gm.group_id = events.group_id and gm.user_id = auth.uid()
      )
    )
    or (
      events.course_id is not null
      and events.visibility = 'friends'
      and exists (
        select 1 from enrollments e
        where e.user_id = auth.uid() and e.course_id = events.course_id
      )
      and exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and ((f.user_id = auth.uid() and f.friend_id = events.owner_id)
            or (f.friend_id = auth.uid() and f.user_id = events.owner_id))
      )
    )
  );

create policy "events_insert_own"
  on events for insert to authenticated with check (owner_id = auth.uid());

create policy "events_update_own"
  on events for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "events_delete_own"
  on events for delete to authenticated using (owner_id = auth.uid());

-- =========================================================
-- EVENT PARTICIPANTS
-- =========================================================
-- Readable by event owner and the participant themselves.
-- Event owner can insert/update/delete. Participant can update their own status.
create policy "event_participants_select_own_or_owner"
  on event_participants for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from events e where e.id = event_participants.event_id and e.owner_id = auth.uid())
  );

create policy "event_participants_insert_by_owner"
  on event_participants for insert to authenticated with check (
    exists (select 1 from events e where e.id = event_participants.event_id and e.owner_id = auth.uid())
    or user_id = auth.uid()  -- allow self-join (used by collision join-suggestion)
  );

create policy "event_participants_update_own_or_owner"
  on event_participants for update to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from events e where e.id = event_participants.event_id and e.owner_id = auth.uid())
  );

create policy "event_participants_delete_own_or_owner"
  on event_participants for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from events e where e.id = event_participants.event_id and e.owner_id = auth.uid())
  );

-- =========================================================
-- FRIENDSHIPS
-- =========================================================
create policy "friendships_select_own"
  on friendships for select to authenticated using (auth.uid() in (user_id, friend_id));

create policy "friendships_insert_own"
  on friendships for insert to authenticated with check (
    auth.uid() in (user_id, friend_id) and requested_by = auth.uid()
  );

create policy "friendships_update_own"
  on friendships for update to authenticated using (auth.uid() in (user_id, friend_id));

create policy "friendships_delete_own"
  on friendships for delete to authenticated using (auth.uid() in (user_id, friend_id));

-- =========================================================
-- GROUPS
-- =========================================================
create policy "groups_select_all"
  on groups for select to authenticated using (true);

create policy "groups_insert_any"
  on groups for insert to authenticated with check (owner_id = auth.uid());

create policy "groups_update_owner"
  on groups for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "groups_delete_owner"
  on groups for delete to authenticated using (owner_id = auth.uid());

-- =========================================================
-- GROUP MEMBERS
-- =========================================================
create policy "group_members_select_if_member"
  on group_members for select to authenticated using (
    exists (select 1 from group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
    or exists (select 1 from groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
  );

create policy "group_members_insert_owner_or_admin"
  on group_members for insert to authenticated with check (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner', 'admin')
    )
    or exists (select 1 from groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
    or user_id = auth.uid()  -- allow self-join (for group creator adding themselves)
  );

create policy "group_members_delete_owner_or_admin_or_self"
  on group_members for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner', 'admin')
    )
  );

-- =========================================================
-- MESSAGES
-- =========================================================
create policy "messages_select_if_group_member"
  on messages for select to authenticated using (
    exists (
      select 1 from group_members gm
      where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    )
  );

create policy "messages_insert_if_group_member"
  on messages for insert to authenticated with check (
    author_id = auth.uid() and exists (
      select 1 from group_members gm
      where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    )
  );

create policy "messages_update_own"
  on messages for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "messages_delete_own"
  on messages for delete to authenticated using (author_id = auth.uid());
```

- [ ] **Step 2: Commit RLS migration**

```bash
git add supabase/migrations/0002_rls.sql
git commit -m "feat: add RLS policies migration"
```

---

## Task 11: Deploy schema to Supabase (MANUAL STEP)

**Files:** (no file changes — SQL runs in Supabase dashboard)

- [ ] **Step 1: User runs schema migration**

Prompt to user:
> "Open Supabase dashboard → SQL Editor → New Query. Copy the full contents of `supabase/migrations/0001_schema.sql` and run it. Verify no errors. If errors, read them carefully — usually a syntax issue or a missing dependency."

- [ ] **Step 2: User runs RLS migration**

Prompt to user:
> "Open a new SQL Editor query. Copy the full contents of `supabase/migrations/0002_rls.sql` and run it. Verify no errors."

- [ ] **Step 3: Verify tables exist**

Prompt to user:
> "In Supabase dashboard → Database → Tables, confirm all 10 tables exist: profiles, courses, enrollments, class_meetings, events, event_participants, friendships, groups, group_members, messages. Each should show 'RLS enabled'."

- [ ] **Step 4: Generate TypeScript types (optional but recommended)**

This requires the Supabase CLI. If the user has it installed:

Run (after user sets up Supabase CLI with `supabase login` and links the project):
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/db.ts
```

If the user has not installed the Supabase CLI, skip this and manually update `src/types/db.ts` in a later task. For now, keep the stub type.

- [ ] **Step 5: Verify type compilation still passes**

Run:
```bash
npm run typecheck
```

Expected: no errors.

---

## Task 12: Set up Zustand auth store

**Files:**
- Create: `src/store/authStore.ts`
- Create: `tests/store/authStore.test.ts`

- [ ] **Step 1: Write failing test for authStore**

Create `/Users/exfi8/Projects/StudySync/tests/store/authStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('starts unhydrated with no session and no profile', () => {
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.hydrated).toBe(false);
  });

  it('setSession stores session and marks hydrated', () => {
    const fakeSession = { access_token: 'abc', user: { id: 'u1', email: 'a@b.com' } } as unknown as import('@supabase/supabase-js').Session;
    useAuthStore.getState().setSession(fakeSession);
    const state = useAuthStore.getState();
    expect(state.session).toEqual(fakeSession);
    expect(state.hydrated).toBe(true);
  });

  it('setSession(null) clears session but keeps hydrated true', () => {
    useAuthStore.getState().setSession(null);
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.hydrated).toBe(true);
  });

  it('setProfile stores profile', () => {
    const fakeProfile = { id: 'u1', name: 'Alice', username: 'alice' } as never;
    useAuthStore.getState().setProfile(fakeProfile);
    expect(useAuthStore.getState().profile).toEqual(fakeProfile);
  });

  it('reset clears session and profile and resets hydrated', () => {
    useAuthStore.getState().setSession({ user: { id: 'u1' } } as never);
    useAuthStore.getState().setProfile({ id: 'u1' } as never);
    useAuthStore.getState().reset();
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.hydrated).toBe(false);
  });

  it('selectors: userId returns session user id or null', () => {
    expect(useAuthStore.getState().userId()).toBeNull();
    useAuthStore.getState().setSession({ user: { id: 'u42' } } as never);
    expect(useAuthStore.getState().userId()).toBe('u42');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run:
```bash
npm run test:run -- tests/store/authStore.test.ts
```

Expected: FAIL with "Cannot find module '@/store/authStore'".

- [ ] **Step 3: Implement authStore**

Create `/Users/exfi8/Projects/StudySync/src/store/authStore.ts`:

```ts
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  name: string;
  username: string;
  school_email: string;
  major: string | null;
  grad_year: number | null;
  avatar_color: string;
  initials: string;
  status: 'available' | 'studying' | 'busy';
  status_text: string | null;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  hydrated: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  reset: () => void;
  userId: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  hydrated: false,
  setSession: (session) => set({ session, hydrated: true }),
  setProfile: (profile) => set({ profile }),
  reset: () => set({ session: null, profile: null, hydrated: false }),
  userId: () => get().session?.user.id ?? null,
}));
```

- [ ] **Step 4: Run test — verify it passes**

Run:
```bash
npm run test:run -- tests/store/authStore.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/authStore.ts tests/store/authStore.test.ts
git commit -m "feat: add Zustand auth store"
```

---

## Task 13: Implement auth service

**Files:**
- Create: `src/services/auth.service.ts`

- [ ] **Step 1: Create auth service**

Create `/Users/exfi8/Projects/StudySync/src/services/auth.service.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/store/authStore';

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  username?: string;
  major?: string;
  gradYear?: number;
}

export interface SignInInput {
  email: string;
  password: string;
}

export class AuthError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'AuthError';
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function randomAvatarColor(): string {
  const palette = ['#3B5BDB', '#8B5CF6', '#F97316', '#10B981', '#EF4444', '#14B8A6', '#F59E0B', '#6366F1'];
  return palette[Math.floor(Math.random() * palette.length)];
}

export async function signUp(input: SignUpInput): Promise<Session> {
  const { email, password, name, username, major, gradYear } = input;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        username: username ?? null,
        initials: initialsFromName(name),
        avatar_color: randomAvatarColor(),
        major: major ?? null,
        grad_year: gradYear ?? null,
      },
    },
  });

  if (error) throw new AuthError(error.message, error);
  if (!data.session) throw new AuthError('Signup returned no session. Check email confirmation settings.');
  return data.session;
}

export async function signIn(input: SignInInput): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw new AuthError(error.message, error);
  if (!data.session) throw new AuthError('Sign-in returned no session.');
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthError(error.message, error);
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AuthError(error.message, error);
  return data.session;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new AuthError(error.message, error);
  }
  return data as unknown as Profile;
}

export function onAuthChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run typecheck
```

Expected: no errors. The permissive `Database` stub type accepts any table name, so `supabase.from('profiles').select('*')` compiles. When real types are generated from Supabase later, type safety will tighten automatically.

- [ ] **Step 3: Commit**

```bash
git add src/services/auth.service.ts
git commit -m "feat: add auth service (signup/signin/signout/fetchProfile)"
```

---

## Task 14: Create useAuth hook

**Files:**
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Create useAuth hook**

Create `/Users/exfi8/Projects/StudySync/src/hooks/useAuth.ts`:

```ts
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getCurrentSession, onAuthChange, fetchProfile } from '@/services/auth.service';

/**
 * Bootstraps auth state: loads current session, subscribes to auth changes,
 * and hydrates the profile when session is present.
 * Must be mounted once at the app root.
 */
export function useAuthBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    let cancelled = false;

    getCurrentSession().then(async (session) => {
      if (cancelled) return;
      setSession(session);
      if (session) {
        const profile = await fetchProfile(session.user.id);
        if (!cancelled) setProfile(profile);
      } else {
        setProfile(null);
      }
    });

    const { data: sub } = onAuthChange(async (session) => {
      setSession(session);
      if (session) {
        const profile = await fetchProfile(session.user.id);
        setProfile(profile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setProfile]);
}

/**
 * Read-only selector for components that need auth state.
 */
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const hydrated = useAuthStore((s) => s.hydrated);
  return { session, profile, hydrated, isAuthenticated: !!session };
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: add useAuth bootstrap hook"
```

---

## Task 15: Build LoginPage and SignupPage (shell)

**Files:**
- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/SignupPage.tsx`
- Create: `src/components/auth/AuthLayout.tsx`

- [ ] **Step 1: Create AuthLayout (shared shell for login/signup)**

Create `/Users/exfi8/Projects/StudySync/src/components/auth/AuthLayout.tsx`:

```tsx
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#3B5BDB] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6C2 6 5 5 8 5C10 5 12 6 12 6V20C12 20 10 19 8 19C5 19 2 20 2 20V6Z" fill="white" fillOpacity="0.9" />
              <path d="M22 6C22 6 19 5 16 5C14 5 12 6 12 6V20C12 20 14 19 16 19C19 19 22 20 22 20V6Z" fill="white" fillOpacity="0.7" />
              <path d="M7 3C8.5 2 10.2 2 12 2C13.8 2 15.5 2 17 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-800 tracking-tight">StudySync</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
          {!subtitle && <div className="mb-4" />}
          {children}
        </div>

        {footer && <div className="text-center mt-6 text-sm text-gray-600">{footer}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create LoginPage**

Create `/Users/exfi8/Projects/StudySync/src/pages/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import { signIn } from '@/services/auth.service';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to coordinate study sessions with your classmates."
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#3B5BDB] font-semibold hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">School email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-[#3B5BDB] text-white text-sm font-semibold py-2.5 rounded-md hover:bg-[#3451c7] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-2"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 3: Create SignupPage**

Create `/Users/exfi8/Projects/StudySync/src/pages/SignupPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import { signUp } from '@/services/auth.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!EMAIL_RE.test(email.trim())) errs.email = 'Please enter a valid email.';
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (gradYear && !/^\d{4}$/.test(gradYear)) errs.gradYear = 'Grad year must be 4 digits.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        username: username.trim() || undefined,
        major: major.trim() || undefined,
        gradYear: gradYear ? Number(gradYear) : undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join StudySync to coordinate study sessions with classmates."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-[#3B5BDB] font-semibold hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Full name <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            aria-invalid={!!fieldErrors.name}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
          {fieldErrors.name && <span className="text-xs text-red-600">{fieldErrors.name}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">School email <span className="text-red-500">*</span></span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
          {fieldErrors.email && <span className="text-xs text-red-600">{fieldErrors.email}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Password <span className="text-red-500">*</span></span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.password}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
          {fieldErrors.password && <span className="text-xs text-red-600">{fieldErrors.password}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Username (optional)</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-700">Major (optional)</span>
            <input
              type="text"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-700">Grad year (optional)</span>
            <input
              type="text"
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              inputMode="numeric"
              maxLength={4}
              aria-invalid={!!fieldErrors.gradYear}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
            />
            {fieldErrors.gradYear && <span className="text-xs text-red-600">{fieldErrors.gradYear}</span>}
          </label>
        </div>

        {formError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-[#3B5BDB] text-white text-sm font-semibold py-2.5 rounded-md hover:bg-[#3451c7] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-2"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 4: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LoginPage.tsx src/pages/SignupPage.tsx src/components/auth/AuthLayout.tsx
git commit -m "feat: add login and signup pages"
```

---

## Task 16: Set up React Router with ProtectedRoute

**Files:**
- Create: `src/app/App.tsx` (replaces `src/App.tsx`)
- Create: `src/app/routes.tsx`
- Create: `src/app/ProtectedRoute.tsx`
- Create: `src/pages/DashboardPage.tsx`
- Modify: `src/main.tsx`
- Delete: `src/App.tsx` (old root)

- [ ] **Step 1: Create DashboardPage wrapping existing layout**

Create `/Users/exfi8/Projects/StudySync/src/pages/DashboardPage.tsx`:

```tsx
import Header from '@/components/layout/Header';
import CoursesSidebar from '@/components/courses/CoursesSidebar';
import StudyCalendar from '@/components/calendar/StudyCalendar';
import RightPanel from '@/components/friends/RightPanel';

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        <CoursesSidebar />
        <StudyCalendar />
        <RightPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProtectedRoute**

Create `/Users/exfi8/Projects/StudySync/src/app/ProtectedRoute.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, hydrated } = useAuth();
  const location = useLocation();

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <svg className="animate-spin h-5 w-5 text-[#3B5BDB]" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.2" />
            <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Create routes**

Create `/Users/exfi8/Projects/StudySync/src/app/routes.tsx`:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import ProtectedRoute from './ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
```

- [ ] **Step 4: Create new App root**

Create `/Users/exfi8/Projects/StudySync/src/app/App.tsx`:

```tsx
import { RouterProvider } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { router } from './routes';

export default function App() {
  useAuthBootstrap();
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 5: Update main.tsx to import from new location**

Read `src/main.tsx`. Replace its contents with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 6: Delete the old App.tsx**

Run:
```bash
git rm src/App.tsx
```

- [ ] **Step 7: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add React Router with protected dashboard route"
```

---

## Task 17: Wire logout button

**Files:**
- Modify: `src/components/courses/CoursesSidebar.tsx` (the settings gear button → add logout on click for now; real settings page comes in a later plan)

- [ ] **Step 1: Update CoursesSidebar to include logout**

Read `src/components/courses/CoursesSidebar.tsx`. Replace the entire file with:

```tsx
import { COURSES } from '../../data/courses';
import { CURRENT_USER, statusConfig } from '../../data/users';
import Avatar from '../shared/Avatar';
import { signOut } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
}

export default function CoursesSidebar() {
  const navigate = useNavigate();
  const reset = useAuthStore((s) => s.reset);
  const enrolledCourses = COURSES.filter((c: Course) => CURRENT_USER.enrolledCourses.includes(c.id));

  async function handleLogout() {
    await signOut();
    reset();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="flex flex-col bg-white border-r border-gray-200" style={{ width: '210px', minWidth: '210px' }}>
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">My Courses</p>
        <div className="flex flex-col gap-1.5">
          {enrolledCourses.map((course: Course) => (
            <div
              key={course.id}
              className="flex items-stretch rounded-md overflow-hidden bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: course.color }} />
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold text-gray-800 leading-tight">{course.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{course.code}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-3 py-3 border-t border-gray-100 flex-shrink-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Quick Invite</p>
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        />
        <button className="mt-2 w-full bg-[#3B5BDB] text-white text-sm font-semibold py-2 rounded hover:bg-[#3451c7] transition-colors">
          Send Invite
        </button>
      </div>

      <div className="px-3 py-3 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Avatar user={CURRENT_USER} size="md" showStatus />
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-tight">{CURRENT_USER.name}</p>
            <p className="text-[10px] font-medium" style={{ color: statusConfig[CURRENT_USER.status as keyof typeof statusConfig]?.color }}>
              {statusConfig[CURRENT_USER.status as keyof typeof statusConfig]?.label}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 transition-colors p-1"
          aria-label="Log out"
          title="Log out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
```

Note: The gear icon has been temporarily replaced with a logout icon. In a later plan we'll add a dropdown menu with Settings + Logout. For MVP foundation, one-click logout is clearer.

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/CoursesSidebar.tsx
git commit -m "feat: add logout button to profile section"
```

---

## Task 18: End-to-end smoke test

**Files:** No file changes — manual verification

- [ ] **Step 1: Run dev server**

Run:
```bash
npm run dev
```

- [ ] **Step 2: Open browser**

Navigate to http://localhost:5173/. Expected: redirected to `/login` (since not authenticated).

- [ ] **Step 3: Test signup flow**

Click "Sign up". Fill form:
- Name: Test User
- Email: test+1@example.com
- Password: password123

Click "Create account". Expected: redirected to `/dashboard` showing the full 3-column layout with calendar.

- [ ] **Step 4: Test logout**

Click the logout icon in the bottom-left profile area. Expected: redirected to `/login`.

- [ ] **Step 5: Test login with same credentials**

Email: test+1@example.com, Password: password123. Click "Sign in". Expected: redirected to `/dashboard`.

- [ ] **Step 6: Test session persistence**

Refresh the browser while on `/dashboard`. Expected: loading spinner briefly, then dashboard loads (no redirect to login).

- [ ] **Step 7: Test protected route redirect**

In an incognito window, navigate directly to http://localhost:5173/dashboard. Expected: redirected to `/login`.

- [ ] **Step 8: Verify profile was created in database**

In Supabase dashboard → Table Editor → `profiles`. Expected: a row exists with `id = <auth user id>`, `school_email = test+1@example.com`, `name = Test User`.

- [ ] **Step 9: Kill dev server and run typecheck + tests**

```bash
npm run typecheck
npm run test:run
```

Expected: both pass. No errors.

- [ ] **Step 10: No commit needed — this is verification only**

---

## Task 19: Update README with setup instructions

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README**

Run:
```bash
cat README.md
```

- [ ] **Step 2: Replace README contents with updated version**

Write `/Users/exfi8/Projects/StudySync/README.md`:

```markdown
# StudySync

A collaborative study scheduling platform for college students. StudySync helps students coordinate study sessions, see when friends are available, and organize group study time — all from a shared calendar view.

---

## What We're Building

StudySync solves the problem of disorganized study coordination. Instead of texting back and forth to find a time, students can see their friends' schedules, create shared study blocks, join study groups, and stay in sync — across web today, and mobile in the future.

**Roadmap:**
- **Phase 1 (current):** Web app with Supabase backend, auth, persistent data, real-time features
- **Phase 2:** Mobile app (React Native / Expo) sharing core business logic with the web

---

## Current Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 5 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Calendar | FullCalendar 6 |
| Routing | React Router 6 |
| State | Zustand 5 |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 |

---

## Current Features

- Email/password authentication (Supabase)
- Protected dashboard with session persistence
- Weekly calendar (FullCalendar) with drag/resize (mock data, to be persisted in next plan)
- Course sidebar with color-coded courses
- Right-sidebar with friends and groups
- Profile status indicator (Discord-style avatar dot)

---

## Setup

### 1. Clone and install

```bash
git clone git@github.com:kevinanguyen/StudySync.git
cd StudySync
npm install
```

### 2. Create a Supabase project

1. Go to https://supabase.com and sign up / log in
2. Create a new project named "StudySync"
3. Choose a strong database password (save it somewhere safe)
4. Select the closest region
5. Wait for the project to finish provisioning

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

In your Supabase project dashboard → Settings → API:
- Copy **Project URL** → paste into `VITE_SUPABASE_URL` in `.env.local`
- Copy **anon public** key → paste into `VITE_SUPABASE_ANON_KEY` in `.env.local`

### 4. Run database migrations

In your Supabase dashboard → SQL Editor → New Query:
1. Copy the contents of `supabase/migrations/0001_schema.sql` and run it
2. Open a new query, copy `supabase/migrations/0002_rls.sql` and run it
3. Verify tables exist: Database → Tables (should show 10 tables with RLS enabled)

### 5. Disable email confirmation for dev (optional)

In Supabase dashboard → Authentication → Providers → Email: uncheck "Confirm email".

### 6. Run the app

```bash
npm run dev
```

Open http://localhost:5173 and create an account.

---

## Scripts

```bash
npm run dev         # Vite dev server
npm run build       # Production build (tsc + vite build)
npm run typecheck   # TypeScript type-check only
npm run test        # Run tests in watch mode
npm run test:run    # Run tests once (CI-friendly)
npm run lint        # ESLint check
```

---

## Project Structure

```
src/
├── app/              # Router, providers
├── pages/            # Route-level pages (LoginPage, SignupPage, DashboardPage)
├── components/       # UI components grouped by domain
│   ├── auth/
│   ├── calendar/
│   ├── courses/
│   ├── friends/
│   ├── groups/
│   ├── layout/
│   └── shared/
├── hooks/            # React hooks
├── lib/              # Pure utilities (supabase client, time helpers)
├── services/         # Supabase query wrappers (auth, courses, events, ...)
├── store/            # Zustand stores
├── types/            # TypeScript types (generated from Supabase)
└── data/             # Mock data (to be replaced by real queries)

supabase/
├── migrations/       # SQL migrations
└── seed.sql          # Demo data (optional)

tests/
├── lib/              # Unit tests for pure utilities
├── store/            # Store tests
└── setup.ts          # Test setup (jest-dom matchers)

docs/
└── superpowers/      # Design specs and implementation plans
```

---

## Architecture Notes

- **Data flow:** Components → hooks → services → Supabase
- **State:** Zustand for app-wide state (auth, etc.); hook-local state for transient data
- **RLS:** Row-level security enforces access control at the database level
- **Pure logic:** `lib/time.ts` and (eventually) `lib/availability.ts` have no external deps and are fully unit-tested
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with full setup instructions"
```

---

## Self-Review Checklist

Before marking this plan complete, verify:

**Spec coverage (Phases 1-3 only, per plan scope):**
- [x] Phase 1 Foundation: TS migration (Task 1, 5), Vite config (Task 1), folder structure (Task 4), routing (Task 16), Zustand (Task 12), Vitest (Task 3)
- [x] Phase 2 Auth: login page (Task 15), signup page (Task 15), logout (Task 17), protected routes (Task 16), session persistence (Task 14)
- [x] Phase 3 Database & RLS: schema migration (Task 9), RLS policies (Task 10), seed data (deferred to next plan — not strictly needed for auth to work), types generation (Task 11)

**Phases 4-12 are explicitly out of scope for this plan.**

**Placeholder scan:** No TBDs, TODOs, or "similar to" references. Every code block is complete.

**Type consistency:**
- `Profile` interface defined in `store/authStore.ts`, used in `services/auth.service.ts` ✓
- `Session` imported from `@supabase/supabase-js` in both store and service ✓
- `SignUpInput` fields (`name`, `username?`, `major?`, `gradYear?`) match form fields in SignupPage ✓
- `TimeRange` in time.ts used consistently ✓

**Known deferred items (for next plan):**
- Seed data SQL file (needed once we can demo friends/groups, not auth)
- `lib/availability.ts` (needed for Phase 6)
- Service files for courses/events/friends/groups/messages (needed for Phases 4–10)
- Quick Invite removal + "+ New Event" CTA (needed for Phase 5, the event create drawer)
- Replacing mock data in StudyCalendar with Supabase events (Phase 5)
- Header status dot cleanup (mostly cosmetic, deferred)
