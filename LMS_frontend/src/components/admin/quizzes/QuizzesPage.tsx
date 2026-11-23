import * as MUI from '@mui/material'
import * as AdminApi from '../../../api/adminApi'
import * as Shared from '../shared/AdminComponents'

export function QuizzesContent({ rows, courses, loading, onEdit, onDelete }: { rows: AdminApi.QuizRecord[]; courses: AdminApi.CourseRecord[]; loading: boolean; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  return <Shared.TablePanel loading={loading} empty={!loading && !rows.length}><MUI.Table><MUI.TableHead><MUI.TableRow><MUI.TableCell>QUIZ / QUESTIONS</MUI.TableCell><MUI.TableCell>COURSE</MUI.TableCell><MUI.TableCell>TYPE</MUI.TableCell><MUI.TableCell>PASS MARKS</MUI.TableCell><MUI.TableCell align="right">ACTIONS</MUI.TableCell></MUI.TableRow></MUI.TableHead><MUI.TableBody>{rows.map(row => <MUI.TableRow key={row.id} hover><MUI.TableCell><b>{row.title}</b><small>{row.questions?.length ? row.questions.map(question => `${question.question_code}: ${question.question_text}`).join(' · ') : 'No questions assigned'}</small></MUI.TableCell><MUI.TableCell>{courses.find(course => course.id === row.course_id)?.title ?? row.course_id}</MUI.TableCell><MUI.TableCell><MUI.Chip size="small" label={row.quiz_type} className="role-chip" /></MUI.TableCell><MUI.TableCell>{row.pass_marks}</MUI.TableCell><MUI.TableCell align="right"><Shared.RowActions onEdit={() => onEdit(row.id)} onDelete={() => onDelete(row.id)} /></MUI.TableCell></MUI.TableRow>)}</MUI.TableBody></MUI.Table></Shared.TablePanel>
}

