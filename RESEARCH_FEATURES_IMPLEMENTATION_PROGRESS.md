# Research Features Implementation Progress

## Summary
This document tracks the implementation of missing research system features identified in the audit.

---

## ✅ COMPLETED FEATURES

### 1. Notifications UI
**Status:** Fully Implemented

**What was added:**
- `/src/components/NotificationDropdown.tsx` - Bell icon dropdown in TopNav
  - Shows unread count badge
  - Lists last 10 notifications with icons
  - Click to mark as read and navigate to links
  - Polls for new notifications every 60 seconds
  - "Mark all as read" functionality
  - Links to notification settings

- **Integration:** Added to TopNav.tsx for authenticated users
- **API:** Already existed (`/api/notifications/list`, `/api/notifications/mark-read`)
- **Settings Page:** Already exists at `/settings/notifications` (for newsletter prefs)

**Next Steps:**
- Consider adding research-specific notification preferences to settings page
- Add real-time notifications using Supabase Realtime subscriptions

---

### 2. Citations System API
**Status:** Fully Implemented

**What was added:**

#### API Routes:
1. **POST `/api/research/citations/create`** - Create citation
   - Validates citation type (builds_on, replicates, challenges, uses_method, references)
   - Verifies user owns citing research
   - Verifies cited research exists and is published
   - Prevents duplicate citations
   - Creates notification trigger for cited author

2. **GET `/api/research/citations/[objectId]`** - List citations
   - Returns `citations[]` (research this object cites)
   - Returns `cited_by[]` (research that cites this object)
   - Includes full author/research metadata

3. **DELETE `/api/research/citations/[objectId]?citationId=xxx`** - Delete citation
   - Verifies ownership
   - Only allows deleting from own research

4. **GET `/api/research/search`** - Search research for citations
   - Full-text search on title/abstract
   - Filters to published only
   - Can exclude specific ID (to avoid self-citation)
   - Returns top 20 results with author info

---

### 3. Citations UI (Partial)
**Status:** In Progress

**What was added:**
- `/src/components/research/AddCitationDialog.tsx` - Modal for adding citations
  - Search interface for finding research to cite
  - 5 citation type selection (builds_on, replicates, challenges, uses_method, references)
  - Optional context notes field
  - Prevents self-citation via excludeId

**What remains:**
- Component to display citations on research pages (`CitationsList.tsx`)
- Integration into research view page
- Citation graph visualization
- Citation badges/counts in research cards

---

## 🚧 IN PROGRESS

### Citations UI Components Needed:
1. **CitationsList.tsx** - Display citations on research page
   - Tab for "References" (outgoing citations)
   - Tab for "Cited By" (incoming citations)
   - Group by citation type
   - Show citation context if provided
   - Allow deletion of own citations

2. **CitationBadge.tsx** - Small citation count indicator
   - Show citation count on research cards
   - Click to view citations

3. **Integration into ResearchViewClient**
   - Add citations section below discussions
   - "Add Citation" button for authors
   - Display citations list

---

## 📋 TODO - REMAINING FEATURES

### Phase 2: Curation & Discovery

#### 4. Collections System (API)
**Not Started**

**Need to create:**
- **POST `/api/research/collections/create`**
  - Create new collection (topic, method, institution, series)
  - Set visibility (public/private)
  - Set curator

- **GET `/api/research/collections/[id]`**
  - Get collection with all research objects
  - Include curator info
  - Order by position

- **PATCH `/api/research/collections/[id]`**
  - Update collection metadata
  - Verify curator ownership

- **DELETE `/api/research/collections/[id]`**
  - Delete collection
  - Verify curator ownership

- **POST `/api/research/collections/[id]/add`**
  - Add research object to collection
  - Set position/order
  - Verify curator ownership

- **DELETE `/api/research/collections/[id]/remove`**
  - Remove research object from collection
  - Verify curator ownership

- **GET `/api/research/collections/list`**
  - List public collections
  - Filter by type
  - Search by name

---

#### 5. Collections UI
**Not Started**

**Components needed:**
- **CreateCollectionDialog.tsx** - Modal for creating collections
  - Name, description, collection_type selector
  - Visibility toggle
  - Initial research selection

- **CollectionCard.tsx** - Display collection in browse view
  - Show curator, research count
  - Preview thumbnails of research in collection

- **CollectionDetailPage.tsx** - Full collection view
  - List all research in collection
  - Edit button for curator
  - Follow collection button
  - Add to collection (for curator)

- **CollectionBrowser.tsx** - Browse/discover collections
  - Filter by type
  - Search
  - Featured collections

- **AddToCollectionDialog.tsx** - Add research to collections
  - Show user's collections
  - Create new collection option

**Pages needed:**
- `/research/collections` - Browse page
- `/research/collections/[slug]` - Collection detail page
- `/research/collections/new` - Create collection page

---

### Phase 2: Referral System

#### 6. Referral System (API)
**Not Started**

**Need to create:**
- **POST `/api/research/referrals/generate`**
  - Generate referral code for user
  - Return referral URL
  - Store in referrals table

- **GET `/api/research/referrals/track`**
  - Track referral conversion
  - Match referral code to user
  - Award attribution points

- **GET `/api/research/referrals/stats`**
  - Get user's referral statistics
  - Count conversions by source type
  - Show attribution earned

**Middleware needed:**
- Referral tracking middleware to capture `?ref=xxx` codes
- Store in session/cookie
- Attribute on signup

---

#### 7. Referral UI
**Not Started**

**Components needed:**
- **ShareButton.tsx** - Share with referral link
  - Generate referral link
  - Copy to clipboard
  - Social share buttons (Twitter, LinkedIn, Email)

- **ReferralDashboard.tsx** - User referral stats page
  - Total referrals
  - Conversion rate
  - Attribution points earned
  - Breakdown by source (research, profile, discussion, etc.)

- **ReferralBadge.tsx** - Show attribution source
  - "via @username" attribution on research
  - "Discovered through..." tags

**Pages needed:**
- `/settings/referrals` - Referral dashboard
- Integration of share buttons on all research pages

---

### Phase 3: Advanced Features

#### 8. Workspace Forking
**Not Started**

**API needed:**
- **POST `/api/workspaces/fork/[id]`**
  - Fork a lab workspace
  - Copy workspace configuration
  - Link to original via `forked_from_id`
  - Set new owner

- **GET `/api/workspaces/[id]/forks`**
  - List forks of a workspace
  - Show fork tree

**UI needed:**
- **ForkWorkspaceButton.tsx** - "Replicate Analysis" button
  - Click to fork workspace
  - Opens in appropriate lab with forked state

- **Integration:**
  - Add "Replicate this analysis" button on research pages with `lab_workspace_id`
  - Show "Forked from..." link if workspace is a fork

---

## 🎯 PRIORITY ORDER

### Immediate (Most Impact):
1. ✅ Notifications UI - DONE
2. ✅ Citations API - DONE
3. 🚧 Citations UI - IN PROGRESS (finish integration)

### Next (High Value):
4. Collections API - Enable curation
5. Collections UI - Discovery and organization
6. Referral API - Growth tracking

### Future (Nice to Have):
7. Referral UI - Growth features
8. Workspace Forking - Replication features

---

## 📊 COMPLETION STATUS

| Feature | API | UI | Status |
|---------|-----|----|---------|
| Notifications | ✅ | ✅ | **COMPLETE** |
| Citations | ✅ | ⚠️ | **80% COMPLETE** |
| Collections | ❌ | ❌ | **NOT STARTED** |
| Referrals | ❌ | ❌ | **NOT STARTED** |
| Workspace Forking | ❌ | ❌ | **NOT STARTED** |

---

## 🔨 NEXT ACTIONS

1. **Finish Citations UI** (20 min)
   - Create CitationsList component
   - Integrate into research view page
   - Test adding/removing citations

2. **Start Collections API** (1 hour)
   - Create CRUD routes
   - Add membership management
   - Create list/browse endpoint

3. **Build Collections UI** (2 hours)
   - Collection browser page
   - Create collection dialog
   - Collection detail page
   - Add to collection functionality

4. **Referral System** (2 hours)
   - Generate/track API
   - Share buttons
   - Referral dashboard

5. **Workspace Forking** (1 hour)
   - Fork API
   - Replicate button
   - Fork attribution

---

## 📝 NOTES

- All database schema already exists for these features
- RLS policies are in place
- Triggers for notifications are working
- The foundation is solid, just need to build the UI/API layer

**Estimated total remaining time:** 6-7 hours to complete all features
