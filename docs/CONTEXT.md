# Context — read this first

This file explains **what this project is, what it talks to, and the decisions already made**. Read it before
writing any code. If you are an agent, also read [SPEC.md](SPEC.md), [SCREENS.md](SCREENS.md),
[API.md](API.md) and [TRACKER.md](TRACKER.md) before starting a task.

---

## 1. What Aion is

Aion is a learning platform (LMS) run by one academy/instructor. Students browse courses, enroll, watch lessons,
take quizzes, submit assignments, keep notes, ask an AI tutor, discuss in a forum, open support tickets and earn
certificates. An existing **web app** and **API server** already do all of this.

**This repository is the mobile app only.** It is built by **Irfan** and **Maria** as the submission for a
university Mobile App Development course, and it is public. The API server and web app live in a separate
**private** repository and are not part of this project.

## 2. What the app talks to

| Thing | What it is | How the app uses it |
|---|---|---|
| **Aion API** | REST API, base path `/api/v1`, JSON | All data. Every protected call sends `Authorization: Bearer <supabase access token>`. Full reference in [API.md](API.md). |
| **Supabase Auth** | Hosted auth service | Sign in, session storage, token refresh, sign out, email codes. The app uses `@supabase/supabase-js` directly for these. |
| **Cloudinary** (indirect) | Image/document hosting | The app never talks to Cloudinary. Uploads go through `POST /media/upload` on the API. |
| **Stripe** (indirect) | Payments for paid courses | **Not used in the app** (see decision D-04). |

`api/openapi.json` in this repo is a **snapshot** of the API's OpenAPI 3.1 spec. It is used to generate
TypeScript types. Some endpoints are missing from it or untyped; [API.md](API.md) fills those gaps by hand.

## 3. Users and roles

There are two roles: `student` and `admin` (the instructor). The mobile app is a **student app**. Instructor
features are an optional stretch goal (tracker Phase 3). Course authoring stays on the web.

## 4. Scope

**In scope (v1):** sign in, sign up, email verification, password reset, home dashboard, course catalog,
course detail and enrollment (free or invite code), my courses, curriculum, lesson viewer (video, text, documents,
embeds, resources), notes, lesson comments, AI lesson summary, quizzes, assignments, AI tutor chat, forum,
support tickets, profile, settings, certificates and certificate verification (QR).

**Out of scope:** course/lesson authoring, admin user management, analytics, SEO, certificate template design,
in-app payments, live chat or realtime updates, multiple languages.

**Stretch (only if time allows):** instructor mode (stats, support inbox, grading), push notifications, offline
video download.

## 5. Constraints you must respect

1. **Public repo.** Never commit `.env`, secrets, backend source code, private URLs other than the public API base
   URL, or real user data. Only `EXPO_PUBLIC_*` variables go in the app; the Supabase anon key is designed to be
   public. Fixtures must use made-up data.
2. **No backend code here.** If a feature needs a backend change, add it to the "Backend dependencies" table in
   [TRACKER.md](TRACKER.md) and build the mobile side against the mock until it is done.
3. **Auth endpoints are strictly rate-limited** (login roughly 10 per 15 min per IP, signup 5 per hour). Show the
   `RATE_LIMITED` error nicely; never retry auth calls automatically.
4. **No realtime.** Refresh data with pull-to-refresh and refetch-on-focus.
5. **Lesson videos are plain URLs.** They can be YouTube, Vimeo, or a direct MP4/HLS file. There is no DRM.
6. **The AI tutor streams its answer.** React Native's built-in `fetch` cannot read streams; use `fetch` from
   `expo/fetch` for that one call.

## 6. Decision log

Add new decisions at the bottom with the next number. Do not silently reverse one; add a new entry that
supersedes it.

| ID | Decision | Why |
|---|---|---|
| D-01 | **Expo (SDK 57) + Expo Router + TypeScript (strict)**, npm as package manager. | Already set up; one codebase for Android and iOS; matches the team's TypeScript skills. |
| D-02 | **Separate public repo**; the API contract comes from the `api/openapi.json` snapshot plus [API.md](API.md). | Only the mobile app may be public. The backend shares no client-safe code worth importing. |
| D-03 | **Login, refresh and logout via supabase-js; signup via the API** (`POST /auth/signup`). | Signup on the API checks username uniqueness and stores first/last name. Login through supabase-js avoids the web-only reCAPTCHA on the API login route. |
| D-04 | **No in-app payments.** Free and invite-code courses enroll in the app. Paid courses show a "Get this course on the web" button that opens the web course page in the browser. | Apple and Google forbid selling digital content through Stripe inside apps. Once bought on the web, the course appears in the app automatically. |
| D-05 | **Email verification and password reset use 6-digit codes** typed into the app (`supabase.auth.verifyOtp`). | Avoids deep-link setup. Needs backend dependency B-02. Until then, screens S04/S06 work in mock mode and the real flow shows "check your email". |
| D-06 | **A login is required for everything except certificate verification.** | Simpler navigation and data layer. The catalog is not useful without enrolling anyway. |
| D-07 | **UI first, against mock data.** Every screen reads data through hooks in `src/features/*/hooks.ts`. In mock mode those hooks return typed fixtures; Phase 2 switches them to the real API without touching screens. | Lets both people build screens in parallel before integration and keeps screens stable. |
| D-08 | **Styling: React Native `StyleSheet` + theme tokens** from `src/theme`. No NativeWind or other UI framework. | Fewer moving parts with RN 0.86 and the React Compiler; full control over the look. |
| D-09 | **Tabs use the JS `Tabs` from `expo-router`**, not `unstable-native-tabs`. | The native tabs API is marked unstable. |
| D-10 | **Bottom sheets are Expo Router routes** with `presentation: 'formSheet'` (notes, comments, AI summary). | Native feel without an extra bottom-sheet library; the back gesture works. |
| D-11 | **Icons: `lucide-react-native`.** | Same icon set as the web app, so the products look related. |
| D-12 | **The visual style follows the web app**: a neutral grey palette, near-black primary, 10px radius, Geist font, light and dark mode. Tokens are in [SPEC.md §6](SPEC.md#6-design-system). | Consistent brand. |

## 7. Glossary

- **Course**: top-level product. It has chapters.
- **Chapter**: an ordered group of lessons inside a course.
- **Lesson** (the web UI calls them "activities"): one unit of content. Its `type` decides how it renders
  (video, quiz, assignment and so on).
- **Enrollment**: a student's access to a course.
- **Progress**: per-lesson completion plus the video position. Course progress is the percentage of lessons completed.
- **Ticket**: a support request with a message thread.
- **Post / reply**: forum discussion. A reply can be marked as the solution.
