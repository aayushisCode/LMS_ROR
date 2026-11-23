import { displayDate } from '../shared/adminFormatters'
import * as MUI from '@mui/material'
import * as Icons from '@mui/icons-material'
import * as AdminApi from '../../../api/adminApi'
import * as Shared from '../shared/AdminComponents'

export function AssignmentsContent({ rows, users, loading, onDelete }: { rows: AdminApi.AssignmentRecord[]; users: AdminApi.UserRecord[]; loading: boolean; onDelete: (id: string) => void }) {
  const userLabel = (id: string) => users.find(user => user.id === id)?.email ?? `Learner ${id.slice(0, 8)}`
  return <Shared.TablePanel loading={loading} empty={!loading && !rows.length}><MUI.Table><MUI.TableHead><MUI.TableRow><MUI.TableCell>LEARNER</MUI.TableCell><MUI.TableCell>COURSE</MUI.TableCell><MUI.TableCell>PROGRESS</MUI.TableCell><MUI.TableCell>STATUS</MUI.TableCell><MUI.TableCell>DUE DATE</MUI.TableCell><MUI.TableCell align="right">ACTIONS</MUI.TableCell></MUI.TableRow></MUI.TableHead><MUI.TableBody>{rows.map(row => <MUI.TableRow key={row.id} hover><MUI.TableCell><MUI.Box className="table-user"><MUI.Avatar>{userLabel(row.user_id).slice(0, 1).toUpperCase()}</MUI.Avatar><b>{userLabel(row.user_id)}</b></MUI.Box></MUI.TableCell><MUI.TableCell>{row.course?.title ?? `Course ${row.course_id}`}</MUI.TableCell><MUI.TableCell><Shared.ProgressCell value={row.progress_percentage} /></MUI.TableCell><MUI.TableCell><Shared.StatusBadge label={row.status} /></MUI.TableCell><MUI.TableCell>{displayDate(row.due_date)}</MUI.TableCell><MUI.TableCell align="right"><MUI.Tooltip title="Remove assignment"><MUI.IconButton size="small" onClick={() => onDelete(row.id)}><Icons.DeleteOutlined fontSize="small" /></MUI.IconButton></MUI.Tooltip></MUI.TableCell></MUI.TableRow>)}</MUI.TableBody></MUI.Table></Shared.TablePanel>
}

