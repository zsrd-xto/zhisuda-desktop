import type { ReactNode } from 'react'

export type AppPage = 'home' | 'resume' | 'settings'

interface LayoutProps {
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
  children: ReactNode
}

const NAV_ITEMS: Array<{ id: AppPage; label: string }> = [
  { id: 'home', label: '个人中心' },
  { id: 'resume', label: '简历管理' },
  { id: 'settings', label: '设置' }
]

export function Layout({ currentPage, onNavigate, children }: LayoutProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">职速达</p>
            <h1 className="text-lg font-semibold text-white">好工作，职速达</h1>
          </div>
          <nav className="flex gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  currentPage === item.id
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
