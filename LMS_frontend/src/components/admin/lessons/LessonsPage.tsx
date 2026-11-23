import * as MUI from '@mui/material'
import * as AdminApi from '../../../api/adminApi'
import * as Shared from '../shared/AdminComponents'

export function LessonsContent({ rows, courses, loading, onEdit, onDelete }: { rows: AdminApi.LessonRecord[]; courses: AdminApi.CourseRecord[]; loading: boolean; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  return <Shared.TablePanel loading={loading} empty={!loading && !rows.length}><MUI.Table><MUI.TableHead><MUI.TableRow><MUI.TableCell>LESSON</MUI.TableCell><MUI.TableCell>COURSE</MUI.TableCell><MUI.TableCell>POSITION</MUI.TableCell><MUI.TableCell>PAGES</MUI.TableCell><MUI.TableCell>STATUS</MUI.TableCell><MUI.TableCell>CONTENT TYPE</MUI.TableCell><MUI.TableCell align="right">ACTIONS</MUI.TableCell></MUI.TableRow></MUI.TableHead><MUI.TableBody>{rows.map(row => <MUI.TableRow key={row.id} hover><MUI.TableCell><b>{row.title}</b></MUI.TableCell><MUI.TableCell>{courses.find(course => course.id === row.course_id)?.title ?? row.course_id}</MUI.TableCell><MUI.TableCell>{row.position ?? '—'}</MUI.TableCell><MUI.TableCell>{row.lesson_pages?.length ?? row.total_pages ?? 0}</MUI.TableCell><MUI.TableCell><Shared.StatusBadge label={row.status} /></MUI.TableCell><MUI.TableCell>{row.content_type || '—'}</MUI.TableCell><MUI.TableCell align="right"><Shared.RowActions onEdit={() => onEdit(row.id)} onDelete={() => onDelete(row.id)} /></MUI.TableCell></MUI.TableRow>)}</MUI.TableBody></MUI.Table></Shared.TablePanel>
}

