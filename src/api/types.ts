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
export type AccessMode = 'free' | 'paid' | 'invite_only' | 'subscription' | 'closed';
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
  courseId: UUID;
  inviteCode?: string;
}

// ── Lessons (API §4) ──────────────────────────────────────────────────────────
export type LessonType =
  | 'video'
  | 'markdown'
  | 'dynamic_page'
  | 'document'
  | 'embed'
  | 'resource'
  | 'quiz'
  | 'assignment'
  | 'live_session';

// The web editor saves every `*Settings` block on every lesson; read only the
// one that matches the lesson's `type` (API §4). All keys can be missing.
export interface VideoSettings {
  sourceType?: 'link' | 'upload' | 'embed';
  posterImageUrl?: string;
  startTime?: string; // 'mm:ss'
  endTime?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  requireFullWatch?: boolean;
}

export interface MarkdownSettings {
  sourceType?: 'direct' | 'link';
  markdownUrl?: string;
}

export interface DocumentSettings {
  sourceType?: 'link' | 'upload';
  fileUrl?: string;
  allowDownload?: boolean;
}

export interface EmbedSettings {
  embedUrl?: string;
  height?: number;
}

export interface ResourceSettings {
  sourceType?: 'link' | 'upload';
  fileUrl?: string;
  buttonLabel?: string;
}

export interface AssignmentSettings {
  dueDate?: string | null; // may come without a timezone: treat as local time
  gradingType?: 'alphabetic' | 'numeric' | 'percentage' | 'pass_fail' | 'gpa';
  passingScore?: number;
  allowRetries?: boolean;
  maxAttempts?: number;
}

export interface LiveSettings {
  startsAt?: string | null;
  durationMinutes?: number;
  joinUrl?: string | null;
  recordingUrl?: string | null;
}

export interface LessonMetadata {
  // Common keys. `isPreview: true` means a non-enrolled viewer can open the
  // full lesson (S10 / S12). `isLocked: true` hides it until unlocked.
  status?: 'published' | 'draft';
  isLocked?: boolean;
  isPreview?: boolean;
  description?: string;
  videoSettings?: VideoSettings;
  markdownSettings?: MarkdownSettings;
  documentSettings?: DocumentSettings;
  embedSettings?: EmbedSettings;
  resourceSettings?: ResourceSettings;
  assignmentSettings?: AssignmentSettings;
  liveSettings?: LiveSettings;
  // Older fallbacks for document / resource / embed URLs.
  fileUrl?: string;
  embedUrl?: string;
  // dynamic_page only (parsed by lib/lesson.ts)
  blocks?: DynamicBlock[];
  lastConfiguredAt?: string;
  [key: string]: unknown;
}

export interface Lesson {
  id: UUID;
  chapterId: UUID;
  courseId: UUID;
  title: string;
  // Unknown types must render an "Open on the web" fallback, not crash.
  type: LessonType | (string & {});
  position: number;
  // `content` and `videoUrl` are null in outlines (not enrolled).
  content?: string | null;
  videoUrl?: string | null;
  metadata: LessonMetadata | null;
  // Mock seed only: real completion comes from `GET /progress/course/{id}`.
  completed: boolean;
  durationSeconds?: number | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type DynamicBlock = { id: string } & (
  | {
      type: 'hero';
      data: {
        badge?: string;
        heading?: string;
        subtitle?: string;
        readingTime?: string;
        learningGoals?: string[];
      };
    }
  | { type: 'typography'; data: { content: string } }
  | { type: 'code'; data: { language: string; title?: string; code: string; output?: string } }
  | {
      type: 'callout';
      data: {
        style: 'tip' | 'info' | 'warning' | 'danger' | 'success';
        title?: string;
        message: string;
      };
    }
  | { type: 'video'; data: { title?: string; videoUrl: string; caption?: string } }
  | {
      type: 'quiz';
      data: { question: string; options: string[]; correctIndex: number; explanation?: string };
    }
  | { type: 'tabs'; data: { tabs: { title: string; content: string }[] } }
  | { type: 'accordion'; data: { items: { title: string; content: string }[] } }
  | { type: 'stepper'; data: { steps: { title: string; description: string }[] } }
  | {
      type: 'resource';
      data: { title: string; description?: string; fileUrl: string; buttonLabel?: string };
    }
  | { type: 'embed'; data: { title?: string; embedUrl: string; height: string | number } }
  | { type: 'glossary'; data: { terms: { term: string; definition: string }[] } }
  | { type: 'image'; data: { imageUrl: string; caption?: string } }
  | { type: 'checklist'; data: { items: string[] } }
);

// ── Learning summary row (API §12) ────────────────────────────────────────────
/**
 * Per-course row in `GET /users/me/learning-summary`. Used by Home (S07) for
 * the my-courses carousel and My Learning (S09) for the in-progress /
 * completed segments. The screen never reads lesson-level progress: the API
 * pre-aggregates it.
 */
export interface MyLearningRow {
  id: UUID; // course id
  title: string;
  thumbnail: string | null;
  totalLessons: number;
  completedLessons: number;
  percent: number; // 0..100
  isCompleted: boolean;
  enrolledAt: Timestamp;
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

export interface CommentAuthor {
  id: UUID;
  name: string;
  avatarUrl: string | null;
  role: 'student' | 'admin' | 'instructor' | string;
}

export interface Comment {
  id: UUID;
  lessonId: UUID;
  courseId?: UUID;
  chapterId?: UUID | null;
  userId: UUID;
  parentId: UUID | null;
  content: string;
  timestampSeconds?: number | null;
  upvotes: number;
  upvotesCount?: number;
  upvoted: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  author?: CommentAuthor;
  replies?: Comment[];
}

export interface CreateCommentBody {
  courseId: UUID;
  chapterId?: UUID | null;
  content: string;
  parentId?: UUID | null;
  timestampSeconds?: number | null;
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

// ── Learn: progress, notes, quizzes, assignments, AI (S12–S17) ────────────────
// These follow API.md §4, §6–§8, §13 and §16 exactly. The older `Note`, `Quiz`,
// `QuizSubmission`, `Assignment`, `AssignmentSubmission`, `Summary` and
// `TutorChat` shapes above predate API.md; the lesson screens don't use them.

/** One row of `GET /progress/course/{courseId}`. No row means not started. */
export interface LessonProgressRow {
  id: UUID;
  userId: UUID;
  lessonId: UUID;
  lastPositionSeconds: number;
  maxWatchedSeconds: number;
  isCompleted: boolean;
  completedAt: Timestamp | null;
  updatedAt: Timestamp;
}

export interface ProgressPatchBody {
  lessonId: UUID;
  courseId: UUID;
  completed?: boolean; // default true
}

export interface HeartbeatBody {
  lessonId: UUID;
  courseId: UUID;
  positionSeconds: number; // int ≥ 0
  durationSeconds?: number; // int ≥ 0
}

export interface HeartbeatResult {
  isCompleted: boolean;
  lastPositionSeconds: number;
}

export interface LessonNote {
  id: UUID;
  userId: UUID;
  lessonId: UUID;
  courseId: UUID;
  timestampSeconds: number | null;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateNoteBody {
  lessonId: UUID;
  courseId: UUID;
  timestampSeconds?: number | null;
  content: string;
}

export type QuizQuestionKind = 'single' | 'multiple' | 'boolean';

export interface QuizQuestionItem {
  id: string;
  prompt: string;
  type: QuizQuestionKind;
  points: number;
  options: { id: string; text: string }[];
}

export interface QuizInfo {
  id: UUID;
  lessonId: UUID;
  title: string;
  description: string | null;
  passingScorePercent: number;
  maxAttempts: number; // 0 = unlimited
  shuffleQuestions: boolean;
  questions: QuizQuestionItem[];
}

export interface QuizAttempt {
  id: UUID;
  quizId: UUID;
  lessonId: UUID;
  scorePercent: number;
  passed: boolean;
  userAnswers: Record<string, string[]>;
  submittedAt: Timestamp;
}

/** `GET /quizzes/lesson/{lessonId}?courseId=` */
export interface LessonQuiz {
  quiz: QuizInfo | null;
  submissions: QuizAttempt[]; // newest first
  latestSubmission: QuizAttempt | null;
}

export interface QuizSubmitBody {
  courseId: UUID;
  userAnswers: Record<string, string[]>; // single / boolean: one-element array
}

export interface QuizFeedbackItem {
  questionId: string;
  prompt: string;
  isCorrect: boolean;
  explanation?: string;
  correctOptionIds: string[];
}

export interface QuizSubmitResult {
  submission: QuizAttempt;
  passed: boolean;
  scorePercent: number;
  totalQuestions: number;
  correctCount: number;
  feedback: QuizFeedbackItem[];
}

export interface LessonAssignmentSubmission {
  id: UUID;
  lessonId: UUID;
  courseId: UUID;
  studentId: UUID;
  contentText: string;
  attachmentUrl: string | null;
  attachmentPublicId: string | null;
  attachmentName: string | null;
  status: 'submitted' | 'graded';
  scorePercent: number | null;
  feedback: string | null;
  gradedAt: Timestamp | null;
  submittedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssignmentSubmitPayload {
  contentText?: string; // ≤ 20000
  attachmentUrl?: string | null;
  attachmentPublicId?: string;
  attachmentName?: string;
}

/** `POST /media/upload` (API §16). */
export interface UploadedMedia {
  url: string;
  publicId: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

/** `GET /ai/summary/{lessonId}`. A failed generation has an `unavailable-` id. */
export interface AiSummary {
  id: string;
  lessonId: UUID;
  executiveSummary: string;
  keyTakeaways: string[];
  concepts: { term: string; definition: string; timestampSeconds?: number }[];
  flashcards: { id: string; front: string; back: string; hint?: string }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AiMessage {
  id: UUID;
  conversationId: UUID;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Timestamp;
}

/** `GET /ai/history?limit=50`; messages are chronological. */
export interface AiHistory {
  conversation: { id: UUID; title: string; createdAt: Timestamp; updatedAt: Timestamp } | null;
  messages: AiMessage[];
}

export interface AiHistoryMessageBody {
  role: 'user' | 'assistant';
  content: string; // 1–20000
  title?: string;
}

/** `POST /ai/tutor-stream` body (not in openapi.json). */
export interface TutorStreamBody {
  courseId?: string | null;
  lessonId?: string | null;
  message: string; // 1–5000
  context?: {
    courseTitle?: string;
    lessonTitle?: string;
    lessonContent?: string | null; // ≤ 20000
    userNotes?: string[]; // ≤ 50
    chatHistory?: { role: 'user' | 'assistant'; content: string }[]; // ≤ 20
  };
}
