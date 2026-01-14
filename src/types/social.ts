// Types for social features: profiles, comments, follows, notifications

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  twitter_handle: string | null;
  linkedin_url: string | null;
  github_handle: string | null;
  location: string | null;
  is_public: boolean;
  show_activity: boolean;
  created_at: string;
  updated_at: string;

  // Computed fields (from queries)
  follower_count?: number;
  following_count?: number;
  is_following?: boolean;
  model_count?: number;
  research_count?: number;
}

export interface ModelComment {
  id: string;
  model_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  edited_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined data
  user?: UserProfile;
  like_count?: number;
  user_has_liked?: boolean;
  replies?: ModelComment[];
}

export interface CommentLike {
  user_id: string;
  comment_id: string;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;

  // Joined data
  follower?: UserProfile;
  following?: UserProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'model_comment'
  | 'comment_reply'
  | 'comment_like'
  | 'new_follower'
  | 'follower_published_model'
  | 'research_comment'
  | 'research_cited'
  | 'system';

// API Response types
export interface UserProfileResponse {
  profile: UserProfile;
  models?: any[];
  research?: any[];
}

export interface CommentsResponse {
  comments: ModelComment[];
  total: number;
}

export interface FollowersResponse {
  followers: UserProfile[];
  total: number;
}

export interface FollowingResponse {
  following: UserProfile[];
  total: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

// Form types for updates
export interface UpdateProfileInput {
  display_name?: string;
  bio?: string | null;
  avatar_url?: string | null;
  website_url?: string | null;
  twitter_handle?: string | null;
  linkedin_url?: string | null;
  github_handle?: string | null;
  location?: string | null;
  is_public?: boolean;
  show_activity?: boolean;
}

export interface CreateCommentInput {
  content: string;
  parent_comment_id?: string | null;
}

export interface UpdateCommentInput {
  content: string;
}
