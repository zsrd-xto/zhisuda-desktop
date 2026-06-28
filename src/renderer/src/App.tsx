import { useEffect, useState } from 'react'
import type { UserProfile } from '@shared/types/user'
import { Layout, type AppPage } from '@renderer/components/Layout'
import { zhisudaClient } from '@renderer/lib/zhisuda-client'
import { HomePage } from '@renderer/pages/HomePage'
import { JobsPage } from '@renderer/pages/JobsPage'
import { PreferencesPage } from '@renderer/pages/PreferencesPage'
import { ResumePage } from '@renderer/pages/ResumePage'
import { SettingsPage } from '@renderer/pages/SettingsPage'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: UserProfile }

function App(): React.JSX.Element {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [currentPage, setCurrentPage] = useState<AppPage>('home')
  const [resumeRefreshKey, setResumeRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    zhisudaClient.user
      .getProfile()
      .then((profile) => {
        if (!cancelled) {
          setState({ status: 'ready', profile })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : '加载用户信息失败'
          setState({ status: 'error', message })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleProfileChange = (profile: UserProfile): void => {
    setState({ status: 'ready', profile })
  }

  const handleNavigate = (page: AppPage): void => {
    if (page !== 'jobs') {
      void zhisudaClient.platform.hideView()
    }
    setCurrentPage(page)
  }

  const handleDataCleared = (): void => {
    setResumeRefreshKey((value) => value + 1)
    setCurrentPage('home')
  }

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        正在初始化本地用户…
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-red-400">
        {state.message}
      </div>
    )
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'home' && (
        <HomePage
          key={state.profile.id}
          profile={state.profile}
          onProfileChange={handleProfileChange}
        />
      )}
      {currentPage === 'resume' && <ResumePage refreshKey={resumeRefreshKey} />}
      {currentPage === 'preferences' && <PreferencesPage />}
      {currentPage === 'jobs' && <JobsPage />}
      {currentPage === 'settings' && (
        <SettingsPage
          profile={state.profile}
          onProfileChange={handleProfileChange}
          onDataCleared={handleDataCleared}
        />
      )}
    </Layout>
  )
}

export default App
