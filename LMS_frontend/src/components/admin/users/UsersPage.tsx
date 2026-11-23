import { displayDate } from '../shared/adminFormatters'
import * as React from 'react'
import * as MUI from '@mui/material'
import * as Icons from '@mui/icons-material'
import * as AdminApi from '../../../api/adminApi'
import * as Shared from '../shared/AdminComponents'
import * as Notifications from 'react-toastify'

export function UsersContent({ rows, loading, onRefresh }: { rows: AdminApi.UserRecord[]; loading: boolean; onRefresh: () => Promise<void> }) {
  const [profile, setProfile] = React.useState<AdminApi.UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = React.useState(false)
  const [profileError, setProfileError] = React.useState('')
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)

  const viewProfile = async (id: string) => {
    setProfile(null)
    setProfileError('')
    setProfileLoading(true)
    try {
      setProfile(await AdminApi.adminApi.userProfile(id))
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : 'Could not load this user profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  const toggleStatus = async (user: AdminApi.UserRecord) => {
    setUpdatingId(user.id)
    try {
      await AdminApi.adminApi.setUserActive(user.id, !user.active)
      Notifications.toast.success(`${user.name || user.email} ${user.active ? 'deactivated' : 'activated'}.`)
      if (profile?.user.id === user.id) await viewProfile(user.id)
      await onRefresh()
    } catch (cause) {
      Notifications.toast.error(cause instanceof Error ? cause.message : 'Could not update account status.')
    } finally {
      setUpdatingId(null)
    }
  }

  return <>
    <Shared.TablePanel loading={loading} empty={!loading && !rows.length}>
      <MUI.Table size="medium">
        <MUI.TableHead><MUI.TableRow><MUI.TableCell sx={{ fontWeight: 700 }}>USER</MUI.TableCell><MUI.TableCell sx={{ fontWeight: 700 }}>EMAIL</MUI.TableCell><MUI.TableCell sx={{ fontWeight: 700 }}>ROLE</MUI.TableCell><MUI.TableCell sx={{ fontWeight: 700 }}>STATUS</MUI.TableCell><MUI.TableCell align="right" sx={{ fontWeight: 700 }}>ENROLLED COURSES</MUI.TableCell><MUI.TableCell align="right" sx={{ fontWeight: 700 }}>ACTIONS</MUI.TableCell></MUI.TableRow></MUI.TableHead>
        <MUI.TableBody>{rows.map(row => <MUI.TableRow key={row.id} hover>
          <MUI.TableCell><MUI.Box className="table-user"><MUI.Avatar>{(row.name ?? row.email).slice(0, 1).toUpperCase()}</MUI.Avatar><b>{row.name || 'Name not available'}</b></MUI.Box></MUI.TableCell>
          <MUI.TableCell>{row.email}</MUI.TableCell>
          <MUI.TableCell><MUI.Chip size="small" label={row.role_name || 'Unassigned'} className="role-chip" /></MUI.TableCell>
          <MUI.TableCell><Shared.StatusBadge label={row.status || (row.active ? 'active' : 'inactive')} /></MUI.TableCell>
          <MUI.TableCell align="right">{row.enrolled_course_count}</MUI.TableCell>
          <MUI.TableCell align="right"><MUI.Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
            <MUI.Button size="small" startIcon={<Icons.VisibilityOutlined />} onClick={() => void viewProfile(row.id)}>View profile</MUI.Button>
            <MUI.Button size="small" color={row.active ? 'warning' : 'success'} startIcon={<Icons.PowerSettingsNew />} disabled={updatingId === row.id} onClick={() => void toggleStatus(row)}>{updatingId === row.id ? 'Updating…' : row.active ? 'Deactivate' : 'Activate'}</MUI.Button>
          </MUI.Stack></MUI.TableCell>
        </MUI.TableRow>)}</MUI.TableBody>
      </MUI.Table>
    </Shared.TablePanel>

    <MUI.Dialog open={profileLoading || profileError.length > 0 || profile !== null} onClose={() => { setProfile(null); setProfileError('') }} fullWidth maxWidth="md">
      <MUI.DialogTitle className="dialog-title">User profile<MUI.IconButton aria-label="Icons.Close" onClick={() => { setProfile(null); setProfileError('') }} size="small"><Icons.Close /></MUI.IconButton></MUI.DialogTitle>
      <MUI.DialogContent className="dialog-fields">
        {profileLoading && <MUI.Box className="loading-state"><MUI.CircularProgress color="success" /><MUI.Typography>Loading user profile…</MUI.Typography></MUI.Box>}
        {profileError && <MUI.Alert severity="error">{profileError}</MUI.Alert>}
        {profile && <>
          <MUI.Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <MUI.Avatar sx={{ width: 52, height: 52 }}>{(profile.user.name || profile.user.email).slice(0, 1).toUpperCase()}</MUI.Avatar>
            <MUI.Box sx={{ flex: 1, minWidth: 200 }}><MUI.Typography variant="h6">{profile.user.name || 'Name not available'}</MUI.Typography><MUI.Typography color="text.secondary">{profile.user.email}</MUI.Typography></MUI.Box>
            <MUI.Chip size="small" label={profile.user.role_name || 'Unassigned'} className="role-chip" />
            <Shared.StatusBadge label={profile.user.status || (profile.user.active ? 'active' : 'inactive')} />
          </MUI.Box>
          {(profile.user.contact || profile.user.address) && <MUI.Typography color="text.secondary">{[profile.user.contact, profile.user.address].filter(Boolean).join(' · ')}</MUI.Typography>}
          <MUI.Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, mt: 1 }}>
            <MUI.Paper variant="outlined" sx={{ p: 1.5 }}><MUI.Typography variant="body2" color="text.secondary">Completed courses</MUI.Typography><MUI.Typography variant="h6">{profile.completed_courses.length}</MUI.Typography></MUI.Paper>
            <MUI.Paper variant="outlined" sx={{ p: 1.5 }}><MUI.Typography variant="body2" color="text.secondary">Pending courses</MUI.Typography><MUI.Typography variant="h6">{profile.pending_courses.length}</MUI.Typography></MUI.Paper>
          </MUI.Box>
          <UserCourseList title="Completed courses" courses={profile.completed_courses} />
          <UserCourseList title="Pending courses" courses={profile.pending_courses} />
          {!profile.courses.length && <Shared.EmptyInline title="No courses assigned" detail="Course assignments for this user will appear here." />}
        </>}
      </MUI.DialogContent>
      <MUI.DialogActions className="dialog-actions"><MUI.Button onClick={() => { setProfile(null); setProfileError('') }} className="secondary-button">Icons.Close</MUI.Button></MUI.DialogActions>
    </MUI.Dialog>
  </>
}

function UserCourseList({ title, courses }: { title: string; courses: AdminApi.UserProfile['courses'] }) {
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  return <MUI.Box>
    <MUI.Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>{title}</MUI.Typography>
    {courses.length ? <><MUI.Table size="small"><MUI.TableHead><MUI.TableRow><MUI.TableCell>COURSE</MUI.TableCell><MUI.TableCell>STATUS</MUI.TableCell><MUI.TableCell>PROGRESS</MUI.TableCell><MUI.TableCell>LESSONS</MUI.TableCell><MUI.TableCell>DUE DATE</MUI.TableCell></MUI.TableRow></MUI.TableHead><MUI.TableBody>{courses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(course => <MUI.TableRow key={course.id}>
      <MUI.TableCell><b>{course.title}</b></MUI.TableCell><MUI.TableCell><Shared.StatusBadge label={course.status} /></MUI.TableCell><MUI.TableCell><Shared.ProgressCell value={course.progress_percentage} /></MUI.TableCell><MUI.TableCell>{course.completed_lessons} / {course.total_lessons}</MUI.TableCell><MUI.TableCell>{displayDate(course.due_date)}</MUI.TableCell>
    </MUI.TableRow>)}</MUI.TableBody></MUI.Table>{courses.length > rowsPerPage && <MUI.TablePagination component="div" count={courses.length} page={page} onPageChange={(_, next) => setPage(next)} rowsPerPage={rowsPerPage} onRowsPerPageChange={event => { setRowsPerPage(Number(event.target.value)); setPage(0) }} rowsPerPageOptions={[10, 25, 50]} />}</> : <MUI.Typography variant="body2" color="text.secondary">No {title.toLowerCase()}.</MUI.Typography>}
  </MUI.Box>
}

