import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import { signIn } from './api/authApi'
import { clearSession, getSession } from './api/authSession'
import AdminDashboard from './components/AdminDashboard'
import LearnerDashboard from './components/LearnerDashboard'
import './App.css'

const rolePaths: Record<string, string> = {
  admin: '/admin/dashboard',
  manager: '/manager/dashboard',
  learner: '/learner/dashboard',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const emailError = submitted && !EMAIL_PATTERN.test(email.trim())
  const passwordError = submitted && password.length === 0

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')
    if (!EMAIL_PATTERN.test(email.trim()) || !password) return

    setLoading(true)
    try {
      const user = await signIn(email.trim(), password)
      const path = rolePaths[user.role.toLowerCase()]
      if (!path) {
        clearSession()
        throw new Error('Your account does not have a supported LMS role.')
      }
      toast.success('You’re signed in. Welcome back!')
      navigate(path, { replace: true })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return <Box className="login-shell">
    <Box className="brand-row"><img src="https://quickinsure.co.in/static/images/quickinsure-logo.svg" alt="QuickInsure Logo" /></Box>
    <Paper elevation={0} className="login-card">
      <Box className="card-heading"><Typography variant="overline" className="eyebrow">LEARNING PORTAL</Typography><Typography component="h1">Welcome back</Typography><Typography className="subtitle">Sign in to continue your learning journey.</Typography></Box>
      {error && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={submit} noValidate className="login-form">
        <TextField label="Work email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} error={Boolean(emailError)} helperText={emailError ? 'Enter a valid email address.' : ' '} fullWidth required />
        <TextField label="Password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} error={Boolean(passwordError)} helperText={passwordError ? 'Password is required.' : ' '} fullWidth required slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}} />
        <Button type="submit" variant="contained" size="large" disabled={loading} className="submit-button">{loading ? <><CircularProgress size={20} color="inherit" /> <span>Signing in…</span></> : 'Sign in'}</Button>
      </Box>
      <Typography className="security-note">Secure access for your organization</Typography>
    </Paper>
    <Typography className="footer-note">© {new Date().getFullYear()} QuickInsure Learning Management System</Typography>
  </Box>
}

function DashboardLanding() {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  return <Box className="dashboard-shell"><Box className="brand-row"><img src="https://quickinsure.co.in/static/images/quickinsure-logo.svg" alt="QuickInsure Logo" /></Box><Paper className="dashboard-card" elevation={0}><Typography variant="overline" className="eyebrow">{session.role}</Typography><Typography component="h1">Welcome, {session.email}</Typography><Typography className="subtitle">Your learning workspace is ready.</Typography></Paper></Box>
}

export default function App() {
  const session = getSession()
  const destination = session ? rolePaths[session.role.toLowerCase()] : '/login'
  return <><Routes><Route path="/login" element={session ? <Navigate to={destination ?? '/login'} replace /> : <LoginPage />} /><Route path="/admin/dashboard" element={<AdminDashboard />} /><Route path="/manager/dashboard" element={<DashboardLanding />} /><Route path="/learner/dashboard" element={<LearnerDashboard />} /><Route path="*" element={<Navigate to={destination ?? '/login'} replace />} /></Routes><ToastContainer position="top-right" autoClose={3500} /></>
}
