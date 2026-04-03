import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/home/HomePage'
import SettingsPage from './pages/settings/SettingsPage'
import { ThemeProvider } from "@/components/theme-provider"


function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>

  )
}

export default App