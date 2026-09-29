import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { OnboardingLayout } from './components/onboarding/layout.tsx'
import { Welcome } from './pages/welcome.tsx'
import { Intro } from './pages/intro.tsx'
import { Questionnaire } from './pages/questionnaire.tsx'
import { CreateAccount } from './pages/create-account.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<OnboardingLayout />}>
          <Route index element={<Welcome />} />
          <Route path="welcome" element={<Navigate to="/" replace />} />
          <Route path="intro" element={<Intro />} />
          <Route path="questionnaire" element={<Questionnaire />} />
          <Route path="create-account" element={<CreateAccount />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
