import * as React from 'react'
import * as MUI from '@mui/material'
import * as Icons from '@mui/icons-material'
import * as AdminApi from '../../../api/adminApi'
import * as Shared from '../shared/AdminComponents'

export function QuestionBankPage({ categories, courses, quizzes, rows, loading, onEdit, onToggle }: { categories: AdminApi.CategoryRecord[]; courses: AdminApi.CourseRecord[]; quizzes: AdminApi.QuizRecord[]; rows: AdminApi.QuestionRecord[]; loading: boolean; onEdit: (id: string) => void; onToggle: (row: AdminApi.QuestionRecord) => void }) {
  const [categoryId, setCategoryId] = React.useState('')
  const [courseId, setCourseId] = React.useState('')
  const [quizId, setQuizId] = React.useState('')
  const category = categories.find(item => item.id === categoryId)
  const course = courses.find(item => item.id === courseId)
  const quiz = quizzes.find(item => item.id === quizId)
  const categoryCourses = courses.filter(item => item.category_id === categoryId)
  const courseQuizzes = quizzes.filter(item => item.course_id === courseId)
  const quizQuestions = rows.filter(item => item.quiz_id === quizId).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const crumbs = <MUI.Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
    <MUI.Button size="small" onClick={() => { setCategoryId(''); setCourseId(''); setQuizId('') }}>Categories</MUI.Button>
    {category && <><Icons.ChevronRight fontSize="small" /><MUI.Button size="small" onClick={() => { setCourseId(''); setQuizId('') }}>{category.category_name}</MUI.Button></>}
    {course && <><Icons.ChevronRight fontSize="small" /><MUI.Button size="small" onClick={() => setQuizId('')}>{course.title}</MUI.Button></>}
    {quiz && <><Icons.ChevronRight fontSize="small" /><MUI.Typography variant="body2">{quiz.title}</MUI.Typography></>}
  </MUI.Stack>
  if (loading && !categories.length) return <Shared.LoadingState />
  if (!categoryId) return <><MUI.Typography className="panel-kicker">QUESTION BANK</MUI.Typography><MUI.Typography className="panel-title">Choose a category</MUI.Typography><QuestionBankList items={categories.map(item => ({ id: item.id, label: item.category_name }))} onSelect={setCategoryId} /></>
  if (!courseId) return <>{crumbs}<MUI.Typography className="panel-title">Courses in {category?.category_name}</MUI.Typography><QuestionBankList items={categoryCourses.map(item => ({ id: item.id, label: item.title }))} onSelect={setCourseId} emptyTitle="No courses" emptyDetail="There are no courses in this category." /></>
  if (!quizId) return <>{crumbs}<MUI.Typography className="panel-title">Lesson and Final quizzes</MUI.Typography><QuestionBankList items={courseQuizzes.map(item => ({ id: item.id, label: item.title, detail: item.quiz_type }))} onSelect={setQuizId} emptyTitle="No quizzes" emptyDetail="There are no quizzes for this course." /></>
  return <>{crumbs}<MUI.Typography className="panel-title">Questions for {quiz?.title}</MUI.Typography><Shared.TablePanel loading={loading} empty={!loading && !quizQuestions.length}><MUI.Table><MUI.TableHead><MUI.TableRow><MUI.TableCell>ID / QUESTION</MUI.TableCell><MUI.TableCell>TYPE</MUI.TableCell><MUI.TableCell>MARKS</MUI.TableCell><MUI.TableCell>OPTIONS / CORRECT ANSWER</MUI.TableCell><MUI.TableCell>STATUS</MUI.TableCell></MUI.TableRow></MUI.TableHead><MUI.TableBody>{quizQuestions.map(row => { const correctOption = row.options?.find(option => option.id === row.correct_option_id); return <MUI.TableRow key={row.id}><MUI.TableCell className="question-cell"><b>{row.question_code} · {row.question_text}</b></MUI.TableCell><MUI.TableCell><MUI.Chip size="small" label={row.question_type.replaceAll('_', ' ')} /></MUI.TableCell><MUI.TableCell>{row.marks}</MUI.TableCell><MUI.TableCell className="question-options">{row.options?.map(option => <span key={option.id} className={option.id === correctOption?.id ? 'correct-option' : ''}>Option {option.position}: {option.option_text}{option.id === correctOption?.id ? ' ✓ Correct' : ''}</span>)}</MUI.TableCell><MUI.TableCell><Shared.StatusBadge label={row.status} /><MUI.Button size="small" onClick={() => void onToggle(row)}>{row.status === 'active' ? 'Deactivate' : 'Activate'}</MUI.Button><MUI.IconButton size="small" onClick={() => onEdit(row.id)}><Icons.EditOutlined fontSize="small" /></MUI.IconButton></MUI.TableCell></MUI.TableRow>})}</MUI.TableBody></MUI.Table></Shared.TablePanel></>
}

function QuestionBankList({ items, onSelect, emptyTitle = 'No categories', emptyDetail = 'There are no categories available.' }: { items: { id: string; label: string; detail?: string }[]; onSelect: (id: string) => void; emptyTitle?: string; emptyDetail?: string }) {
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const visible = items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  if (!items.length) return <Shared.EmptyInline title={emptyTitle} detail={emptyDetail} />
  return <MUI.Box sx={{ mt: 2 }}><MUI.Stack spacing={1}>{visible.map(item => <MUI.Paper key={item.id} elevation={0} className="table-panel"><MUI.Button fullWidth sx={{ justifyContent: 'space-between' }} onClick={() => onSelect(item.id)}>{item.label}{item.detail ? <MUI.Chip size="small" label={item.detail} /> : <Icons.ChevronRight />}</MUI.Button></MUI.Paper>)}</MUI.Stack>{items.length > rowsPerPage && <MUI.TablePagination component="div" count={items.length} page={page} onPageChange={(_, next) => setPage(next)} rowsPerPage={rowsPerPage} onRowsPerPageChange={event => { setRowsPerPage(Number(event.target.value)); setPage(0) }} rowsPerPageOptions={[10, 25, 50]} />}</MUI.Box>
}

