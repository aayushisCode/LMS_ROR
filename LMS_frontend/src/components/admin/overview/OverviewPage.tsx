import * as MUI from '@mui/material'
import * as Icons from '@mui/icons-material'
import * as Shared from '../shared/AdminComponents'

export function OverviewContent({ data, loading, refreshing, onSection, onRefresh }: { data: Shared.DashboardData; loading: boolean; refreshing: boolean; onSection: (section: Shared.Section) => void; onRefresh: () => void }) {
  const overview = data.overview
  if (loading && !overview) return <Shared.LoadingState />
  if (!overview && !loading) return <Shared.DataUnavailable onRefresh={onRefresh} />
  const cards = [
    { label: 'Total users', value: overview?.total_users ?? 0, icon: <Icons.GroupsOutlined />, change: `${overview?.total_managers ?? 0} managers · ${overview?.total_learners ?? 0} learners`, section: 'users' as Shared.Section },
    { label: 'Courses', value: overview?.total_courses ?? 0, icon: <Icons.LibraryBooksOutlined />, change: `${overview?.total_categories ?? 0} catalog categories`, section: 'courses' as Shared.Section },
    { label: 'Active assignments', value: overview?.total_assignments ?? 0, icon: <Icons.AssignmentTurnedIn />, change: 'Learner course enrollments', section: 'assignments' as Shared.Section },
    { label: 'Learning content', value: (overview?.total_lessons ?? 0) + (overview?.total_quizzes ?? 0) + (overview?.total_questions ?? 0), icon: <Icons.BookOutlined />, change: `${overview?.total_lessons ?? 0} lessons · ${overview?.total_quizzes ?? 0} quizzes · ${overview?.total_questions ?? 0} questions`, section: 'lessons' as Shared.Section },
  ]
  const distribution = [
    { label: 'Users', value: overview?.total_users ?? 0, color: 'green' }, { label: 'Courses', value: overview?.total_courses ?? 0, color: 'dark' },
    { label: 'Lessons', value: overview?.total_lessons ?? 0, color: 'mint' }, { label: 'Quizzes', value: overview?.total_quizzes ?? 0, color: 'sage' },
    { label: 'Questions', value: overview?.total_questions ?? 0, color: 'dark' },
  ]
  const max = Math.max(...distribution.map(item => item.value), 1)
  const nameFor = (id: string) => data.users.find(user => user.id === id)?.name || data.users.find(user => user.id === id)?.email || id.slice(0, 10)
  return <>
    <MUI.Box className="metric-grid">{cards.map(card => <MUI.Box key={card.label} onClick={() => onSection(card.section)} role="button" tabIndex={0} className="metric-clickable"><Shared.MetricCard label={card.label} value={card.value} icon={card.icon} change={card.change} accent={card.label === 'Active assignments'} /></MUI.Box>)}</MUI.Box>
    <MUI.Box className="overview-grid">
      <MUI.Paper className="chart-card" elevation={0}><MUI.Box className="panel-heading"><MUI.Box><MUI.Typography className="panel-kicker">PLATFORM SNAPSHOT</MUI.Typography><MUI.Typography className="panel-title">Learning ecosystem</MUI.Typography></MUI.Box><MUI.Chip label="All time" size="small" className="filter-chip" /></MUI.Box><MUI.Box className="bar-chart">{distribution.map(item => <MUI.Box key={item.label} className="bar-item"><MUI.Box className="bar-track"><MUI.Box className={`bar-fill bar-${item.color}`} style={{ height: `${Math.max(item.value / max * 100, item.value ? 7 : 0)}%` }} /><MUI.Typography className="bar-number">{item.value}</MUI.Typography></MUI.Box><MUI.Typography className="bar-label">{item.label}</MUI.Typography></MUI.Box>)}</MUI.Box><MUI.Box className="chart-foot"><MUI.Typography>Current totals from the admin dashboard API</MUI.Typography><MUI.Box className="trend-note"><Icons.TrendingUp fontSize="small" /> Live data</MUI.Box></MUI.Box></MUI.Paper>
      <MUI.Paper className="recent-card" elevation={0}><MUI.Box className="panel-heading"><MUI.Box><MUI.Typography className="panel-kicker">LEARNER SNAPSHOT</MUI.Typography><MUI.Typography className="panel-title">Recent assignments</MUI.Typography></MUI.Box><MUI.Button className="text-link" onClick={() => onSection('assignments')}>View all <Icons.ChevronRight fontSize="small" /></MUI.Button></MUI.Box>{data.assignments.length ? <MUI.Stack className="recent-list" divider={<MUI.Divider flexItem />}>{data.assignments.slice(0, 4).map(assignment => <MUI.Box key={assignment.id} className="recent-row"><MUI.Avatar className="recent-avatar">{nameFor(assignment.user_id).slice(0, 1).toUpperCase()}</MUI.Avatar><MUI.Box className="recent-copy"><b>{nameFor(assignment.user_id)}</b><small>{assignment.course?.title ?? `Course ${assignment.course_id}`}</small></MUI.Box><MUI.Box className="recent-progress"><b>{Math.round(assignment.progress_percentage ?? 0)}%</b><MUI.LinearProgress variant="determinate" value={assignment.progress_percentage ?? 0} /></MUI.Box></MUI.Box>)}</MUI.Stack> : <Shared.EmptyInline title="No assignments yet" detail="Course assignments will appear here." />}<MUI.Button className="card-bottom-link" onClick={() => onSection('progress')}>Open learner progress <Icons.ChevronRight fontSize="small" /></MUI.Button></MUI.Paper>
    </MUI.Box>
    <MUI.Box className="quick-actions"><MUI.Box className="quick-copy"><MUI.Typography className="panel-kicker">QUICK ACTIONS</MUI.Typography><MUI.Typography className="panel-title">Keep your LMS moving</MUI.Typography><MUI.Typography>Manage the essentials from one place.</MUI.Typography></MUI.Box><MUI.Stack direction="row" spacing={1.5} className="quick-action-buttons"><MUI.Button onClick={() => onSection('users')} startIcon={<Icons.GroupsOutlined />}>Manage users</MUI.Button><MUI.Button onClick={() => onSection('courses')} startIcon={<Icons.Add />}>Create a course</MUI.Button><MUI.Button onClick={() => onSection('assignments')} startIcon={<Icons.AssignmentTurnedIn />}>Assign learning</MUI.Button></MUI.Stack></MUI.Box>
    {refreshing && <MUI.Typography className="refresh-note">Refreshing platform data…</MUI.Typography>}
  </>
}

