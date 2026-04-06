# Instagram Clone - Phase 5: Stories System + Advanced Profile

## Current State
- Backend: Full Motoko canister with profiles, posts, reels, stories (basic), comments, follows, messages, notifications
- Stories: Basic `createStory(imageBlobKey)` and `getActiveStories()` - image only, no reactions, no viewer tracking, no highlights
- Profile: Text-only edit (username, bio) - no avatar photo upload, no website/location fields, no tabs for Reels/Tagged/Saved
- StoriesRow: Displays story bubbles but tapping does nothing - no story viewer modal
- ProfileScreen: Basic stats (posts/followers/following), text profile edit, post grid

## Requested Changes (Diff)

### Add
- **Story viewer modal**: Full-screen story viewer with progress bar (auto-advance 5s), tap left/right navigation, close button, author info
- **Story creation sheet**: Upload image OR video, preview before posting, caption/text overlay support
- **Story reactions**: Preset emoji reactions (❤️ 😂 😮 😢 😡 👏) displayed as floating reactions when viewing a story
- **Story reply (DM)**: Send a DM reply directly from the story viewer to the story author
- **Story viewer tracking**: Author can see who viewed their story ("Seen by X" list)
- **Story expiry**: Backend already filters by 24h; frontend indicates "expired" visually
- **Story highlights**: Users can save stories to named highlight collections shown on their profile page
- **Poll stickers**: Simple yes/no or two-option poll sticker in story creation
- **Question sticker**: Text question sticker in story creation
- **Advanced Profile**: 
  - Profile photo upload using blob storage
  - Website and location fields
  - Profile tabs: Posts / Reels / Tagged / Saved
  - Story highlights row on profile
  - Edit profile sheet (full form)
  - Blue tick verification badge if user is verified

### Modify
- `StoriesRow`: Make story bubbles tappable (open story viewer)
- `ProfileScreen`: Add avatar upload, extra fields, tabs, highlights row
- `createStory` backend: Extend Story type to support videoBlobKey, reactions, viewer list, highlights
- `upsertProfile` backend: Add website and location fields to Profile type
- Backend `getActiveStories`: Return StoryView with author username and avatar

### Remove
- Nothing removed (backward compatible)

## Implementation Plan
1. Update Motoko backend:
   - Extend `Profile` with `website`, `location` fields
   - Extend `Story` with `videoBlobKey`, `viewerList`, `reactions`, `sticker` (optional poll/question data)
   - Add `StoryView` type with author info resolved
   - Add `getActiveStories()` returning `[StoryView]`
   - Add `viewStory(id)` - records caller as viewer
   - Add `reactToStory(id, emoji)` - stores reaction
   - Add story highlights: `Highlight` type, `createHighlight`, `addStoryToHighlight`, `getHighlights`
   - Update `upsertProfile` to accept website + location

2. Update frontend:
   - `StoriesRow`: Add onClick handler, open full-screen viewer modal
   - New `StoryViewer` component: progress bar, tap nav, reactions bar, reply input, viewer list (for own stories)
   - New `StoryCreate` sheet: file input (image/video), preview, poll/question sticker options
   - `ProfileScreen`: Avatar upload via blob storage, website/location fields, tabs (Posts/Reels/Tagged/Saved), highlights row
   - `HomeScreen`: Connect story "Your story" button to story creation sheet
