# LMS backend audit

Reviewed the Rails API routes, controllers, Trailblazer operations, models, associations, policies, progress and quiz services, schema/migrations, Devise/JWT setup, seeds, and the Postman login request. No backend code has been changed. Findings below are based on static review; runtime behavior still needs API level checks in a configured Rails environment.

## Critical

No confirmed critical issue found in the reviewed code.

## High

- **Cross origin requests are disabled in the checked in CORS initializer.** The full Rack::Cors configuration is commented out in `config/initializers/cors.rb`. A browser frontend on Vite's origin cannot call Rails on another origin until an explicit allowed origin and headers/methods are configured. Configure only the intended frontend origins and allow `Authorization` and `Content-Type` headers.
- **Course completion currently allows an empty course to remain incomplete.** `Progress::CourseCalculator` marks completion only when `total_activities.positive?`; a course without pages or quizzes remains `assigned` rather than completing, regardless of the intended business rule. Define and enforce the empty-course rule.
- **Final quiz eligibility can be satisfied without a final quiz existing.** `UserQuiz::Operation::Start#all_lesson_quizzes_passed?` checks lesson quizzes but `final` eligibility does not verify the final quiz setup constraints; a course can contain no lesson quizzes and will fail the `any?` requirement forever. Validate course quiz configuration when publishing, or define an explicit policy for courses without lesson quizzes.

## Medium

- **The routes advertise an unimplemented assignment update action.** `resources :user_courses` includes `:update`, but `Api::UserCoursesController` has no `update` method or update operation. Calls return an action-not-found server error. Remove the route if assignment edits are unsupported, or implement the intended operation after confirming its frontend use.
- **Several endpoints are duplicated or overly broad.** `courses/:course_id/lessons` and standalone `lessons` expose overlapping CRUD actions; course nested quiz routes duplicate standalone `quizzes` routes (and nested quiz create/update/destroy are outside the shown nested block's intended shape). The `user_courses/:user_course_id/lessons` resource also declares ordinary lesson CRUD routes in addition to `navigate_page`. Audit clients/Postman references, then narrow nested routes to the actual supported operations.
- **Responses do not follow one envelope.** Operations return `{data: ...}`, raw arrays/objects, `{msg: ...}`, or `{message: ...}`; session login returns `{message, data}` and progress navigation has its own shape. Define a documented response/error contract before adding more frontend API consumers.
- **The login response assumes every account has a role.** `Users::SessionsController#respond_with` calls `resource.role.name`; `User#role` is optional, so a valid password for a role-less account raises instead of returning a controlled authentication error. Make role required or handle missing roles explicitly.
- **Role matching is case-sensitive and duplicated.** `RoleHelpers` and policies compare lowercase strings exactly, while `User` role predicates use case-insensitive comparison. Normalize/validate role names and centralize role checks to avoid differing authorization behavior.
- **Course progress recalculation may query once per lesson.** `CourseCalculator` invokes `LessonCalculator`, which reads pages for each lesson, and downstream quiz-start checks walk lessons/progress records. Current eager loading helps some paths, but `UserCourse::Operation::Show#final_quiz_data` queries attempts for one assignment while related nested results may introduce additional queries. Profile list endpoints with realistic data and preload associations/aggregate where needed.
- **Quiz scoring behavior differs between service and submit operation.** `Quizzes::ScoreCalculator` scores loaded user options in Ruby; `UserQuiz::Operation::Submit` independently calculates with SQL and neither path saves `pass_marks` on the attempt. Keep a single scoring implementation and persist the threshold used for historical reports.
- **Quiz-start concurrency can create duplicate active attempts.** Attempt numbering is computed with `maximum + 1`; the validation alone is vulnerable to simultaneous requests. Add database uniqueness/locking around attempt creation and a database constraint against duplicate attempt numbers (and, if required, concurrent active attempts).
- **JWT expiry and sign-out behavior need end-to-end verification.** JWT expiry is 24 hours and revocation is configured with JTIMatcher. The custom sign-out response only checks whether an Authorization header exists; verify invalid/expired tokens produce the expected revocation and status behavior.

## Low

- **`RoleHelpers` methods are repeated.** The module and `ApplicationPolicy` define the same predicates; remove the duplicate definitions after checking policy inheritance behavior.
- **Legacy commented implementations and disabled routes are substantial.** Old progress service implementations, controller error renderers, and route variants make it harder to identify the active contract. Remove only after confirming no documentation/client relies on them.
- **Some failures are swallowed or logged without preserving context.** `User::Operation::Index` rescues all `StandardError` and returns a generic error. Prefer narrow exception handling while retaining useful server-side diagnostics.
- **The JWT secret fallback points to `config/jwt_secret.key`.** Confirm this file is provisioned outside source control in every environment or require `DEVISE_JWT_SECRET_KEY`; missing configuration can prevent boot, while a checked-in static secret would be unsafe.

## API inventory

- Authentication: Devise `POST /users/sign_in`, `DELETE /users/sign_out`; login returns user id/email/role and the JWT is in the `Authorization` response header.
- Catalog/admin CRUD: categories, courses, lessons, quizzes, questions, users, course assignments. Pundit policies generally limit writes to admins and scope reads to assigned users/managers.
- Learner workflow: assignment list/detail, lesson detail/progress navigation, quiz start, attempt display, answer save, submit, and report card.
- No dedicated `me`/current-user endpoint, assignment-update operation, explicit course-completion endpoint, or pagination contract was found. Lesson completion and course completion are calculated as part of navigation and quiz submission.
- No API should be removed based only on route duplication: first compare the Postman collection and frontend callers, then deprecate the selected route with a compatibility window.

## Recommended order

1. Enable restricted CORS and remove answer-key fields from learner quiz payloads.
2. Decide empty-course and quiz-configuration rules; enforce them at course publication and progress calculation.
3. Resolve the advertised but missing assignment update action and duplicate route surface after client-usage review.
4. Standardize response/error envelopes and normalize role handling.
5. Add database-backed concurrency protection for quiz attempts, then profile the assignment/progress endpoints.

Major backend changes are deferred pending approval, as requested.
