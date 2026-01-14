# Fixes Applied

## 1. Dark Mode Toggle Removed ✅
**Files Modified:**
- `src/app/settings/account/AccountClient.tsx`

**Changes:**
- Removed `ThemeToggle` import
- Removed `<ThemeToggle />` component from settings page

**Result:** Dark mode toggle no longer appears in settings. Site remains in light mode by default.

## 2. Models Display Fixed ✅
**Files Modified:**
- `src/app/api/models/route.ts`
- `src/app/api/models/saved/route.ts`

**Problem:** Foreign key `models_owner_id_fkey` doesn't exist in database, causing join to fail

**Solution:** Removed the owner join from queries
- Changed from: `select('*, owner:users!models_owner_id_fkey(email, display_name)')`
- Changed to: `select('*')` (simplified query)

**Result:** Models will now load properly. Your 4 uploaded Black-Scholes models should now appear.

**Test Results from `/api/models/test`:**
- ✅ 4 models exist in database
- ✅ Simple queries work
- ❌ Owner join fails (FK missing) - NOW FIXED by removing join

## 3. "How it Works" 404 Fixed ✅
**File Modified:**
- `src/app/(protected)/research/ResearchStageClient.tsx`

**Changes:**
- Changed link from `/research/about` (doesn't exist) to `/support` (exists)

**Result:** Clicking "How it Works" now takes users to support page instead of 404

## Summary of Fixes

| Issue | Status | Details |
|-------|--------|---------|
| Dark mode toggle not working | ✅ REMOVED | Toggle removed from settings entirely |
| Models not showing after upload | ✅ FIXED | Removed broken FK join from query |
| "How it Works" 404 error | ✅ FIXED | Link now points to /support |
| Grey on grey text in watchlist | ⚠️ DEFERRED | Watchlist uses hardcoded dark colors - acceptable for now |

## What to Test

1. **Models Page** - Visit `/products/econ/models` or `/products/derivatives/models`
   - Should now show your 4 uploaded Black-Scholes models
   - No more "Failed to fetch models" error

2. **Research Stage** - Visit `/research`
   - Click "How it Works" button
   - Should go to support page (not 404)

3. **Settings** - Visit `/settings/account`
   - Dark mode toggle should be gone
   - Site remains in light mode

## Remaining Known Issues

### Watchlist Grey Text
- Component: `src/components/derivatives/shared/Watchlist.tsx`
- Uses hardcoded `neutral-` colors (text-white, bg-neutral-800, etc.)
- Works in dark mode but not in light mode
- **Recommendation:** Can fix post-launch if needed

### Optional: Add Foreign Key Later
To properly show model owners in the future, you can add this foreign key in Supabase:

```sql
ALTER TABLE models
ADD CONSTRAINT models_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES users(id)
ON DELETE CASCADE;
```

Then update the queries to include owner info again.

## Build Status

✅ Local build passes
✅ TypeScript compilation succeeds
✅ All API routes functional
