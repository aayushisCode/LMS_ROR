import api from './axios'
import { request, type AssignmentRecord, type LessonRecord } from './adminApi'

export interface LearnerLessonDetail extends LessonRecord {
  lesson_pages_count: number
  lesson_pages: NonNullable<LessonRecord['lesson_pages']>
  current_page?: { id: string; page_number: number; position: number } | null
}

export async function getMyAssignments(): Promise<AssignmentRecord[]> {
  return (await request(() => api.get<{ data: AssignmentRecord[] }>('/user_courses'))).data.data
}

export async function getMyProfile(userId: string) {
  return (await request(() => api.get<{ data: { user: { name: string; email: string; address: string; contact: string }; courses: { id: string; title: string; status: string; progress_percentage: number }[] } }>(`/users/${userId}`))).data.data
}

export async function getLearnerLesson(lessonId: string, userCourseId: string): Promise<LearnerLessonDetail> {
  return (await request(() => api.get<{ data: LearnerLessonDetail }>(`/lessons/${lessonId}`, { params: { user_course_id: userCourseId } }))).data.data
}

export async function navigateLearnerLesson(userCourseId: string, lessonId: string, pageNumber?: number, direction?: 'forward' | 'backward') {
  return (await request(() => api.post<{ page_number: number; page?: LearnerLessonDetail['lesson_pages'][number]; lesson_completed?: boolean; message?: string }>(`/user_courses/${userCourseId}/lessons/${lessonId}/navigate_page`, { page_number: pageNumber, direction }))).data
}

export interface QuizQuestion { id: string; question_text: string; marks: number; options: { id: string; option_text: string }[] }
export interface QuizAttempt { id: string; quiz_id: string; status: string; questions: QuizQuestion[]; answers: { question_id: string; option_id: string }[]; result?: string | null; score?: number | null; total_marks?: number | null; percentage?: number | null }
function quizAttemptStorageKey(userCourseId: string, quizId: string) { return `lms_quiz_attempt:${userCourseId}:${quizId}` }
export function getSavedLearnerQuizAttempt(userCourseId: string, quizId: string): string | null {
  return localStorage.getItem(quizAttemptStorageKey(userCourseId, quizId))
}
export function saveLearnerQuizAttempt(userCourseId: string, quizId: string, attemptId: string): void {
  localStorage.setItem(quizAttemptStorageKey(userCourseId, quizId), attemptId)
}
export function clearSavedLearnerQuizAttempt(userCourseId: string, quizId: string): void {
  localStorage.removeItem(quizAttemptStorageKey(userCourseId, quizId))
}
export async function startLearnerQuiz(userCourseId: string, quizId: string) {
  return (await request(() => api.post<{ user_quiz_id: string }>(`/user_courses/${userCourseId}/quizzes/${quizId}/start`))).data
}
export async function getLearnerQuizAttempt(id: string) {
  return (await request(() => api.get<QuizAttempt>(`/user_quizzes/${id}`))).data
}
export async function answerLearnerQuiz(id: string, questionId: string, optionId: string) {
  return request(() => api.post(`/user_quizzes/${id}/answer`, { answer: { question_id: questionId, option_id: optionId } }))
}
export async function submitLearnerQuiz(id: string) {
  return (await request(() => api.post<{ message: string; status: string; result: string; score: number; total_marks: number; percentage: number }>(`/user_quizzes/${id}/submit`))).data
}
