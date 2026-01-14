# Complete Implementation Strategy

## Overview
This document outlines the strategy for:
1. Completing all remaining research features
2. Redesigning entire site to minimalist aesthetic
3. Adding dark/light mode toggle

## Phase 1: Complete Core Features (Features First, Then Design)

### A. Citations Integration (30 min)
- ✅ CitationsList component created
- Add to ResearchViewClient below discussions
- Add "Add Citation" button for authors
- Test full flow

### B. Collections System (2 hours)
**API Routes:**
1. POST `/api/research/collections/create`
2. GET `/api/research/collections/[id]`
3. PATCH `/api/research/collections/[id]`
4. DELETE `/api/research/collections/[id]`
5. POST `/api/research/collections/[id]/add`
6. DELETE `/api/research/collections/[id]/remove`
7. GET `/api/research/collections/list`

**UI Components:**
1. CreateCollectionDialog
2. CollectionCard
3. CollectionsList
4. AddToCollectionDialog

**Pages:**
1. `/research/collections` - Browse
2. `/research/collections/[slug]` - Detail

### C. Referral System (1.5 hours)
**API Routes:**
1. POST `/api/research/referrals/generate`
2. GET `/api/research/referrals/track`
3. GET `/api/research/referrals/stats`

**UI Components:**
1. ShareButton (with referral link)
2. ReferralDashboard

**Pages:**
1. `/settings/referrals` - Dashboard

### D. Workspace Forking (1 hour)
**API Routes:**
1. POST `/api/workspaces/fork/[id]`
2. GET `/api/workspaces/[id]/forks`

**UI Components:**
1. ForkWorkspaceButton
2. Fork attribution badge

---

## Phase 2: Design System & Dark Mode (3 hours)

### A. Create Design System
**File:** `/src/lib/design-system.ts`

```typescript
export const colors = {
  light: {
    bg: {
      primary: 'bg-white',
      secondary: 'bg-gray-50',
      tertiary: 'bg-gray-100',
    },
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      tertiary: 'text-gray-500',
    },
    border: 'border-gray-200',
    hover: 'hover:bg-gray-50',
  },
  dark: {
    bg: {
      primary: 'bg-gray-900',
      secondary: 'bg-gray-800',
      tertiary: 'bg-gray-700',
    },
    text: {
      primary: 'text-white',
      secondary: 'text-gray-300',
      tertiary: 'text-gray-400',
    },
    border: 'border-gray-700',
    hover: 'hover:bg-gray-800',
  },
};

export const spacing = {
  page: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  section: 'py-8 sm:py-12',
  card: 'p-6',
};

export const typography = {
  h1: 'text-3xl sm:text-4xl font-bold tracking-tight',
  h2: 'text-2xl sm:text-3xl font-bold',
  h3: 'text-xl sm:text-2xl font-semibold',
  body: 'text-base',
  small: 'text-sm',
  tiny: 'text-xs',
};

export const components = {
  button: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors',
    secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors',
    ghost: 'text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition-colors',
  },
  card: 'rounded-lg border border-gray-200 bg-white shadow-sm',
  input: 'w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none',
};
```

### B. Theme Context
**File:** `/src/contexts/ThemeContext.tsx`

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### C. Update Tailwind Config
Add dark mode support:

```javascript
module.exports = {
  darkMode: 'class',
  // ... rest of config
}
```

### D. Minimalist Design Principles
1. **Generous white space** - Increase padding/margins by 50%
2. **Reduced borders** - Use subtle shadows instead of heavy borders
3. **Fewer colors** - Stick to gray scale + 1-2 accent colors
4. **Typography hierarchy** - Clear font size differences
5. **Remove gradients** - Use flat colors
6. **Simplified components** - Remove unnecessary decorations
7. **Focus on content** - Reduce UI chrome

---

## Phase 3: Apply Design System to All Pages (4 hours)

### Priority Order (Most Visible First):
1. **Landing Page** (`/page.tsx`)
   - Hero section
   - Feature cards
   - CTA buttons

2. **TopNav** (`/components/TopNav.tsx`)
   - Simplified header
   - Cleaner dropdown
   - Theme toggle button

3. **Research Pages**
   - `/research` - Landing
   - `/research/[slug]` - Detail
   - `/research/browse` - List
   - `/research/publish` - Publish flow

4. **Lab Pages**
   - `/products/derivatives` - Derivatives lab
   - `/products/econ` - Econ lab
   - `/products/econ/macro` - Macro

5. **Settings Pages**
   - `/settings` - Main
   - `/settings/account`
   - `/settings/billing`
   - `/settings/notifications`
   - `/settings/usage`

6. **Researcher Pages**
   - `/researchers/[slug]` - Profile

7. **Other Pages**
   - `/pricing`
   - `/blog`
   - `/support`

---

## Implementation Order

### Day 1: Features (6-7 hours)
1. ✅ Notifications UI - DONE
2. ✅ Citations API - DONE
3. ✅ Citations UI components - DONE
4. Citations integration - 30 min
5. Collections API - 1 hour
6. Collections UI - 1 hour
7. Referral API - 45 min
8. Referral UI - 45 min
9. Workspace Forking - 1 hour

### Day 2: Design System (3 hours)
1. Create design system constants
2. Create ThemeContext
3. Add theme toggle to settings
4. Update Tailwind config

### Day 3: Apply Design (4 hours)
1. Update TopNav
2. Update Landing page
3. Update Research pages
4. Update Lab pages
5. Update Settings pages
6. Update remaining pages

---

## Testing Checklist
- [ ] All API routes return correct data
- [ ] All components render in light mode
- [ ] All components render in dark mode
- [ ] Theme persists across page refreshes
- [ ] All features work end-to-end
- [ ] No TypeScript errors
- [ ] Build passes
- [ ] Responsive on mobile/tablet/desktop

---

## Key Design Changes Per Page Type

### Cards
Before: Heavy shadows, thick borders, gradients
After: Subtle shadow, thin border or no border, flat colors

### Buttons
Before: Multiple button styles, gradients
After: 3 styles max (primary/secondary/ghost), flat colors

### Typography
Before: Multiple font weights, small size differences
After: 2-3 font weights, clear size hierarchy

### Spacing
Before: Tight spacing, cramped layouts
After: Generous whitespace, breathing room

### Colors
Before: Many colors, saturated backgrounds
After: Gray scale + blue accent, white/gray backgrounds

---

## Deliverables
1. All research features complete and functional
2. Dark/light mode toggle in settings
3. Theme persists in localStorage
4. All pages follow minimalist design
5. Consistent spacing/typography across site
6. Build passes without errors
7. Documentation of design system
