# Visual designs

Every screen in [SCREENS.md](SCREENS.md) has a visual design, exported as an image to **`docs/design/`**. Anyone
can open these (Irfan, Maria, or any AI agent that can read images); no Stitch account is needed.

The originals live in a private Google Stitch project ("Aion Mobile", `projects/6276837047848980610`, design
system "Aion Neutral", `assets/13354212775677618750`). Only Irfan's account can open them.

## Rules for using the designs

1. **Open the image before building a screen.** Agents should read the PNG with their image/file tool.
2. **Match the layout, hierarchy, spacing and components** you see: pill inputs and buttons, list rows, cards,
   badges, sheets, the tab bar.
3. **SCREENS.md wins on behaviour, data and states.** The designs sometimes add decoration the spec doesn't ask
   for. Examples: S28 shows an instructor signature and a "Verified by Aion Public Ledger" line; S29 shows extra
   tags and a record number. Don't build anything that isn't in SCREENS.md. If you're unsure, follow
   SCREENS.md and write the difference in your log.
4. **Never copy colours, fonts or pixel sizes from the image.** Use `useTheme()` tokens and the UI kit
   (SPEC §6–7). The designs were generated from those same tokens.
5. All text, names, avatars and thumbnails are **sample content**. Real data comes from the feature hooks.
6. The designs are light mode only. Dark mode uses the dark tokens in SPEC §6.
7. S13, S20 and S26 are a phone frame on a wide dark canvas; only the phone matters.
8. **Logo:** wherever a design shows an "Aion" wordmark or logo (S01, S02, S07 header…), use the real logo from
   `assets/brand/` (`logo.png` in light mode, `logo-dark.png` in dark mode; see `assets/brand/README.md`). Don't
   recreate it from text.

## Screen → design

| ID | Screen | Image | Stitch screen id |
|---|---|---|---|
| S01 | Welcome | [S01-welcome.png](design/S01-welcome.png) | `f6c681465cc942198766915c73118346` |
| S02 | Login | [S02-login.png](design/S02-login.png) | `87410e0412ac4126bf6017254390549d` |
| S03 | Sign up | [S03-signup.png](design/S03-signup.png) | `e14e18fc997d4b639dc1149ef149ad96` |
| S04 | Verify email | [S04-verify-email.png](design/S04-verify-email.png) | `dc68e7f61c7f433c801193b571ff5602` |
| S05 | Forgot password | [S05-forgot-password.png](design/S05-forgot-password.png) | `2ecafe2935d74f948b6e92e99dcca734` |
| S06 | Reset password | [S06-reset-password.png](design/S06-reset-password.png) | `f8609711de234286916ebb725e73c5a6` |
| S07 | Home | [S07-home.png](design/S07-home.png) | `1078d586c9ab4a4497d02b0361bdef22` |
| S08 | Explore | [S08-explore.png](design/S08-explore.png) | `1df19d5f5bd84af6a33ba52dd24a062b` |
| S09 | My Learning | [S09-my-learning.png](design/S09-my-learning.png) | `8f0c4908fb554112b9d2edb0755f4d2d` |
| S10 | Course detail | [S10-course-detail.png](design/S10-course-detail.png) | `1be8b12d4eb14c478ae5ecae9d7c79f1` |
| S11 | Curriculum | [S11-curriculum.png](design/S11-curriculum.png) | `25e87c66f1c74b33ae1abc699158b049` |
| S12 | Lesson (video) | [S12-lesson.png](design/S12-lesson.png) | `ef460a808d58457baf0c73ef1c3413a1` |
| S13 | Notes sheet | [S13-notes-sheet.png](design/S13-notes-sheet.png) | `430b5f89ead747fbbf2cd97f58ab4b65` |
| S14 | AI summary sheet (Flashcards tab) | [S14-ai-summary-sheet.png](design/S14-ai-summary-sheet.png) | `b94e0c57a19b4a4aaea4855ef5039d5b` |
| S15 | Quiz: question | [S15-quiz-question.png](design/S15-quiz-question.png) | `0a9713f7f9704f31bdef06864d7e49a2` |
| S15 | Quiz: result | [S15b-quiz-result.png](design/S15b-quiz-result.png) | `fb067b65ccbd4a53b070d22436473d64` |
| S16 | Assignment | [S16-assignment.png](design/S16-assignment.png) | `b2134fc9d4764b188884e6a2eb5915c3` |
| S17 | AI Tutor chat | [S17-ai-tutor.png](design/S17-ai-tutor.png) | `a95a3c13b164410686a540f1c288910c` |
| S18 | Lesson comments sheet | [S18-comments-sheet.png](design/S18-comments-sheet.png) | `8f00bfae5b8b47aab0393bf43fe8de95` |
| S19 | Community | [S19-community.png](design/S19-community.png) | `8d078c7ad50b4a519dfb53294584ff32` |
| S20 | Forum post detail | [S20-post-detail.png](design/S20-post-detail.png) | `df2062075e044ae8b7956e910e821c8f` |
| S21 | New post | [S21-new-post.png](design/S21-new-post.png) | `b773551ad052418fafeb262c60fd5608` |
| S22 | Support tickets | [S22-support-tickets.png](design/S22-support-tickets.png) | `bf780497932f4c7289451018d5c7903d` |
| S23 | Ticket thread | [S23-ticket-thread.png](design/S23-ticket-thread.png) | `1bcb93a930374c088ee25cfd3c76b4cc` |
| S24 | New ticket | [S24-new-ticket.png](design/S24-new-ticket.png) | `cfc4141deaab4eb482df17ef2898de4c` |
| S25 | Profile | [S25-profile.png](design/S25-profile.png) | `6a774c47f8be4382a4733761928d9c4b` |
| S26 | Edit profile | [S26-edit-profile.png](design/S26-edit-profile.png) | `4dfe4915c5844e69b7b1fa434d8e3695` |
| S27 | Settings | [S27-settings.png](design/S27-settings.png) | — |
| S28 | Certificate | [S28-certificate.png](design/S28-certificate.png) | `84713b2c3719461c94f800bf815764d5` |
| S29 | Verify certificate (result) | [S29-verify-certificate.png](design/S29-verify-certificate.png) | `2813eabe95a24395ac367737225299b2` |

**Not designed** (build these from SCREENS.md using the same visual language):
- the empty, loading and error states;
- the other lesson types in S12 (markdown, document, embed, resource, live session, and the quiz and assignment
  intro cards);
- the Summary and Concepts tabs of S14;
- the manual-entry and invalid states of S29.
