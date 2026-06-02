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
        }
      } catch {
        setIsAuthenticated(false)
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
      onSandboxCreated(sandboxData)
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
      onSandboxCreated(sandboxData)
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

  const isAnyLoading = loading || loadingProjectId !== null

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Logout Button */}
      {isAuthenticated && !isAnyLoading && (
        <button 
          onClick={handleLogout}
          className="absolute top-6 right-6 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer z-50 flex items-center gap-2 hover:bg-white/5 border border-transparent hover:border-white/10 text-gray-400 hover:text-gray-200"
        >
          <LogOut size={16} /> Logout
        </button>
      )}

      {/* Main content wrapped in framer-motion */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-8 px-6 text-center w-full" 
        style={{ maxWidth: '480px' }}
      >
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.3)]">
            <Box size={40} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-gray-100">
            Sandbox IDE
          </h1>
          <p className="text-base text-gray-400">
            Spin up an isolated coding environment instantly.
          </p>
        </div>

        {/* Existing projects list or Login */}
        {!isAnyLoading && (
          <div className="w-full">
            {projectsLoading ? (
              <div className="w-full flex justify-center py-4">
                <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              </div>
            ) : !isAuthenticated ? (
              <div className="w-full flex flex-col items-center mt-4">
                <a href="/api/auth/google"
                  className="btn-claude w-full py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-3 text-center shadow-lg shadow-orange-500/20"
                >
                  Continue with Google
                </a>
              </div>
            ) : projects.length > 0 && (
              <div className="w-full">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-left text-gray-500">
                  Recent Projects
                </p>
                <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: '240px' }}>
                  {projects.map(project => (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      key={project._id}
                      className="w-full flex items-center justify-between px-4 py-3 liquid-glass-panel text-left group relative"
                    >
                      <button
                        onClick={() => handleOpenProject(project._id)}
                        disabled={isAnyLoading}
                        className="flex-1 flex items-center gap-3 cursor-pointer outline-none bg-transparent text-left"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/5 border border-white/10 group-hover:bg-orange-500/10 group-hover:border-orange-500/30 transition-colors">
                          <Folder size={16} className="text-gray-400 group-hover:text-orange-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-200 group-hover:text-white">{project.title}</span>
                      </button>
                      <div className="flex items-center gap-4 shrink-0 relative z-10">
                        {loadingProjectId === project._id ? (
                          <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                        ) : (
                          <button
                            onClick={() => handleOpenProject(project._id)}
                            disabled={isAnyLoading}
                            className="cursor-pointer"
                          >
                            <Play size={16} className="text-gray-500 hover:text-orange-400 transition-colors" />
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
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-xs text-gray-500 font-medium">OR CREATE NEW</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* New project input + CTA */}
        {isAuthenticated && !isAnyLoading ? (
          <div className="flex flex-col items-center gap-3 w-full" style={{ maxWidth: '420px' }}>
            <div className="w-full liquid-glass-panel overflow-hidden transition-colors focus-within:border-orange-500/50">
              <input
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="New project name…"
                className="w-full outline-none bg-transparent px-5 py-3.5 text-sm text-gray-200"
                autoFocus={projects.length === 0}
              />
            </div>
            <button onClick={handleCreate} className="btn-claude w-full py-3.5 rounded-xl text-base shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
              <Plus size={18} /> Create Project
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="flex items-center gap-3 px-6 py-3 liquid-glass-panel text-orange-400">
              <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              <span className="text-sm font-medium text-gray-200">
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
          <div className="px-5 py-3 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400 w-full">
            ⚠ {error}
          </div>
        )}
      </motion.div>

      {/* Bottom brand */}
      <div className="absolute bottom-6 text-xs font-medium text-gray-500">
        Sandbox IDE • Powered by AI
      </div>
    </div>
  )
}
