import * as React from 'react'
import type { FormEvent } from 'react'
import * as MUI from '@mui/material'
import * as Icons from '@mui/icons-material'
import * as AdminApi from '../../../api/adminApi'

export function QuestionDialog({ open, question, courses, saving, onClose, onSave }: {
  open: boolean; question?: AdminApi.QuestionRecord; courses: AdminApi.CourseRecord[]; saving: boolean;
  onClose: () => void; onSave: (values: Record<string, string>) => Promise<void>
}) {
  const options = [...(question?.options ?? [])].sort((a, b) => a.position - b.position)
  const initial: Record<string, string> = {
    question_text: question?.question_text ?? '', course_id: question?.course_id ?? '',
    question_type: question?.question_type ?? 'mcq', marks: String(question?.marks ?? 1),
    status: question?.status ?? 'active',
    correct_option_position: String(options.find(option => option.id === question?.correct_option_id)?.position ?? 1),
    ...Object.fromEntries([1, 2, 3, 4].map(position => [`option_${position}`, options.find(option => option.position === position)?.option_text ?? ''])),
  }
  const [values, setValues] = React.useState(initial)
  const count = values.question_type === 'mcq' ? 4 : 2
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSave(values)
  }
  return <MUI.Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <MUI.Box component="form" onSubmit={submit}>
      <MUI.DialogTitle className="dialog-title">{question ? 'Edit question' : 'New question'}<MUI.IconButton aria-label="Close" onClick={onClose} size="small"><Icons.Close /></MUI.IconButton></MUI.DialogTitle>
      <MUI.DialogContent className="dialog-fields">
        <MUI.TextField fullWidth select label="Course" required value={values.course_id} onChange={event => setValues(current => ({ ...current, course_id: event.target.value }))}>
          {courses.map(course => <MUI.MenuItem key={course.id} value={course.id}>{course.title}</MUI.MenuItem>)}
        </MUI.TextField>
        <MUI.TextField fullWidth label="Question" required multiline minRows={2} value={values.question_text} onChange={event => setValues(current => ({ ...current, question_text: event.target.value }))} />
        <MUI.TextField fullWidth select label="Question type" value={values.question_type} onChange={event => setValues(current => ({ ...current, question_type: event.target.value, correct_option_position: '1' }))}>
          <MUI.MenuItem value="mcq">Multiple choice</MUI.MenuItem><MUI.MenuItem value="true_false">True / False</MUI.MenuItem>
        </MUI.TextField>
        {Array.from({ length: count }, (_, index) => index + 1).map(position => <MUI.TextField key={position} fullWidth required label={`Option ${position}`} value={values[`option_${position}`]} onChange={event => setValues(current => ({ ...current, [`option_${position}`]: event.target.value }))} />)}
        <MUI.TextField fullWidth select required label="Correct option" value={values.correct_option_position} onChange={event => setValues(current => ({ ...current, correct_option_position: event.target.value }))}>
          {Array.from({ length: count }, (_, index) => index + 1).map(position => <MUI.MenuItem key={position} value={String(position)}>Option {position}</MUI.MenuItem>)}
        </MUI.TextField>
        <MUI.TextField fullWidth required type="number" label="Marks" value={values.marks} onChange={event => setValues(current => ({ ...current, marks: event.target.value }))} />
        <MUI.TextField fullWidth select label="Status" value={values.status} onChange={event => setValues(current => ({ ...current, status: event.target.value }))}><MUI.MenuItem value="active">Active</MUI.MenuItem><MUI.MenuItem value="inactive">Inactive</MUI.MenuItem></MUI.TextField>
      </MUI.DialogContent>
      <MUI.DialogActions className="dialog-actions"><MUI.Button onClick={onClose} disabled={saving} className="secondary-button">Cancel</MUI.Button><MUI.Button type="submit" variant="contained" disabled={saving} className="primary-button">{saving ? <MUI.CircularProgress size={18} color="inherit" /> : 'Save question'}</MUI.Button></MUI.DialogActions>
    </MUI.Box>
  </MUI.Dialog>
}

