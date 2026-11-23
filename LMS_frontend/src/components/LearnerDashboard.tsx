import { useEffect, useMemo, useState } from 'react'
import {
  Alert, AppBar, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, LinearProgress, Paper, Stack, Toolbar, Typography,
  TextField, InputAdornment,
} from '@mui/material'
import type { ReactNode } from 'react'
import { ArrowBack, ArrowForward, Close, Logout, MenuBookOutlined, Refresh, Search } from '@mui/icons-material'
import { clearSession, getSession } from '../api/authSession'
import { answerLearnerQuiz, clearSavedLearnerQuizAttempt, getLearnerQuizAttempt, getMyAssignments, getLearnerLesson, getMyProfile, getSavedLearnerQuizAttempt, navigateLearnerLesson, saveLearnerQuizAttempt, startLearnerQuiz, submitLearnerQuiz, type LearnerLessonDetail, type QuizAttempt } from '../api/learnerApi'
import type { AssignmentRecord, LessonProgressRecord } from '../api/adminApi'

interface LessonTarget { assignment: AssignmentRecord; lesson: LessonProgressRecord; pageNumber: number }

export default function LearnerDashboard() {
  const session = getSession()
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [player, setPlayer] = useState<LessonTarget | null>(null)
  const [lessonDetail, setLessonDetail] = useState<LearnerLessonDetail | null>(null)
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerError, setPlayerError] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [lessonCompleted, setLessonCompleted] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [profile, setProfile] = useState<{ name: string; email: string; address: string; contact: string } | null>(null)
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null)
  const [quizResult, setQuizResult] = useState<{ result: string; score: number; total_marks: number; percentage: number } | null>(null)
  const [quizBusy, setQuizBusy] = useState(false)
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0)

  const loadAssignments = async (): Promise<AssignmentRecord[] | undefined> => {
    setError('')
    try { const result = await getMyAssignments(); setAssignments(result); return result }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load your courses.') }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => {
    void loadAssignments()
    if (session?.user?.id) void getMyProfile(String(session.user.id)).then(data => setProfile(data.user)).catch(() => undefined)
  }, [])

  const lessons = useMemo(() => assignments.flatMap(assignment => (assignment.course?.lessons ?? []).map(lesson => ({ assignment, lesson }))), [assignments])
  const completedLessons = lessons.filter(({ lesson }) => lesson.lesson_progress?.status === 'completed')
  const pendingLessons = lessons.filter(({ lesson }) => lesson.lesson_progress?.status !== 'completed')
  const pendingQuizzes = assignments.flatMap(assignment => [
    ...(assignment.course?.lessons ?? []).flatMap(lesson => lesson.lesson_quiz && ['Not Started', 'In Progress', 'Failed'].includes(lesson.lesson_quiz.status ?? 'Not Started')
      ? [{ assignment, title: lesson.lesson_quiz.title ?? `${lesson.title} quiz`, status: lesson.lesson_quiz.status ?? 'Not Started' }]
      : []),
    ...(assignment.final_quiz && ['Not Started', 'In Progress', 'Failed'].includes(assignment.final_quiz.status)
      ? [{ assignment, title: assignment.final_quiz.title ?? assignment.final_quiz.quiz_title ?? 'Final quiz', status: assignment.final_quiz.status }]
      : []),
  ])
  const quizResults = assignments.flatMap(assignment => [
    ...(assignment.course?.lessons ?? []).flatMap(lesson => lesson.lesson_quiz?.result
      ? [{ courseTitle: assignment.course?.title ?? 'Course', title: lesson.lesson_quiz.title ?? `${lesson.title} quiz`, result: lesson.lesson_quiz.result, score: lesson.lesson_quiz.score, total: lesson.lesson_quiz.total_marks, percentage: lesson.lesson_quiz.percentage }]
      : []),
    ...(assignment.final_quiz?.result
      ? [{ courseTitle: assignment.course?.title ?? 'Course', title: assignment.final_quiz.title ?? assignment.final_quiz.quiz_title ?? 'Final quiz', result: assignment.final_quiz.result, score: assignment.final_quiz.score, total: assignment.final_quiz.total_marks, percentage: assignment.final_quiz.percentage }]
      : []),
  ])

  const startLesson = async (assignment: AssignmentRecord, lesson: LessonProgressRecord, preferredPage = 1) => {
    setQuizAttempt(null); setQuizResult(null)
    setPlayer({ assignment, lesson, pageNumber: preferredPage })
    setLessonDetail(null)
    setPlayerError('')
    setLessonCompleted(false)
    setPageNumber(preferredPage)
    setPlayerLoading(true)
    try {
      const detail = await getLearnerLesson(lesson.id, assignment.id)
      setLessonDetail(detail)
      setPageNumber(Math.min(Math.max(preferredPage, 1), Math.max(detail.lesson_pages_count, 1)))
    } catch (cause) { setPlayerError(cause instanceof Error ? cause.message : 'Could not open this lesson.') }
    finally { setPlayerLoading(false) }
  }

  const openQuiz = async (assignment: AssignmentRecord, quizId: string) => {
    setPlayer({ assignment, lesson: assignment.course?.lessons?.[0] as LessonProgressRecord, pageNumber: 1 })
    setLessonDetail(null); setPlayerError(''); setQuizResult(null); setQuizAttempt(null); setQuizQuestionIndex(0); setQuizBusy(true)
    try {
      let attempt: QuizAttempt | null = null
      const savedAttemptId = getSavedLearnerQuizAttempt(assignment.id, quizId)
      if (savedAttemptId) {
        try {
          const savedAttempt = await getLearnerQuizAttempt(savedAttemptId)
          if (savedAttempt.status === 'in_progress' && savedAttempt.questions.length) attempt = savedAttempt
          else clearSavedLearnerQuizAttempt(assignment.id, quizId)
        } catch {
          clearSavedLearnerQuizAttempt(assignment.id, quizId)
        }
      }
      if (!attempt) {
        const started = await startLearnerQuiz(assignment.id, quizId)
        saveLearnerQuizAttempt(assignment.id, quizId, started.user_quiz_id)
        attempt = await getLearnerQuizAttempt(started.user_quiz_id)
      }
      if (!attempt.questions.length) throw new Error('This quiz attempt has no questions available. Please retry or contact support.')
      setQuizAttempt(attempt)
    } catch (cause) { setPlayerError(cause instanceof Error ? cause.message : 'Unable to start quiz.') }
    finally { setQuizBusy(false) }
  }

  const saveQuizAnswer = async (questionId: string, optionId: string) => {
    if (!quizAttempt) return
    setQuizBusy(true)
    try {
      await answerLearnerQuiz(quizAttempt.id, questionId, optionId)
      setQuizAttempt(current => current ? { ...current, answers: [...(current.answers ?? []).filter(answer => answer.question_id !== questionId), { question_id: questionId, option_id: optionId }] } : current)
    } catch (cause) { setPlayerError(cause instanceof Error ? cause.message : 'Unable to save answer.') }
    finally { setQuizBusy(false) }
  }

  const finishQuiz = async () => {
    if (!quizAttempt) return
    setQuizBusy(true)
    try {
      const result = await submitLearnerQuiz(quizAttempt.id)
      setQuizResult(result); setQuizAttempt(current => current ? { ...current, status: 'submitted' } : current)
      if (player) clearSavedLearnerQuizAttempt(player.assignment.id, quizAttempt.quiz_id)
      const refreshed = await loadAssignments()
      const assignment = refreshed?.find(item => item.id === player?.assignment.id)
      if (assignment) setPlayer(current => current ? { ...current, assignment } : current)
    } catch (cause) { setPlayerError(cause instanceof Error ? cause.message : 'Unable to submit quiz.') }
    finally { setQuizBusy(false) }
  }

  const continueCourse = async (assignment: AssignmentRecord) => {
    const resume = assignment.resume_position
    const lesson = assignment.course?.lessons?.find(item => item.id === resume?.lesson_id)
      ?? assignment.course?.lessons?.find(item => item.lesson_pages?.length)
    if (!lesson) return
    await startLesson(assignment, lesson, resume?.lesson_id === lesson.id ? resume.page_number : 1)
  }

  const movePage = async (direction: 'forward' | 'backward') => {
    if (!player || !lessonDetail) return
    setSavingProgress(true)
    setPlayerError('')
    try {
      const response = await navigateLearnerLesson(player.assignment.id, lessonDetail.id, pageNumber, direction)
      if (response.lesson_completed) {
        setLessonCompleted(true)
        const refreshed = await loadAssignments()
        const assignment = refreshed?.find(item => item.id === player.assignment.id)
        if (assignment) setPlayer(current => current ? { ...current, assignment } : current)
      } else if (response.page_number) {
        setPageNumber(response.page_number)
      }
    } catch (cause) { setPlayerError(cause instanceof Error ? cause.message : 'Unable to update lesson progress.') }
    finally { setSavingProgress(false) }
  }

  const currentPage = lessonDetail?.lesson_pages.find(page => page.position === pageNumber)
  const currentQuizQuestion = quizAttempt?.questions[quizQuestionIndex]
  const totalCourses = assignments.length
  const completeCourses = assignments.filter(assignment => assignment.status === 'completed').length
  const overallProgress = totalCourses ? Math.round(assignments.reduce((sum, assignment) => sum + assignment.progress_percentage, 0) / totalCourses) : 0
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = (assignment.course?.title ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = courseFilter === 'all' || (courseFilter === 'completed' ? assignment.status === 'completed' : assignment.status !== 'completed')
    return matchesSearch && matchesStatus
  })

  return <Box sx={{ minHeight: '100vh', bgcolor: '#f6f8f5' }}>
    <AppBar position="sticky" elevation={0} color="inherit" sx={{ borderBottom: '1px solid #e8ece7' }}>
      <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto' }}>
        <img src="https://quickinsure.co.in/static/images/quickinsure-logo.svg" alt="QuickInsure" style={{ width: 144, marginRight: 20 }} />
        <Typography sx={{ fontWeight: 700 }}>Learning dashboard</Typography><Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={() => { setRefreshing(true); void loadAssignments() }} aria-label="Refresh dashboard"><Refresh /></IconButton>
        <Button startIcon={<Logout />} onClick={() => { clearSession(); window.location.assign('/login') }}>Sign out</Button>
      </Toolbar>
    </AppBar>
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <Box><Typography variant="overline" color="success.main">LEARNER WORKSPACE</Typography><Typography variant="h4" sx={{ fontWeight: 750 }}>Welcome, {profile?.name ?? session?.user?.email ?? session?.email}</Typography><Typography color="text.secondary">Pick up where you left off or review your course progress.</Typography></Box>
        {refreshing && <CircularProgress size={22} />}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={() => { setLoading(true); void loadAssignments() }}>Retry</Button>}>{error}</Alert>}
      {loading ? <LinearProgress /> : <>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <Metric label="Enrolled courses" value={totalCourses} />
          <Metric label="Course completion" value={`${overallProgress}%`} />
          <Metric label="Completed lessons" value={completedLessons.length} />
          <Metric label="Pending quizzes" value={pendingQuizzes.length} />
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField size="small" fullWidth placeholder="Search your courses" value={search} onChange={event => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
          <Stack direction="row" spacing={1}>{[['all', 'All courses'], ['pending', 'In progress'], ['completed', 'Completed']].map(([value, label]) => <Chip key={value} label={label} clickable color={courseFilter === value ? 'success' : 'default'} variant={courseFilter === value ? 'filled' : 'outlined'} onClick={() => setCourseFilter(value)} />)}</Stack>
        </Stack>
        <Stack spacing={2}>
          {filteredAssignments.map(assignment => <Card key={assignment.id} elevation={0} sx={{ border: '1px solid #e4e9e3', borderRadius: 3, overflow: 'hidden' }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                <Box sx={{ width: { sm: 124 }, height: { xs: 110, sm: 82 }, flexShrink: 0, borderRadius: 2, bgcolor: '#e8f3eb', display: 'grid', placeItems: 'center', color: '#247447' }}><MenuBookOutlined sx={{ fontSize: 38 }} /></Box>
                <Box sx={{ flex: 1 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Typography variant="h6" sx={{ fontWeight: 700 }}>{assignment.course?.title ?? 'Course'}</Typography><Chip size="small" label={assignment.status === 'completed' ? 'Completed' : assignment.progress_percentage > 0 ? 'In Progress' : 'Not Started'} color={assignment.status === 'completed' ? 'success' : 'default'} /></Stack><Typography color="text.secondary" variant="body2">{assignment.completed_lessons ?? 0} of {assignment.total_lessons ?? assignment.course?.lessons?.length ?? 0} lessons completed · {assignment.progress_percentage ?? 0}%</Typography><LinearProgress variant="determinate" value={Math.max(0, Math.min(100, assignment.progress_percentage ?? 0))} sx={{ mt: 1.5, height: 8, borderRadius: 5 }} /></Box>
                <Button variant="contained" startIcon={<MenuBookOutlined />} disabled={!assignment.course?.lessons?.some(lesson => lesson.lesson_pages?.length)} onClick={() => void continueCourse(assignment)}>Continue Learning</Button>
              </Stack>
            </CardContent>
          </Card>)}
          {!filteredAssignments.length && <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}><Typography variant="h6">{assignments.length ? 'No matching courses' : 'No courses assigned yet'}</Typography><Typography color="text.secondary">{assignments.length ? 'Try another search or filter.' : 'Your courses will appear here when you are enrolled.'}</Typography></Paper>}
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 3 }}>
          <DataPanel title="Pending lessons" empty={!pendingLessons.length}>{pendingLessons.map(({ assignment, lesson }) => <Stack key={`${assignment.id}-${lesson.id}`} direction="row" sx={{ py: 1, borderBottom: '1px solid #edf0ec', justifyContent: 'space-between', alignItems: 'center' }}><Box><Typography sx={{ fontWeight: 600 }}>{lesson.title}</Typography><Typography variant="caption" color="text.secondary">{assignment.course?.title} · {lesson.lesson_progress?.completed_pages ?? 0}/{lesson.lesson_progress?.total_pages ?? lesson.lesson_pages?.length ?? 0} pages</Typography></Box><Button size="small" onClick={() => void startLesson(assignment, lesson)}>Open</Button></Stack>)}</DataPanel>
          <DataPanel title="Completed lessons" empty={!completedLessons.length}>{completedLessons.map(({ assignment, lesson }) => <Box key={`${assignment.id}-${lesson.id}`} sx={{ py: 1, borderBottom: '1px solid #edf0ec' }}><Typography sx={{ fontWeight: 600 }}>{lesson.title}</Typography><Typography variant="caption" color="text.secondary">{assignment.course?.title}</Typography></Box>)}</DataPanel>
          <DataPanel title="Pending quizzes" empty={!pendingQuizzes.length}>{pendingQuizzes.map((quiz, index) => <Box key={`${quiz.assignment.id}-${quiz.title}-${index}`} sx={{ py: 1, borderBottom: '1px solid #edf0ec' }}><Typography sx={{ fontWeight: 600 }}>{quiz.title}</Typography><Typography variant="caption" color="text.secondary">{quiz.assignment.course?.title} · {quiz.status.replaceAll('_', ' ')}</Typography></Box>)}</DataPanel>
          <DataPanel title="Quiz results" empty={!quizResults.length}>{quizResults.map((result, index) => <Stack key={`${result.courseTitle}-${result.title}-${index}`} direction="row" sx={{ py: 1, borderBottom: '1px solid #edf0ec', justifyContent: 'space-between' }}><Box><Typography sx={{ fontWeight: 600 }}>{result.title}</Typography><Typography variant="caption" color="text.secondary">{result.courseTitle}</Typography></Box><Stack sx={{ alignItems: 'flex-end' }}><Chip size="small" label={result.result} color={result.result === 'pass' ? 'success' : result.result === 'fail' ? 'error' : 'default'} />{result.score !== null && result.score !== undefined && <Typography variant="caption">{result.score}/{result.total ?? 0} · {result.percentage ?? 0}%</Typography>}</Stack></Stack>)}</DataPanel>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>Completed courses: {completeCourses} · Overall progress across enrolled courses: {overallProgress}%</Typography>
        <Paper elevation={0} sx={{ p: 2.5, mt: 2, border: '1px solid #e4e9e3', borderRadius: 3 }}><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>My profile</Typography><Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.5, md: 4 }}><Typography><b>{profile?.name ?? 'Learner'}</b></Typography><Typography color="text.secondary">{profile?.email ?? session?.email}</Typography><Typography color="text.secondary">{profile?.contact ?? 'Contact details unavailable'}</Typography><Typography color="text.secondary">{profile?.address ?? 'Address unavailable'}</Typography></Stack><Typography variant="subtitle2" sx={{ mt: 2, mb: .5 }}>Course history · {completeCourses} completed · {totalCourses - completeCourses} pending</Typography>{assignments.map(assignment => <Stack key={assignment.id} direction="row" sx={{ py: .75, borderTop: '1px solid #edf0ec', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="body2">{assignment.course?.title ?? 'Course'}</Typography><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Typography variant="caption" color="text.secondary">{assignment.progress_percentage ?? 0}%</Typography><Chip size="small" label={assignment.status === 'completed' ? 'Completed' : 'Pending'} color={assignment.status === 'completed' ? 'success' : 'default'} /></Stack></Stack>)}</Paper>
      </>}
    </Box>

    <Dialog open={Boolean(player)} onClose={() => { setPlayer(null); setLessonDetail(null) }} fullWidth maxWidth="lg">
      <DialogTitle>{player?.assignment.course?.title ?? lessonDetail?.title ?? 'Course learning'}<IconButton aria-label="Close" onClick={() => { setPlayer(null); setLessonDetail(null) }} sx={{ position: 'absolute', right: 12, top: 12 }}><Close /></IconButton></DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' }, gap: 2, minHeight: 380 }}>
          {quizAttempt ? <Paper variant="outlined" sx={{ p: 1.5, alignSelf: 'start' }}><Typography variant="subtitle2" sx={{ px: 1, pb: 1 }}>QUESTIONS</Typography><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }}>{quizAttempt.questions.map((question, index) => {
            const answered = quizAttempt.answers?.some(answer => answer.question_id === question.id)
            return <Button key={question.id} variant={quizQuestionIndex === index ? 'contained' : 'outlined'} color={answered ? 'success' : 'inherit'} onClick={() => setQuizQuestionIndex(index)} sx={{ minWidth: 0, px: 1 }}>{index + 1}{answered ? ' ✓' : ''}</Button>
          })}</Box></Paper> : <Paper variant="outlined" sx={{ p: 1.5, maxHeight: { md: 520 }, overflowY: 'auto' }}><Typography variant="subtitle2" sx={{ px: 1, pb: 1 }}>COURSE CONTENT</Typography>{player?.assignment.course?.lessons?.map((item, index) => {
            const prior = player.assignment.course?.lessons?.slice(0, index) ?? []
            const unlocked = prior.every(previous => previous.lesson_progress?.status === 'completed')
            return <Box key={item.id}><Button fullWidth variant={item.id === lessonDetail?.id ? 'contained' : 'text'} disabled={!unlocked || playerLoading} onClick={() => void startLesson(player.assignment, item)} sx={{ justifyContent: 'flex-start', textAlign: 'left', mb: .5, textTransform: 'none' }}><Box><Typography variant="body2">{index + 1}. {item.title}</Typography><Typography variant="caption">{item.lesson_progress?.status?.replaceAll('_', ' ') ?? 'Not Started'} · Quiz {item.lesson_quiz?.status ?? 'Not Available'}</Typography></Box></Button>
            {item.lesson_quiz?.id && <Button fullWidth size="small" disabled={item.lesson_progress?.completed_pages !== item.lesson_progress?.total_pages || playerLoading || item.lesson_quiz?.result === 'pass'} onClick={() => player && item.lesson_quiz?.id && void openQuiz(player.assignment, item.lesson_quiz.id)} sx={{ justifyContent: 'flex-start', pl: 3, mb: .5 }}>↳ Quiz · {item.lesson_quiz?.result === 'pass' ? 'Passed' : item.lesson_quiz?.status ?? 'Not Started'}</Button>}</Box>
          })}{player?.assignment.course?.final_quiz && <Button fullWidth disabled={!player.assignment.course.lessons?.every(item => item.lesson_progress?.status === 'completed') || player.assignment.course.final_quiz.status === 'Passed'} onClick={() => void openQuiz(player.assignment, player.assignment.course!.final_quiz!.id)} sx={{ justifyContent: 'flex-start', px: 1, mt: 1 }}>Final quiz · {player.assignment.course.final_quiz.status ?? 'Not Started'}</Button>}</Paper>}
          <Box>{(playerLoading || quizBusy) && <LinearProgress />}{playerError && <Alert severity="error" sx={{ mb: 2 }}>{playerError}</Alert>}
        {quizAttempt ? <Box><Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{quizResult ? 'Quiz result' : 'Quiz'}</Typography>{quizResult ? <Alert severity={quizResult.result === 'pass' ? 'success' : 'warning'}>{quizResult.result === 'pass' ? 'Passed' : 'Not passed'} · {quizResult.score}/{quizResult.total_marks} ({quizResult.percentage}%)</Alert> : currentQuizQuestion && <Paper variant="outlined" sx={{ p: 2, mb: 2 }}><Stack direction="row" sx={{ justifyContent: 'space-between', mb: 2 }}><Typography color="text.secondary">Question {quizQuestionIndex + 1} of {quizAttempt.questions.length}</Typography><Typography color="text.secondary">{currentQuizQuestion.marks} marks</Typography></Stack><Typography variant="h6" sx={{ fontWeight: 650, mb: 2 }}>{currentQuizQuestion.question_text}</Typography>{currentQuizQuestion.options.map(option => <Button key={option.id} fullWidth disabled={quizBusy || quizAttempt.status !== 'in_progress'} variant={quizAttempt.answers?.find(answer => answer.question_id === currentQuizQuestion.id)?.option_id === option.id ? 'contained' : 'outlined'} onClick={() => void saveQuizAnswer(currentQuizQuestion.id, option.id)} sx={{ justifyContent: 'flex-start', mb: .75 }}>{option.option_text}</Button>)}</Paper>}{!quizResult && <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}><Button onClick={() => setQuizQuestionIndex(index => Math.max(0, index - 1))} disabled={quizBusy || quizQuestionIndex === 0}>Previous</Button>{quizQuestionIndex < quizAttempt.questions.length - 1 ? <Button variant="contained" onClick={() => setQuizQuestionIndex(index => Math.min(quizAttempt.questions.length - 1, index + 1))} disabled={quizBusy}>Next</Button> : <Button variant="contained" onClick={() => void finishQuiz()} disabled={quizBusy || quizAttempt.status !== 'in_progress' || quizQuestionIndex !== quizAttempt.questions.length - 1}>Submit</Button>}</Stack>}</Box> : lessonCompleted ? <Alert severity="success">Lesson completed. Your progress has been saved.</Alert> : currentPage && <>
          <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between' }}><Typography color="text.secondary">Page {pageNumber} of {lessonDetail?.lesson_pages_count}</Typography><Typography color="text.secondary">{player?.assignment.course?.title}</Typography></Stack>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{currentPage.title}</Typography>
          {currentPage.topic && <Typography color="text.secondary" sx={{ mb: 2 }}>{currentPage.topic}</Typography>}
          <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{currentPage.content || 'No page content has been added yet.'}</Typography>
        </>}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void movePage('backward')} disabled={!lessonDetail || playerLoading || savingProgress || pageNumber <= 1 || lessonCompleted} startIcon={<ArrowBack />}>Previous</Button>
        <Box sx={{ flexGrow: 1 }} />
        {lessonCompleted ? <Button variant="contained" onClick={() => { setPlayer(null); setLessonDetail(null) }}>Back to dashboard</Button> : <Button variant="contained" onClick={() => void movePage('forward')} disabled={!lessonDetail || playerLoading || savingProgress || !currentPage} endIcon={<ArrowForward />}>{savingProgress ? 'Saving…' : pageNumber >= (lessonDetail?.lesson_pages_count ?? 1) ? 'Complete lesson' : 'Complete page'}</Button>}
      </DialogActions>
    </Dialog>
  </Box>
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <Paper elevation={0} sx={{ p: 2.2, border: '1px solid #e4e9e3', borderRadius: 3 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h4" sx={{ fontWeight: 750 }}>{value}</Typography></Paper>
}

function DataPanel({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e4e9e3', borderRadius: 3 }}><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>{empty ? <Typography variant="body2" color="text.secondary">Nothing to show right now.</Typography> : children}</Paper>
}
