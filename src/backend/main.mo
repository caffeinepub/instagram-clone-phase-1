import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Migration "migration";

(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // ---- Types ----

  public type Profile = {
    owner : Principal;
    username : Text;
    bio : Text;
    avatarBlobKey : Text;
    createdAt : Int;
  };

  public type Post = {
    id : Nat;
    author : Principal;
    imageBlobKey : Text;
    caption : Text;
    createdAt : Int;
  };

  public type Reel = {
    id : Nat;
    author : Principal;
    videoBlobKey : Text;
    caption : Text;
    audioLabel : Text;
    createdAt : Int;
  };

  public type Comment = {
    id : Nat;
    postId : Nat;
    author : Principal;
    text : Text;
    createdAt : Int;
  };

  public type Story = {
    id : Nat;
    author : Principal;
    imageBlobKey : Text;
    createdAt : Int;
  };

  public type PostView = {
    id : Nat;
    author : Principal;
    imageBlobKey : Text;
    caption : Text;
    createdAt : Int;
    likeCount : Nat;
    commentCount : Nat;
    likedByMe : Bool;
    authorUsername : Text;
    authorAvatarBlobKey : Text;
  };

  public type ReelView = {
    id : Nat;
    author : Principal;
    videoBlobKey : Text;
    caption : Text;
    audioLabel : Text;
    createdAt : Int;
    likeCount : Nat;
    likedByMe : Bool;
    authorUsername : Text;
    authorAvatarBlobKey : Text;
  };

  public type Message = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : Text;
    timestamp : Int;
  };

  public type Notification = {
    id : Nat;
    notificationType : NotificationType;
    from : Principal;
    to : Principal;
    postId : ?Nat;
    text : ?Text;
    timestamp : Int;
    read : Bool;
  };

  public type NotificationType = {
    #like;
    #comment;
    #follow;
    #mention;
  };

  public type ConversationPreview = {
    user : Principal;
    lastMessage : ?Message;
  };

  public type MessageWithTime = {
    message : Message;
    timestamp : Int;
  };

  // ---- State ----

  var nextPostId = 0;
  var nextCommentId = 0;
  var nextStoryId = 0;
  var nextMessageId = 0;
  var nextNotificationId = 0;
  var nextReelId = 0;

  let profiles = Map.empty<Principal, Profile>();
  let posts = Map.empty<Nat, Post>();
  let reels = Map.empty<Nat, Reel>();
  let comments = Map.empty<Nat, Comment>();
  let stories = Map.empty<Nat, Story>();
  let postLikes = Map.empty<Nat, [Principal]>();
  let reelLikes = Map.empty<Nat, [Principal]>();
  let follows = Map.empty<Principal, [Principal]>();
  let messages = Map.empty<Nat, Message>();
  let notifications = Map.empty<Nat, Notification>();

  // ---- Helpers ----

  func principalInArray(arr : [Principal], p : Principal) : Bool {
    arr.find(func(x) { Principal.equal(x, p) }) != null;
  };

  func removeFromArray(arr : [Principal], p : Principal) : [Principal] {
    arr.filter(func(x) { not Principal.equal(x, p) });
  };

  func getPostView(post : Post, caller : Principal) : PostView {
    let likers = switch (postLikes.get(post.id)) { case null { [] }; case (?ls) { ls } };
    let allComments = comments.values().toArray();
    let commentCount = allComments.filter(func(c) { c.postId == post.id }).size();
    let authorProfile = profiles.get(post.author);
    let authorUsername = switch (authorProfile) { case null { "" }; case (?p) { p.username } };
    let authorAvatar = switch (authorProfile) { case null { "" }; case (?p) { p.avatarBlobKey } };
    {
      id = post.id;
      author = post.author;
      imageBlobKey = post.imageBlobKey;
      caption = post.caption;
      createdAt = post.createdAt;
      likeCount = likers.size();
      commentCount;
      likedByMe = principalInArray(likers, caller);
      authorUsername;
      authorAvatarBlobKey = authorAvatar;
    };
  };

  func getReelView(reel : Reel, caller : Principal) : ReelView {
    let likers = switch (reelLikes.get(reel.id)) { case null { [] }; case (?ls) { ls } };
    let authorProfile = profiles.get(reel.author);
    let authorUsername = switch (authorProfile) { case null { "" }; case (?p) { p.username } };
    let authorAvatar = switch (authorProfile) { case null { "" }; case (?p) { p.avatarBlobKey } };
    {
      id = reel.id;
      author = reel.author;
      videoBlobKey = reel.videoBlobKey;
      caption = reel.caption;
      audioLabel = reel.audioLabel;
      createdAt = reel.createdAt;
      likeCount = likers.size();
      likedByMe = principalInArray(likers, caller);
      authorUsername;
      authorAvatarBlobKey = authorAvatar;
    };
  };

  func addNotification(notificationType : NotificationType, from : Principal, to : Principal, postId : ?Nat, text : ?Text) {
    let id = nextNotificationId;
    nextNotificationId += 1;
    let notification = {
      id;
      notificationType;
      from;
      to;
      postId;
      text;
      timestamp = Time.now();
      read = false;
    };
    notifications.add(id, notification);
  };

  // ---- Profile API (Required by frontend) ----

  public shared ({ caller }) func saveCallerUserProfile(username : Text, bio : Text, avatarBlobKey : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    let existing = profiles.get(caller);
    let createdAt = switch (existing) { case null { Time.now() }; case (?p) { p.createdAt } };
    profiles.add(caller, { owner = caller; username; bio; avatarBlobKey; createdAt });
  };

  public query ({ caller }) func getCallerUserProfile() : async ?Profile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?Profile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile unless admin");
    };
    profiles.get(user);
  };

  // ---- Legacy Profile API (kept for compatibility) ----

  public shared ({ caller }) func upsertProfile(username : Text, bio : Text, avatarBlobKey : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    let existing = profiles.get(caller);
    let createdAt = switch (existing) { case null { Time.now() }; case (?p) { p.createdAt } };
    profiles.add(caller, { owner = caller; username; bio; avatarBlobKey; createdAt });
  };

  public query ({ caller }) func getProfile(user : Principal) : async ?Profile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(user);
  };

  public shared query ({ caller }) func getMyProfile() : async ?Profile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(caller);
  };

  public query ({ caller }) func listProfiles() : async [Profile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list profiles");
    };
    profiles.values().toArray();
  };

  // ---- Post API ----

  public shared ({ caller }) func createPost(imageBlobKey : Text, caption : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };
    let id = nextPostId;
    nextPostId += 1;
    posts.add(id, { id; author = caller; imageBlobKey; caption; createdAt = Time.now() });
    id;
  };

  public query ({ caller }) func getPost(id : Nat) : async ?PostView {
    switch (posts.get(id)) {
      case null { null };
      case (?post) { ?getPostView(post, caller) };
    };
  };

  public query ({ caller }) func listPosts() : async [PostView] {
    let allPosts = posts.values().toArray();
    let sorted = allPosts.sort(func(a, b) { Int.compare(b.createdAt, a.createdAt) });
    sorted.map(func(p) { getPostView(p, caller) });
  };

  public shared ({ caller }) func deletePost(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };
    switch (posts.get(id)) {
      case null { false };
      case (?post) {
        if (Principal.equal(post.author, caller) or AccessControl.isAdmin(accessControlState, caller)) {
          posts.remove(id);
          true;
        } else { 
          Runtime.trap("Unauthorized: Can only delete your own posts");
        };
      };
    };
  };

  // ---- Reel API ----

  public shared ({ caller }) func createReel(videoBlobKey : Text, caption : Text, audioLabel : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create reels");
    };
    let id = nextReelId;
    nextReelId += 1;
    reels.add(id, {
      id;
      author = caller;
      videoBlobKey;
      caption;
      audioLabel;
      createdAt = Time.now();
    });
    id;
  };

  public query ({ caller }) func getReel(id : Nat) : async ?ReelView {
    switch (reels.get(id)) {
      case null { null };
      case (?reel) { ?getReelView(reel, caller) };
    };
  };

  public query ({ caller }) func listReels() : async [ReelView] {
    let allReels = reels.values().toArray();
    let sorted = allReels.sort(func(a, b) { Int.compare(b.createdAt, a.createdAt) });
    sorted.map(func(r) { getReelView(r, caller) });
  };

  public shared ({ caller }) func deleteReel(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete reels");
    };
    switch (reels.get(id)) {
      case null { false };
      case (?reel) {
        if (Principal.equal(reel.author, caller) or AccessControl.isAdmin(accessControlState, caller)) {
          reels.remove(id);
          true;
        } else { 
          Runtime.trap("Unauthorized: Can only delete your own reels");
        };
      };
    };
  };

  // ---- Post Like API ----

  public shared ({ caller }) func toggleLike(postId : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };
    let current = switch (postLikes.get(postId)) { case null { [] }; case (?ls) { ls } };
    if (principalInArray(current, caller)) {
      postLikes.add(postId, removeFromArray(current, caller));
      false;
    } else {
      postLikes.add(postId, current.concat([caller]));
      let post = posts.get(postId);
      switch (post) {
        case (null) {};
        case (?p) {
          if (not Principal.equal(p.author, caller)) {
            addNotification(#like, caller, p.author, ?postId, null);
          };
        };
      };
      true;
    };
  };

  public query ({ caller }) func isLiked(postId : Nat) : async Bool {
    let current = switch (postLikes.get(postId)) { case null { [] }; case (?ls) { ls } };
    principalInArray(current, caller);
  };

  // ---- Reel Like API ----

  public shared ({ caller }) func toggleReelLike(reelId : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like reels");
    };
    let current = switch (reelLikes.get(reelId)) { case null { [] }; case (?ls) { ls } };
    if (principalInArray(current, caller)) {
      reelLikes.add(reelId, removeFromArray(current, caller));
      false;
    } else {
      reelLikes.add(reelId, current.concat([caller]));
      let reel = reels.get(reelId);
      switch (reel) {
        case (null) {};
        case (?r) {
          if (not Principal.equal(r.author, caller)) {
            addNotification(#like, caller, r.author, null, null);
          };
        };
      };
      true;
    };
  };

  public query ({ caller }) func isReelLiked(reelId : Nat) : async Bool {
    let current = switch (reelLikes.get(reelId)) { case null { [] }; case (?ls) { ls } };
    principalInArray(current, caller);
  };

  // ---- Comment API ----

  public shared ({ caller }) func addComment(postId : Nat, text : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add comments");
    };
    let id = nextCommentId;
    nextCommentId += 1;
    comments.add(id, { id; postId; author = caller; text; createdAt = Time.now() });

    let post = posts.get(postId);
    switch (post) {
      case (null) {};
      case (?p) {
        if (not Principal.equal(p.author, caller)) {
          addNotification(#comment, caller, p.author, ?postId, ?text);
        };
      };
    };

    id;
  };

  public query ({ caller }) func getComments(postId : Nat) : async [Comment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view comments");
    };
    let all = comments.values().toArray();
    let filtered = all.filter(func(c) { c.postId == postId });
    filtered.sort(func(a, b) { Int.compare(a.createdAt, b.createdAt) });
  };

  public shared ({ caller }) func deleteComment(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete comments");
    };
    switch (comments.get(id)) {
      case null { false };
      case (?c) {
        if (Principal.equal(c.author, caller) or AccessControl.isAdmin(accessControlState, caller)) {
          comments.remove(id);
          true;
        } else { 
          Runtime.trap("Unauthorized: Can only delete your own comments");
        };
      };
    };
  };

  // ---- Follow API ----

  public shared ({ caller }) func followUser(target : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow others");
    };
    if (Principal.equal(caller, target)) { return };
    let current = switch (follows.get(caller)) { case null { [] }; case (?fs) { fs } };
    if (not principalInArray(current, target)) {
      follows.add(caller, current.concat([target]));
      addNotification(#follow, caller, target, null, null);
    };
  };

  public shared ({ caller }) func unfollowUser(target : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow others");
    };
    let current = switch (follows.get(caller)) { case null { [] }; case (?fs) { fs } };
    follows.add(caller, removeFromArray(current, target));
  };

  public query ({ caller }) func getFollowing(user : Principal) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view following lists");
    };
    switch (follows.get(user)) { case null { [] }; case (?fs) { fs } };
  };

  public query ({ caller }) func getFollowers(user : Principal) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view follower lists");
    };
    let allFollows = follows.entries().toArray();
    let filtered = allFollows.filter(func((_, targets)) { principalInArray(targets, user) });
    filtered.map(func((f, _)) { f });
  };

  public query ({ caller }) func isFollowing(target : Principal) : async Bool {
    let current = switch (follows.get(caller)) { case null { [] }; case (?fs) { fs } };
    principalInArray(current, target);
  };

  // ---- Story API ----

  public shared ({ caller }) func createStory(imageBlobKey : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create stories");
    };
    let id = nextStoryId;
    nextStoryId += 1;
    stories.add(id, { id; author = caller; imageBlobKey; createdAt = Time.now() });
    id;
  };

  public query ({ caller }) func getActiveStories() : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };
    let cutoff = Time.now() - 86_400_000_000_000;
    let all = stories.values().toArray();
    let active = all.filter(func(s) { s.createdAt > cutoff });
    active.sort(func(a, b) { Int.compare(b.createdAt, a.createdAt) });
  };

  // ---- Feed API ----

  public query ({ caller }) func getFeed(limit : Nat) : async [PostView] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view feed");
    };
    let following = switch (follows.get(caller)) { case null { [] }; case (?fs) { fs } };
    let allPosts = posts.values().toArray();
    let feedPosts = allPosts.filter(func(p) {
      Principal.equal(p.author, caller) or principalInArray(following, p.author);
    });
    let sorted = feedPosts.sort(func(a, b) { Int.compare(b.createdAt, a.createdAt) });
    let limited = if (sorted.size() > limit) { sorted.sliceToArray(0, limit) } else { sorted };
    limited.map(func(p) { getPostView(p, caller) });
  };

  // ---- Direct Messaging API ----

  public shared ({ caller }) func sendMessage(receiver : Principal, content : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    let id = nextMessageId;
    nextMessageId += 1;
    let message = { id; sender = caller; receiver; content; timestamp = Time.now() };
    messages.add(id, message);
    id;
  };

  public query ({ caller }) func getMessagesWithUser(user : Principal) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    let all = messages.values().toArray();
    all.filter(func(m) { 
      (Principal.equal(m.sender, caller) and Principal.equal(m.receiver, user)) or 
      (Principal.equal(m.sender, user) and Principal.equal(m.receiver, caller)) 
    });
  };

  public query ({ caller }) func getConversations() : async [ConversationPreview] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };
    let all = messages.values().toArray();
    let convoMap = Map.empty<Principal, MessageWithTime>();

    for (msg in all.values()) {
      if (Principal.equal(msg.sender, caller) or Principal.equal(msg.receiver, caller)) {
        let other = if (Principal.equal(msg.sender, caller)) { msg.receiver } else { msg.sender };
        let existing = convoMap.get(other);
        switch (existing) {
          case (null) {
            convoMap.add(other, { message = msg; timestamp = msg.timestamp });
          };
          case (?prev) {
            if (msg.timestamp > prev.timestamp) {
              convoMap.add(other, { message = msg; timestamp = msg.timestamp });
            };
          };
        };
      };
    };

    let arrayIterResult = convoMap.entries().toArray();
    arrayIterResult.map<(Principal, MessageWithTime), ConversationPreview>(
      func((user, lastMessage)) { { user; lastMessage = ?lastMessage.message } }
    );
  };

  // ---- Notifications API ----

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };
    let all = notifications.values().toArray();
    let userNotifications = all.filter(
      func(n) { Principal.equal(n.to, caller) }
    );
    userNotifications.sort(
      func(a, b) { Int.compare(b.timestamp, a.timestamp) }
    );
  };

  public shared ({ caller }) func markNotificationRead(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };
    switch (notifications.get(id)) {
      case null { false };
      case (?n) {
        if (Principal.equal(n.to, caller)) {
          notifications.add(id, { n with read = true });
          true;
        } else { 
          Runtime.trap("Unauthorized: Can only mark your own notifications as read");
        };
      };
    };
  };

  public shared ({ caller }) func markAllNotificationsRead() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };
    let userNotifications = notifications.values().toArray().filter(
      func(n) { Principal.equal(n.to, caller) }
    );
    for (n in userNotifications.values()) {
      if (not n.read) {
        notifications.add(n.id, { n with read = true });
      };
    };
  };

  public shared ({ caller }) func deleteNotification(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete notifications");
    };
    switch (notifications.get(id)) {
      case null { false };
      case (?n) {
        if (Principal.equal(n.to, caller) or AccessControl.isAdmin(accessControlState, caller)) {
          notifications.remove(id);
          true;
        } else { 
          Runtime.trap("Unauthorized: Can only delete your own notifications");
        };
      };
    };
  };
};
