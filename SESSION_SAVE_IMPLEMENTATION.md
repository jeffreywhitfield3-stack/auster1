# Session Save Implementation Plan

## Overview

Implement prompts to save work before users leave a lab session, preventing loss of:
- Derivatives strategies built
- Screener configurations
- Positions entered
- Econ lab analysis work

## Architecture Approach

### 1. Unsaved State Detection

Track "dirty" state in each lab:

```typescript
// Track unsaved changes
const [hasUnsavedWork, setHasUnsavedWork] = useState(false);
const [workToSave, setWorkToSave] = useState<SaveableWork | null>(null);

// Mark dirty when user makes changes
useEffect(() => {
  if (legs.length > 0 || strategies.length > 0) {
    setHasUnsavedWork(true);
  }
}, [legs, strategies]);
```

### 2. Navigation Intercept

Use Next.js router events to intercept navigation:

```typescript
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useUnsavedChangesWarning(hasUnsaved: boolean) {
  const router = useRouter();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsaved]);
}
```

### 3. Save Dialog Component

Create a reusable save prompt dialog:

```typescript
// src/components/SaveWorkDialog.tsx
interface SaveWorkDialogProps {
  open: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
  workType: 'strategy' | 'screener' | 'positions' | 'analysis';
}

export function SaveWorkDialog({
  open,
  onSave,
  onDiscard,
  onCancel,
  workType
}: SaveWorkDialogProps) {
  return (
    <Dialog open={open}>
      <DialogTitle>Save your {workType}?</DialogTitle>
      <DialogContent>
        <p>You have unsaved work. Would you like to save it to a project before leaving?</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDiscard}>Discard</Button>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} variant="primary">Save to Project</Button>
      </DialogActions>
    </Dialog>
  );
}
```

## Implementation by Lab

### Derivatives Lab

Track unsaved work in:
1. **Builder Tab** - Unsaved strategies
2. **Screeners Tab** - Custom screener configs
3. **Positions Tab** - Manually entered positions

```typescript
// DerivativesClient.tsx
const [unsavedStrategies, setUnsavedStrategies] = useState<Strategy[]>([]);
const [unsavedScreeners, setUnsavedScreeners] = useState<ScreenerConfig[]>([]);
const [unsavedPositions, setUnsavedPositions] = useState<Position[]>([]);

// Show dialog before navigation
const handleTabChange = (newTab: Tab) => {
  if (hasUnsavedWork) {
    setShowSaveDialog(true);
    setPendingTab(newTab);
  } else {
    setActiveTab(newTab);
  }
};
```

### Econ Labs

Track unsaved work in:
1. **Chart configurations** - Custom series selections
2. **Analysis notes** - User annotations
3. **Data filters** - Custom date ranges and parameters

```typescript
// MacroClient.tsx / InequalityClient.tsx / etc.
const [hasUnsavedAnalysis, setHasUnsavedAnalysis] = useState(false);
const [analysisState, setAnalysisState] = useState({
  selectedSeries,
  dateRange,
  notes: '',
  customFilters
});

// Mark as unsaved when state changes
useEffect(() => {
  if (analysisState.notes || customFilters) {
    setHasUnsavedAnalysis(true);
  }
}, [analysisState]);
```

## Projects System

### Database Schema

```sql
-- Projects to organize saved work
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('derivatives', 'econ')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved work items within projects
CREATE TABLE IF NOT EXISTS project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('strategy', 'screener', 'position', 'analysis')),
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Save Flow

1. User clicks "Save to Project"
2. Show project selector (or create new project)
3. Save current work state to selected project
4. Mark as saved (hasUnsavedWork = false)
5. Show success message

```typescript
async function saveToProject(projectId: string, workType: string, data: unknown) {
  const response = await fetch('/api/projects/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      item_type: workType,
      name: generateAutoName(workType, data),
      data
    })
  });

  if (response.ok) {
    setHasUnsavedWork(false);
    showToast('Saved to project successfully');
  }
}
```

## User Experience

### Trigger Points

Show save prompt when:
- Navigating away from tab with unsaved work
- Closing browser/tab (beforeunload)
- Logging out
- Going back to homepage

### Don't Prompt When:
- No changes have been made
- Work was already saved
- User explicitly discarded changes

### Dialog Options

1. **Save to Project** - Opens project selector, saves work
2. **Discard** - Clears unsaved work, proceeds with navigation
3. **Cancel** - Stays on current tab, keeps working

## Auto-Save (Optional Enhancement)

Consider auto-saving to localStorage:

```typescript
// Auto-save to localStorage every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    if (hasUnsavedWork) {
      localStorage.setItem('derivatives-autosave', JSON.stringify({
        timestamp: Date.now(),
        strategies: unsavedStrategies,
        screeners: unsavedScreeners
      }));
    }
  }, 30000);

  return () => clearInterval(interval);
}, [hasUnsavedWork, unsavedStrategies, unsavedScreeners]);

// Restore on mount
useEffect(() => {
  const saved = localStorage.getItem('derivatives-autosave');
  if (saved) {
    const data = JSON.parse(saved);
    // Show "Restore previous session?" prompt
  }
}, []);
```

## Implementation Priority

### Phase 1: Core (Now)
- [x] Create documentation
- [ ] Add database schema for projects
- [ ] Create SaveWorkDialog component
- [ ] Implement useUnsavedChangesWarning hook
- [ ] Add to Derivatives Builder tab

### Phase 2: Expand
- [ ] Add to Derivatives Screeners
- [ ] Add to Derivatives Positions
- [ ] Add to Econ labs
- [ ] Create Projects management page

### Phase 3: Polish
- [ ] Auto-save to localStorage
- [ ] Session restore on refresh
- [ ] Keyboard shortcuts (Cmd+S to save)
- [ ] Toast notifications

## API Routes Needed

```
POST   /api/projects/create          - Create new project
GET    /api/projects/list            - List user's projects
GET    /api/projects/[id]            - Get project details
POST   /api/projects/items/create    - Add item to project
DELETE /api/projects/items/[id]      - Remove item from project
```

## Testing Checklist

- [ ] Prompt shows when leaving with unsaved strategy
- [ ] Prompt shows when leaving with unsaved screener
- [ ] Prompt shows when closing browser tab
- [ ] Save to project works correctly
- [ ] Discard clears unsaved state
- [ ] Cancel stays on current page
- [ ] No prompt when no changes made
- [ ] Auto-save works correctly
- [ ] Session restore works after refresh

## Notes

This is a significant UX enhancement that prevents users from losing work.
The key is tracking "dirty" state properly and only prompting when truly necessary.

Start simple (browser beforeunload + basic dialog) and enhance over time
(auto-save, projects system, restore).
