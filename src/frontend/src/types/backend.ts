// Re-export the app-specific types from the generated declaration file.
// backend.d.ts contains the full interface while backend.ts has a limited one.

export type {
  Option,
  Some,
  None,
  UserRole,
  Profile,
  Comment,
  Story,
  PostView,
  Message,
  ConversationPreview,
  Notification,
  NotificationType,
  backendInterface as FullBackendInterface,
} from "../backend.d";
