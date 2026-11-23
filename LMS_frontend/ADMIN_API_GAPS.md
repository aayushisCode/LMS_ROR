# QuickInsure admin dashboard: API coverage and gaps

The dashboard uses the existing Rails endpoints for current functionality. No backend logic was changed.

| Endpoint | Purpose | Priority |
| --- | --- | --- |
| `GET /api/roles` | Return role IDs and names for role selection and readable user/role management. Current user payloads include `role_id` only. | High |
| `GET /admin/analytics` | Provide date filtered enrollment and completion trends, active learners, overdue assignments, and completion rates. Current `/admin/dashboard` exposes lifetime totals only. | High |
| `GET /api/user_courses` pagination and filters | Support server-side search, status, learner, course, and due-date filters without loading all assignment progress records. | High |
| `GET /api/admin/learner_progress/:user_id` | Return a focused learner timeline with lesson completion, quiz attempts/results, and course history for support and coaching. Current assignment index nests substantial data and is not paginated. | Medium |
| `PATCH /api/user_courses/:id` | Update supported assignment fields such as due date or status. A route is declared, but `Api::UserCoursesController` has no `update` action. | Medium |
| `GET /api/admin/audit_events` | Track user, course, role, and assignment changes for compliance and support investigations. | Medium |

## Existing endpoints used

- `GET /admin/dashboard` — authenticated admin overview totals.
- `/api/users`, `/api/categories`, `/api/courses`, `/api/lessons`, `/api/quizzes` — existing list and CRUD operations, scoped by Rails policies.
- `/api/user_courses` — assignment list, create, show, and delete. The dashboard uses the nested lesson/progress information returned by the index operation.

Quiz questions are exposed through quiz endpoints and are managed by the existing question APIs. The dashboard does not duplicate question authoring in this iteration.
