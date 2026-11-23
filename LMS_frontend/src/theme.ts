import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#5d9c6a', dark: '#4c8959', light: '#eaf5eb', contrastText: '#ffffff' },
    success: { main: '#5d9c6a' },
    background: { default: '#f5f8f5', paper: '#ffffff' },
    text: { primary: '#19231c', secondary: '#78857c' },
    divider: '#e6ece6',
  },
  shape: { borderRadius: 9 },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    button: { fontWeight: 600, textTransform: 'none' },
  },
})

export default theme
