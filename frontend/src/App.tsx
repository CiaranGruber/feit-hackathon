import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { OnboardingLayout } from './components/onboarding/layout.tsx'
import { Welcome } from './pages/welcome.tsx'
import { Intro } from './pages/intro.tsx'
import { Questionnaire } from './pages/questionnaire.tsx'
import { CreateAccount } from './pages/create-account.tsx'
import { SignIn } from './pages/sign-in.tsx'
import { MainLayout } from './components/home/layout.tsx'
import { Home } from './pages/home.tsx'
import { MyQuests } from './pages/my-quests.tsx'
import { Profile } from './pages/profile.tsx'
import { ProfileInterests } from './pages/profile-interests.tsx'
import { ProfilePersonalisation } from './pages/profile-personalisation.tsx'
import { ProfileSettings } from './pages/profile-settings.tsx'
import { ProfileEdit } from './pages/profile-edit.tsx'
import { Explore } from './pages/explore.tsx'
import { ExploreCategory } from './pages/explore-category.tsx'
import { ExploreActivity } from './pages/explore-activity.tsx'
import { ExploreRecords } from './pages/explore-records.tsx'
import { QuestDetailPage } from './pages/quest-detail.tsx'
import { QuestComplete } from './pages/quest-complete.tsx'
import { QuestCompleted } from './pages/quest-completed.tsx'

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
          <Route path="sign-in" element={<SignIn />} />
        </Route>
        <Route element={<MainLayout />}>
          <Route path="home" element={<Home />} />
          <Route path="my-quests" element={<MyQuests />} />
          <Route path="quests/:questId" element={<QuestDetailPage />} />
          <Route path="quests/:questId/complete/:attemptId" element={<QuestComplete />} />
          <Route path="quests/:questId/completed/:recordId" element={<QuestCompleted />} />
          <Route path="explore" element={<Explore />} />
          <Route path="explore/:categoryId" element={<ExploreCategory />} />
          <Route path="explore/:categoryId/:activitySlug" element={<ExploreActivity />} />
          <Route path="explore/:categoryId/:activitySlug/records" element={<ExploreRecords />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/interests" element={<ProfileInterests />} />
          <Route path="profile/personalisation" element={<ProfilePersonalisation />} />
          <Route path="profile/settings" element={<ProfileSettings />} />
          <Route path="profile/edit" element={<ProfileEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
