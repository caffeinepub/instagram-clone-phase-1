import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

module {
  type OldProfile = {
    owner : Principal;
    username : Text;
    bio : Text;
    avatarBlobKey : Text;
    createdAt : Int;
  };

  type OldPost = {
    id : Nat;
    author : Principal;
    imageBlobKey : Text;
    caption : Text;
    createdAt : Int;
  };

  type OldReel = {
    id : Nat;
    author : Principal;
    videoBlobKey : Text;
    caption : Text;
    audioLabel : Text;
    createdAt : Int;
  };

  type OldComment = {
    id : Nat;
    postId : Nat;
    author : Principal;
    text : Text;
    createdAt : Int;
  };

  type OldStory = {
    id : Nat;
    author : Principal;
    imageBlobKey : Text;
    createdAt : Int;
  };

  type OldPostView = {
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

  type OldReelView = {
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

  type OldMessage = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : Text;
    timestamp : Int;
  };

  type OldNotification = {
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

  type OldConversationPreview = {
    user : Principal;
    lastMessage : ?OldMessage;
  };

  type OldMessageWithTime = {
    message : OldMessage;
    timestamp : Int;
  };

  type OldActor = {
    nextPostId : Nat;
    nextCommentId : Nat;
    nextStoryId : Nat;
    nextMessageId : Nat;
    nextNotificationId : Nat;
    nextReelId : Nat;
    profiles : Map.Map<Principal, OldProfile>;
    posts : Map.Map<Nat, OldPost>;
    reels : Map.Map<Nat, OldReel>;
    comments : Map.Map<Nat, OldComment>;
    stories : Map.Map<Nat, OldStory>;
    postLikes : Map.Map<Nat, [Principal]>;
    reelLikes : Map.Map<Nat, [Principal]>;
    follows : Map.Map<Principal, [Principal]>;
    messages : Map.Map<Nat, OldMessage>;
    notifications : Map.Map<Nat, OldNotification>;
    accessControlState : AccessControl.AccessControlState;
  };

  // New types (unchanged)

  type NewProfile = {
    owner : Principal;
    username : Text;
    bio : Text;
    avatarBlobKey : Text;
    website : Text;
    location : Text;
    createdAt : Int;
  };

  type NewPost = {
    id : Nat;
    author : Principal;
    imageBlobKey : Text;
    caption : Text;
    createdAt : Int;
  };

  type NewReel = {
    id : Nat;
    author : Principal;
    videoBlobKey : Text;
    caption : Text;
    audioLabel : Text;
    createdAt : Int;
  };

  type NewComment = {
    id : Nat;
    postId : Nat;
    author : Principal;
    text : Text;
    createdAt : Int;
  };

  type StoryReaction = {
    viewer : Principal;
    emoji : Text;
  };

  type StorySticker = {
    #poll : PollSticker;
    #question : QuestionSticker;
  };

  type PollSticker = {
    question : Text;
    optionA : Text;
    optionB : Text;
    votesA : [Principal];
    votesB : [Principal];
  };

  type QuestionSticker = {
    question : Text;
    answers : [{ viewer : Principal; answer : Text }];
  };

  type NewStory = {
    id : Nat;
    author : Principal;
    imageBlobKey : Text;
    videoBlobKey : Text;
    viewerList : [Principal];
    reactions : [StoryReaction];
    sticker : ?StorySticker;
    createdAt : Int;
  };

  type NewPostView = {
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

  type Highlight = {
    id : Nat;
    owner : Principal;
    title : Text;
    coverBlobKey : Text;
    storyIds : [Nat];
    createdAt : Int;
  };

  type NewReelView = {
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

  type NewMessage = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : Text;
    timestamp : Int;
  };

  type NewNotification = {
    id : Nat;
    notificationType : NotificationType;
    from : Principal;
    to : Principal;
    postId : ?Nat;
    text : ?Text;
    timestamp : Int;
    read : Bool;
  };

  type NewConversationPreview = {
    user : Principal;
    lastMessage : ?NewMessage;
  };

  type NewMessageWithTime = {
    message : NewMessage;
    timestamp : Int;
  };

  type NewActor = {
    nextPostId : Nat;
    nextCommentId : Nat;
    nextStoryId : Nat;
    nextMessageId : Nat;
    nextNotificationId : Nat;
    nextReelId : Nat;
    nextHighlightId : Nat;
    profiles : Map.Map<Principal, NewProfile>;
    posts : Map.Map<Nat, NewPost>;
    reels : Map.Map<Nat, NewReel>;
    comments : Map.Map<Nat, NewComment>;
    stories : Map.Map<Nat, NewStory>;
    postLikes : Map.Map<Nat, [Principal]>;
    reelLikes : Map.Map<Nat, [Principal]>;
    follows : Map.Map<Principal, [Principal]>;
    messages : Map.Map<Nat, NewMessage>;
    notifications : Map.Map<Nat, NewNotification>;
    highlights : Map.Map<Nat, Highlight>;
    accessControlState : AccessControl.AccessControlState;
  };

  public func run(old : OldActor) : NewActor {
    let newProfiles = old.profiles.map<Principal, OldProfile, NewProfile>(
      func(_p, p) {
        {
          p with
          website = "";
          location = "";
        };
      }
    );

    let newStories = old.stories.map<Nat, OldStory, NewStory>(
      func(_id, s) {
        {
          id = s.id;
          author = s.author;
          imageBlobKey = s.imageBlobKey;
          videoBlobKey = "";
          viewerList = [];
          reactions = [];
          sticker = null;
          createdAt = s.createdAt;
        };
      }
    );

    {
      old with
      nextHighlightId = 0;
      profiles = newProfiles;
      stories = newStories;
      highlights = Map.empty<Nat, Highlight>();
    };
  };
};
