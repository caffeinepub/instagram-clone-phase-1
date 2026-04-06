# Instagram Clone - Phase 3: Real Reels + Live Messages

## Current State
- Phase 1 & 2 deployed: Auth, Home Feed, Stories, Create Post (with blob storage for images), Profile, Reels (static mock videos), Messages (static mock conversations), Notifications, Settings
- Backend has: User, Post, Story, Comment, Like, Follow, Message, Notification APIs
- Blob storage already integrated for image uploads (CreateScreen uses StorageClient)
- ReelsScreen shows hardcoded sample videos from external URLs
- MessagesScreen shows hardcoded mock conversations; sendMessage backend call is commented out (no real principal resolution)
- getConversations() is fetched but result is unused (conversations list shows mocks)

## Requested Changes (Diff)

### Add
- `Reel` type in Motoko backend: id, author, videoBlobKey, caption, audioLabel, createdAt
- `createReel(videoBlobKey, caption, audioLabel)` backend method
- `listReels()` backend method returning ReelView (with author info, likeCount, likedByMe)
- `toggleReelLike(reelId)` backend method
- `ReelView` type with authorUsername, authorAvatarBlobKey, likeCount, likedByMe fields
- Upload Reel button/flow in ReelsScreen: video file picker, upload to blob storage, submit to backend
- ReelsScreen now fetches real reels from backend, falls back to mock content when empty
- MessagesScreen fully wired to backend: getConversations() drives conversation list, messages sent via sendMessage(), getMessagesWithUser() loads thread
- New conversation flow: search users from listProfiles() and start a conversation
- Polling for new messages every 5s when inside a chat thread

### Modify
- ReelsScreen: merge backend reels with mock content (backend first, mocks as fallback filler)
- MessagesScreen: replace MOCK_CONVERSATIONS with real backend data; ChatThread fetches real message history and sends via actor
- Backend main.mo: add Reel state and CRUD methods, add markAllNotificationsRead convenience method

### Remove
- Nothing removed (mock fallbacks kept so app is never empty)

## Implementation Plan
1. Update Motoko backend: add Reel type, createReel, listReels (with ReelView), toggleReelLike
2. Update ReelsScreen: add upload FAB, video file picker, blob storage upload flow, fetch real reels from backend, merge with mocks
3. Update MessagesScreen: wire conversation list to getConversations() + listProfiles() for display names, wire ChatThread to getMessagesWithUser() + sendMessage(), add new conversation modal with user search, add 5s polling for new messages in open thread
