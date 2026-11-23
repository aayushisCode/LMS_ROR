import * as React from 'react'
import type { FormEvent } from 'react'
import type { SelectChangeEvent } from '@mui/material/Select'
import * as MUI from '@mui/material'
import * as Icons from '@mui/icons-material'
import type { CategoryRecord, CourseRecord, UserRecord } from '../../../api/adminApi'

export function AssignmentDialog({ open, saving, categories, courses, users, onClose, onSave }: { open: boolean; saving: boolean; categories: CategoryRecord[]; courses: CourseRecord[]; users: UserRecord[]; onClose: () => void; onSave: (values: Record<string, string>) => Promise<void> }) {
  const [categoryId, setCategoryId] = React.useState('')
  const [courseId, setCourseId] = React.useState('')
  const [userIds, setUserIds] = React.useState<string[]>([])
  const availableCourses = courses.filter(course => course.category_id === categoryId && course.status === 'published')
  const availableUsers = users.filter(user => user.role_id != null)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void onSave({ category_id: categoryId, course_id: courseId, user_ids: userIds.join(',') }) }
  return <MUI.Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm"><MUI.Box component="form" onSubmit={submit}><MUI.DialogTitle className="dialog-title">Assign a course<MUI.IconButton aria-label="Close" onClick={onClose} size="small"><Icons.Close /></MUI.IconButton></MUI.DialogTitle><MUI.DialogContent className="dialog-fields"><MUI.Alert severity="info">Only published courses can be assigned. The backend accepts manager and learner accounts; this API does not return role names, so it validates selected accounts when submitted. Due dates are set automatically.</MUI.Alert><MUI.TextField select fullWidth required label="Category" value={categoryId} onChange={event => { setCategoryId(event.target.value); setCourseId('') }}>{categories.map(item => <MUI.MenuItem key={item.id} value={item.id}>{item.category_name}</MUI.MenuItem>)}</MUI.TextField><MUI.TextField select fullWidth required label="Published course" value={courseId} onChange={event => setCourseId(event.target.value)} disabled={!categoryId}>{availableCourses.map(item => <MUI.MenuItem key={item.id} value={item.id}>{item.title}</MUI.MenuItem>)}</MUI.TextField><MUI.FormControl fullWidth required><MUI.InputLabel id="assignee-label">Accounts to enroll</MUI.InputLabel><MUI.Select<string[]> labelId="assignee-label" multiple label="Accounts to enroll" value={userIds} onChange={(event: SelectChangeEvent<string[]>) => setUserIds(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}>{availableUsers.map(item => <MUI.MenuItem key={item.id} value={item.id}>{item.name ? `${item.name} · ` : ''}{item.email} · role {item.role_id}</MUI.MenuItem>)}</MUI.Select></MUI.FormControl><MUI.Typography className="field-help">The API will reject accounts outside its supported learner and manager roles.</MUI.Typography>{!availableUsers.length && <MUI.Alert severity="warning">No accounts with a role ID were returned by the users API.</MUI.Alert>}</MUI.DialogContent><MUI.DialogActions className="dialog-actions"><MUI.Button onClick={onClose} className="secondary-button">Cancel</MUI.Button><MUI.Button type="submit" variant="contained" disabled={saving} className="primary-button">{saving ? <MUI.CircularProgress size={18} color="inherit" /> : 'Create assignment'}</MUI.Button></MUI.DialogActions></MUI.Box></MUI.Dialog>
}


