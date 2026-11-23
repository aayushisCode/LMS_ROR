import axios from 'axios'
import api from './axios'
import { clearSession, getToken } from './authSession'

export interface UserRecord {
  id: string
  email: string
  name?: string
  address?: string
  contact?: string
  active: boolean
  status: 'active' | 'inactive' | string
  enrolled_course_count: number
  role_id: string | number | null
  role_name: string
}

export interface UserCourseProfile {
  id: string
  title: string
  status: string
  progress_percentage: number
  completed_lessons: number
  total_lessons: number
  assigned_at?: string | null
  due_date?: string | null
  completed_at?: string | null
}

export interface UserProfile {
  user: UserRecord
  courses: UserCourseProfile[]
  completed_courses: UserCourseProfile[]
  pending_courses: UserCourseProfile[]
}

export interface CategoryRecord {
  id: string
  category_name: string
  description?: string | null
}

export interface CourseRecord {
  id: string
  category_id: string
  title: string
  description?: string | null
  status: 'draft' | 'published' | 'archived' | string
}

export interface LessonRecord {
  id: string
  course_id: string
  title: string
  content_type?: string | null
  position?: number
  total_pages?: number
  status: 'active' | 'inactive' | string
  lesson_pages?: { id: string; title: string; topic?: string | null; content?: string | null; metadata?: Record<string, unknown>; position: number }[]
}

export interface QuizRecord {
  id: string
  course_id: string
  lesson_id?: string | null
  title: string
  quiz_type: 'lesson' | 'final' | string
  pass_marks: number
  description?: string | null
  questions?: QuestionRecord[]
}

export interface QuestionRecord {
  id: string
  question_code: string
  quiz_id: string | null
  course_id: string
  category_id: string
  question_text: string
  question_type: string
  correct_option_id?: string | null
  marks: number
  position: number | null
  status: string
  options?: { id: string; option_text: string; position: number }[]
}

export interface LessonProgressRecord {
  id: string
  title: string
  position?: number
  lesson_progress?: { status?: string; progress_percentage?: number; completed_pages?: number; total_pages?: number }
  lesson_quiz?: { id?: string; title?: string; status?: string; result?: string | null; score?: number | null; total_marks?: number | null; percentage?: number | null }
  lesson_pages?: { id: string; title: string; content?: string | null; position: number; user_lesson_progress?: { completed: boolean } }[]
}

export interface AssignmentRecord {
  id: string
  user_id: string
  course_id: string
  status: string
  progress_percentage: number
  completed_lessons?: number
  total_lessons?: number
  due_date?: string | null
  completed_at?: string | null
  resume_position?: { lesson_id: string; page_number: number; page_id: string } | null
  final_quiz?: { id?: string; quiz_id?: string; title?: string; quiz_title?: string; status: string; result?: string | null; score?: number | null; total_marks?: number | null; percentage?: number | null } | null
  course?: { id: string; title: string; description?: string | null; lessons?: LessonProgressRecord[]; final_quiz?: { id: string; title: string; status: string; result?: string | null } | null }
}

export interface OverviewRecord {
  total_users: number
  total_managers: number
  total_learners: number
  total_categories: number
  total_courses: number
  total_lessons: number
  total_quizzes: number
  total_questions: number
  total_assignments: number
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      clearSession()
      window.location.assign('/login')
      return 'Your session expired. Please sign in again.'
    }
    const body: unknown = error.response?.data
    if (body && typeof body === 'object') {
      const message = 'msg' in body ? body.msg : 'error' in body ? body.error : undefined
      if (typeof message === 'string') return message
      const errors = 'errors' in body ? body.errors : undefined
      if (Array.isArray(errors)) return errors.map(String).join(', ')
    }
    return error.message || 'The request could not be completed.'
  }
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

export async function request<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new Error(errorMessage(error), { cause: error })
  }
}

export const adminApi = {
  async overview() {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined || '').replace(/\/api\/?$/, '')
    const token = getToken()
    const response = await request(() => axios.get<{ data: { overview: OverviewRecord } }>(`${base}/admin`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      timeout: 10000,
    }))
    return response.data.data.overview
  },
  async users() { return (await request(() => api.get<{ data: UserRecord[] }>('/users'))).data.data },
  async userProfile(id: string) { return (await request(() => api.get<{ data: UserProfile }>(`/users/${id}`))).data.data },
  async setUserActive(id: string, active: boolean) { return request(() => api.patch(`/users/${id}/status`, { active })) },
  async categories() { return (await request(() => api.get<{ data: CategoryRecord[] }>('/categories'))).data.data },
  async courses() { return (await request(() => api.get<{ data: CourseRecord[] }>('/courses'))).data.data },
  async lessons() {
    const payload = (await request(() => api.get<{ data: LessonRecord[] | { data: LessonRecord[] } }>('/lessons'))).data.data
    return Array.isArray(payload) ? payload : payload.data
  },
  async quizzes() { return (await request(() => api.get<{ data: QuizRecord[] }>('/quizzes'))).data.data },
  async questions(search = '') { return (await request(() => api.get<{ data: QuestionRecord[] }>('/questions', { params: search ? { search } : undefined }))).data.data },
  async createQuestion(payload: Record<string, unknown>) { return request(() => api.post('/questions', { question: payload })) },
  async updateQuestion(id: string, payload: Record<string, unknown>) { return request(() => api.patch(`/questions/${id}`, { question: payload })) },
  async assignments() { return (await request(() => api.get<{ data: AssignmentRecord[] }>('/user_courses'))).data.data },
  async createCategory(payload: Record<string, unknown>) { return request(() => api.post('/categories', { category: payload })) },
  async updateCategory(id: string, payload: Record<string, unknown>) { return request(() => api.patch(`/categories/${id}`, { category: payload })) },
  async deleteCategory(id: string) { return request(() => api.delete(`/categories/${id}`)) },
  async createCourse(payload: Record<string, unknown>) { return request(() => api.post('/courses', { course: payload })) },
  async updateCourse(id: string, payload: Record<string, unknown>) { return request(() => api.patch(`/courses/${id}`, { course: payload })) },
  async deleteCourse(id: string) { return request(() => api.delete(`/courses/${id}`)) },
  async createLesson(payload: Record<string, unknown>) { return request(() => api.post('/lessons', { lesson: payload })) },
  async updateLesson(id: string, payload: Record<string, unknown>) { return request(() => api.patch(`/lessons/${id}`, { lesson: payload })) },
  async deleteLesson(id: string) { return request(() => api.delete(`/lessons/${id}`)) },
  async createQuiz(payload: Record<string, unknown>) { return request(() => api.post('/quizzes', { quiz: payload })) },
  async updateQuiz(id: string, payload: Record<string, unknown>) { return request(() => api.patch(`/quizzes/${id}`, { quiz: payload })) },
  async deleteQuiz(id: string) { return request(() => api.delete(`/quizzes/${id}`)) },
  async createAssignment(payload: Record<string, unknown>) { return request(() => api.post('/user_courses', { user_course: payload })) },
  async deleteAssignment(id: string) { return request(() => api.delete(`/user_courses/${id}`)) },
  async signOut() {
    try {
      const base = (import.meta.env.VITE_API_BASE_URL as string | undefined || '').replace(/\/api\/?$/, '')
      const token = getToken()
      await request(() => axios.delete(`${base}/users/sign_out`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeout: 10000,
      }))
    } finally {
      clearSession()
      delete api.defaults.headers.common.Authorization
    }
  },
}
