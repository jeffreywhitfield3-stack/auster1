// src/types/models.ts
// TypeScript types for the Models System

// ============================================================================
// CORE MODEL TYPES
// ============================================================================

export type LabScope = 'econ' | 'derivatives' | 'both';
export type ModelVisibility = 'private' | 'unlisted' | 'public';
export type ModelDifficulty = 'basic' | 'intermediate' | 'advanced';
export type ModelRuntime = 'dsl' | 'python' | 'js';
export type RunStatus = 'success' | 'error';
export type ArtifactType = 'model_run' | 'research_object';

export interface Model {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string;
  lab_scope: LabScope;
  visibility: ModelVisibility;
  tags: string[];
  difficulty: ModelDifficulty;
  is_template: boolean;

  // Stats (denormalized)
  total_runs: number;
  unique_users: number;
  avg_rating: number | null;
  total_ratings: number;

  created_at: string;
  updated_at: string;

  // Joined data (not in DB)
  owner?: {
    email: string;
    display_name?: string;
  };
  latest_version?: ModelVersion;
  versions?: ModelVersion[];
  is_saved?: boolean;
  user_rating?: number;
}

export interface ModelVersion {
  id: string;
  model_id: string;
  version: number;
  runtime: ModelRuntime;

  // DSL (Phase 1)
  dsl_json: DslModel | null;

  // Code (Phase 3)
  code_bundle: string | null;
  dependencies: string[] | null;

  // Schemas
  input_schema: InputSchema;
  output_schema: OutputSchema;

  // Metadata
  changelog: string | null;
  is_active: boolean;

  created_at: string;
}

export interface ModelRun {
  id: string;
  user_id: string;
  model_version_id: string;
  inputs_json: Record<string, any>;
  outputs_json: ModelOutput | null;
  runtime_ms: number | null;
  status: RunStatus;
  error_message: string | null;
  ip_hash: string | null;
  created_at: string;

  // Joined
  model_version?: ModelVersion;
  model?: Model;
}

export interface ModelUsageDaily {
  id: string;
  model_id: string;
  date: string;
  runs: number;
  unique_users: number;
}

export interface ModelSave {
  id: string;
  user_id: string;
  model_id: string;
  created_at: string;
}

export interface ModelRating {
  id: string;
  user_id: string;
  model_id: string;
  rating: number; // 1-5
  review: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishedArtifact {
  id: string;
  owner_id: string;
  slug: string;
  type: ArtifactType;
  model_run_id: string | null;
  title: string;
  summary: string | null;
  visibility: 'unlisted' | 'public';
  views: number;
  created_at: string;

  // Joined
  model_run?: ModelRun;
  owner?: {
    email: string;
    display_name?: string;
  };
}

// ============================================================================
// DSL TYPES (Phase 1)
// ============================================================================

export interface DslModel {
  version: '1.0';
  steps: DslStep[];
  outputs: DslOutputDefinition;
}

export interface DslStep {
  id: string;
  operation: string;
  params: Record<string, any>;
  inputs?: string[]; // Step IDs this step depends on
}

export interface DslOutputDefinition {
  scalars?: Array<{ id: string; source: string; label: string }>;
  series?: OutputSeriesDefinition[];
  tables?: OutputTableDefinition[];
}

export interface OutputSeriesDefinition {
  id: string;
  source: string; // Step ID
  label: string;
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

export interface OutputTableDefinition {
  id: string;
  source: string; // Step ID
  label: string;
  columns: string[];
}

// ============================================================================
// SCHEMAS
// ============================================================================

export interface InputSchema {
  fields: InputField[];
}

export interface InputField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'multi-select';
  label: string;
  description?: string;
  required: boolean;
  default?: any;
  options?: Array<string | { value: string; label: string }>; // For select/multi-select
  min?: number; // For number
  max?: number;
  placeholder?: string;
  pattern?: string; // For string validation
}

export interface OutputSchema {
  series?: OutputSeriesSchema[];
  tables?: OutputTableSchema[];
}

export interface OutputSeriesSchema {
  id: string;
  label: string;
  description?: string;
}

export interface OutputTableSchema {
  id: string;
  label: string;
  columns: OutputColumn[];
}

export interface OutputColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string; // e.g., 'currency', 'percentage', 'date'
}

// ============================================================================
// EXECUTION TYPES
// ============================================================================

export interface ModelOutput {
  scalars?: Record<string, number | string>;
  series?: OutputSeries[];
  tables?: OutputTable[];
  metadata?: {
    computed_at: string;
    data_sources: string[];
    warnings?: string[];
  };
}

export interface OutputSeries {
  id: string;
  label: string;
  data: SeriesDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

export interface SeriesDataPoint {
  x: string | number; // Date string or numeric x value
  y: number;
  label?: string;
}

export interface OutputTable {
  id: string;
  label: string;
  columns: OutputColumn[];
  rows: Record<string, any>[];
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ListModelsParams {
  query?: string;
  lab_scope?: LabScope | 'all';
  tags?: string[];
  difficulty?: ModelDifficulty;
  runtime?: ModelRuntime;
  sort?: 'most_used' | 'trending' | 'newest' | 'top_rated';
  limit?: number;
  offset?: number;
}

export interface ListModelsResponse {
  models: Model[];
  total: number;
  has_more: boolean;
}

export interface RunModelRequest {
  model_id: string;
  version?: number; // Defaults to latest
  inputs: Record<string, any>;
}

export interface RunModelResponse {
  run_id: string;
  outputs: ModelOutput;
  runtime_ms: number;
  cached: boolean;
}

export interface PublishArtifactRequest {
  model_run_id: string;
  title: string;
  summary?: string;
  visibility: 'unlisted' | 'public';
}

export interface PublishArtifactResponse {
  artifact: PublishedArtifact;
  url: string;
}

export interface ForkModelRequest {
  model_id: string;
  name?: string;
  description?: string;
}

export interface ForkModelResponse {
  model: Model;
}

export interface SaveModelRequest {
  model_id: string;
}

export interface RateModelRequest {
  model_id: string;
  rating: number; // 1-5
  review?: string;
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface ModelFilters {
  query: string;
  lab_scope: LabScope | 'all';
  tags: string[];
  difficulty: ModelDifficulty | 'all';
  runtime: ModelRuntime | 'all';
  sort: 'most_used' | 'trending' | 'newest' | 'top_rated';
}

export interface RunPanelState {
  inputs: Record<string, any>;
  validationErrors: Record<string, string>;
  isRunning: boolean;
}

export interface ResultsPanelState {
  outputs: ModelOutput | null;
  isPublishing: boolean;
  publishSuccess: boolean;
}

// ============================================================================
// DATA GATEWAY TYPES
// ============================================================================

export interface MarketDataRequest {
  symbol: string;
  start_date?: string;
  end_date?: string;
  interval?: 'day' | 'week' | 'month';
}

export interface MarketDataResponse {
  symbol: string;
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface MacroSeriesRequest {
  series_id: string; // FRED series ID
  start_date?: string;
  end_date?: string;
}

export interface MacroSeriesResponse {
  series_id: string;
  name: string;
  data: Array<{
    date: string;
    value: number;
  }>;
}

export interface OptionsChainRequest {
  symbol: string;
  expiration: string;
}

export interface OptionsChainResponse {
  symbol: string;
  expiration: string;
  underlying: number;
  calls: OptionContract[];
  puts: OptionContract[];
}

export interface OptionContract {
  strike: number;
  bid: number | null;
  ask: number | null;
  volume: number | null;
  open_interest: number | null;
  implied_volatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
}

// ============================================================================
// DSL PRIMITIVE TYPES
// ============================================================================

export interface DslContext {
  variables: Map<string, any>;
  cache: Map<string, any>;
}

export interface DslPrimitive {
  name: string;
  execute: (params: any, inputs: any[], context: DslContext) => Promise<any>;
  validate: (params: any) => string[]; // Returns error messages
}

// ============================================================================
// PHASE 2 TYPES (Builder)
// ============================================================================

export interface ModelBuilderState {
  steps: DslStep[];
  outputs: DslOutputDefinition;
  validation: {
    errors: string[];
    warnings: string[];
  };
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface BuilderNode {
  id: string;
  step: DslStep;
  position: NodePosition;
  connections: string[]; // IDs of nodes this connects to
}

// ============================================================================
// PHASE 3 TYPES (Code Sandbox)
// ============================================================================

export interface CodeModel {
  language: 'python' | 'js';
  entrypoint: string;
  code: string;
  dependencies: string[];
}

export interface SandboxLimits {
  max_runtime_ms: number;
  max_memory_mb: number;
  max_output_kb: number;
}

export interface SandboxResult {
  status: 'success' | 'error' | 'timeout';
  outputs?: ModelOutput;
  error?: string;
  logs?: string[];
  runtime_ms: number;
  memory_used_mb: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MODEL_DIFFICULTIES: Record<ModelDifficulty, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const LAB_SCOPES: Record<LabScope | 'both', string> = {
  econ: 'Economics',
  derivatives: 'Derivatives',
  both: 'Both Labs',
};

export const SORT_OPTIONS = [
  { value: 'most_used', label: 'Most Used' },
  { value: 'trending', label: 'Trending (7d)' },
  { value: 'newest', label: 'Newest' },
  { value: 'top_rated', label: 'Top Rated' },
] as const;

export const DEFAULT_LIMITS = {
  LIST_PAGE_SIZE: 24,
  MAX_RUNS_PER_DAY_FREE: 10,
  MAX_RUNS_PER_DAY_PAID: 100,
  MAX_RUNS_PER_MINUTE: 3,
  DSL_MAX_RUNTIME_MS: 30000,
  CODE_MAX_RUNTIME_MS: 60000,
  MAX_OUTPUT_SIZE_KB: 1024,
};
