# Team and work split

| Person | Owns |
|---|---|
| **Irfan** | The **Discover & Learn** screens; backend dependencies (B-xx, done in the private backend repo); API client and Supabase setup; builds and release. |
| **Maria** | The **Auth**, **Community**, **Support**, **Account** and **Certificate** screens; media upload helper; README, screenshots and demo video. |

Phase 0 (cleanup and scaffold) has no owner. Whoever starts first does it, Irfan or Maria (or an agent for
either of them), before any screen work begins. It is small and blocks everything else.

## Screen split

Size points: S = 1, M = 2, L = 3. The full spec of each screen is in [SCREENS.md](SCREENS.md).

### Irfan: Discover & Learn (23 points + backend + integration infrastructure)

| ID | Screen | Size |
|---|---|---|
| S07 | Home | M |
| S08 | Explore (catalog) | M |
| S09 | My Learning | S |
| S10 | Course detail | M |
| S11 | Curriculum | M |
| S12 | Lesson | L |
| S13 | Notes sheet | M |
| S14 | AI summary sheet | S |
| S15 | Quiz | L |
| S16 | Assignment | M |
| S17 | AI Tutor chat | L |

### Maria: Auth, Community, Support, Account, Certificates (28 points)

| ID | Screen | Size |
|---|---|---|
| S01 | Welcome | S |
| S02 | Login | M |
| S03 | Signup | M |
| S04 | Verify email (code) | S |
| S05 | Forgot password | S |
| S06 | Reset password | S |
| S18 | Lesson comments sheet | M |
| S19 | Community (forum feed) | M |
| S20 | Forum post detail | M |
| S21 | New post | S |
| S22 | Support tickets | S |
| S23 | Ticket thread | M |
| S24 | New ticket | S |
| S25 | Profile | M |
| S26 | Edit profile | M |
| S27 | Settings | S |
| S28 | Certificate | M |
| S29 | Verify certificate | M |

Maria has more screen points because Irfan also owns the backend dependencies and the Phase 2 infrastructure
(API client, auth plumbing, streaming).

## Working rules

1. **Each person integrates their own screens in Phase 2.** Whoever built a screen's UI also wires it to the
   real API, so nobody has to learn someone else's screen.
2. **Shared UI kit.** Components in `src/components/ui` are built in Phase 0. If you need a new shared component
   or a change to one, make it, then note it in your log so the other person knows. Don't fork a copy inside your
   feature.
3. **Cross-area touch points.** S12 (Lesson, Irfan) opens S18 (Comments, Maria). S25 (Profile, Maria) links to
   S28 (Certificate, Maria) and to courses (Irfan). Agree on route params early; they are written in SCREENS.md.
   If you change one, update SCREENS.md.
4. **Review.** Each pull request is reviewed by the other person before merging.
5. **Blocked?** Mark the task `blocked` in the tracker with a reason and pick another task. Don't wait.
6. **Stretch items** (instructor mode, push notifications) have no owner. Take them only once your own Phase 1
   and Phase 2 rows are done.
