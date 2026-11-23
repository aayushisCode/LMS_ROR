import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Alert, AppBar, Avatar, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, IconButton, MenuItem, Stack, TextField,
  Toolbar, Typography, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { QuestionDialog } from './admin/questions/QuestionDialog'
import { LessonDialog, type LessonFormValues } from './admin/lessons/LessonDialog'
import { AssignmentDialog } from './admin/assignments/AssignmentDialog'
import {
  Add, AssignmentTurnedIn, BookOutlined, CategoryOutlined, ChevronLeft, ChevronRight, Close,
  DashboardOutlined, GroupsOutlined, LibraryBooksOutlined, Logout, Menu, QuizOutlined, Refresh,
  Search, ShowChart, TaskAlt,
} from '@mui/icons-material'
import { toast } from 'react-toastify'
import { adminApi } from '../api/adminApi'
import { getSession } from '../api/authSession'
import type { Section, DashboardData } from './admin/shared/AdminComponents'
import { OverviewContent } from './admin/overview/OverviewPage'
import { UsersContent } from './admin/users/UsersPage'
import { CategoriesContent } from './admin/categories/CategoriesPage'
import { CoursesContent } from './admin/courses/CoursesPage'
import { LessonsContent } from './admin/lessons/LessonsPage'
import { QuizzesContent } from './admin/quizzes/QuizzesPage'
import { QuestionBankPage } from './admin/question-bank/QuestionBankPage'
import { AssignmentsContent } from './admin/assignments/AssignmentsPage'
import { ProgressContent } from './admin/learner-progress/LearnerProgressPage'

const emptyData: DashboardData = { overview: null, users: [], categories: [], courses: [], lessons: [], quizzes: [], questions: [], assignments: [] }

async function fetchDashboardData(): Promise<{ data: DashboardData; error: string }> {
  const [overview, users, categories, courses, lessons, quizzes, questions, assignments] = await Promise.allSettled([
    adminApi.overview(), adminApi.users(), adminApi.categories(), adminApi.courses(), adminApi.lessons(), adminApi.quizzes(), adminApi.questions(), adminApi.assignments(),
  ])
  const failures: string[] = []
  const pick = <T,>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
    if (result.status === 'fulfilled') return result.value
    failures.push(label)
    return fallback
  }

  return {
    data: {
      overview: pick(overview, null, 'overview'), users: pick(users, [], 'users'), categories: pick(categories, [], 'categories'),
      courses: pick(courses, [], 'courses'), lessons: pick(lessons, [], 'lessons'), quizzes: pick(quizzes, [], 'quizzes'), questions: pick(questions, [], 'questions'),
      assignments: pick(assignments, [], 'assignments'),
    },
    error: failures.length ? `Some data could not be loaded (${failures.join(', ')}). Retry to refresh those sections.` : '',
  }
}

const navigation: { id: Section; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <DashboardOutlined /> },
  { id: 'users', label: 'User Management', icon: <GroupsOutlined /> },
  { id: 'categories', label: 'Categories', icon: <CategoryOutlined /> },
  { id: 'courses', label: 'Courses', icon: <LibraryBooksOutlined /> },
  { id: 'assignments', label: 'Assignments', icon: <AssignmentTurnedIn /> },
  { id: 'lessons', label: 'Lessons', icon: <BookOutlined /> },
  { id: 'quizzes', label: 'Quizzes', icon: <QuizOutlined /> },
  { id: 'questions', label: 'Question bank', icon: <TaskAlt /> },
  { id: 'progress', label: 'Learner progress', icon: <ShowChart /> },
]

const sectionTitles: Record<Section, { title: string; description: string }> = {
  overview: { title: 'Admin overview', description: 'Your learning platform, at a glance.' },
  users: { title: 'User Management', description: 'Review accounts, enrollment totals and learner progress.' },
  categories: { title: 'Categories', description: 'Organize your learning catalog.' },
  courses: { title: 'Courses', description: 'Build and maintain your course library.' },
  assignments: { title: 'Assignments', description: 'Assign published courses to learners and managers.' },
  lessons: { title: 'Lessons', description: 'Review the learning content in your courses.' },
  quizzes: { title: 'Quizzes', description: 'Manage lesson and final course assessments.' },
  questions: { title: 'Question bank', description: 'Review assessment questions returned by the existing question API.' },
  progress: { title: 'Learner progress', description: 'Track course completion and upcoming milestones.' },
}

const createLabels: Partial<Record<Section, string>> = {
  categories: 'Add category', courses: 'Add course', lessons: 'Add lesson', quizzes: 'Add quiz', questions: 'Add question',
}

interface FieldOption { value: string; label: string; courseId?: string }
interface FieldDefinition {
  name: string
  label: string
  required?: boolean
  type?: 'text' | 'email' | 'number' | 'password' | 'select' | 'multiselect' | 'autocomplete'
  options?: FieldOption[]
  multiline?: boolean
  helperText?: string
  dependsOn?: string
  showWhen?: { field: string; value: string }
}


function SectionHeading({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <Box className="section-heading"><Box><Typography component="h2">{title}</Typography><Typography className="section-description">{description}</Typography></Box><Box>{actions}</Box></Box>
}

function EntityDialog({
  open, title, fields, initial, saving, onClose, onSave,
}: {
  open: boolean; title: string; fields: FieldDefinition[]; initial?: Record<string, string>;
  saving: boolean; onClose: () => void; onSave: (values: Record<string, string>) => Promise<void>
}) {
  const [values, setValues] = useState<Record<string, string>>(initial ?? {})
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSave(values)
  }
  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <Box component="form" onSubmit={submit}>
      <DialogTitle className="dialog-title">{title}<IconButton aria-label="Close" onClick={onClose} size="small"><Close /></IconButton></DialogTitle>
      <DialogContent className="dialog-fields">
        {fields.filter(field => !field.showWhen || values[field.showWhen.field] === field.showWhen.value).map(field => field.type === 'autocomplete' ? <Autocomplete
          key={field.name} multiple options={field.options ?? []} getOptionLabel={option => option.label} isOptionEqualToValue={(a, b) => a.value === b.value}
          value={(values[field.name] ? values[field.name].split(',') : []).map(value => field.options?.find(option => option.value === value)).filter((option): option is FieldOption => Boolean(option))}
          onChange={(_, selected) => setValues(current => ({ ...current, [field.name]: selected.map(option => option.value).join(',') }))}
          renderInput={params => <TextField {...params} label={field.label} helperText={field.helperText} />}
        /> : field.type === 'select' || field.type === 'multiselect' ? <TextField
          key={field.name} select fullWidth label={field.label} required={field.required} helperText={field.helperText}
          slotProps={field.type === 'multiselect' ? { select: { multiple: true } } : undefined}
          value={field.type === 'multiselect' ? (values[field.name] ? values[field.name].split(',') : []) : values[field.name] ?? ''}
          onChange={event => setValues(current => {
            const value = Array.isArray(event.target.value) ? event.target.value.join(',') : event.target.value
            const dependentFields = fields.filter(candidate => candidate.dependsOn === field.name)
            const clearOnChange = fields.filter(candidate => candidate.showWhen?.field === field.name && candidate.showWhen.value !== value)
            return { ...current, [field.name]: value, ...Object.fromEntries([...dependentFields, ...clearOnChange].map(candidate => [candidate.name, ''])) }
          })}
        >{field.options?.filter(option => !field.dependsOn || option.courseId === values[field.dependsOn]).map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField> : <TextField
          key={field.name} fullWidth label={field.label} type={field.type ?? 'text'} required={field.required}
          value={values[field.name] ?? ''} multiline={field.multiline} minRows={field.multiline ? 3 : undefined}
          helperText={field.helperText} onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))}
        />)}
      </DialogContent>
      <DialogActions className="dialog-actions"><Button onClick={onClose} disabled={saving} className="secondary-button">Cancel</Button><Button type="submit" variant="contained" disabled={saving} className="primary-button">{saving ? <CircularProgress size={18} color="inherit" /> : 'Save changes'}</Button></DialogActions>
    </Box>
  </Dialog>
}


export default function AdminDashboard() {
  const theme = useTheme()
  const smallScreen = useMediaQuery(theme.breakpoints.down('md'))
  const session = getSession()
  const [section, setSection] = useState<Section>('overview')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)

  const loadData = useCallback(async () => {
    const result = await fetchDashboardData()
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [])

  const refreshData = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      await loadData()
    } finally {
      setRefreshing(false)
    }
  }, [loadData])

  useEffect(() => {
    let active = true
    const initialize = async () => {
      const result = await fetchDashboardData()
      if (!active) return
      setData(result.data)
      setError(result.error)
      setLoading(false)
    }

    void initialize()
    return () => { active = false }
  }, [])

  const title = sectionTitles[section]
  const filteredUsers = useMemo(() => data.users.filter(user => `${user.name ?? ''} ${user.email} ${user.role_name ?? ''}`.toLowerCase().includes(search.toLowerCase())), [data.users, search])
  const filteredCategories = useMemo(() => data.categories.filter(item => `${item.category_name} ${item.description ?? ''}`.toLowerCase().includes(search.toLowerCase())), [data.categories, search])
  const filteredCourses = useMemo(() => data.courses.filter(item => `${item.title} ${item.status}`.toLowerCase().includes(search.toLowerCase())), [data.courses, search])
  const filteredAssignments = useMemo(() => data.assignments.filter(item => `${item.course?.title ?? ''} ${item.user_id} ${item.status}`.toLowerCase().includes(search.toLowerCase())), [data.assignments, search])
  const filteredLessons = useMemo(() => data.lessons.filter(item => `${item.title} ${data.courses.find(course => course.id === item.course_id)?.title ?? ''}`.toLowerCase().includes(search.toLowerCase())), [data.lessons, data.courses, search])
  const filteredQuizzes = useMemo(() => data.quizzes.filter(item => `${item.title} ${item.quiz_type} ${data.courses.find(course => course.id === item.course_id)?.title ?? ''}`.toLowerCase().includes(search.toLowerCase())), [data.quizzes, data.courses, search])
  const filteredQuestions = useMemo(() => data.questions.filter(item => `${item.question_code} ${item.question_text} ${item.question_type} ${item.status}`.toLowerCase().includes(search.toLowerCase())), [data.questions, search])
  const closeDialog = () => { setDialogOpen(false); setEditingId(null) }
  const selectedCategory = editingId ? data.categories.find(item => item.id === editingId) : undefined
  const selectedCourse = editingId ? data.courses.find(item => item.id === editingId) : undefined
  const selectedLesson = editingId ? data.lessons.find(item => item.id === editingId) : undefined
  const selectedQuiz = editingId ? data.quizzes.find(item => item.id === editingId) : undefined

  const categoryFields: FieldDefinition[] = [{ name: 'category_name', label: 'Category name', required: true }, { name: 'description', label: 'Description', multiline: true }]
  const courseFields: FieldDefinition[] = [
    { name: 'title', label: 'Course title', required: true }, { name: 'category_id', label: 'Category', type: 'select', required: true, options: data.categories.map(item => ({ value: item.id, label: item.category_name })) },
    { name: 'status', label: 'Status', type: 'select', required: true, options: ['draft', 'published', 'archived'].map(value => ({ value, label: value })) }, { name: 'description', label: 'Description', multiline: true },
  ]
  const lessonFields: FieldDefinition[] = [
    { name: 'title', label: 'Lesson title', required: true }, { name: 'course_id', label: 'Course', type: 'select', required: true, options: data.courses.map(item => ({ value: item.id, label: item.title })) },
    { name: 'content_type', label: 'Content type', helperText: 'For example: document, video, or interactive' }, { name: 'position', label: 'Position', type: 'number', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: ['active', 'inactive'].map(value => ({ value, label: value })) },
  ]
  const quizFields: FieldDefinition[] = [
    { name: 'title', label: 'Quiz title', required: true }, { name: 'course_id', label: 'Course', type: 'select', required: true, options: data.courses.map(item => ({ value: item.id, label: item.title })) },
    { name: 'quiz_type', label: 'Quiz type', type: 'select', required: true, options: [{ value: 'lesson', label: 'Lesson quiz' }, { value: 'final', label: 'Final quiz' }] },
    { name: 'lesson_id', label: 'Lesson', type: 'select', dependsOn: 'course_id', showWhen: { field: 'quiz_type', value: 'lesson' }, options: data.lessons.map(item => ({ value: item.id, label: item.title, courseId: item.course_id })), helperText: 'Select a lesson from the chosen course.' },
    { name: 'pass_marks', label: 'Pass marks', type: 'number', required: true }, { name: 'description', label: 'Description', multiline: true },
    { name: 'question_ids', label: 'Questions (search by question code or text)', type: 'autocomplete', options: data.questions.filter(q => !q.quiz_id || q.quiz_id === selectedQuiz?.id).map(q => ({ value: q.id, label: `${q.question_code} · ${q.question_text}` })) },
  ]

  const openCreate = () => { setEditingId(null); setDialogOpen(true) }
  const openEdit = (id: string) => { setEditingId(id); setDialogOpen(true) }
  const recordDialog: { title: string; fields: FieldDefinition[]; initial?: Record<string, string> } = section === 'categories' ? { title: editingId ? 'Edit category' : 'New category', fields: categoryFields, initial: selectedCategory ? { category_name: selectedCategory.category_name, description: selectedCategory.description ?? '' } : undefined }
      : section === 'courses' ? { title: editingId ? 'Edit course' : 'New course', fields: courseFields, initial: selectedCourse ? { title: selectedCourse.title, category_id: selectedCourse.category_id, description: selectedCourse.description ?? '', status: selectedCourse.status } : { status: 'draft' } }
        : section === 'lessons' ? { title: editingId ? 'Edit lesson' : 'New lesson', fields: lessonFields, initial: selectedLesson ? { title: selectedLesson.title, course_id: selectedLesson.course_id, content_type: selectedLesson.content_type ?? '', position: String(selectedLesson.position ?? 1), status: selectedLesson.status } : { position: '1', status: 'active' } }
          : section === 'quizzes' ? { title: editingId ? 'Edit quiz' : 'New quiz', fields: quizFields, initial: selectedQuiz ? { title: selectedQuiz.title, course_id: selectedQuiz.course_id, lesson_id: selectedQuiz.lesson_id ?? '', quiz_type: selectedQuiz.quiz_type, pass_marks: String(selectedQuiz.pass_marks), description: selectedQuiz.description ?? '', question_ids: (selectedQuiz.questions ?? []).map(q => q.id).join(',') } : { quiz_type: 'lesson', pass_marks: '0' } }
          : { title: '', fields: [] }

  const saveRecord = async (values: Record<string, string>) => {
    setSaving(true)
    try {
      if (section === 'categories') {
        if (editingId) await adminApi.updateCategory(editingId, values); else await adminApi.createCategory(values)
      } else if (section === 'courses') {
        if (editingId) await adminApi.updateCourse(editingId, values); else await adminApi.createCourse(values)
      } else if (section === 'lessons') {
        const payload = { ...values, position: Number(values.position) }
        if (editingId) await adminApi.updateLesson(editingId, payload); else await adminApi.createLesson(payload)
      } else if (section === 'quizzes') {
        const payload: Record<string, unknown> = { ...values, pass_marks: Number(values.pass_marks), lesson_id: values.lesson_id || null, question_ids: values.question_ids ? values.question_ids.split(',') : [] }
        if (editingId) await adminApi.updateQuiz(editingId, payload); else await adminApi.createQuiz(payload)
      } else {
        const questionType = values.question_type
        const count = questionType === 'mcq' ? 4 : 2
        const currentOptions = editingId ? data.questions.find(q => q.id === editingId)?.options ?? [] : []
        const payload: Record<string, unknown> = {
          course_id: values.course_id, question_text: values.question_text, question_type: questionType,
          marks: Number(values.marks), status: values.status, correct_option_position: Number(values.correct_option_position),
          options_attributes: Array.from({ length: count }, (_, index) => ({
            ...(currentOptions.find(option => option.position === index + 1)?.id ? { id: currentOptions.find(option => option.position === index + 1)?.id } : {}),
            option_text: values[`option_${index + 1}`], position: index + 1,
          })),
        }
        if (editingId) await adminApi.updateQuestion(editingId, payload); else await adminApi.createQuestion(payload)
      }
      toast.success(editingId ? 'Changes saved.' : 'Record created.')
      closeDialog()
      await refreshData()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Could not save record.') }
    finally { setSaving(false) }
  }

  const saveLesson = async (values: LessonFormValues) => {
    setSaving(true)
    try {
      const payload = {
        course_id: values.course_id, title: values.title, content_type: values.content_type,
        position: values.position, status: values.status,
        lesson_pages_attributes: values.lesson_pages.map((page, index) => ({ ...page, position: index + 1 })),
      }
      if (editingId) await adminApi.updateLesson(editingId, payload)
      else await adminApi.createLesson(payload)
      toast.success(editingId ? 'Lesson updated.' : 'Lesson created.')
      closeDialog()
      await refreshData()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Could not save lesson.') }
    finally { setSaving(false) }
  }

  const deleteRecord = async (id: string) => {
    if (!window.confirm('Delete this record? This may fail if it is still in use.')) return
    try {
      if (section === 'categories') await adminApi.deleteCategory(id)
      else if (section === 'courses') await adminApi.deleteCourse(id)
      else if (section === 'lessons') await adminApi.deleteLesson(id)
      else if (section === 'quizzes') await adminApi.deleteQuiz(id)
      else if (section === 'assignments' || section === 'progress') await adminApi.deleteAssignment(id)
      toast.success('Record deleted.')
      await refreshData()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Could not delete record.') }
  }

  const saveAssignment = async (values: Record<string, string>) => {
    setSaving(true)
    try {
      await adminApi.createAssignment({
        filter_type: 'user', category_id: values.category_id, course_id: values.course_id,
        user_ids: values.user_ids ? values.user_ids.split(',').filter(Boolean) : [],
      })
      toast.success('Course assigned successfully.')
      setAssignmentDialogOpen(false)
      await refreshData()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Could not create assignment.') }
    finally { setSaving(false) }
  }

  const sidebarContent = <Box className={`admin-sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <Box className="sidebar-brand"><img src="https://quickinsure.co.in/static/images/quickinsure-logo.svg" alt="QuickInsure Logo" />{!sidebarCollapsed && <Typography><small>ADMIN CONSOLE</small></Typography>}</Box>
    {!sidebarCollapsed && <Typography className="sidebar-label">WORKSPACE</Typography>}
    <Box className="nav-list">{navigation.map(item => <Button key={item.id} className={`nav-item ${section === item.id ? 'nav-active' : ''}`} onClick={() => { setSection(item.id); setSearch(''); setDrawerOpen(false) }} title={sidebarCollapsed ? item.label : undefined}>{item.icon}{!sidebarCollapsed && <span>{item.label}</span>}{section === item.id && !sidebarCollapsed && <Box className="nav-indicator" />}</Button>)}</Box>
    <Box className="sidebar-bottom">{!sidebarCollapsed && <Box className="sidebar-help"><Box className="help-icon">?</Box><Typography>Need a hand?<small>Contact platform support</small></Typography><ChevronRight fontSize="small" /></Box>}<Button className="profile-row" onClick={() => { void adminApi.signOut().catch((cause: unknown) => toast.error(cause instanceof Error ? cause.message : 'Signed out locally.')).finally(() => window.location.assign('/login')) }}><Avatar className="profile-avatar">{session?.email.slice(0, 1).toUpperCase()}</Avatar>{!sidebarCollapsed && <><span className="profile-copy"><b>{session?.email.split('@')[0]}</b><small>Administrator</small></span><Logout fontSize="small" /></>}</Button></Box>
  </Box>

  if (!session || session.role.toLowerCase() !== 'admin') return <Box className="admin-denied"><Alert severity="error">Administrator access is required to view this page.</Alert></Box>

  return <Box className="admin-layout">
    {smallScreen ? <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} slotProps={{ paper: { className: 'mobile-sidebar' } }}>{sidebarContent}</Drawer> : <Box className={`sidebar-wrap ${sidebarCollapsed ? 'sidebar-wrap-collapsed' : ''}`}>{sidebarContent}<IconButton className="sidebar-toggle" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}</IconButton></Box>}
    <Box className="admin-main">
      <AppBar position="sticky" elevation={0} className="admin-appbar"><Toolbar className="toolbar-content">{smallScreen && <IconButton onClick={() => setDrawerOpen(true)} aria-label="Open navigation"><Menu /></IconButton>}<Box className="breadcrumbs"><Typography>Workspace</Typography><ChevronRight fontSize="small" /><b>{title.title}</b></Box><Box className="toolbar-spacer" /><IconButton className="toolbar-icon" onClick={() => void refreshData()} aria-label="Refresh data"><Refresh /></IconButton><Divider orientation="vertical" flexItem className="toolbar-divider" /><Avatar className="toolbar-avatar">{session.email.slice(0, 1).toUpperCase()}</Avatar><Box className="toolbar-user"><b>{session.email.split('@')[0]}</b><small>Administrator</small></Box></Toolbar></AppBar>
      <Box className="page-content">
        {error && <Alert severity="warning" className="load-warning" action={<Button color="inherit" size="small" onClick={() => void refreshData()}>Retry</Button>}>{error}</Alert>}
        <SectionHeading
          title={title.title}
          description={title.description}
          actions={section !== 'overview' && section !== 'progress' ? (
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Search records"
                value={search}
                onChange={event => setSearch(event.target.value)}
                slotProps={{ input: { startAdornment: <Search fontSize="small" />, className: 'search-field' } }}
              />
              {section === 'assignments' ? (
                <Button startIcon={<Add />} variant="contained" onClick={() => setAssignmentDialogOpen(true)} className="primary-button">Assign course</Button>
              ) : section === 'questions' ? (
                <Button startIcon={<Add />} variant="contained" onClick={openCreate} className="primary-button">Add question</Button>
              ) : section === 'users' ? null : (
                <Button startIcon={<Add />} variant="contained" onClick={openCreate} className="primary-button">{createLabels[section] ?? 'Add record'}</Button>
              )}
            </Stack>
          ) : (
            <Button startIcon={<Refresh />} onClick={() => void refreshData()} disabled={refreshing} className="refresh-button">{refreshing ? 'Refreshing' : 'Refresh'}</Button>
          )}
        />
        {section === 'overview' && <OverviewContent data={data} loading={loading} refreshing={refreshing} onSection={setSection} onRefresh={() => void refreshData()} />}
        {section === 'users' && <UsersContent rows={filteredUsers} loading={loading} onRefresh={refreshData} />}
        {section === 'categories' && <CategoriesContent rows={filteredCategories} loading={loading} onEdit={openEdit} onDelete={deleteRecord} />}
        {section === 'courses' && <CoursesContent rows={filteredCourses} categories={data.categories} loading={loading} onEdit={openEdit} onDelete={deleteRecord} />}
        {section === 'assignments' && <AssignmentsContent rows={filteredAssignments} users={data.users} loading={loading} onDelete={deleteRecord} />}
        {section === 'lessons' && <LessonsContent rows={filteredLessons} courses={data.courses} loading={loading} onEdit={openEdit} onDelete={deleteRecord} />}
        {section === 'quizzes' && <QuizzesContent rows={filteredQuizzes} courses={data.courses} loading={loading} onEdit={openEdit} onDelete={deleteRecord} />}
        {section === 'questions' && <QuestionBankPage categories={data.categories} courses={data.courses} quizzes={data.quizzes} rows={filteredQuestions} loading={loading} onEdit={openEdit} onToggle={async row => { await adminApi.updateQuestion(row.id, { status: row.status === 'active' ? 'inactive' : 'active' }); await refreshData() }} />}
        {section === 'progress' && <ProgressContent rows={filteredAssignments} users={data.users} loading={loading} onDelete={deleteRecord} />}
      </Box>
    </Box>
    {section === 'questions' ? <QuestionDialog key={`${dialogOpen}-${editingId ?? 'new'}`} open={dialogOpen} question={data.questions.find(q => q.id === editingId)} courses={data.courses} saving={saving} onClose={closeDialog} onSave={saveRecord} /> : section === 'lessons' ? <LessonDialog key={`${dialogOpen}-${editingId ?? 'new'}`} open={dialogOpen} lesson={selectedLesson} courses={data.courses} saving={saving} onClose={closeDialog} onSave={saveLesson} /> : section !== 'users' && <EntityDialog key={`${dialogOpen}-${section}-${editingId ?? 'new'}`} open={dialogOpen} title={recordDialog.title} fields={recordDialog.fields} initial={recordDialog.initial} saving={saving} onClose={closeDialog} onSave={saveRecord} />}
    <AssignmentDialog key={String(assignmentDialogOpen)} open={assignmentDialogOpen} saving={saving} categories={data.categories} courses={data.courses} users={data.users} onClose={() => setAssignmentDialogOpen(false)} onSave={saveAssignment} />
  </Box>
}

