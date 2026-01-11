// src/types/research.ts
// TypeScript types for the Research Stage

// ============================================================================
// RESEARCHER PROFILES
// ============================================================================

export type ResearcherTier = 'observer' | 'contributor' | 'researcher' | 'institution';

export interface ResearcherProfile {
  id: string;
  user_id: string;

  // Identity
  display_name: string;
  slug: string;
  bio?: string;
  credentials?: string;
  institution?: string;
  location?: string;
  website_url?: string;
  avatar_url?: string;

  // Tier & Standing
  tier: ResearcherTier;
  attribution_score: number;
  credibility_score: number;

  // Counts
  published_objects_count: number;
  discussions_count: number;
  citations_received_count: number;

  // Settings
  public_profile: boolean;
  allow_collaboration: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// RESEARCH OBJECTS
// ============================================================================

export type ResearchObjectType =
  | 'economic_research'
  | 'econometric_analysis'
  | 'market_analysis'
  | 'data_exploration'
  | 'methodology'
  | 'replication';

export type ResearchObjectStatus = 'draft' | 'published' | 'archived';

export type LabType = 'econ' | 'derivatives' | 'none';

export interface ResearchObjectContent {
  sections: ResearchSection[];
  findings: string[];
  visualizations?: Visualization[];
}

export interface ResearchSection {
  type: 'text' | 'chart' | 'table' | 'code' | 'image';
  content?: string;
  config?: Record<string, unknown>;
  data?: unknown[];
  caption?: string;
}

export interface Visualization {
  id: string;
  type: 'line' | 'bar' | 'scatter' | 'heatmap' | 'distribution';
  title: string;
  data: unknown;
  config: Record<string, unknown>;
}

export interface ResearchObject {
  id: string;
  author_id: string;

  // Core Content
  title: string;
  slug: string;
  abstract: string;
  object_type: ResearchObjectType;
  content: ResearchObjectContent;

  // Methods & Reproducibility
  methods: string;
  assumptions: string;
  data_sources: string[];
  statistical_techniques: string[];

  // Lab Connection
  lab_type: LabType;
  lab_workspace_id?: string;
  lab_state?: Record<string, unknown>;

  // Metadata
  tags: string[];
  topics: string[];

  // Status
  status: ResearchObjectStatus;
  published_at?: string;
  version: number;

  // Engagement Metrics
  views_count: number;
  discussions_count: number;
  citations_count: number;
  extensions_count: number;
  replications_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined data (not in DB)
  author?: ResearcherProfile;
}

// ============================================================================
// DISCUSSIONS
// ============================================================================

export type DiscussionType =
  | 'methodology'
  | 'evidence'
  | 'reasoning'
  | 'implication'
  | 'extension'
  | 'replication'
  | 'critique';

export type DiscussionStatus = 'active' | 'resolved' | 'archived';

export interface Discussion {
  id: string;
  research_object_id: string;
  author_id: string;

  // Threading
  parent_id?: string;
  thread_depth: number;

  // Content
  content: string;
  discussion_type: DiscussionType;

  // Quality Signals
  quality_score: number;
  endorsed_by_author: boolean;

  // Status
  status: DiscussionStatus;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined data (not in DB)
  author?: ResearcherProfile;
  replies?: Discussion[];
}

// ============================================================================
// REFERRALS & ATTRIBUTION
// ============================================================================

export type ReferralSourceType = 'research_object' | 'profile' | 'collection';

export type AttributionType =
  | 'direct_share'
  | 'discussion'
  | 'extension'
  | 'citation'
  | 'replication';

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;

  // Source
  source_type: ReferralSourceType;
  source_object_id?: string;

  // Referral Mechanism
  referral_code: string;
  referral_url: string;

  // Attribution
  attribution_points: number;
  attribution_type: AttributionType;

  // Conversion
  converted: boolean;
  converted_at?: string;

  // Timestamps
  created_at: string;
}

// ============================================================================
// CITATIONS
// ============================================================================

export type CitationType =
  | 'builds_on'
  | 'replicates'
  | 'challenges'
  | 'uses_method'
  | 'references';

export interface Citation {
  id: string;
  citing_object_id: string;
  cited_object_id: string;

  // Context
  citation_context?: string;
  citation_type: CitationType;

  // Timestamps
  created_at: string;

  // Joined data (not in DB)
  citing_object?: ResearchObject;
  cited_object?: ResearchObject;
}

// ============================================================================
// COLLECTIONS & TOPICS
// ============================================================================

export type CollectionType = 'topic' | 'method' | 'institution' | 'series';

export interface Collection {
  id: string;
  curator_id: string;

  // Collection Info
  title: string;
  slug: string;
  description: string;
  collection_type: CollectionType;

  // Visibility
  public: boolean;

  // Counts
  objects_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined data (not in DB)
  curator?: ResearcherProfile;
  objects?: ResearchObject[];
}

export interface CollectionMembership {
  id: string;
  collection_id: string;
  research_object_id: string;
  position: number;
  added_at: string;
}

// ============================================================================
// RESEARCHER ACTIVITY
// ============================================================================

export type ResearcherActivityType =
  | 'published_object'
  | 'created_discussion'
  | 'received_citation'
  | 'extended_research'
  | 'replicated_study'
  | 'received_endorsement'
  | 'created_collection';

export interface ResearcherActivity {
  id: string;
  researcher_id: string;
  activity_type: ResearcherActivityType;
  related_object_id?: string;
  attribution_points: number;
  credibility_points: number;
  created_at: string;
}

// ============================================================================
// UI TYPES
// ============================================================================

// Publishing flow state
export interface PublishingDraft {
  title: string;
  abstract: string;
  object_type: ResearchObjectType;
  methods: string;
  assumptions: string;
  data_sources: string[];
  statistical_techniques: string[];
  content: ResearchObjectContent;
  tags: string[];
  topics: string[];
  lab_type: LabType;
  lab_workspace_id?: string;
}

// Discussion form state
export interface DiscussionDraft {
  content: string;
  discussion_type: DiscussionType;
  parent_id?: string;
}

// Filter options for discovery
export interface ResearchFilters {
  object_type?: ResearchObjectType[];
  topics?: string[];
  tags?: string[];
  statistical_techniques?: string[];
  date_range?: {
    start: string;
    end: string;
  };
}

// Sort options for discovery
export type ResearchSortBy =
  | 'recent'
  | 'most_discussed'
  | 'most_cited'
  | 'most_viewed';

// Tier progression requirements
export interface TierRequirements {
  tier: ResearcherTier;
  label: string;
  description: string;
  requirements: {
    published_objects?: number;
    discussions?: number;
    attributions?: number;
  };
  unlocks: string[];
}

export const TIER_REQUIREMENTS: TierRequirements[] = [
  {
    tier: 'observer',
    label: 'Observer',
    description: 'Default tier for all users',
    requirements: {},
    unlocks: [
      'Read all public research',
      'Comment on published work',
      '1 private workspace'
    ]
  },
  {
    tier: 'contributor',
    label: 'Contributor',
    description: 'Earned through contribution',
    requirements: {
      published_objects: 2,
      discussions: 5
    },
    unlocks: [
      'Publish research objects',
      '3 private workspaces',
      'Public profile',
      'Referral link'
    ]
  },
  {
    tier: 'researcher',
    label: 'Researcher',
    description: 'Established research presence',
    requirements: {
      published_objects: 5,
      attributions: 10
    },
    unlocks: [
      'Unlimited workspaces',
      'Featured placement',
      'Early lab access',
      'Custom URL',
      'Collaboration tools'
    ]
  },
  {
    tier: 'institution',
    label: 'Institution',
    description: 'Institutional-level contribution',
    requirements: {
      published_objects: 25,
      attributions: 100
    },
    unlocks: [
      'Institution page',
      'Team workspaces',
      'Priority support',
      'API access',
      'White-label options'
    ]
  }
];

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ResearchObjectWithAuthor extends ResearchObject {
  author: ResearcherProfile;
}

export interface DiscussionWithAuthor extends Discussion {
  author: ResearcherProfile;
  replies: DiscussionWithAuthor[];
}

export interface CollectionWithObjects extends Collection {
  curator: ResearcherProfile;
  objects: ResearchObjectWithAuthor[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const RESEARCH_OBJECT_TYPES: Record<ResearchObjectType, string> = {
  economic_research: 'Economic Research',
  econometric_analysis: 'Econometric Analysis',
  market_analysis: 'Market Analysis',
  data_exploration: 'Data Exploration',
  methodology: 'Methodology',
  replication: 'Replication Study'
};

export const DISCUSSION_TYPES: Record<DiscussionType, { label: string; description: string }> = {
  methodology: {
    label: 'Methodology',
    description: 'Questions about methods and approach'
  },
  evidence: {
    label: 'Evidence',
    description: 'Questions about data and sources'
  },
  reasoning: {
    label: 'Reasoning',
    description: 'Questions about interpretation'
  },
  implication: {
    label: 'Implications',
    description: 'Questions about conclusions'
  },
  extension: {
    label: 'Extension',
    description: 'Proposals to extend the work'
  },
  replication: {
    label: 'Replication',
    description: 'Replication attempts and results'
  },
  critique: {
    label: 'Critique',
    description: 'Evidence-based challenges'
  }
};

export const COLLECTION_TYPES: Record<CollectionType, string> = {
  topic: 'Topic Collection',
  method: 'Methodology Collection',
  institution: 'Institutional Research',
  series: 'Research Series'
};
