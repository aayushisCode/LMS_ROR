import * as React from 'react'
import type { FormEvent } from 'react'
import * as MUI from '@mui/material'
import * as Icons from '@mui/icons-material'
import type { CourseRecord, LessonRecord } from '../../../api/adminApi'

export interface LessonFormPage {
  id?: string
  title: string
  topic: string
  content: string
  position: number
  metadata?: Record<string, unknown>
}

export interface LessonFormValues {
  course_id: string
  title: string
  content_type: string
  position: number
  status: string
  lesson_pages: LessonFormPage[]
}

export function LessonDialog({ open, lesson, courses, saving, onClose, onSave }: {
  open: boolean; lesson?: LessonRecord; courses: CourseRecord[]; saving: boolean;
  onClose: () => void; onSave: (values: LessonFormValues) => Promise<void>
}) {
  const [courseId, setCourseId] = React.useState(lesson?.course_id ?? '')
  const [title, setTitle] = React.useState(lesson?.title ?? '')
  const [contentType, setContentType] = React.useState(lesson?.content_type ?? '')
  const [position, setPosition] = React.useState(String(lesson?.position ?? 1))
  const [status, setStatus] = React.useState(lesson?.status ?? 'active')
  const [pages, setPages] = React.useState<LessonFormPage[]>(() => lesson?.lesson_pages?.map(page => ({
    id: page.id, title: page.title, topic: page.topic ?? '', content: page.content ?? '', position: page.position, metadata: page.metadata,
  })) ?? [{ title: '', topic: '', content: '', position: 1 }])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSave({ course_id: courseId, title, content_type: contentType, position: Number(position), status, lesson_pages: pages })
  }
  const updatePage = (index: number, key: keyof LessonFormPage, value: string) => setPages(current => current.map((page, pageIndex) => pageIndex === index ? { ...page, [key]: value } : page))
  return <MUI.Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
    <MUI.Box component="form" onSubmit={submit}>
      <MUI.DialogTitle className="dialog-title">{lesson ? 'Edit lesson' : 'New lesson'}<MUI.IconButton aria-label="Close" onClick={onClose} size="small"><Icons.Close /></MUI.IconButton></MUI.DialogTitle>
      <MUI.DialogContent className="dialog-fields">
        <MUI.TextField fullWidth select required label="Course" value={courseId} onChange={event => setCourseId(event.target.value)}>{courses.map(course => <MUI.MenuItem key={course.id} value={course.id}>{course.title}</MUI.MenuItem>)}</MUI.TextField>
        <MUI.TextField fullWidth required label="Lesson title" value={title} onChange={event => setTitle(event.target.value)} />
        <MUI.TextField fullWidth label="Content type" value={contentType} onChange={event => setContentType(event.target.value)} />
        <MUI.Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <MUI.TextField fullWidth required type="number" label="Position" value={position} onChange={event => setPosition(event.target.value)} />
          <MUI.TextField fullWidth select label="Status" value={status} onChange={event => setStatus(event.target.value)}><MUI.MenuItem value="active">Active</MUI.MenuItem><MUI.MenuItem value="inactive">Inactive</MUI.MenuItem></MUI.TextField>
        </MUI.Stack>
        <MUI.Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><MUI.Typography variant="h6">Lesson pages</MUI.Typography><MUI.Button startIcon={<Icons.Add />} onClick={() => setPages(current => [...current, { title: '', topic: '', content: '', position: current.length + 1 }])}>Add page</MUI.Button></MUI.Stack>
        {pages.map((page, index) => <MUI.Paper key={page.id ?? `new-${index}`} variant="outlined" sx={{ p: 2, display: 'grid', gap: 1.5 }}>
          <MUI.Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><MUI.Typography sx={{ fontWeight: 700 }}>Page {index + 1}</MUI.Typography>{!page.id && pages.length > 1 && <MUI.Button color="error" onClick={() => setPages(current => current.filter((_, pageIndex) => pageIndex !== index))}>Remove</MUI.Button>}</MUI.Stack>
          <MUI.TextField fullWidth required label="Page title" value={page.title} onChange={event => updatePage(index, 'title', event.target.value)} />
          <MUI.TextField fullWidth label="Topic" value={page.topic} onChange={event => updatePage(index, 'topic', event.target.value)} />
          <MUI.TextField fullWidth multiline minRows={4} label="Page content" value={page.content} onChange={event => updatePage(index, 'content', event.target.value)} />
        </MUI.Paper>)}
      </MUI.DialogContent>
      <MUI.DialogActions className="dialog-actions"><MUI.Button onClick={onClose} disabled={saving} className="secondary-button">Cancel</MUI.Button><MUI.Button type="submit" variant="contained" disabled={saving} className="primary-button">{saving ? <MUI.CircularProgress size={18} color="inherit" /> : 'Save lesson'}</MUI.Button></MUI.DialogActions>
    </MUI.Box>
  </MUI.Dialog>
}

