import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react'
import { useAuthStore } from './store/authStore'
import Dashboard from './pages/Dashboard'
import DailyReport from './pages/DailyReport'
import Suggestion from './pages/Suggestion'

const links = [
  { to: '/', label: '儀表板' },
  { to: '/daily-report', label: '每日報告' },
  { to: '/suggestion', label: '持倉調整' },
]

function AuthSync() {
  const { getToken } = useAuth()
  const setToken = useAuthStore((s) => s.setToken)

  useEffect(() => {
    getToken().then(setToken).catch(() => setToken(null))
    const interval = setInterval(() => {
      getToken().then(setToken).catch(() => setToken(null))
    }, 60000)
    return () => clearInterval(interval)
  }, [getToken, setToken])

  return null
}

function Nav() {
  const loc = useLocation()
  return (
    <nav className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
        <Link to="/" className="font-bold text-lg text-gray-800">
          🧠 蒙格投資組合
        </Link>
        <div className="flex items-center gap-3">
          <SignedIn>
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  loc.pathname === l.to
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                登入
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthSync />
      <Nav />
      <main className="p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/daily-report" element={<DailyReport />} />
          <Route path="/suggestion" element={<Suggestion />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
