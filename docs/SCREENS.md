# Screens

There are 29 screens. Owners are in [TEAM.md](TEAM.md) and status is in [TRACKER.md](TRACKER.md). Routes follow
[SPEC.md §2](SPEC.md#2-folder-structure). Endpoint shapes are in [API.md](API.md); the `API §n` references below
point to its sections.

**Every screen** must handle loading, empty and error states, light and dark mode, a 360×640 phone, and
accessibility labels on icon-only buttons (SPEC §9). Those aren't repeated in each acceptance list below.

**Phase 1** builds each screen against mock data through feature hooks. **Phase 2** wires the same hooks to the
endpoints listed under *Data*.

---

## A. Auth & onboarding — Maria

### S01 Welcome · `(auth)/welcome.tsx` · S
- **Purpose:** first screen for signed-out users. It replaces the web landing page.
- **Layout:** 3 swipeable slides (Learn anywhere / Ask the AI tutor / Earn certificates), each with an
  illustration or icon, a title and one line of text. Page dots. A **Get started** button (→ S03) and an
  **I already have an account** link (→ S02).
- **Behaviour:** shown only until the first successful sign-in (store a `seenWelcome` flag). After that,
  signed-out users land on S02.
- **Acceptance:**
  - [ ] Swipe and dots stay in sync.
  - [ ] Both buttons navigate.
  - [ ] The screen isn't shown again after the first sign-in.

### S02 Login · `(auth)/login.tsx` · M
- **Layout:** logo/title "Welcome back", then Email and Password `TextField`s (secure toggle), a **Forgot
  password?** link (→ S05), a **Log in** primary button, and the footer "Don't have an account? Sign up" (→ S03).
  Restyle the look of the existing `auth-screen.tsx` onto the theme tokens.
- **Validation (zod):** email must be a valid email; password must be at least 8 characters.
- **Data:** `supabase.auth.signInWithPassword` (SPEC §5), then `GET /users/me` (API §12).
- **States:** a loading button; inline field errors; a banner for wrong credentials, `RATE_LIMITED` ("Too many
  attempts, try again in a few minutes"), an unverified email (offer **Enter code** → S04), and network errors.
- **Acceptance:**
  - [ ] Keyboard "next" moves from email to password; "go" submits.
  - [ ] `autoComplete` and `textContentType` let password managers work.
  - [ ] On success, the app lands on the Home tab. There is no "success" screen.
  - [ ] No Apple or Google buttons in v1.

### S03 Signup · `(auth)/signup.tsx` · M
- **Fields:** First name, Last name, Username, Email, Password, Confirm password. Add a password strength hint
  (weak / ok / strong) under the password field.
- **Validation:** names 1–100 characters; username 3–20 characters, using only lowercase letters, numbers and
  underscores (lowercase the input automatically); email valid; password 8–200 characters; confirm must match.
- **Live username check:** `supabase.rpc('check_username_available')`, debounced by 400 ms, showing ✓ available
  or ✗ taken (API §2).
- **Data:** `POST /auth/signup` (API §2). A `USERNAME_TAKEN` error appears on the username field.
- **On success:** go to S04 with `?email=`.
- **Acceptance:**
  - [ ] All validation shows inline.
  - [ ] A server error lands on the right field.
  - [ ] The form scrolls above the keyboard on a small phone.

### S04 Verify email · `(auth)/verify-email.tsx?email=` · S
- **Layout:** "Check your email", "We sent a 6-digit code to **{email}**", then `OtpInput` (6 boxes), a
  **Verify** button, and **Resend code** with a 60-second cooldown.
- **Data:** `supabase.auth.verifyOtp({ email, token, type: 'email' })`; resend with
  `supabase.auth.resend({ type: 'signup', email })`.
- **Fallback until B-02 is done:** in real mode, show "Open the link in your email, then log in" with a
  **Go to login** button.
- **Acceptance:**
  - [ ] Pasting a 6-digit code fills all boxes.
  - [ ] It auto-submits when the 6th digit is entered.
  - [ ] Backspace moves to the previous box.
  - [ ] Shows an error for a wrong code.

### S05 Forgot password · `(auth)/forgot-password.tsx` · S
- **Layout:** an Email field and a **Send code** button.
- **Data:** `supabase.auth.resetPasswordForEmail(email)`.
- **Behaviour:** always show the same success message, whether or not the account exists. Then go to S06 with
  `?email=`.
- **Acceptance:**
  - [ ] Shows the `RATE_LIMITED` message when limited.
  - [ ] The back gesture returns to S02.

### S06 Reset password · `(auth)/reset-password.tsx?email=` · S
- **Layout:** `OtpInput`, New password, Confirm password, and a **Reset password** button.
- **Data:** `verifyOtp({ type: 'recovery' })`, then `supabase.auth.updateUser({ password })` (SPEC §5).
- **On success:** show a toast, then the user is signed in and lands on Home.
- **Acceptance:**
  - [ ] Wrong code and mismatched passwords are handled.
  - [ ] Has the same B-02 fallback as S04.

---

## B. Discover & Learn — Irfan

### S07 Home · `(app)/(tabs)/index.tsx` · M
- **Layout:**
  - Header: "Hi, {first name}" with the avatar (→ Profile tab) and an AI tutor button (→ S17).
  - **Continue learning** card: the most recently active course, its next lesson title, a progress bar, and a
    **Resume** button (→ S12 for that lesson).
  - Stats row (3 small cards): courses enrolled, lessons finished, courses completed.
  - **My courses** horizontal carousel (→ S11).
  - **Explore more** horizontal carousel of courses not yet enrolled (→ S10).
- **Data:** `GET /users/me/learning-summary` (API §12) for the stats, my courses and the continue card;
  `GET /courses` (API §3) for Explore more (filter out enrolled IDs). The continue card's "next lesson" is
  worked out from the curriculum and progress endpoints; the rule is in API §12.
- **Empty state** (no enrollments): a friendly card "Start your first course" → Explore tab.
- **Acceptance:**
  - [ ] Pull-to-refresh refetches everything.
  - [ ] Resume opens the correct lesson.
  - [ ] Long course titles truncate to 2 lines.

### S08 Explore · `(app)/(tabs)/explore.tsx` · M
- **Layout:** `SearchBar` (300 ms debounce), a level filter `ChipGroup` (All / Beginner / Intermediate /
  Advanced), and a price filter (All / Free / Paid). Below that, a vertical list of course cards: thumbnail,
  title, short description, level badge, price or "Free" (use the effective-price rule in API §3), and an
  "Enrolled" badge.
- **Data:** `GET /courses?limit=100` (API §3). The API has **no** search or filter parameters, so search
  (title, description, tags), level and price are all filtered on the device. Enrolled IDs come from
  `GET /enrollments/my`.
- **Acceptance:**
  - [ ] Search and filters combine.
  - [ ] An empty result shows "No courses match" with a **Clear filters** action.
  - [ ] Tapping a card → S10.

### S09 My Learning · `(app)/(tabs)/learning.tsx` · S
- **Layout:** `SegmentedControl` In progress / Completed. A list of enrolled courses: thumbnail, title, a
  progress bar with %, "x / y lessons", and the enrolled date. A completed course shows a **Certificate**
  button (→ S28).
- **Data:** `GET /users/me/learning-summary` → `courses[]`, split by `isCompleted` (API §12).
- **Acceptance:**
  - [ ] The segments filter correctly.
  - [ ] Tapping a course → S11.
  - [ ] Empty state → Explore.

### S10 Course detail · `(app)/course/[id]/index.tsx` · M
- **Layout:**
  - Hero thumbnail; title, level, number of chapters and lessons.
  - Description, then a "What you'll learn" bullet list (`learnings`), then tags.
  - Curriculum preview: an accordion of chapters with lesson titles and type icons; locked items show a lock.
    Before enrollment the API returns outlines only. Lessons with `metadata.isPreview` show a **Preview** badge
    and open S12 (API §3).
  - A sticky bottom action bar. Its button depends on access (API §3: effective price and `accessMode`):
    - Already enrolled → **Continue** (→ S11).
    - `accessMode: 'closed'` → a disabled "Enrollment closed".
    - Free → **Enroll for free**.
    - Invite only → **Enter invite code** (opens a small dialog with a text field).
    - Paid → price, plus **Get this course on the web** (opens `EXPO_PUBLIC_WEB_URL/courses/{slug}` in the
      browser; D-04), with the hint "Already bought it? Pull to refresh."
- **Data:** `GET /courses/{id}/curriculum` (API §3; it includes the course, so one call is enough),
  `GET /enrollments/my` (enrolled?), `POST /enrollments` (API §5). Treat `ALREADY_ENROLLED` as success.
- **Acceptance:**
  - [ ] After enrolling, the button changes to **Continue** without leaving the screen.
  - [ ] A wrong invite code shows an error.
  - [ ] Pull-to-refresh rechecks enrollment.

### S11 Curriculum · `(app)/course/[id]/curriculum.tsx` · M
- **Purpose:** the "inside the course" hub for enrolled students.
- **Layout:**
  - Header: course title, a progress ring (%), and a **Resume** button.
  - A list grouped by chapter. Each lesson row shows a type icon, title, duration if known, and a completed
    check. A locked chapter shows a lock and its lessons can't be tapped.
  - A header menu: **Notes** (all notes for the course, reusing the S13 list, read-only grouping by lesson),
    **Certificate** (when eligible → S28) and **Get help** (→ S24 with `courseId`).
- **Data:** `GET /courses/{id}/curriculum`, `GET /progress/course/{courseId}` (API §3, §4).
- **Acceptance:**
  - [ ] Completed checks match the progress data.
  - [ ] Resume goes to the first incomplete lesson.
  - [ ] Tapping a row → S12 with `courseId`.

### S12 Lesson · `(app)/lesson/[id]/index.tsx?courseId=` · L
- **Layout:**
  - Top: a content area that depends on the lesson type (see the table below).
  - Under it: the lesson title and chapter name.
  - An action row: **Notes** (→ S13), **Summary** (→ S14), **Comments** (→ S18), **Ask AI** (→ S17 with
    `courseId` and `lessonId`).
  - A bottom bar: ◀ Previous · **Mark complete** / ✓ Completed · Next ▶.

| Lesson `type` | Renders |
|---|---|
| `video` | YouTube/Vimeo URL → WebView embed; otherwise `expo-video` with native controls. Show the content text below it if present. |
| `markdown` | The markdown renderer. |
| `dynamic_page` | Native renderer for the common block types in API §4. Unknown blocks are skipped. If parsing fails, fall back to a WebView of the web lesson URL. |
| `document` | A file card (name, type) → open in the in-app browser or download. |
| `embed` | A WebView of the embed URL. |
| `resource` | A list of links and files. |
| `quiz` | An intro card (questions, passing score, attempts left) and a **Start quiz** button → S15. |
| `assignment` | An intro card (instructions, status or grade) and an **Open assignment** button → S16. |
| `live_session` | Date and time, a status (upcoming / live / ended) and a **Join** button (opens the link). |

- **Data:** `GET /lessons/{id}` (API §4), `PATCH /progress` (mark complete), `POST /progress/heartbeat` (video
  position; see API §4 for the interval), and the curriculum for Previous/Next.
- **Acceptance:**
  - [ ] Every lesson type in the fixtures renders.
  - [ ] Mark complete updates the curriculum checks immediately (optimistic update).
  - [ ] Previous/Next cross chapters.
  - [ ] Video resumes from the saved position.

### S13 Notes sheet · `(app)/lesson/[id]/notes.tsx` · M (formSheet)
- **Layout:** a list of notes for this lesson, each with a timestamp chip (`mm:ss`, video lessons only), the text
  and a date. Swipe or long-press to delete (with confirmation). An input at the bottom with an **Add** button.
  On video lessons, new notes capture the current playback time.
- **Data:** `GET /notes/lesson/{lessonId}`, `POST /notes`, `DELETE /notes/{id}` (API §8).
- **Acceptance:**
  - [ ] Adding is optimistic.
  - [ ] Tapping a timestamp chip seeks the video and closes the sheet.
  - [ ] Delete asks for confirmation.

### S14 AI summary sheet · `(app)/lesson/[id]/summary.tsx` · S (formSheet)
- **Layout:** `SegmentedControl` Summary / Concepts / Flashcards.
  - **Summary:** the executive summary paragraph plus a key takeaways bullet list.
  - **Concepts:** term and definition rows. If a concept has `timestampSeconds`, tapping it seeks the video.
  - **Flashcards:** swipeable cards; tap to flip front and back; an optional hint.
  - A "Summary not available yet" empty state when the `id` starts with `unavailable-`.
- **Data:** `GET /ai/summary/{lessonId}?courseId=&lessonTitle=` (API §13).
- **Acceptance:**
  - [ ] Loading skeleton, then the summary.
  - [ ] Flashcards flip with a short animation.
  - [ ] Shows a respectful message when the user has turned AI off (`aiConsent=false`) or the endpoint refuses.

### S15 Quiz · `(app)/lesson/[id]/quiz.tsx?courseId=` · L
- **Flow:** Intro → Questions → Result.
  - **Intro:** title, description, question count, passing %, attempts used / max, and **Start**.
  - **Intro** also shows the last attempt's score, if there is one (`latestSubmission`).
  - **Questions:** one per page, with a progress bar "3 / 10". Options are selectable cards. `single` and
    `boolean` questions allow one choice (radio); `multiple` allows several (checkbox, labelled "Select all that
    apply"). Shuffle the questions if `shuffleQuestions`. Previous / Next, and **Submit** on the last question.
    Confirm before submitting if any question is unanswered.
  - **Result:** the score %, passed or failed, "x / y correct", and a per-question review from `feedback`
    (correct or wrong, your choice, the correct options from `correctOptionIds`, the explanation). **Retry** if
    attempts remain (`maxAttempts` 0 = unlimited), otherwise **Back to lesson**. A pass marks the lesson complete
    on the server; refresh progress.
- **Data:** `GET /quizzes/lesson/{lessonId}?courseId=`, `POST /quizzes/lesson/{lessonId}/submit` (API §6).
- **Acceptance:**
  - [ ] Answers survive moving back and forth.
  - [ ] The confirmation shows when answers are missing.
  - [ ] Retry is hidden when no attempts remain.
  - [ ] Leaving mid-quiz asks "Discard answers?".

### S16 Assignment · `(app)/lesson/[id]/assignment.tsx?courseId=` · M
- **Layout:** instructions (markdown), any due date or info from metadata, then a status card (Not submitted /
  Submitted on {date} / Graded: {score}% with feedback). The submit form has a text answer and an optional
  attachment (document or image picker). **Submit**, which becomes **Update submission** once submitted. It can
  be revised until it is graded; after grading the form is read-only (API §7).
- **Data:** `GET` and `POST /lessons/{lessonId}/assignment` (API §7). Attachments go through the upload helper
  (P2-05, API §16).
- **Acceptance:**
  - [ ] Shows the selected file name with a remove button.
  - [ ] Upload progress and errors are visible.
  - [ ] A graded submission shows the score and feedback.

### S17 AI Tutor chat · `(app)/tutor.tsx?courseId=&lessonId=` · L
- **Layout:**
  - Header: "Ask Aion", plus a context chip ("About: {lesson title}") when opened from a lesson, and a menu with
    **Clear history**.
  - A chat list: user bubbles on the right; assistant replies on the left, rendered as markdown.
  - Empty state: 3 suggestion chips ("Explain this lesson simply", "Quiz me on this", "Summarize key points").
  - Composer: a multiline input and **Send**. While the reply streams, Send becomes **Stop**.
- **Data:** `POST /ai/tutor-stream` streamed with `expo/fetch` and parsed by `lib/sse.ts` (API §13);
  `GET`/`DELETE /ai/history`. The stream doesn't save anything, so `POST /ai/history/message` the user message
  before streaming and the full assistant reply after the stream ends. When opened from a lesson, send
  `courseId`, `lessonId` and `context` (titles, lesson content, notes, the last few messages).
- **Acceptance:**
  - [ ] Text appears progressively while streaming.
  - [ ] Stop cancels the stream (AbortController).
  - [ ] History loads on open.
  - [ ] Errors (rate limit, AI off) show inline as a failed bubble with **Retry**.
  - [ ] The keyboard never hides the composer.

---

## C. Community, Support, Account, Certificates — Maria

### S18 Lesson comments sheet · `(app)/lesson/[id]/comments.tsx?courseId=&chapterId=` · M (formSheet)
- **Layout:** a comment count, then a list: avatar, name, relative time, text, and a **Reply** link. Replies are
  indented one level. Your own comments have a delete option. A composer at the bottom ("Replying to {name}" chip
  when replying).
- **Data:** `GET /lessons/{lessonId}/comments`, `POST` the same path, `DELETE /comments/{id}` (API §9). The list
  is flat; build the threads from `parentId`. The POST response has no `author`, so fill it from the current user.
- **Acceptance:**
  - [ ] Posting is optimistic.
  - [ ] Replies attach to the right parent.
  - [ ] Delete appears only on your own comments.

### S19 Community · `(app)/(tabs)/community.tsx` · M
- **Layout:**
  - A stats strip (posts, replies, solved; API §10).
  - `SearchBar`, then category chips (All, Question, General, Feedback, Bug, Showcase), then a sort menu
    (Latest / Recent activity / Most upvoted / Most replies).
  - A post list. Each card shows title, an excerpt, category, author and time, upvotes, reply count, and
    "Solved" and "Pinned" badges. Pinned posts come first.
  - A floating **New post** button (→ S21).
- **Data:** `GET /forum/stats`, `GET /forum/posts` (API §10).
- **Acceptance:**
  - [ ] Search, category and sort combine.
  - [ ] Infinite scroll using `page` and `total` (API §10).
  - [ ] Pull-to-refresh works.

### S20 Forum post detail · `(app)/forum/[id].tsx` · M
- **Layout:** the post (title, author, time, category, content, image if any, upvote button with count), then
  replies (the accepted solution is pinned to the top with a "Solution" badge; nested replies one level deep).
  A reply composer at the bottom. The post author sees **Mark as solution** on replies. The post author can edit
  or delete from a header menu.
- **Data:** `GET /forum/posts/{id}`, `GET /forum/posts/{id}/replies`, `POST .../replies`, `POST .../upvote`,
  `POST /forum/replies/{id}/upvote`, `POST /forum/replies/{id}/solution`, `PUT`/`DELETE /forum/posts/{id}`
  (API §10).
- **Acceptance:**
  - [ ] Upvote toggles optimistically.
  - [ ] Marking a solution moves that reply to the top.
  - [ ] After a delete, the user is returned to S19 and the list refreshes.

### S21 New post · `(app)/forum/new.tsx` · S (modal)
- **Fields:** Title, Category (picker; default General), Content (multiline), and an optional image (image picker,
  previewed). If opened from a lesson, it is linked to that course and lesson.
- **Data:** `POST /forum/posts` (API §10); the image uses the upload helper (API §16, `folder=forum`).
- **Acceptance:**
  - [ ] Validation: title 3–250 characters, content at least 5.
  - [ ] Closing with unsaved text asks to discard.
  - [ ] On success, navigates to S20 for the new post.

### S22 Support tickets · `(app)/support/index.tsx` · S
- **Layout:** status filter chips (All / Open / In progress / Resolved / Closed), then a list of tickets:
  `#ticketNumber` and subject, status badge, priority badge, last update ("Staff replied" when
  `lastReplySenderRole === 'instructor'`), and the course name if linked. A **New ticket** button
  (→ S24).
- **Data:** `GET /support/tickets` (API §11).
- **Acceptance:**
  - [ ] The filters work.
  - [ ] Empty state: "No tickets — need help? Create one".

### S23 Ticket thread · `(app)/support/[id].tsx` · M
- **Layout:** a header with the subject, status and priority, and linked course/lesson if any. Below that, a
  message thread in chat style: your messages on the right, staff on the left. Internal notes are never shown to
  students. A reply composer, hidden with "This ticket is closed" when the status is `closed`. A header menu
  offers **Mark as resolved** (allowed while the ticket is open or in progress).
- **Data:** `GET /support/tickets/{id}`, `POST /support/tickets/{id}/messages`,
  `PATCH /support/tickets/{id}/status` (API §11).
- **Acceptance:**
  - [ ] New messages appear at the bottom and the list scrolls to them.
  - [ ] The composer stays above the keyboard.

### S24 New ticket · `(app)/support/new.tsx?courseId=&lessonId=` · S (modal)
- **Fields:** Subject (3–250 characters), Description (at least 5), Priority (Low / Normal / High / Urgent;
  default Normal), and an optional course picker (the student's courses, prefilled from params).
- **Data:** `POST /support/tickets` (API §11).
- **Acceptance:**
  - [ ] Validation works.
  - [ ] On success, opens S23 for the new ticket.

### S25 Profile · `(app)/(tabs)/profile.tsx` · M
- **Layout:**
  - Avatar, name, @username, headline, and an **Edit profile** button (→ S26).
  - A learning stats card (enrolled / completed courses / lessons finished; from the learning summary).
  - A menu list: **My certificates** (list → S28), **Support tickets** (→ S22), **Settings** (→ S27),
    **About Aion**, **Log out** (with confirmation).
- **Data:** `GET /users/me`, `GET /users/me/learning-summary` (API §12).
- **Acceptance:**
  - [ ] Logout clears the session and cache and returns to S02.
  - [ ] Initials appear when there is no avatar.

### S26 Edit profile · `(app)/profile/edit.tsx` · M
- **Fields:** Avatar (tap → camera or library; preview; upload), Name, Username, Headline, Bio, Learning goals,
  and an **AI features** toggle (`aiConsent`).
- **Data:** `PATCH /users/me` (API §12); the avatar goes through the upload helper (API §16).
- **Acceptance:**
  - [ ] **Save** is disabled until something changes.
  - [ ] Shows `USERNAME_TAKEN` on the field.
  - [ ] Leaving with unsaved changes asks to discard.

### S27 Settings · `(app)/settings.tsx` · S
- **Sections:**
  - **Appearance:** System / Light / Dark.
  - **Security:** Change password (a dialog with new password and confirm → `POST /auth/password`, API §2) and
    Biometric lock (the toggle is added in P3-04).
  - **About:** app version, links to Terms and Privacy on the web, and the open-source licenses.
  - **Developer** (dev builds only): a mock mode indicator and a fixture role switch (student/admin).
- **Acceptance:**
  - [ ] The theme changes instantly and is remembered.
  - [ ] Change password validates and shows success or error.

### S28 Certificate · `(app)/course/[id]/certificate.tsx` · M
- **Layout:** a native certificate card (certificate title, course title, student name, issue date, certificate
  ID, issuer), a QR code that encodes the `certificateId`, and the buttons **View full certificate** (renders the
  returned `html` in a WebView), **Share** (P3-05) and **Verify online** (opens `EXPO_PUBLIC_WEB_URL + verifyUrl`).
  When the API returns `INCOMPLETE`, show the not-earned state with the course progress and a **Continue
  course** button.
- **Data:** `GET /courses/{id}/student-certificate` (API §14), plus `GET /enrollments/progress/{courseId}` for the
  not-earned state.
- **Acceptance:**
  - [ ] Shows the earned state and the not-earned state.
  - [ ] The QR is scannable by S29.

### S29 Verify certificate · `verify/index.tsx`, `verify/[code].tsx` · M (public, no login needed)
- **Layout (index):** "Verify a certificate". A code text field with a **Verify** button, and a **Scan QR**
  button (the scanner is added in P3-01; it can be disabled until then).
- **Layout ([code]):** a result card. Valid: a green check with student name, course, issue date and issuer.
  Invalid: a red state with "No certificate found for this code".
- **Data:** `GET /courses/verify/{certificateId}` (API §14).
- **Entry points:** a link on S02 ("Verify a certificate") and from S28.
- **Acceptance:**
  - [ ] Works while signed out.
  - [ ] Valid and invalid states.
  - [ ] Trims and normalizes the typed code.
