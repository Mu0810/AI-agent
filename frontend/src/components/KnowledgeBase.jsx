import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X, Plus, Trash2, Search, Tag } from 'lucide-react'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export default function KnowledgeBase({ userId, onClose }) {
  const [knowledge, setKnowledge] = useState([])
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [search, setSearch] = useState('')

  const loadKnowledge = async () => {
    try {
      const res = await fetch(`${API}/api/knowledge?user_id=${userId}&query=${search}`)
      const data = await res.json()
      setKnowledge(data)
    } catch (e) { setKnowledge([]) }
  }

  useEffect(() => { loadKnowledge() }, [userId, search])

  const handleSave = async () => {
    if (!newKey || !newValue) return
    await fetch(`${API}/api/knowledge?user_id=${userId}&key=${encodeURIComponent(newKey)}&value=${encodeURIComponent(newValue)}&category=general`, { method: 'POST' })
    setNewKey('')
    setNewValue('')
    loadKnowledge()
  }

  const handleDelete = async (id) => {
    await fetch(`${API}/api/knowledge/${id}?user_id=${userId}`, { method: 'DELETE' })
    loadKnowledge()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="glass rounded-2xl p-6 mb-4 border border-white/10 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary-400" /><h3 className="text-lg font-bold text-gradient">Knowledge Base</h3></div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-dark-400" /></button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search knowledge..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-900/50 border border-white/10 text-sm text-white placeholder:text-dark-500 outline-none" />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Key (e.g., api_key)" className="flex-1 px-3 py-2 rounded-lg bg-dark-900/50 border border-white/10 text-sm text-white placeholder:text-dark-500 outline-none" />
        <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Value" className="flex-1 px-3 py-2 rounded-lg bg-dark-900/50 border border-white/10 text-sm text-white placeholder:text-dark-500 outline-none" />
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500"><Plus className="w-4 h-4" /></motion.button>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {knowledge.map((item) => (
            <motion.div key={item.id || item.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="glass rounded-lg p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><Tag className="w-3 h-3 text-primary-400" /><span className="text-sm font-mono text-white">{item.key}</span></div>
                <p className="text-xs text-dark-300 truncate">{typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}</p>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(item.id)} className="p-1.5 rounded-md hover:bg-red-500/20 text-dark-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
        {knowledge.length === 0 && <p className="text-center text-sm text-dark-500 py-4">No knowledge saved yet. Use /save in chat or add entries here.</p>}
      </div>
    </motion.div>
  )
}
