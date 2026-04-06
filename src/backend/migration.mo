import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  type Profile = {
    owner : Principal;
    username : Text;
    bio : Text;
    avatarBlobKey : Text;
    createdAt : Int;
  };

  type Post = {
    id : Nat;
    author : Principal;
    imageBlobKey : Text;
    caption : Text;
    createdAt : Int;
  };

  type Reel = {
    id : Nat;
    author : Principal;
    videoBlobKey : Text;
    caption : Text;
    audioLabel : Text;
    createdAt : Int;
  };

  type Comment = {
    id : Nat;
    postId : Nat;
    author : Principal;
    text : Text;
    createdAt : Int;
  };

  type Story = {
    id : Nat;
    author : Principal;
    imageBlobKey : Text;
    createdAt : Int;
  };

  type Message = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : Text;
    timestamp : Int;
  };

  type Notification = {
    id : Nat;
    notificationType : NotificationType;
    from : Principal;
    to : Principal;
    postId : ?Nat;
    text : ?Text;
    timestamp : Int;
    read : Bool;
  };

  type NotificationType = {
    #like;
    #comment;
    #follow;
    #mention;
  };

  type OldActor = {
    nextPostId : Nat;
    nextCommentId : Nat;
    nextStoryId : Nat;
    nextMessageId : Nat;
    nextNotificationId : Nat;
    profiles : Map.Map<Principal, Profile>;
    posts : Map.Map<Nat, Post>;
    comments : Map.Map<Nat, Comment>;
    stories : Map.Map<Nat, Story>;
    likes : Map.Map<Nat, [Principal]>;
    follows : Map.Map<Principal, [Principal]>;
    messages : Map.Map<Nat, Message>;
    notifications : Map.Map<Nat, Notification>;
  };

  type NewActor = {
    nextPostId : Nat;
    nextCommentId : Nat;
    nextStoryId : Nat;
    nextMessageId : Nat;
    nextNotificationId : Nat;
    nextReelId : Nat;
    profiles : Map.Map<Principal, Profile>;
    posts : Map.Map<Nat, Post>;
    reels : Map.Map<Nat, Reel>;
    comments : Map.Map<Nat, Comment>;
    stories : Map.Map<Nat, Story>;
    postLikes : Map.Map<Nat, [Principal]>;
    reelLikes : Map.Map<Nat, [Principal]>;
    follows : Map.Map<Principal, [Principal]>;
    messages : Map.Map<Nat, Message>;
    notifications : Map.Map<Nat, Notification>;
  };

  public func run(old : OldActor) : NewActor {
    {
      nextPostId = old.nextPostId;
      nextCommentId = old.nextCommentId;
      nextStoryId = old.nextStoryId;
      nextMessageId = old.nextMessageId;
      nextNotificationId = old.nextNotificationId;
      nextReelId = 0;
      profiles = old.profiles;
      posts = old.posts;
      reels = Map.empty<Nat, Reel>();
      comments = old.comments;
      stories = old.stories;
      postLikes = old.likes;
      reelLikes = Map.empty<Nat, [Principal]>();
      follows = old.follows;
      messages = old.messages;
      notifications = old.notifications;
    };
  };
};
