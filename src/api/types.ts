/**
 * Hand-written types for endpoints the OpenAPI snapshot leaves untyped or
 * missing. The full set of generated types lives in `./schema.d.ts`
 * (regenerated via `npm run api:types` from `api/openapi.json`).
 *
 * Conventions (see docs/API.md §1):
 *   - UUID = string
 *   - Timestamp = string (ISO-8601, UTC)
 *   - All successful responses are `{ success: true, data: T }`
 *   - All error responses are `{ success: false, error: { code, message } }`
 */

export type UUID = string;
export type Timestamp = string;
export type Currency = string;

export type Role = 'student' | 'admin';

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorPayload;
}

/** Auth-lockout extensions (API §1) — appear on 401/429 envelopes. */
export interface ApiAuthLockout {
  attemptsRemaining?: number;
  lockedForSeconds?: number;
}

// ── Auth (API §2) ─────────────────────────────────────────────────────────────
export interface SupabaseUser {
  id: UUID;
  email?: string;
  created_at: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    name?: string;
    username?: string;
  };
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: 'bearer';
  user: SupabaseUser;
}

export interface SignupBody {
  email: string;
  password: string; // 8–200
  firstName: string; // 1–100
  lastName: string; // 1–100
  username: string; // 3–20, /^[a-z0-9_]+$/
  captchaToken?: string;
}

export interface SignupData {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
}

export interface ChangePasswordBody {
  password: string; // min 8
}

// ── Courses & curriculum (API §3) ─────────────────────────────────────────────
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type PricingType = 'free' | 'one_time' | 'subscription' | 'custom';
export type BillingPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AccessMode = 'free' | 'paid' | 'invite_only' | 'subscription';
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface PricingConfig {
  type: PricingType;
  currency: Currency;
  price: number; // whole units
  compareAtPrice?: number;
  hasDiscount?: boolean;
  billingPeriod?: BillingPeriod;
}

export interface AccessConfig {
  mode: AccessMode;
  inviteCode?: string;
  // API §3: when `pricingType === 'paid'`, `price` is the USD whole-unit price
  // the course is sold for outside of `pricingConfig` (e.g. invite-only
  // cohorts with their own price). Optional; many courses leave both unset.
  pricingType?: 'free' | 'paid';
  price?: number;
  maxCapacity?: number | null;
}

export interface CertificateConfig {
  templateId?: UUID;
  enabled: boolean;
  criteria?: {
    minProgressPercent?: number;
    requireAllLessons?: boolean;
  };
}

export interface Course {
  id: UUID;
  title: string;
  slug: string;
  description: string | null;
  about: string | null;
  thumbnail: string | null;
  learnings: string[] | null;
  tags: string[] | null;
  level: CourseLevel | null;
  pricingConfig: PricingConfig | null;
  accessConfig: AccessConfig | null;
  instructorId: UUID;
  status: CourseStatus;
  certificateConfig: CertificateConfig | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CourseListParams {
  search?: string;
  level?: CourseLevel;
  tag?: string;
  page?: number;
  pageSize?: number;
  excludeIds?: UUID[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Chapter {
  id: UUID;
  courseId: UUID;
  title: string;
  position: number;
  locked: boolean;
  lessons: Lesson[];
}

export interface Curriculum {
  course: Course;
  chapters: Chapter[];
}

export interface EnrollBody {
  inviteCode?: string;
}

// ── Lessons (API §4) ──────────────────────────────────────────────────────────
export type LessonType =
  'video' | 'text' | 'document' | 'embed' | 'resource' | 'quiz' | 'assignment' | 'live';

export interface LessonMetadata {
  videoUrl?: string;
  videoProvider?: 'youtube' | 'vimeo' | 'mp4' | 'hls';
  durationSeconds?: number;
  documentUrl?: string;
  embedHtml?: string;
  resourceUrl?: string;
  // dynamic_page blocks (parsed by lib/lesson.ts)
  blocks?: DynamicBlock[];
  [key: string]: unknown;
}

export interface Lesson {
  id: UUID;
  chapterId: UUID;
  courseId: UUID;
  title: string;
  type: LessonType;
  position: number;
  metadata: LessonMetadata | null;
  completed: boolean;
  videoPositionSeconds?: number;
  durationSeconds?: number;
}

export type DynamicBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; url: string; alt?: string; caption?: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'callout'; tone: 'info' | 'warning' | 'success' | 'danger'; text: string };

export interface LessonProgressBody {
  positionSeconds?: number;
  completed?: boolean;
}

// ── Enrollment & progress (API §5) ────────────────────────────────────────────
export interface Enrollment {
  id: UUID;
  userId: UUID;
  courseId: UUID;
  enrolledAt: Timestamp;
  source: 'free' | 'invite_code' | 'paid' | 'admin_grant';
  progressPercent: number;
  lastLessonId: UUID | null;
  lastActiveAt: Timestamp | null;
}

export interface LearningSummary {
  enrollmentsCount: number;
  lessonsCompletedCount: number;
  coursesCompletedCount: number;
  continueLearning: {
    enrollment: Enrollment;
    course: Course;
    nextLesson: Lesson | null;
  } | null;
  enrolledCourses: {
    enrollment: Enrollment;
    course: Course;
  }[];
}

// ── Notes & comments (API §6) ─────────────────────────────────────────────────
export interface Note {
  id: UUID;
  lessonId: UUID;
  userId: UUID;
  content: string;
  videoTimestampSeconds?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Comment {
  id: UUID;
  lessonId: UUID;
  userId: UUID;
  parentId: UUID | null;
  content: string;
  upvotes: number;
  upvoted: boolean;
  createdAt: Timestamp;
  replies?: Comment[];
}

// ── Quiz (API §7) ─────────────────────────────────────────────────────────────
export type QuizQuestionType = 'single' | 'multiple' | 'truefalse';

export interface QuizQuestion {
  id: UUID;
  type: QuizQuestionType;
  prompt: string;
  options: { id: string; text: string }[];
  points: number;
}

export interface Quiz {
  id: UUID;
  lessonId: UUID;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
}

export interface QuizSubmission {
  answers: Record<UUID, string[]>; // questionId → selected option ids
}

export interface QuizResult {
  score: number;
  passed: boolean;
  perQuestion: {
    questionId: UUID;
    correct: boolean;
    pointsEarned: number;
  }[];
}

// ── Assignment (API §8) ───────────────────────────────────────────────────────
export interface Assignment {
  id: UUID;
  lessonId: UUID;
  instructions: string;
  dueAt: Timestamp | null;
  maxScore: number;
  submission: AssignmentSubmission | null;
}

export interface AssignmentSubmission {
  id: UUID;
  fileUrl: string | null;
  text: string | null;
  submittedAt: Timestamp;
  gradedAt: Timestamp | null;
  score: number | null;
  feedback: string | null;
}

export interface AssignmentSubmitBody {
  text?: string;
  fileUrl?: string;
}

// ── Forum (API §9) ────────────────────────────────────────────────────────────
export type ForumCategory = 'general' | 'question' | 'showcase' | 'feedback';
export interface ForumPost {
  id: UUID;
  authorId: UUID;
  authorName: string;
  authorAvatar: string | null;
  category: ForumCategory;
  title: string;
  body: string;
  imageUrl: string | null;
  upvotes: number;
  upvoted: boolean;
  replyCount: number;
  pinned: boolean;
  solvedReplyId: UUID | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ForumReply {
  id: UUID;
  postId: UUID;
  authorId: UUID;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  upvotes: number;
  upvoted: boolean;
  isSolution: boolean;
  createdAt: Timestamp;
}

export interface CreatePostBody {
  category: ForumCategory;
  title: string;
  body: string;
  imageUrl?: string;
}

export interface CreateReplyBody {
  body: string;
}

// ── Support tickets (API §10) ──────────────────────────────────────────────────
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export interface Ticket {
  id: UUID;
  subject: string;
  status: TicketStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: UUID;
  ticketId: UUID;
  authorId: UUID;
  authorRole: Role;
  body: string;
  attachments: { url: string; name: string; mime: string }[];
  createdAt: Timestamp;
}

export interface CreateTicketBody {
  subject: string;
  body: string;
  attachments?: { url: string; name: string; mime: string }[];
}

export interface ReplyTicketBody {
  body: string;
  attachments?: { url: string; name: string; mime: string }[];
}

// ── AI tutor & summary (API §11) ─────────────────────────────────────────────
export interface TutorMessage {
  id: UUID;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Timestamp;
}

export interface TutorChat {
  id: UUID;
  title: string;
  messages: TutorMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Summary {
  lessonId: UUID;
  content: string;
  generatedAt: Timestamp;
}

// ── User (API §12) ────────────────────────────────────────────────────────────
export interface UserProfile {
  id: UUID;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  role: Role;
  createdAt: Timestamp;
}

export interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
}

// ── Certificate (API §14) ─────────────────────────────────────────────────────
export interface Certificate {
  id: UUID;
  code: string;
  userId: UUID;
  userName: string;
  courseId: UUID;
  courseTitle: string;
  issuedAt: Timestamp;
  certificateUrl: string | null;
}

export interface CertificateVerification {
  valid: boolean;
  certificate?: Certificate;
  reason?: 'NOT_FOUND' | 'REVOKED';
}
