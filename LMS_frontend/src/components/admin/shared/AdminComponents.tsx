import React, { useState, type ReactNode } from 'react'
import { Box, Chip, LinearProgress, Paper, Stack, Table, TableBody, TablePagination, Tooltip, IconButton, Typography, CircularProgress, Button } from '@mui/material'
import type * as AdminApi from '../../../api/adminApi'
import { DeleteOutlined, EditOutlined, TaskAlt, TrendingUp, WarningAmber, Refresh } from '@mui/icons-material'
export type Section = 'overview' | 'users' | 'categories' | 'courses' | 'assignments' | 'lessons' | 'quizzes' | 'questions' | 'progress'

export interface DashboardData {
  overview: AdminApi.OverviewRecord | null
  users: AdminApi.UserRecord[]
  categories: AdminApi.CategoryRecord[]
  courses: AdminApi.CourseRecord[]
  lessons: AdminApi.LessonRecord[]
  quizzes: AdminApi.QuizRecord[]
  questions: AdminApi.QuestionRecord[]
  assignments: AdminApi.AssignmentRecord[]
}

export function TablePanel({ children, empty, loading }: { children: ReactNode; empty?: boolean; loading?: boolean }) {
  const [pagination, setPagination] = useState({ page: 0, rowSignature: '' })
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const table = React.isValidElement(children) && children.type === Table ? children : null
  const body = table && React.isValidElement((table.props as { children?: ReactNode }).children)
    ? (table.props as { children: React.ReactElement }).children : null
  const tableBody = body && body.type === TableBody ? body : null
  const tableRows = tableBody ? React.Children.toArray((tableBody.props as { children?: ReactNode }).children) : []
  const rowSignature = tableRows.map(row => React.isValidElement(row) ? String(row.key) : '').join('|')
  const page = pagination.rowSignature === rowSignature ? pagination.page : 0
  const pagedTable = table && tableBody && tableRows.length
    ? React.cloneElement(table, {}, React.cloneElement(tableBody, {}, tableRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)))
    : children
  return <Paper className="table-panel" elevation={0}>
    {loading && <LinearProgress color="success" />}
    {empty ? <Box className="empty-state"><TaskAlt /><Typography>No records found</Typography><Typography>Records from your LMS API will appear here when available.</Typography></Box> : <>{pagedTable}{tableRows.length > rowsPerPage && <TablePagination component="div" count={tableRows.length} page={page} onPageChange={(_, next) => setPagination({ page: next, rowSignature })} rowsPerPage={rowsPerPage} onRowsPerPageChange={event => { setRowsPerPage(Number(event.target.value)); setPagination({ page: 0, rowSignature }) }} rowsPerPageOptions={[10, 25, 50]} />}</>}
  </Paper>
}

export function StatusBadge({ label }: { label: string }) {
  const normalized = label.toLowerCase().replaceAll('_', ' ')
  const good = ['published', 'completed', 'passed', 'active'].includes(normalized)
  const warning = ['in progress', 'draft', 'assigned', 'pending'].includes(normalized)
  return <Chip size="small" label={normalized || 'unknown'} className={`status-chip ${good ? 'status-good' : warning ? 'status-warn' : 'status-neutral'}`} />
}

export function MetricCard({ label, value, icon, change, accent }: { label: string; value: number | string; icon: ReactNode; change?: string; accent?: boolean }) {
  return <Paper className={`metric-card ${accent ? 'metric-accent' : ''}`} elevation={0}>
    <Box className="metric-top"><Typography className="metric-label">{label}</Typography><Box className="metric-icon">{icon}</Box></Box>
    <Typography className="metric-value">{value}</Typography>
    <Box className="metric-foot"><TrendingUp fontSize="small" /><Typography>{change ?? 'Current platform total'}</Typography></Box>
  </Paper>
}

export function ProgressCell({ value }: { value?: number }) {
  const progress = Math.max(0, Math.min(100, value ?? 0))
  return <Box className="progress-cell"><Box className="progress-track"><Box style={{ width: `${progress}%` }} /></Box><b>{Math.round(progress)}%</b></Box>
}

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <Stack direction="row" sx={{ justifyContent: 'flex-end' }}><Tooltip title="Edit"><IconButton size="small" onClick={onEdit}><EditOutlined fontSize="small" /></IconButton></Tooltip><Tooltip title="Delete"><IconButton size="small" onClick={onDelete}><DeleteOutlined fontSize="small" /></IconButton></Tooltip></Stack>
}

export function LoadingState() { return <Box className="loading-state"><CircularProgress color="success" /><Typography>Loading your platform data…</Typography></Box> }
export function DataUnavailable({ onRefresh }: { onRefresh: () => void }) { return <Paper className="unavailable-card" elevation={0}><WarningAmber /><Typography component="h3">Dashboard metrics are unavailable</Typography><Typography>Confirm that Rails is running and your admin session is still valid.</Typography><Button onClick={onRefresh} startIcon={<Refresh />} className="primary-button">Retry</Button></Paper> }
export function EmptyInline({ title, detail }: { title: string; detail: string }) { return <Box className="empty-inline"><TaskAlt /><b>{title}</b><small>{detail}</small></Box> }
