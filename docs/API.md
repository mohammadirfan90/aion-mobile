# API reference (mobile view)

Written for this app's developers, who can't see the backend code. It covers what the mobile app uses, with the
exact `data` shapes. Generated types come from `api/openapi.json` (`npm run api:types`). Where the spec leaves a
response untyped, use the types here and put them in `src/api/types.ts`.

If the real API disagrees with this file, trust the API, fix this file, and note it in your log. If an endpoint is
missing, add a `B-05x` row to the tracker.

Conventions: `UUID = string`, `Timestamp = string` (ISO-8601, UTC). Base path is `/api/v1` unless stated.

---

## 1. Conventions

**Envelope**

```ts
type Ok<T> = { success: true; data: T };
type Err   = { success: false; error: { code: string; message: string } };
```

**HTTP status ↔ meaning:** 400 validation · 401 not signed in · 403 not allowed · 404 not found · 409 conflict ·
429 rate-limited · 500 server error.

**Common error codes:** `VALIDATION_ERROR` (the message is a "field: reason; …" summary), `UNAUTHENTICATED`,
`FORBIDDEN`, `INSUFFICIENT_PERMISSIONS`, `NOT_FOUND`, `DEMO_MODE_READ_ONLY`, `INTERNAL_ERROR`. Endpoint-specific
codes are listed in each section.

**Things the client must handle:**
- Per-IP rate limits reply `429` with the normal envelope and code `RATE_LIMITED`. Older servers sent plain text,
  so `unwrap()` must still treat any 429 as `RATE_LIMITED`, even when the body isn't JSON.
- Auth lockouts reply with the JSON envelope plus extra top-level fields: `lockedForSeconds` (also sent as a
  `Retry-After` header) or `attemptsRemaining`.
- Rough limits: login 10 per 15 min, signup 5/h, password reset 3/h, password change 5/h, AI tutor 60/h, AI summary
  20/h, uploads 40/h.

**Auth header:** `Authorization: Bearer <supabase access_token>` on every protected call. The user's role isn't in
the token; read it from `GET /users/me`.

---

## 2. Auth

Per D-03: **login, refresh and logout use supabase-js**; **signup uses the API**.

### POST /auth/signup (public)
**Always send the header `X-Aion-Client: mobile`.** The server uses it to let the app sign up without the web's
reCAPTCHA (backend B-01).
```ts
body: { email: string; password: string /*8–200*/; firstName: string /*1–100*/; lastName: string /*1–100*/;
        username: string /*3–20, /^[a-z0-9_]+$/*/; captchaToken?: string }
data: { user: SupabaseUser | null; session: SupabaseSession | null }
```
- `session` is `null` when email confirmation is required (the normal case). Go to S04.
- Errors: `USERNAME_TAKEN` (409, case-insensitive), `SIGNUP_FAILED` (400, plus `attemptsRemaining`),
  `RATE_LIMITED` (429, plus `lockedForSeconds`), `RECAPTCHA_REQUIRED` / `RECAPTCHA_FAILED` (until B-01 is done),
  `PROFILE_CREATION_FAILED` (500).
- Don't send `bio` here; it isn't saved to the profile. Set it later with `PATCH /users/me`.

### Username availability (no REST endpoint)
Call the Supabase RPC with the anon key:
`supabase.rpc('check_username_available', { p_username })` returns `boolean` (`true` = available). Use it for a
live check on S03, debounced by 400 ms.

### Login, session, refresh, logout
- Login: `supabase.auth.signInWithPassword({ email, password })`. A bad password gives a Supabase
  `invalid_credentials` error.
- Refresh: supabase-js does it automatically (no API endpoint exists).
- Logout: `supabase.auth.signOut()`. Don't call the API's `/auth/logout`; it only clears web cookies.

### Email codes (D-05; needs B-02)
- Verify signup: `supabase.auth.verifyOtp({ email, token, type: 'email' })` (`'signup'` is the older,
  deprecated name for the same type; check the supabase-js docs for the installed version); resend with
  `supabase.auth.resend({ type: 'signup', email })`.
- Reset: `supabase.auth.resetPasswordForEmail(email)` → `verifyOtp({ email, token, type: 'recovery' })` →
  `supabase.auth.updateUser({ password })`.

### POST /auth/password (auth)
`body: { password: string /*min 8*/ }` → `data: null`. Errors: `UPDATE_FAILED`, `UNAUTHENTICATED`. Used by Settings
→ Change password. The API doesn't check the current password; S27 may still ask for it, but only for UX.

```ts
type SupabaseUser = { id: UUID; email?: string; created_at: string;
  user_metadata: { first_name?: string; last_name?: string; full_name?: string; name?: string; username?: string } };
```

---

## 3. Courses & curriculum

```ts
type Course = {
  id: UUID; title: string; slug: string; description: string | null; about: string | null;
  thumbnail: string | null; learnings: string[] | null; tags: string[] | null;
  level: 'beginner' | 'intermediate' | 'advanced' | null;
  pricingConfig: PricingConfig | null; accessConfig: AccessConfig | null;
  instructorId: UUID; status: 'draft' | 'published' | 'archived';
  certificateConfig: CertificateConfig | null; createdAt: Timestamp; updatedAt: Timestamp;
  // also present, ignore in the app: thumbnailPublicId, seoConfig, aiIndexedAt, deletedAt
};
type PricingConfig = { type: 'free' | 'one_time' | 'subscription' | 'custom'; currency: string; price: number /*whole units*/;
  compareAtPrice?: number; hasDiscount?: boolean; billingPeriod?: 'weekly' | 'monthly' | 'quarterly' | 'yearly' };
type AccessConfig = { accessMode: 'open' | 'invite' | 'closed'; pricingType?: 'free' | 'paid'; price?: number;
  maxCapacity?: number | null };
type CertificateConfig = { enabled: boolean; title: string; passingScore: number; issuerName: string };
```

`learnings`, `tags`, `pricingConfig`, `accessConfig` and `certificateConfig` arrive as **real JSON**, not strings.
They can still be `null` or have missing keys, so normalize them in `features/catalog/api.ts`.

**Effective price** (put this in `lib/course.ts`):
1. If `pricingConfig.type !== 'free'` and `pricingConfig.price > 0`, the course is paid
   (`pricingConfig.price`, `pricingConfig.currency`).
2. Otherwise, if `accessConfig.pricingType === 'paid'` and `accessConfig.price > 0`, it's paid in USD.
3. Otherwise it's free.

**Access:** `accessMode` `open` lets anyone enroll (if free). `invite` needs an invite code. `closed` means not
currently enrollable: show "Enrollment closed".

### GET /courses (public)
- Query: `limit` (1–100, default 20), `offset` (default 0). **There are no search, level or price filters**; S08
  filters on the client. Fetch with `limit=100`.
- Returns `Course[]`, newest first, **published only** for students.

### GET /courses/{id} (public)
`id` must be a **UUID** (a slug gives a 400). Returns `Course`. A non-published course returns 404
`COURSE_NOT_FOUND`.

### GET /courses/{id}/curriculum (public)
```ts
data: {
  course: Course;
  chapters: Array<{ id: UUID; courseId: UUID; title: string; position: number; isLocked: boolean;
                    createdAt: Timestamp; updatedAt: Timestamp; activities: Lesson[] }>;   // note: "activities"
  stats: { totalActivities: number; totalDurationSeconds: number };
}
```
Chapters and lessons are already in order, and the server already hides draft lessons. Treat
`metadata.isLocked` or a chapter's `isLocked` as locked.

**What the viewer gets** (send the token so enrolled students get full lessons):
- **Enrolled students** (and admins) get full lessons.
- **Everyone else** gets **outlines**: `content` and `videoUrl` are `null`, and `metadata` contains only
  `status`, `isLocked`, `isPreview` and `description`. That's enough for S10's curriculum preview.
- **Preview lessons** (`metadata.isPreview === true`) are always whole. S10 can open them before enrollment.

---

## 4. Lessons & progress

```ts
type LessonType = 'video' | 'markdown' | 'dynamic_page' | 'document' | 'embed' | 'resource'
                | 'quiz' | 'assignment' | 'live_session';
type Lesson = { id: UUID; courseId: UUID; chapterId: UUID | null; title: string; type: LessonType | string;
  content: string | null; videoUrl: string | null; metadata: LessonMetadata; position: number;
  durationSeconds: number | null; createdAt: Timestamp; updatedAt: Timestamp };
```
An unknown `type` must render a generic "Open on the web" fallback, not crash.

### GET /lessons/{id} (auth)
Returns `Lesson`. It needs enrollment in the lesson's course, except for preview lessons.
- `401 UNAUTHENTICATED`: no token.
- `403 NOT_ENROLLED`: signed in but not enrolled. Send the user to S10 to enroll.
- `404 LESSON_NOT_FOUND`: no such lesson, a draft, or an unpublished course.

`GET /courses/{courseId}/lessons` returns `Lesson[]` under the same rules as the curriculum (outlines unless
enrolled). The curriculum endpoint usually makes it unnecessary.

### Metadata (a JSON object; default `{}`)
Every type may have the common keys `{ status?: 'published' | 'draft'; isLocked?: boolean; isPreview?: boolean;
description?: string }`. The web editor saves **every** `*Settings` block on every lesson, so read only the block
that matches the lesson's `type`:

| type | Where the content is | Settings block |
|---|---|---|
| `video` | `videoUrl` (YouTube, Vimeo or a direct file). `content` = description. | `videoSettings: { sourceType: 'link'\|'upload'\|'embed'; posterImageUrl?; startTime: 'mm:ss'; endTime?; autoplay; muted; loop; controls; requireFullWatch: boolean }` |
| `markdown` | `content` (when `sourceType === 'direct'`) | `markdownSettings: { sourceType: 'direct'\|'link'; markdownUrl? }`. For `link`, fetch and render `markdownUrl`. |
| `document` | `documentSettings.fileUrl` (fallback: top-level `metadata.fileUrl`). `content` = markdown notes. | `documentSettings: { sourceType: 'link'\|'upload'; fileUrl?; allowDownload: boolean }` |
| `embed` | `embedSettings.embedUrl` (fallback: `metadata.embedUrl`). `content` = description. | `embedSettings: { embedUrl?; height: number /*default 450*/ }` |
| `resource` | `resourceSettings.fileUrl` (fallback: `metadata.fileUrl`). `content` = description. | `resourceSettings: { sourceType: 'link'\|'upload'; fileUrl?; buttonLabel: string }` |
| `assignment` | `content` = the brief (markdown) | `assignmentSettings: { dueDate?: string \| null; gradingType: 'alphabetic'\|'numeric'\|'percentage'\|'pass_fail'\|'gpa'; passingScore: number; allowRetries: boolean; maxAttempts: number }` |
| `live_session` | `content` = the agenda (markdown) | `liveSettings: { startsAt: string \| null; durationMinutes: number; joinUrl?: string \| null; recordingUrl?: string \| null }` |
| `quiz` | Questions come from §6. `content` is usually null. | common keys only |
| `dynamic_page` | `metadata.blocks` (below). `content` is a text synopsis, **not** for display. | `{ blocks: DynamicBlock[]; lastConfiguredAt: string }` |

`assignmentSettings.dueDate` may come without a timezone (`YYYY-MM-DDTHH:mm:00`) or with `Z`. Treat a value with no
timezone as local time.

**dynamic_page fallback:** if `metadata.blocks` is missing, try `JSON.parse(content)` as either `Block[]` or
`{ blocks }`. If that fails, render `content` as a single markdown block.

```ts
type DynamicBlock = { id: string } & (
  | { type: 'hero'; data: { badge?: string; heading?: string; subtitle?: string; readingTime?: string; learningGoals?: string[] } }
  | { type: 'typography'; data: { content: string /*markdown*/ } }
  | { type: 'code'; data: { language: string; title?: string; code: string; output?: string } }
  | { type: 'callout'; data: { style: 'tip' | 'info' | 'warning' | 'danger' | 'success'; title?: string; message: string } }
  | { type: 'video'; data: { title?: string; videoUrl: string; caption?: string } }
  | { type: 'quiz'; data: { question: string; options: string[]; correctIndex: number; explanation?: string } }
  | { type: 'tabs'; data: { tabs: { title: string; content: string }[] } }
  | { type: 'accordion'; data: { items: { title: string; content: string }[] } }
  | { type: 'stepper'; data: { steps: { title: string; description: string }[] } }
  | { type: 'resource'; data: { title: string; description?: string; fileUrl: string; buttonLabel?: string } }
  | { type: 'embed'; data: { title?: string; embedUrl: string; height: string | number } }
  | { type: 'glossary'; data: { terms: { term: string; definition: string }[] } }
  | { type: 'image'; data: { imageUrl: string; caption?: string } }
  | { type: 'checklist'; data: { items: string[] } }
);
```
An inline `quiz` block is graded on the device (`correctIndex`). On the web, answering one correctly marks the
lesson complete (`PATCH /progress`); do the same.

### GET /progress/course/{courseId} (auth)
```ts
data: Array<{ id: UUID; userId: UUID; lessonId: UUID; lastPositionSeconds: number; maxWatchedSeconds: number;
              isCompleted: boolean; completedAt: Timestamp | null; updatedAt: Timestamp }>
```
Rows exist only for lessons the student has opened. **No row means not started.**

### PATCH /progress (auth): mark complete or incomplete
`body: { lessonId: UUID; courseId: UUID; completed?: boolean /*default true*/ }` → `data: { completed: boolean }`.
Error: `NOT_ENROLLED` (403).

### POST /progress/heartbeat (auth): video position
```ts
body: { lessonId: UUID; courseId: UUID; positionSeconds: number /*int ≥0*/; durationSeconds?: number /*int ≥0*/ }
data: { isCompleted: boolean; lastPositionSeconds: number }
```
- Send it **at most once every ~6 seconds while a video plays**, and once more when playback pauses or the screen
  is left.
- The server **auto-completes the lesson at 90% watched**. When the response says `isCompleted: true`, update the
  UI.
- When the video ends, also call `PATCH /progress { completed: true }`.
- Resume playback from `lastPositionSeconds` (from the progress list).
- Errors: `NOT_ENROLLED`, `LESSON_NOT_FOUND`.

---

## 5. Enrollments

### GET /enrollments/my (auth)
```ts
data: Array<{ id: UUID; userId: UUID; courseId: UUID; enrolledAt: Timestamp; completedAt: Timestamp | null }>
```
This returns IDs only, **with no course details**. For lists of the student's courses, use
`GET /users/me/learning-summary` (§12). Use this endpoint to answer "is the student enrolled in course X?".

### GET /enrollments/progress/{courseId} (auth)
`data: { total: number; completed: number; percent: number /*0–100 int*/; isCompleted: boolean }`

### POST /enrollments (auth): free or invite enrollment
`body: { courseId: UUID; inviteCode?: string }` → 201, the enrollment row.
- Errors: `ALREADY_ENROLLED` (409; treat it as success), `INVITATION_REQUIRED` (403, wrong or missing code),
  `COURSE_CLOSED`, `CAPACITY_REACHED` (409), `PAYMENT_REQUIRED` (paid course; the UI shouldn't offer enroll there).

---

## 6. Quizzes

### GET /quizzes/lesson/{lessonId}?courseId={uuid} (auth; `courseId` is required)
```ts
data: {
  quiz: null | { id: UUID; lessonId: UUID; title: string; description: string | null; passingScorePercent: number;
    maxAttempts: number /*0 = unlimited*/; shuffleQuestions: boolean /*shuffle on the device if true*/;
    questions: Array<{ id: string; prompt: string; type: 'single' | 'multiple' | 'boolean'; points: number;
                       options: Array<{ id: string; text: string }> }> };
  submissions: QuizSubmission[];          // newest first
  latestSubmission: QuizSubmission | null;
};
type QuizSubmission = { id: UUID; quizId: UUID; lessonId: UUID; scorePercent: number; passed: boolean;
                        userAnswers: Record<string, string[]>; submittedAt: Timestamp };
```
Correct answers and explanations are **not** included before you submit. Attempts left =
`maxAttempts === 0 ? ∞ : maxAttempts - submissions.length`. Error: `NOT_ENROLLED`.

### POST /quizzes/lesson/{lessonId}/submit (auth)
```ts
body: { courseId: UUID; userAnswers: Record<questionId, optionId[]> }   // single/boolean: one-element array
data: { submission: QuizSubmission; passed: boolean; scorePercent: number; totalQuestions: number; correctCount: number;
        feedback: Array<{ questionId: string; prompt: string; isCorrect: boolean; explanation?: string;
                          correctOptionIds: string[] }> }
```
A pass marks the lesson complete on the server. Errors: `NOT_ENROLLED`, `QUIZ_NOT_FOUND`,
`MAX_ATTEMPTS_EXCEEDED`.

---

## 7. Assignments

```ts
type AssignmentSubmission = { id: UUID; lessonId: UUID; courseId: UUID; studentId: UUID; contentText: string;
  attachmentUrl: string | null; attachmentPublicId: string | null; attachmentName: string | null;
  status: 'submitted' | 'graded'; scorePercent: number | null; feedback: string | null;
  gradedAt: Timestamp | null; submittedAt: Timestamp; updatedAt: Timestamp };
```

| Endpoint | Body | `data` |
|---|---|---|
| `GET /lessons/{lessonId}/assignment` | – | `AssignmentSubmission \| null` |
| `POST /lessons/{lessonId}/assignment` (201) | `{ contentText?: string /*≤20000*/; attachmentUrl?: string \| null; attachmentPublicId?: string; attachmentName?: string }` | `AssignmentSubmission` |
| `GET /courses/{courseId}/my-assignments` | – | `AssignmentSubmission[]` |

- POST **creates or updates** the submission. It can be revised until it's graded; after that the server returns
  `ALREADY_GRADED` (409).
- Other errors: `NOT_ENROLLED`, `EMPTY_SUBMISSION` (needs text or a file), `SUBMISSION_TOO_LONG`,
  `NOT_AN_ASSIGNMENT`.
- To attach a file, first upload it with §16 (`kind=document`, `folder=assignments`), then send its `url`,
  `publicId` and file name.

---

## 8. Notes

```ts
type Note = { id: UUID; userId: UUID; lessonId: UUID; courseId: UUID; timestampSeconds: number | null;
              content: string; createdAt: Timestamp; updatedAt: Timestamp };
```
- `GET /notes/lesson/{lessonId}` → `Note[]`.
- `GET /notes/course/{courseId}` → `Note[]`.
- `POST /notes` with `{ lessonId, courseId, timestampSeconds?, content }` → `Note`.
- `DELETE /notes/{id}` → `{ deleted: true }`.

---

## 9. Lesson comments

### GET /lessons/{lessonId}/comments
```ts
data: Array<{ id: UUID; lessonId: UUID; courseId: UUID; chapterId: UUID | null; userId: UUID; parentId: UUID | null;
  content: string; timestampSeconds: number | null; upvotesCount: number; createdAt: Timestamp; updatedAt: Timestamp;
  author: { id: UUID; name: string; avatarUrl: string | null; role: 'student' | 'admin' } }>
```
The list is **flat, oldest first**. Build the reply threads on the device from `parentId`.

### POST /lessons/{lessonId}/comments (auth)
- Body: `{ courseId: UUID; chapterId?: UUID; content: string /*1–2000*/; parentId?: UUID; timestampSeconds?: number }`.
- Returns the row (201) **without `author`**. For the optimistic item, fill `author` from the current user.
- Errors: `NOT_ENROLLED_IN_COURSE`, `INVALID_COURSE_LESSON_PAIR`.

### DELETE /comments/{id} (auth, owner)
Returns `{ deleted: true }`.

---

## 10. Forum

**Categories** (free text in the DB; the web uses): `question`, `general` (default), `feedback`, `bug`, `showcase`.

### GET /forum/stats
`data: { totalPosts: number; totalReplies: number; totalSolved: number }`

### GET /forum/posts (optional auth; send the token so `hasUpvoted` is right)
- Query: `search?` (title and content), `category?` (`'all'` = no filter), `sort?`
  (`'latest' | 'activity' | 'replies' | 'upvotes' | 'oldest'`, default `latest`; pinned posts always come first),
  `page?` (≥1), `limit?` (1–100, default 20), and `courseId?` / `chapterId?` / `lessonId?`.
- Returns `data: { posts: ForumPost[]; total: number }`. Paginate with `page` until
  `page * limit >= total`.

```ts
type ForumPost = { id: UUID; userId: UUID; title: string; content: string; imageUrl: string | null; imagePublicId: string | null;
  category: string; courseId: UUID | null; chapterId: UUID | null; lessonId: UUID | null;
  isPinned: boolean; isSolved: boolean; viewsCount: number; upvotesCount: number; repliesCount: number;
  lastReplyAt: Timestamp | null; createdAt: Timestamp; updatedAt: Timestamp;
  author: { id: UUID; name: string | null; avatarUrl: string | null; role: string | null } | null;
  course: { id: UUID; title: string; slug: string } | null; lesson: { id: UUID; title: string; type: string } | null;
  hasUpvoted: boolean };
```

### GET /forum/posts/{id}
Returns a `ForumPost`. Each call counts as a view, so don't refetch it in a loop. Error: `FORUM_POST_NOT_FOUND`.

### GET /forum/posts/{id}/replies
```ts
data: Array<{ id: UUID; postId: UUID; userId: UUID; parentId: UUID | null; content: string; isSolution: boolean;
  upvotesCount: number; createdAt: Timestamp; updatedAt: Timestamp;
  author: { id: UUID; name: string; avatarUrl: string | null; role: string }; hasUpvoted: boolean }>
```
Flat: the solution first, then oldest first. Thread on the device by `parentId`.

### Writes (auth)

| Endpoint | Body | `data` |
|---|---|---|
| `POST /forum/posts` (201) | `{ title /*3–250*/; content /*≥5*/; category?; imageUrl?; imagePublicId?; courseId?; chapterId?; lessonId? }` | raw post row (no `author`) |
| `PUT /forum/posts/{id}` (owner) | `{ title?; content?; category?; imageUrl?; imagePublicId?; isSolved? }` | post row |
| `DELETE /forum/posts/{id}` (owner) | – | `{ deleted: true }` |
| `POST /forum/posts/{id}/replies` (201) | `{ content /*2–5000*/; parentId? }` | reply row |
| `POST /forum/posts/{id}/upvote` | – | `{ upvoted: boolean; count: number }` (toggles) |
| `POST /forum/replies/{replyId}/upvote` | – | `{ upvoted: boolean; count: number }` (toggles) |
| `POST /forum/replies/{replyId}/solution` (post owner) | `{ postId }` | `{ success: true }` |

---

## 11. Support tickets

**Status:** `open | in_progress | resolved | closed`. **Priority:** `low | normal | high | urgent` (default `normal`).

```ts
type Ticket = { id: UUID; ticketNumber: number; studentId: UUID; courseId: UUID | null; chapterId: UUID | null;
  lessonId: UUID | null; subject: string; status: TicketStatus; priority: TicketPriority;
  timestampSeconds: number | null; lastReplyAt: Timestamp | null; lastReplySenderRole: 'student' | 'instructor' | null;
  createdAt: Timestamp; updatedAt: Timestamp };
type TicketWithRelations = Ticket & {
  course: { id: UUID; title: string; slug: string } | null; lesson: { id: UUID; title: string; type: string } | null };
type TicketMessage = { id: UUID; ticketId: UUID; senderId: UUID; senderRole: 'student' | 'instructor'; message: string;
  createdAt: Timestamp; sender: { id: UUID; name: string; avatarUrl: string | null; role: string } };
```

| Endpoint | Notes |
|---|---|
| `GET /support/tickets?status=&priority=&search=&page=&limit=` | `status`/`priority` accept `'all'`. Returns `data: { tickets: TicketWithRelations[]; total: number }`, newest activity first. Students only see their own. |
| `GET /support/tickets/{id}` | `data: { ticket: TicketWithRelations; messages: TicketMessage[] }`, messages oldest first. Errors: `TICKET_NOT_FOUND`, `FORBIDDEN`. |
| `POST /support/tickets` (201) | `{ subject /*3–250*/; description /*≥5*/; priority?; courseId?; chapterId?; lessonId?; timestampSeconds? }` returns a bare `Ticket`. The description becomes the **first message**. |
| `POST /support/tickets/{id}/messages` (201) | `{ message: string }` returns the message row. |
| `PATCH /support/tickets/{id}/status` | Students may set only `resolved` or `closed`. S23 offers **Mark as resolved**. |

Show tickets as `#{ticketNumber} {subject}`. (A ticket's `student` object, if present, can be ignored.)

---

## 12. Users & profile

```ts
type Me = { id: UUID; email: string; username: string | null; name: string | null; role: 'student' | 'admin';
  avatarUrl: string | null; headline: string | null; bio: string | null; aiConsent: boolean;
  learningGoals: string | null; createdAt: Timestamp; updatedAt: Timestamp };
```
- `GET /users/me` → `Me`.
- `PATCH /users/me` with `{ name?, username?, avatarUrl?, headline?, bio?, aiConsent?, learningGoals? }` → `Me`.
  Errors: `USERNAME_TAKEN`, `VALIDATION_ERROR`. Check field lengths against `api/openapi.json`.

### GET /users/me/learning-summary
```ts
data: { totalEnrolled: number; totalCompleted: number; inProgress: number; totalLessonsFinished: number;
  courses: Array<{ id: UUID /*course id*/; title: string; thumbnail: string | null; totalLessons: number;
                   completedLessons: number; percent: number; isCompleted: boolean; enrolledAt: Timestamp }> }
```
This is the main source for Home (S07), My Learning (S09) and the Profile stats (S25).

**"Continue learning" on S07:** pick the in-progress course with the latest `enrolledAt`. Then find its next lesson
by loading its curriculum (§3) and progress (§4) and taking the first lesson without a completed row.

---

## 13. AI

All AI endpoints respect the user's `aiConsent`. If it's off, show "AI features are turned off" with a link to
Edit profile.

### GET /ai/summary/{lessonId}?courseId={uuid}&lessonTitle={string} (auth; both query params required)
```ts
data: { id: string; lessonId: UUID; executiveSummary: string; keyTakeaways: string[];
        concepts: Array<{ term: string; definition: string; timestampSeconds?: number }>;
        flashcards: Array<{ id: string; front: string; back: string; hint?: string }>;
        createdAt: Timestamp; updatedAt: Timestamp }
```
If generation failed, `id` starts with `unavailable-` and the lists are empty. Show S14's empty state.

### GET /ai/history?limit=50 · POST /ai/history/message · DELETE /ai/history
```ts
GET  data: { conversation: { id: UUID; title: string; createdAt: Timestamp; updatedAt: Timestamp } | null;
             messages: Array<{ id: UUID; conversationId: UUID; role: 'user' | 'assistant' | 'system'; content: string;
                               createdAt: Timestamp }> }   // chronological
POST body: { role: 'user' | 'assistant'; content: string /*1–20000*/; title?: string }   → the saved message
DELETE data: { cleared: true }
```

### GET /ai/context (auth)
```ts
data: { aiConsent: boolean;
  enrolledCourses: Array<{ id: UUID; title: string; percent: number; currentLessonId: UUID | null;
                           currentLessonTitle: string }>;   // [] when aiConsent is false
  stats: { totalEnrolled: number; totalCompleted: number; totalInProgress: number; totalLessonsFinished: number } }
```

### POST /ai/tutor-stream (auth; not in openapi.json)
```ts
body: { courseId?: string | null; lessonId?: string | null; message: string /*1–5000*/;
  context?: { courseTitle?: string; lessonTitle?: string; lessonContent?: string | null /*≤20000*/;
              userNotes?: string[] /*≤50*/; chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }> /*≤20*/ } }
```
- A validation error comes back as the normal JSON envelope (400). Otherwise the response is
  `text/event-stream`. Server-side AI failures still stream a fallback answer; they don't return an error.
- **The stream doesn't save anything.** The app must `POST /ai/history/message` the user message **before**
  streaming and the full assistant text **after** the stream ends.
- **Parsing rules** (use `fetch` from `expo/fetch`):
  1. Read chunks, append them to a buffer, and split on `\n`. Keep the last partial line in the buffer.
  2. Ignore every line that doesn't start with `data: `. Ignore `data: [DONE]`.
  3. JSON-parse the rest and take
     `json.choices?.[0]?.delta?.content ?? json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''`.
     Skip lines that fail to parse.
  4. **The end of the stream (EOF) is the end of the message.** Don't wait for `[DONE]`; it isn't always sent.
  5. Trim a trailing literal `\n\n` (backslash-n characters) if it appears. The server sometimes appends it after
     closing a code fence.
- Send the last few messages as `context.chatHistory` (the server uses the last 6).

---

## 14. Certificates

### GET /courses/{id}/student-certificate (auth)
```ts
data: { certificateId: string /*e.g. "CERT-AION-XXXX-XXXXXXXX"*/; issueDate: string /*already formatted, e.g. "October 13, 2026"*/;
        studentName: string; courseTitle: string; certificateTitle: string; issuerName: string;
        html: string /*full HTML document of the certificate*/; enabled: boolean;
        verifyUrl: string /*RELATIVE web path; prefix with EXPO_PUBLIC_WEB_URL*/ }
```
- Errors: `INCOMPLETE` (400, course not finished: show the not-earned state), `FORBIDDEN` (not enrolled),
  `NOT_FOUND`.
- S28 shows a native card and can render `html` in a WebView for the full certificate.
- The QR code should encode the `certificateId`. S29 accepts either the bare ID or a URL containing it.

### GET /courses/verify/{certificateId} (public)
Accepts the `CERT-…` code. Returns the fields above **plus**
`{ valid: true; courseSlug: string; courseId: UUID; learnings: string[]; tags: string[]; completedAt: Timestamp | null;
score?: string /*e.g. "80%"*/ }`. Any failure is a **404** (`CERTIFICATE_NOT_FOUND`, `CERTIFICATE_INCOMPLETE`,
`COURSE_NOT_FOUND`); show the invalid state for all of them.

---

## 15. Payments (reference only; not used in the app, see D-04)

- `GET /payments/my` returns past payments (`amount` is in **cents**, with `currency` and
  `status: 'completed' | 'failed' | 'pending'`).
- `GET /payments/course/{courseId}/receipt` returns one completed payment or `null`.
- Checkout is web-only. A course bought on the web shows up in `learning-summary` and `/enrollments/my`
  automatically, so refetch when the app returns to the foreground.

---

## 16. Media upload

### POST /media/upload (auth, `multipart/form-data`, 201)
- Fields:
  - `file`: required.
  - `folder`: optional. Use `avatars`, `forum` or `assignments`.
  - `kind`: set to `document` for non-image files.
- **Images:** JPEG, PNG, WebP or GIF, ≤ 5 MB.
- **`kind=document`:** the image types plus PDF, TXT, MD, CSV, DOC and DOCX, ≤ 10 MB.
- **HEIC is rejected, and so is SVG.** Convert photos to JPEG on the device first (`expo-image-manipulator`, or
  the picker's options). Also resize large photos.
- The declared MIME type must match the file content. Send the correct `type` in the `FormData` part.
- Returns `data: { url: string; publicId: string; format?: string; width?: number; height?: number; bytes?: number }`.
- Errors: `INVALID_FILE`, `FILE_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `UPLOAD_FAILED`.
- `DELETE /media` with `{ publicId }` removes an upload, for example when the user removes an attachment before
  submitting.

---

## 17. Instructor endpoints (stretch P3-S1 only)

These exist and need `role === 'admin'`. Their response shapes aren't documented here yet; check the live response
and document it here before building on them.
- `GET /stats/admin`
- `GET /stats/course/{courseId}`
- `GET /courses/{id}/assignment-submissions`
- `GET /courses/{id}/assignment-stats`
- `PATCH /assignment-submissions/{id}/grade` with `{ scorePercent, feedback }`
- `PATCH /support/tickets/{id}/status | /priority | /assign`
- `POST /support/tickets/{id}/messages` with `isInternalNote`

## 18. Health

`GET /health`, at the server root, **not** under `/api/v1`, and **not** enveloped: `{ status: 'ok'; timestamp: string }`.
It's useful for a "server unreachable" check.
