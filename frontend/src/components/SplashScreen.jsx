import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Plus, Trash2, Box, Folder, Play, ChevronRight } from 'lucide-react'

export default function SplashScreen({ onSandboxCreated }) {
  const [ loading, setLoading ] = useState(false)
  const [ loadingProjectId, setLoadingProjectId ] = useState(null)
  const [ error, setError ] = useState(null)
  const [ dots, setDots ] = useState('')
  const [ title, setTitle ] = useState('')
  const [ loadingStep, setLoadingStep ] = useState('')
  const [ isAuthenticated, setIsAuthenticated ] = useState(true)
  const [ projects, setProjects ] = useState([])
  const [ projectsLoading, setProjectsLoading ] = useState(true)
  const [ serverDown, setServerDown ] = useState(false)
  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/sandbox/project', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
          setIsAuthenticated(true)
        } else if (res.status === 401) {
          setIsAuthenticated(false)
        } else {
          // Server reachable but returned an unexpected error → treat as backend unavailable
          setServerDown(true)
        }
      } catch {
        // Network error: no backend reachable (e.g. the static front-end-only deploy)
        setServerDown(true)
      } finally {
        setProjectsLoading(false)
      }
    }
    fetchProjects()
  }, [])

  useEffect(() => {
    if (!loading && loadingProjectId === null) return
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [ loading, loadingProjectId ])

  const handleOpenProject = async (projectId) => {
    setLoadingProjectId(projectId)
    setError(null)
    try {
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start sandbox (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()
      const project = projects.find(p => p._id === projectId)
      onSandboxCreated({ ...sandboxData, title: project ? project.title : 'Untitled' })
    } catch (err) {
      setError(err.message || 'Failed to start sandbox')
      setLoadingProjectId(null)
    }
  }

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/sandbox/project/${projectId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to delete project')
      setProjects(projects.filter(p => p._id !== projectId))
    } catch (err) {
      setError(err.message || 'Failed to delete project')
    }
  }

  const handleCreate = async () => {
    const projectTitle = title.trim()
    if (!projectTitle) {
      setError('Please enter a project name')
      return
    }
    setLoading(true)
    setError(null)
    try {
      setLoadingStep('project')
      const projectRes = await fetch('/api/sandbox/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: projectTitle })
      })
      if (!projectRes.ok) throw new Error(`Failed to create project (${projectRes.status})`)
      const projectData = await projectRes.json()
      const projectId = projectData.project._id

      setLoadingStep('sandbox')
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start sandbox (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()
      onSandboxCreated({ ...sandboxData, title: projectTitle })
    } catch (err) {
      setError(err.message || 'Failed to create sandbox')
      setLoading(false)
      setLoadingStep('')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout')
      setIsAuthenticated(false)
      setProjects([])
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  const handleSignIn = (e) => {
    e.preventDefault()
    setError('Connection refused: The authentication and AI microservices are currently offline.')
  }

  const isAnyLoading = loading || loadingProjectId !== null

  // When the backend can't be reached (e.g. the static front-end-only deploy),
  // show a sign-in page that reports the server is offline when the user submits.
  if (serverDown && !projectsLoading) {
    return (
      <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden" style={{ background: '#1F1F1D' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center gap-7 px-6 text-center w-full"
          style={{ maxWidth: '400px' }}
        >
          {/* Logo */}
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--accent)', boxShadow: '0 0 40px var(--accent-glow-bright)' }}>
            <Box size={40} className="text-white" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Sandbox IDE</h1>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>Sign in to continue</p>
          </div>

          {/* Sign-in form */}
          <form onSubmit={handleSignIn} className="flex flex-col gap-3 w-full">
            <input
              type="email" required value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              placeholder="Email"
              className="w-full outline-none rounded-xl px-5 py-3.5 text-sm"
              style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}
            />
            <input
              type="password" required value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="Password"
              className="w-full outline-none rounded-xl px-5 py-3.5 text-sm"
              style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}
            />
            <button type="submit" className="btn-claude w-full py-3.5 rounded-xl text-base font-semibold"
              style={{ boxShadow: '0 4px 20px var(--accent-glow-bright)' }}>
              Sign In
            </button>
          </form>

          {error && (
            <div className="px-5 py-3 rounded-lg text-sm w-full" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              ⚠ {error}
            </div>
          )}
        </motion.div>

        <div className="absolute bottom-6 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Sandbox IDE • Powered by AI
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden" style={{ background: '#1F1F1D' }}>
      {/* Logout Button */}
      {isAuthenticated && !isAnyLoading && (
        <button 
          onClick={handleLogout}
          className="absolute top-6 right-6 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer z-50 flex items-center gap-2 hover:bg-white/5 border border-transparent hover:border-white/10 text-gray-400 hover:text-gray-200"
        >
          <LogOut size={16} /> Logout
        </button>
      )}

      {/* Main content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-8 px-6 text-center w-full" 
        style={{ maxWidth: '480px' }}
      >
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--accent)', boxShadow: '0 0 40px var(--accent-glow-bright)' }}>
            <Box size={40} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
            Sandbox IDE
          </h1>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            Spin up an isolated coding environment instantly.
          </p>
        </div>

        {/* Existing projects list or Login */}
        {!isAnyLoading && (
          <div className="w-full">
            {projectsLoading ? (
              <div className="w-full flex justify-center py-4">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              </div>
            ) : !isAuthenticated ? (
              <div className="w-full flex flex-col items-center mt-4">
                <a href="/api/auth/google"
                  className="btn-claude w-full py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-3 text-center"
                  style={{ boxShadow: '0 4px 20px var(--accent-glow-bright)' }}
                >
                  Continue with Google
                </a>
              </div>
            ) : projects.length > 0 && (
              <div className="w-full">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-left" style={{ color: 'var(--text-muted)' }}>
                  Recent Projects
                </p>
                <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: '240px' }}>
                  {projects.map(project => (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      key={project._id}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left group relative"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <button
                        onClick={() => handleOpenProject(project._id)}
                        disabled={isAnyLoading}
                        className="flex-1 flex items-center gap-3 cursor-pointer outline-none bg-transparent text-left"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <Folder size={16} className="text-gray-400 group-hover:text-[var(--accent)]" style={{ transition: 'color 0.2s' }} />
                        </div>
                        <span className="text-sm font-medium text-gray-200 group-hover:text-white">{project.title}</span>
                      </button>
                      <div className="flex items-center gap-4 shrink-0 relative z-10">
                        {loadingProjectId === project._id ? (
                          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                        ) : (
                          <button
                            onClick={() => handleOpenProject(project._id)}
                            disabled={isAnyLoading}
                            className="cursor-pointer"
                          >
                            <Play size={16} className="text-gray-500 hover:text-[var(--accent)]" style={{ transition: 'color 0.2s' }} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteProject(e, project._id)}
                          disabled={isAnyLoading}
                          className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          title="Delete Project"
                        >
                          <Trash2 size={16} className="text-red-400 hover:text-red-300" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>OR CREATE NEW</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* New project input + CTA */}
        {isAuthenticated && !isAnyLoading ? (
          <div className="flex flex-col items-center gap-3 w-full" style={{ maxWidth: '420px' }}>
            <div className="w-full rounded-xl overflow-hidden transition-colors"
              style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="New project name…"
                className="w-full outline-none bg-transparent px-5 py-3.5 text-sm"
                style={{ color: 'var(--text-primary)' }}
                autoFocus={projects.length === 0}
              />
            </div>
            <button onClick={handleCreate} className="btn-claude w-full py-3.5 rounded-xl text-base flex items-center justify-center gap-2"
              style={{ boxShadow: '0 4px 20px var(--accent-glow-bright)' }}>
              <Plus size={18} /> Create Project
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {loadingProjectId
                  ? `Starting sandbox${dots}`
                  : loadingStep === 'project'
                    ? `Creating project${dots}`
                    : `Starting sandbox${dots}`}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="px-5 py-3 rounded-lg text-sm w-full" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            ⚠ {error}
          </div>
        )}
      </motion.div>

      {/* Bottom brand */}
      <div className="absolute bottom-6 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        Sandbox IDE • Powered by AI
      </div>
    </div>
  )
}
