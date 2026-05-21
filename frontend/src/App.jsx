import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Bot, User, Send, Globe, Terminal, FileText, Folder, Clock, Calculator, Cloud, TrendingUp, Bitcoin, MessageSquare, Plus, RotateCcw, Copy, Check, Cpu, Layers, ArrowRight, Loader2, Mic, MicOff, BarChart3, Download, Command, X, Volume2, Search, BookOpen, Bug, Lightbulb, ArrowLeftRight, Save, Zap, Upload, RefreshCw, Trash2, Settings, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import FileUpload from './components/FileUpload'
import KnowledgeBase from './components/KnowledgeBase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const toolIcons = { web_search: Globe, web_scrape: Globe, calculate: Calculator, execute_code: Terminal, read_file: FileText, write_file: FileText, list_directory: Folder, get_current_time: Clock, get_weather: Cloud, get_crypto_price: Bitcoin, get_stock_price: TrendingUp }
const toolColors = { web_search: 'from-blue-500 to-cyan-500', web_scrape: 'from-blue-500 to-cyan-500', calculate: 'from-green-500 to-emerald-500', execute_code: 'from-purple-500 to-pink-500', read_file: 'from-amber-500 to-orange-500', write_file: 'from-amber-500 to-orange-500', list_directory: 'from-amber-500 to-orange-500', get_current_time: 'from-gray-500 to-slate-500', get_weather: 'from-sky-500 to-blue-500', get_crypto_price: 'from-yellow-500 to-orange-500', get_stock_price: 'from-green-500 to-emerald-500' }
const commandIcons = { '/analyze': Search, '/summarize': BookOpen, '/explain': MessageSquare, '/translate': MessageSquare, '/code': Terminal, '/debug': Bug, '/compare': ArrowLeftRight, '/brainstorm': Lightbulb, '/save': Save }

/* ===== Animated Background with Particles + Floating Orbs ===== */
function AnimatedBackground() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let particles = []
    let animId
    let mouse = { x: undefined, y: undefined }
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y })

    class Particle {
      constructor() { this.reset() }
      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 2.5 + 0.5
        this.speedX = (Math.random() - 0.5) * 0.4
        this.speedY = (Math.random() - 0.5) * 0.4
        this.opacity = Math.random() * 0.5 + 0.1
        this.hue = Math.random() > 0.5 ? 199 : 293 // cyan or magenta
        this.pulseSpeed = Math.random() * 0.02 + 0.01
        this.pulseOffset = Math.random() * Math.PI * 2
      }
      update(time) {
        this.x += this.speedX
        this.y += this.speedY

        // Mouse interaction: gentle repulsion
        if (mouse.x !== undefined) {
          const dx = this.x - mouse.x
          const dy = this.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            const force = (120 - dist) / 120 * 0.5
            this.x += (dx / dist) * force
            this.y += (dy / dist) * force
          }
        }

        // Pulsing opacity
        this.opacity = 0.15 + Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.15 + 0.15

        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset()
      }
      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${this.hue}, 80%, 65%, ${this.opacity})`
        ctx.fill()
      }
    }

    for (let i = 0; i < 80; i++) particles.push(new Particle())

    const connect = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 140) {
            const alpha = 0.08 * (1 - d / 140)
            const gradient = ctx.createLinearGradient(particles[i].x, particles[i].y, particles[j].x, particles[j].y)
            gradient.addColorStop(0, `hsla(${particles[i].hue}, 80%, 65%, ${alpha})`)
            gradient.addColorStop(1, `hsla(${particles[j].hue}, 80%, 65%, ${alpha})`)
            ctx.beginPath()
            ctx.strokeStyle = gradient
            ctx.lineWidth = 0.6
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
    }

    let time = 0
    const animate = () => {
      time++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => { p.update(time); p.draw() })
      connect()
      animId = requestAnimationFrame(animate)
    }
    animate()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId) }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      {/* Floating orbs */}
      <div className="orb orb-1" style={{ top: '10%', left: '5%' }} />
      <div className="orb orb-2" style={{ top: '60%', right: '10%' }} />
      <div className="orb orb-3" style={{ bottom: '15%', left: '40%' }} />
    </>
  )
}

/* ===== Animated Logo ===== */
function AnimatedLogo({ size = 'md' }) {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-20 h-20' }
  const iconMap = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-10 h-10' }
  return (
    <motion.div
      className={`${sizeMap[size]} rounded-2xl bg-gradient-to-br from-primary-500 via-blue-500 to-accent-500 flex items-center justify-center glow-primary relative`}
      animate={{
        rotate: [0, 360],
        borderRadius: ['16px', '20px', '14px', '18px', '16px'],
      }}
      transition={{
        rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
        borderRadius: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {/* Inner spinning ring */}
      <motion.div
        className="absolute inset-0 rounded-2xl border border-white/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      <Brain className={`${iconMap[size]} text-white relative z-10`} />
    </motion.div>
  )
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group my-4 rounded-xl overflow-hidden border border-white/10 hover-lift"
    >
      <div className="flex items-center justify-between px-4 py-2 bg-dark-800/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <motion.div className="w-2.5 h-2.5 rounded-full bg-red-500/60" whileHover={{ scale: 1.3 }} />
            <motion.div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" whileHover={{ scale: 1.3 }} />
            <motion.div className="w-2.5 h-2.5 rounded-full bg-green-500/60" whileHover={{ scale: 1.3 }} />
          </div>
          <span className="text-xs text-dark-400 font-mono ml-2">{language || 'text'}</span>
        </div>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleCopy} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/10 text-xs text-dark-400 hover:text-white transition-colors btn-ripple">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied!' : 'Copy'}
        </motion.button>
      </div>
      <SyntaxHighlighter language={language || 'text'} style={oneDark} customStyle={{ margin: 0, padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', fontSize: '0.85rem', lineHeight: '1.6' }} wrapLongLines>{code}</SyntaxHighlighter>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 mb-6">
      <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mt-1 glow-primary">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="glass rounded-2xl px-5 py-4 flex items-center gap-3">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-primary-400 to-accent-400"
            animate={{
              y: [0, -10, 0],
              scale: [1, 1.4, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
        <motion.span
          className="text-xs text-dark-400 ml-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          NEXUS is thinking...
        </motion.span>
      </div>
    </motion.div>
  )
}

function VoiceChat({ onResult, onClose }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recognition, setRecognition] = useState(null)
  const transcriptRef = useRef('')
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const rec = new SR()
      rec.continuous = false
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.onresult = (e) => { const t = e.results[e.resultIndex][0].transcript; setTranscript(t); transcriptRef.current = t }
      rec.onend = () => { setIsListening(false); if (transcriptRef.current.trim()) onResult(transcriptRef.current) }
      setRecognition(rec)
    }
  }, [])
  const toggle = () => { if (!recognition) return; if (isListening) { recognition.stop() } else { setTranscript(''); transcriptRef.current = ''; recognition.start(); setIsListening(true) } }
  const speak = (text) => { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(text || 'Hello! I am NEXUS.'); speechSynthesis.speak(u) } }
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="glass rounded-2xl p-4 mb-4 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${isListening ? 'bg-red-500/20' : 'bg-primary-500/20'}`}
            animate={isListening ? { scale: [1, 1.15, 1], boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 20px rgba(239,68,68,0.4)', '0 0 0px rgba(239,68,68,0)'] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {isListening ? <Mic className="w-5 h-5 text-red-400" /> : <MicOff className="w-5 h-5 text-dark-400" />}
          </motion.div>
          <div><p className="text-sm font-medium text-white">Voice Chat</p><p className="text-xs text-dark-400">{isListening ? 'Listening...' : 'Tap to speak'}</p></div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-dark-400" /></button>
      </div>
      <div className="flex items-center gap-4">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggle} className={`flex-1 py-3 rounded-xl font-medium text-sm btn-ripple ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'}`}>{isListening ? 'Stop' : 'Start Listening'}</motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => speak(transcript)} className="p-3 rounded-xl bg-accent-500/20 text-accent-400 border border-accent-500/30 btn-ripple"><Volume2 className="w-5 h-5" /></motion.button>
      </div>
      {transcript && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 p-3 rounded-lg bg-dark-900/50 text-sm text-dark-200">"{transcript}"</motion.div>}
      {isListening && <div className="flex items-center justify-center gap-1 mt-4">{[...Array(7)].map((_, i) => (<motion.div key={i} className="w-1 rounded-full bg-gradient-to-t from-primary-400 to-accent-400" animate={{ height: [8, 28, 8], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }} />))}</div>}
    </motion.div>
  )
}

function Dashboard({ analytics, onClose }) {
  const { usage, events } = analytics || {}
  return (
    <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className="glass rounded-2xl p-6 mb-4 border border-white/10">
      <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-gradient neon-text">Dashboard</h2><button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors"><X className="w-5 h-5 text-dark-400" /></button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[{ icon: MessageSquare, label: 'Conversations', value: usage?.total_conversations || 0, color: 'from-blue-500 to-cyan-500' }, { icon: Brain, label: 'Messages', value: usage?.total_messages || 0, color: 'from-purple-500 to-pink-500' }, { icon: Zap, label: 'Tokens Used', value: usage?.total_tokens || 0, color: 'from-yellow-500 to-orange-500' }, { icon: BookOpen, label: 'Knowledge', value: usage?.knowledge_entries || 0, color: 'from-green-500 to-emerald-500' }].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }} whileHover={{ scale: 1.05, y: -4 }} className="glass rounded-xl p-4 hover-lift cursor-default">
            <motion.div
              className={`w-10 h-10 rounded-lg bg-gradient-to-r ${s.color} flex items-center justify-center mb-3`}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
            >
              <s.icon className="w-5 h-5 text-white" />
            </motion.div>
            <motion.p className="text-2xl font-bold text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 + 0.3 }}>{s.value.toLocaleString()}</motion.p>
            <p className="text-xs text-dark-400">{s.label}</p>
          </motion.div>
        ))}
      </div>
      {events && Object.keys(events).length > 0 && <div><h3 className="text-sm font-medium text-dark-300 mb-3">Activity</h3><div className="space-y-2">{Object.entries(events).map(([e, c]) => (<motion.div key={e} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-900/30 hover:bg-dark-900/50 transition-colors"><span className="text-sm text-dark-200">{e}</span><span className="text-sm font-medium text-white">{c}</span></motion.div>))}</div></div>}
    </motion.div>
  )
}

function CommandPalette({ onClose, onCommand }) {
  const [commands, setCommands] = useState({})
  const [filter, setFilter] = useState('')
  useEffect(() => { fetch(`${API}/api/commands`).then(r => r.json()).then(d => setCommands(d.commands || {})).catch(() => {}) }, [])
  const filtered = Object.entries(commands).filter(([c]) => c.includes(filter.toLowerCase()))
  return (
    <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className="glass rounded-2xl p-4 mb-4 border border-white/10 max-h-80 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}><Command className="w-5 h-5 text-primary-400" /></motion.div><h3 className="text-sm font-medium text-white">Commands</h3><kbd className="ml-2 px-1.5 py-0.5 rounded bg-dark-800 border border-white/10 text-[10px] text-dark-400 font-mono">⌘K</kbd></div><button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-dark-400" /></button></div>
      <div className="relative mb-3 input-glow rounded-lg">
        <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter commands..." className="w-full px-3 py-2 rounded-lg bg-dark-900/50 border border-white/10 text-sm text-white placeholder:text-dark-500 outline-none" autoFocus />
      </div>
      <div className="space-y-1">{filtered.map(([cmd, desc], i) => { const Icon = commandIcons[cmd] || Command; return (
        <motion.button key={cmd} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ x: 6, backgroundColor: 'rgba(255,255,255,0.05)' }} onClick={() => onCommand(cmd + ' ')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors">
          <motion.div whileHover={{ rotate: 15 }}><Icon className="w-4 h-4 text-primary-400" /></motion.div>
          <div className="flex-1"><span className="text-sm font-mono text-white">{cmd}</span><p className="text-xs text-dark-400">{desc}</p></div>
          <ArrowRight className="w-4 h-4 text-dark-500" />
        </motion.button>
      ) })}</div>
    </motion.div>
  )
}

function SuggestedActions({ onSend }) {
  const suggestions = ["Tell me more about this", "Can you give an example?", "What are the alternatives?", "Summarize the key points"]
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 mt-3 mb-2">
      {suggestions.map((s, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.07, type: 'spring', stiffness: 300 }}
          whileHover={{ scale: 1.06, y: -2, boxShadow: '0 4px 20px rgba(14,165,233,0.15)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSend(s)}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-500/40 text-dark-300 hover:text-white transition-all flex items-center gap-1.5 btn-ripple"
        >
          <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}>
            <Sparkles className="w-3 h-3 text-primary-400" />
          </motion.div>
          {s}
        </motion.button>
      ))}
    </motion.div>
  )
}

function StepsPanel({ steps, show, onToggle }) {
  if (!steps.length) return null
  return (
    <div className="px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.button onClick={onToggle} whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-dark-400 w-full transition-colors">
          <motion.div animate={{ rotate: show ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <Cpu className="w-3.5 h-3.5 text-primary-400" />
          </motion.div>
          <span>{steps.length} reasoning step{steps.length !== 1 ? 's' : ''}</span>
          {show ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
        </motion.button>
        <AnimatePresence>
          {show && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="space-y-1 py-2 pl-4 border-l-2 border-primary-500/20 ml-2">
                {steps.map((step, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-2 text-xs">
                    {step.type === 'thinking' && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-3 h-3 text-primary-400 mt-0.5 flex-shrink-0" /></motion.div>}
                    {step.type === 'tool' && (() => { const Icon = toolIcons[step.tool] || Zap; return <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}><Icon className="w-3 h-3 text-accent-400 mt-0.5 flex-shrink-0" /></motion.div> })()}
                    <span className="text-dark-400">{step.type === 'tool' ? `Used ${step.tool}` : step.content}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function SettingsPanel({ onClose, backendOnline }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -10 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="glass rounded-2xl p-6 mb-4 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}><Settings className="w-5 h-5 text-primary-400" /></motion.div><h3 className="text-lg font-bold text-gradient">Settings</h3></div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors"><X className="w-5 h-5 text-dark-400" /></button>
      </div>
      <div className="space-y-4 stagger-children">
        <div className="glass rounded-xl p-4 hover-lift">
          <h4 className="text-sm font-medium text-white mb-3">Model</h4>
          <div className="flex items-center gap-3">
            <AnimatedLogo size="md" />
            <div><p className="text-sm text-white">Qwen 2.5 — 7B</p><p className="text-xs text-dark-400">Local via Ollama</p></div>
            <motion.div
              className={`ml-auto px-2.5 py-1 rounded-full text-xs font-medium ${backendOnline ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}
              animate={backendOnline ? { boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 12px rgba(34,197,94,0.3)', '0 0 0px rgba(34,197,94,0)'] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {backendOnline ? 'Connected' : 'Offline'}
            </motion.div>
          </div>
        </div>
        <div className="glass rounded-xl p-4 hover-lift">
          <h4 className="text-sm font-medium text-white mb-3">Keyboard Shortcuts</h4>
          <div className="space-y-2">
            {[['⌘ K', 'Command palette'], ['⌘ N', 'New chat'], ['Enter', 'Send message'], ['Shift + Enter', 'New line']].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-dark-300">{desc}</span>
                <kbd className="px-2 py-0.5 rounded bg-dark-800 border border-white/10 text-xs text-dark-300 font-mono">{key}</kbd>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-xl p-4 hover-lift">
          <h4 className="text-sm font-medium text-white mb-3">Available Tools</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(toolIcons).map(([name, Icon], i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(14,165,233,0.1)' }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-dark-900/30 transition-colors cursor-default"
              >
                <Icon className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-xs text-dark-300">{name.replace(/_/g, ' ')}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ===== Animated Status Badge ===== */
function StatusBadge({ online }) {
  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}
        animate={online ? {
          scale: [1, 1.4, 1],
          boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 10px rgba(34,197,94,0.6)', '0 0 0px rgba(34,197,94,0)']
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <p className="text-xs text-dark-400">{backendOnline ? 'Online' : 'Offline'} • Llama 3.3</p>
    </div>
  )
}

/* ===== Welcome Hero ===== */
function WelcomeHero({ onSend }) {
  const suggestions = [
    { icon: Search, text: "Latest AI news", query: "What are the latest AI developments?", gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/20' },
    { icon: Cloud, text: "Weather today", query: "What is the weather in Delhi?", gradient: 'from-sky-500/20 to-blue-500/20', border: 'border-sky-500/20' },
    { icon: Bitcoin, text: "Crypto prices", query: "What is Bitcoin price?", gradient: 'from-yellow-500/20 to-orange-500/20', border: 'border-yellow-500/20' },
    { icon: Terminal, text: "Write Python code", query: "Write a Python script to calculate fibonacci", gradient: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/20' },
    { icon: Calculator, text: "Math & calculations", query: "Calculate the compound interest on $10,000 at 5% for 10 years", gradient: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/20' },
    { icon: Globe, text: "Web research", query: "Search the web for SpaceX latest launch", gradient: 'from-indigo-500/20 to-violet-500/20', border: 'border-indigo-500/20' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center min-h-[60vh] text-center page-enter">
      {/* Animated floating logo */}
      <motion.div
        className="relative mb-8"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur-3xl"
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <AnimatedLogo size="lg" />
      </motion.div>

      {/* Animated title */}
      <motion.h2
        className="text-5xl font-bold mb-3 text-gradient"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        Welcome to NEXUS
      </motion.h2>

      {/* Subtitle with typing effect */}
      <motion.p
        className="text-dark-400 max-w-lg mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        Advanced AI agent with internet access, voice chat, real-time data, code execution, and smart memory.
      </motion.p>

      {/* Suggestion cards with staggered entrance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {suggestions.map((item, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 25, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.08, type: 'spring', stiffness: 200 }}
            whileHover={{
              scale: 1.04,
              y: -4,
              boxShadow: '0 8px 30px rgba(14,165,233,0.12)',
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSend(item.query)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl glass hover:bg-white/10 text-left group border ${item.border} hover:border-primary-500/40 transition-all`}
          >
            <motion.div
              className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0`}
              whileHover={{ rotate: 15 }}
            >
              <item.icon className="w-4 h-4 text-white group-hover:text-primary-300 transition-colors" />
            </motion.div>
            <span className="text-sm text-dark-200 group-hover:text-white transition-colors">{item.text}</span>
            <motion.div className="ml-auto" whileHover={{ x: 4 }}>
              <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
            </motion.div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

/* ===== Animated Sidebar Button ===== */
function SidebarButton({ icon: Icon, label, onClick, extra, active }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.06)' }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-dark-300 transition-colors ${active ? 'bg-white/10 text-white' : 'hover:text-white'}`}
    >
      <motion.div whileHover={{ rotate: 15 }}>
        <Icon className="w-4 h-4" />
      </motion.div>
      {label}
      {extra}
    </motion.button>
  )
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(null)
  const [userId] = useState(() => `user_${Date.now()}`)
  const [conversationId, setConversationId] = useState(() => `conv_${Date.now()}`)
  const [conversations, setConversations] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [showVoice, setShowVoice] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showCommands, setShowCommands] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showKnowledge, setShowKnowledge] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [backendOnline, setBackendOnline] = useState(false)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [lastUserMessage, setLastUserMessage] = useState('')
  const [stepsHistory, setStepsHistory] = useState([])
  const [showSteps, setShowSteps] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, currentStep])
  useEffect(() => { fetch(`${API}/api/conversations?user_id=${userId}`).then(r => r.json()).then(setConversations).catch(() => {}) }, [userId])
  useEffect(() => { fetch(`${API}/api/analytics?user_id=${userId}`).then(r => r.json()).then(setAnalytics).catch(() => {}) }, [userId])

  useEffect(() => { 
    const check = () => fetch(`${API}/api/health`).then(() => setBackendOnline(true)).catch(() => setBackendOnline(false))
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  // Load conversation messages when switching conversations
  useEffect(() => {
    if (!conversationId) return
    fetch(`${API}/api/conversations/${conversationId}/messages?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m, i) => ({
            role: m.role, content: m.content, id: Date.now() + i,
            timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          })))
        }
      })
      .catch(() => {})
  }, [conversationId, userId])

  const handleNewChat = useCallback(() => { setConversationId(`conv_${Date.now()}`); setMessages([]); setCurrentStep(null); setStepsHistory([]); setLastUserMessage('') }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommands(prev => !prev) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); handleNewChat() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNewChat])

  const refreshConversations = useCallback(() => {
    fetch(`${API}/api/conversations?user_id=${userId}`).then(r => r.json()).then(setConversations).catch(() => {})
  }, [userId])

  const handleSend = useCallback(async (text) => {
    if (!text.trim() || isProcessing) return
    const userMessage = { role: 'user', content: text, id: Date.now(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)
    setCurrentStep({ type: 'thinking', content: 'Analyzing request...' })
    setLastUserMessage(text)
    setStepsHistory([])
    try {
      const response = await fetch(`${API}/api/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, user_id: userId, conversation_id: conversationId })
      })
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
        const assistantId = Date.now() + 1
        setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantId, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
        setCurrentStep(null)
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              try {
                const parsed = JSON.parse(data)
                if (parsed.type === 'token') {
                  fullContent += parsed.content
                  setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m))
                } else if (parsed.type === 'step') {
                  setStepsHistory(prev => [...prev, parsed.step])
                  setCurrentStep(parsed.step)
                  await new Promise(r => setTimeout(r, 400))
                  setCurrentStep(null)
                }
              } catch {}
            }
          }
        }
        if (!fullContent) {
          setMessages(prev => prev.filter(m => m.id !== assistantId))
          throw new Error('Empty stream')
        }
      } else {
        const data = await response.json()
        if (data.steps) {
          for (const step of data.steps) {
            setStepsHistory(prev => [...prev, step])
            setCurrentStep(step)
            await new Promise(r => setTimeout(r, 600))
          }
        }
        setMessages(prev => [...prev, { role: 'assistant', content: data.response, id: Date.now() + 1, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
        setCurrentStep(null)
      }
    } catch (error) {
      try {
        const response = await fetch(`${API}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, user_id: userId, conversation_id: conversationId }) })
        const data = await response.json()
        if (data.steps) {
          for (const step of data.steps) {
            setStepsHistory(prev => [...prev, step])
            setCurrentStep(step)
            await new Promise(r => setTimeout(r, 600))
          }
        }
        setMessages(prev => [...prev, { role: 'assistant', content: data.response, id: Date.now() + 1, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
        setCurrentStep(null)
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to NEXUS. Make sure backend is running on port 8000.', id: Date.now() + 1, isError: true }])
      }
    } finally {
      setIsProcessing(false)
      refreshConversations()
    }
  }, [isProcessing, userId, conversationId, refreshConversations])

  const handleExport = useCallback(async () => { const r = await fetch(`${API}/api/export/${conversationId}?user_id=${userId}`); const b = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `chat_${conversationId}.md`; a.click() }, [conversationId, userId])
  const handleVoiceResult = useCallback((text) => handleSend(text), [handleSend])
  const handleSubmit = (e) => { e.preventDefault(); handleSend(input) }

  const handleDeleteConversation = useCallback(async (convId, e) => {
    e.stopPropagation()
    await fetch(`${API}/api/conversations/${convId}?user_id=${userId}`, { method: 'DELETE' }).catch(() => {})
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (convId === conversationId) handleNewChat()
  }, [userId, conversationId, handleNewChat])

  const handleRegenerate = useCallback(async () => {
    if (!lastUserMessage || isProcessing) return
    setMessages(prev => {
      const lastIdx = [...prev].reverse().findIndex(m => m.role === 'assistant')
      if (lastIdx === -1) return prev
      return prev.slice(0, prev.length - 1 - lastIdx)
    })
    handleSend(lastUserMessage)
  }, [lastUserMessage, isProcessing, handleSend])

  const filteredConversations = conversations.filter(c => !sidebarSearch || c.title?.toLowerCase().includes(sidebarSearch.toLowerCase()) || c.last_message?.toLowerCase().includes(sidebarSearch.toLowerCase()))

  return (
    <div className="h-screen bg-dark-950 relative overflow-hidden flex aurora-bg">
      <AnimatedBackground />

      {/* ===== SIDEBAR ===== */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-72 glass-strong border-r border-white/5 flex flex-col z-20"
          >
            {/* New Chat button */}
            <div className="p-4 border-b border-white/5">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(14,165,233,0.3)' }}
                whileTap={{ scale: 0.97 }}
                onClick={handleNewChat}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 via-blue-600 to-accent-600 text-white font-medium shadow-lg shadow-primary-500/25 btn-ripple relative overflow-hidden"
              >
                <motion.div animate={{ rotate: [0, 90, 0] }} transition={{ duration: 3, repeat: Infinity }}><Plus className="w-5 h-5" /></motion.div>
                New Chat
                {/* Shimmer overlay on button */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              </motion.button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-white/5">
              <div className="relative input-glow rounded-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
                <input type="text" value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} placeholder="Search chats..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-900/50 border border-white/10 text-xs text-white placeholder:text-dark-500 outline-none focus:border-primary-500/30 transition-colors" />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
              <AnimatePresence>
                {filteredConversations.map((conv, i) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.06)' }}
                    className={`group w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 cursor-pointer ${conv.id === conversationId ? 'bg-gradient-to-r from-primary-500/10 to-accent-500/5 text-white border-l-2 border-primary-500' : 'text-dark-300 hover:text-white'}`}
                  >
                    <div className="flex-1 min-w-0" onClick={() => setConversationId(conv.id)}>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate text-sm">{conv.title}</span>
                      </div>
                      {conv.last_message && <p className="text-[10px] text-dark-500 truncate mt-0.5 pl-5">{conv.last_message}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {conv.message_count > 0 && <span className="text-[10px] text-dark-500">{conv.message_count}</span>}
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={(e) => handleDeleteConversation(conv.id, e)} className="p-1 rounded hover:bg-red-500/20 text-dark-500 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredConversations.length === 0 && <p className="text-center text-xs text-dark-500 py-8">{sidebarSearch ? 'No matching chats' : 'No conversations yet'}</p>}
            </div>

            {/* Sidebar footer */}
            <div className="p-4 border-t border-white/5 space-y-1">
              <SidebarButton icon={BarChart3} label="Dashboard" onClick={() => setShowDashboard(!showDashboard)} />
              <SidebarButton icon={Command} label="Commands" onClick={() => setShowCommands(!showCommands)} extra={<kbd className="ml-auto px-1.5 py-0.5 rounded bg-dark-800 border border-white/10 text-[10px] text-dark-500 font-mono">⌘K</kbd>} />
              <SidebarButton icon={Upload} label="Upload File" onClick={() => setShowFileUpload(!showFileUpload)} />
              <SidebarButton icon={BookOpen} label="Knowledge Base" onClick={() => setShowKnowledge(!showKnowledge)} />
              <SidebarButton icon={Settings} label="Settings" onClick={() => setShowSettings(!showSettings)} />
              <SidebarButton icon={Download} label="Export Chat" onClick={handleExport} />

              {/* Brand footer */}
              <motion.div
                className="flex items-center gap-3 px-3 py-3 mt-2 border-t border-white/5"
                whileHover={{ x: 2 }}
              >
                <AnimatedLogo size="sm" />
                <div>
                  <p className="text-sm font-medium text-gradient">NEXUS Agent</p>
                  <p className="text-xs text-dark-400">Powered by Qwen</p>
                </div>
              </motion.div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="glass-strong px-4 py-3 flex items-center justify-between border-b border-white/5 scan-line"
        >
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-white/10 transition-colors"><Layers className="w-5 h-5 text-dark-300" /></motion.button>
            <div className="flex items-center gap-2">
              <AnimatedLogo size="sm" />
              <div>
                <h1 className="text-lg font-bold text-gradient neon-text">NEXUS</h1>
                <StatusBadge online={backendOnline} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowVoice(!showVoice)} className={`p-2 rounded-lg transition-colors ${showVoice ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-dark-300'}`}>{showVoice ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</motion.button>
            <motion.button whileHover={{ scale: 1.1, rotate: 30 }} whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg hover:bg-white/10 text-dark-300 transition-colors"><Settings className="w-5 h-5" /></motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-white/10 text-sm btn-ripple"><Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span></motion.button>
            <motion.button whileHover={{ scale: 1.05, rotate: -180 }} whileTap={{ scale: 0.95 }} onClick={() => { setMessages([]); setCurrentStep(null); setStepsHistory([]); fetch(`${API}/api/reset?user_id=${userId}&conversation_id=${conversationId}`, { method: 'POST' }).catch(() => {}) }} className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-white/10 text-sm btn-ripple"><RotateCcw className="w-4 h-4" /><span className="hidden sm:inline">Clear</span></motion.button>
          </div>
        </motion.header>

        {/* Panels */}
        <AnimatePresence>
          {showDashboard && analytics && <Dashboard analytics={analytics} onClose={() => setShowDashboard(false)} />}
          {showCommands && <CommandPalette onClose={() => setShowCommands(false)} onCommand={(cmd) => { setInput(cmd); setShowCommands(false) }} />}
          {showFileUpload && <FileUpload userId={userId} onClose={() => setShowFileUpload(false)} />}
          {showKnowledge && <KnowledgeBase userId={userId} onClose={() => setShowKnowledge(false)} />}
          {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} backendOnline={backendOnline} />}
        </AnimatePresence>

        <StepsPanel steps={stepsHistory} show={showSteps} onToggle={() => setShowSteps(prev => !prev)} />

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 md:px-8">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode='popLayout'>
              {messages.length === 0 ? (
                <WelcomeHero onSend={handleSend} />
              ) : (
                messages.map((message, idx) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className={`flex gap-4 mb-6 timestamp-hover message-glow ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <motion.div
                        className="w-8 h-8 rounded-lg flex-shrink-0 bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mt-1 glow-primary"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Bot className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                    <motion.div
                      className={`max-w-[85%] rounded-2xl ${message.role === 'user' ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white px-5 py-3 shadow-lg shadow-primary-500/10' : message.isError ? 'bg-red-500/10 border border-red-500/20 text-red-300 px-5 py-3' : 'text-dark-100'}`}
                      whileHover={message.role === 'user' ? { scale: 1.01, boxShadow: '0 8px 30px rgba(14,165,233,0.2)' } : {}}
                    >
                      {message.role === 'assistant' && !message.isError ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code({ node, inline, className, children, ...props }) { const match = /language-(\w+)/.exec(className || ''); return !inline ? <CodeBlock language={match?.[1] || 'text'} code={String(children).replace(/\n$/, '')} /> : <code className="bg-dark-800 px-1.5 py-0.5 rounded text-sm text-primary-300" {...props}>{children}</code> } }}>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )}
                      {message.role === 'assistant' && !message.isError && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center gap-1 mt-3 pt-3 border-t border-white/5">
                          <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={() => { navigator.clipboard.writeText(message.content); setCopiedId(message.id); setTimeout(() => setCopiedId(null), 2000) }} className="p-1.5 rounded-md hover:bg-white/10 text-dark-500 hover:text-white transition-colors" title="Copy">{copiedId === message.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}</motion.button>
                          <motion.button whileHover={{ scale: 1.2, rotate: 180 }} whileTap={{ scale: 0.8 }} onClick={handleRegenerate} className="p-1.5 rounded-md hover:bg-white/10 text-dark-500 hover:text-white transition-colors" title="Regenerate"><RefreshCw className="w-3.5 h-3.5" /></motion.button>
                        </motion.div>
                      )}
                      {message.timestamp && <span className="msg-time text-[10px] text-dark-500 mt-1 block">{message.timestamp}</span>}
                    </motion.div>
                    {message.role === 'user' && (
                      <motion.div
                        className="w-8 h-8 rounded-lg flex-shrink-0 bg-dark-700 flex items-center justify-center mt-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        <User className="w-4 h-4" />
                      </motion.div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !isProcessing && <SuggestedActions onSend={handleSend} />}
            <AnimatePresence>
              {currentStep && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex gap-4 mb-6">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mt-1 glow-primary">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="glass rounded-2xl px-5 py-3 max-w-[85%]">
                    {currentStep.type === 'thinking' && (<div className="flex items-center gap-2 text-dark-300 text-sm"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-4 h-4 text-primary-400" /></motion.div>{currentStep.content}</div>)}
                    {currentStep.type === 'tool' && currentStep.tool === 'web_search' && (<div className="space-y-2"><div className="flex items-center gap-2"><motion.div className="w-6 h-6 rounded-md bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}><Globe className="w-3 h-3 text-white" /></motion.div><span className="text-sm font-medium text-white">Searching the internet...</span></div>{currentStep.result && (<div className="bg-dark-900/50 rounded-lg px-3 py-2 text-xs text-dark-300 max-h-24 overflow-y-auto scrollbar-thin">{currentStep.result}</div>)}</div>)}
                    {currentStep.type === 'tool' && currentStep.tool !== 'web_search' && (<div className="space-y-2"><div className="flex items-center gap-2">{(() => { const Icon = toolIcons[currentStep.tool] || Zap; const gradient = toolColors[currentStep.tool] || 'from-primary-500 to-accent-500'; return (<><motion.div className={`w-6 h-6 rounded-md bg-gradient-to-r ${gradient} flex items-center justify-center`} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1, repeat: Infinity }}><Icon className="w-3 h-3 text-white" /></motion.div><span className="text-sm font-medium text-white">{currentStep.tool.replace('_', ' ')}</span></>)})()}</div>{currentStep.result && (<div className="bg-dark-900/50 rounded-lg px-3 py-2 text-xs text-dark-300 font-mono max-h-24 overflow-y-auto scrollbar-thin">{currentStep.result}</div>)}</div>)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {isProcessing && !currentStep && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            {showVoice && <VoiceChat onResult={handleVoiceResult} onClose={() => setShowVoice(false)} />}
            <motion.form initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} onSubmit={handleSubmit}>
              <motion.div
                className="glass-strong rounded-2xl p-2 flex items-center gap-2 border border-white/10 focus-within:border-primary-500/50 transition-all input-glow gradient-border-animated"
                whileHover={{ boxShadow: '0 4px 20px rgba(14,165,233,0.08)' }}
              >
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input) } }} placeholder="Ask NEXUS anything... (⌘K for commands)" disabled={isProcessing} rows={1} className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-sm placeholder:text-dark-500 disabled:opacity-50 auto-resize" />
                <motion.button
                  type="submit"
                  disabled={isProcessing || !input.trim()}
                  whileHover={{ scale: 1.08, boxShadow: '0 0 20px rgba(14,165,233,0.4)' }}
                  whileTap={{ scale: 0.9 }}
                  className="p-3 rounded-xl bg-gradient-to-r from-primary-500 via-blue-500 to-accent-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 btn-ripple relative overflow-hidden"
                >
                  {isProcessing ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-4 h-4" /></motion.div>
                  ) : (
                    <motion.div whileHover={{ x: 2, y: -2 }}><Send className="w-4 h-4" /></motion.div>
                  )}
                  {/* Send button shimmer */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-200%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                  />
                </motion.button>
              </motion.div>
              <motion.p
                className="text-center text-xs text-dark-500 mt-2"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                NEXUS can make mistakes. Verify important information.
              </motion.p>
            </motion.form>
          </div>
        </div>
      </div>
    </div>
  )
}
