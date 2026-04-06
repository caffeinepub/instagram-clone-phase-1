import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ConversationPreview {
    user: Principal;
    lastMessage?: Message;
}
export interface Comment {
    id: bigint;
    createdAt: bigint;
    text: string;
    author: Principal;
    postId: bigint;
}
export interface Story {
    id: bigint;
    imageBlobKey: string;
    createdAt: bigint;
    author: Principal;
}
export interface PostView {
    id: bigint;
    authorUsername: string;
    likeCount: bigint;
    imageBlobKey: string;
    createdAt: bigint;
    authorAvatarBlobKey: string;
    author: Principal;
    caption: string;
    commentCount: bigint;
    likedByMe: boolean;
}
export interface Notification {
    id: bigint;
    to: Principal;
    notificationType: NotificationType;
    from: Principal;
    read: boolean;
    text?: string;
    timestamp: bigint;
    postId?: bigint;
}
export interface Profile {
    bio: string;
    username: string;
    avatarBlobKey: string;
    owner: Principal;
    createdAt: bigint;
}
export interface Message {
    id: bigint;
    content: string;
    sender: Principal;
    timestamp: bigint;
    receiver: Principal;
}
export interface ReelView {
    id: bigint;
    audioLabel: string;
    authorUsername: string;
    likeCount: bigint;
    createdAt: bigint;
    authorAvatarBlobKey: string;
    videoBlobKey: string;
    author: Principal;
    caption: string;
    likedByMe: boolean;
}
export enum NotificationType {
    like = "like",
    comment = "comment",
    mention = "mention",
    follow = "follow"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(postId: bigint, text: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPost(imageBlobKey: string, caption: string): Promise<bigint>;
    createReel(videoBlobKey: string, caption: string, audioLabel: string): Promise<bigint>;
    createStory(imageBlobKey: string): Promise<bigint>;
    deleteComment(id: bigint): Promise<boolean>;
    deleteNotification(id: bigint): Promise<boolean>;
    deletePost(id: bigint): Promise<boolean>;
    deleteReel(id: bigint): Promise<boolean>;
    followUser(target: Principal): Promise<void>;
    getActiveStories(): Promise<Array<Story>>;
    getCallerUserProfile(): Promise<Profile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(postId: bigint): Promise<Array<Comment>>;
    getConversations(): Promise<Array<ConversationPreview>>;
    getFeed(limit: bigint): Promise<Array<PostView>>;
    getFollowers(user: Principal): Promise<Array<Principal>>;
    getFollowing(user: Principal): Promise<Array<Principal>>;
    getMessagesWithUser(user: Principal): Promise<Array<Message>>;
    getMyProfile(): Promise<Profile | null>;
    getNotifications(): Promise<Array<Notification>>;
    getPost(id: bigint): Promise<PostView | null>;
    getProfile(user: Principal): Promise<Profile | null>;
    getReel(id: bigint): Promise<ReelView | null>;
    getUserProfile(user: Principal): Promise<Profile | null>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(target: Principal): Promise<boolean>;
    isLiked(postId: bigint): Promise<boolean>;
    isReelLiked(reelId: bigint): Promise<boolean>;
    listPosts(): Promise<Array<PostView>>;
    listProfiles(): Promise<Array<Profile>>;
    listReels(): Promise<Array<ReelView>>;
    markAllNotificationsRead(): Promise<void>;
    markNotificationRead(id: bigint): Promise<boolean>;
    saveCallerUserProfile(username: string, bio: string, avatarBlobKey: string): Promise<void>;
    sendMessage(receiver: Principal, content: string): Promise<bigint>;
    toggleLike(postId: bigint): Promise<boolean>;
    toggleReelLike(reelId: bigint): Promise<boolean>;
    unfollowUser(target: Principal): Promise<void>;
    upsertProfile(username: string, bio: string, avatarBlobKey: string): Promise<void>;
}
