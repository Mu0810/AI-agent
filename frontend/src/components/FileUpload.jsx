import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Image as ImageIcon, FileText, Loader2, Search } from 'lucide-react'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export default function FileUpload({ userId, onClose }) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [pdfText, setPdfText] = useState('')
  const [question, setQuestion] = useState('')
  const [queryResult, setQueryResult] = useState('')
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    setResult(null)
    setPdfText('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      if (file.type.startsWith('image/')) {
        formData.append('prompt', 'Describe this image in detail.')
        const res = await fetch(`${API}/api/upload/image`, { method: 'POST', body: formData })
        const data = await res.json()
        setResult({ type: 'image', filename: file.name, url: URL.createObjectURL(file), analysis: data.analysis })
      } else if (file.type === 'application/pdf') {
        const res = await fetch(`${API}/api/upload/pdf`, { method: 'POST', body: formData })
        const data = await res.json()
        setPdfText(data.text)
        setResult({ type: 'pdf', filename: file.name, pages: data.pages })
      }
    } catch (e) {
      setResult({ type: 'error', message: 'Upload failed. Make sure backend is running.' })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleQuery = async () => {
    if (!question || !pdfText) return
    const formData = new FormData()
    formData.append('text', pdfText)
    formData.append('question', question)
    try {
      const res = await fetch(`${API}/api/query/document`, { method: 'POST', body: formData })
      const data = await res.json()
      setQueryResult(data.answer)
    } catch (e) {
      setQueryResult('Query failed.')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="glass-premium rounded-2xl p-6 mb-4 border border-white/5 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary-400 animate-breathe" />
          <h3 className="text-lg font-bold text-gradient">Upload File</h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 hover:text-white text-dark-400 transition-colors"><X className="w-5 h-5" /></button>
      </div>

      {!result ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
            dragActive 
              ? 'border-primary-500 bg-primary-500/10 shadow-[0_0_20px_rgba(14,165,233,0.15)]' 
              : 'border-white/10 hover:border-primary-500/30 hover:bg-white/5'
          }`}
        >
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <p className="text-sm text-dark-200 font-medium">Processing file...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-6 h-6 text-dark-300" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Drag & drop or click to upload</p>
                <p className="text-xs text-dark-400 mt-1">Supports Images (JPG, PNG) or PDF documents</p>
              </div>
            </div>
          )}
        </div>
      ) : result.type === 'image' ? (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
            <img src={result.url} alt="Uploaded" className="max-h-64 w-full object-cover" />
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 transition-all duration-300 hover:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-semibold text-white">Analysis</span>
            </div>
            <p className="text-sm text-dark-200 leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.01, boxShadow: '0 0 15px rgba(14,165,233,0.1)' }}
            whileTap={{ scale: 0.99 }}
            onClick={() => { setResult(null); setPdfText('') }} 
            className="w-full py-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20 text-sm font-semibold hover:bg-primary-500/20 transition-all btn-ripple"
          >
            Upload Another
          </motion.button>
        </div>
      ) : result.type === 'pdf' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
            <FileText className="w-5 h-5 text-accent-400" />
            <span className="text-sm text-white font-medium truncate flex-1">{result.filename}</span>
            <span className="text-xs text-dark-400 bg-white/5 px-2 py-0.5 rounded-full">{result.pages} pages</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 max-h-48 overflow-y-auto scrollbar-thin">
            <pre className="text-xs text-dark-300 whitespace-pre-wrap font-mono leading-relaxed">{pdfText}</pre>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={question} 
              onChange={e => setQuestion(e.target.value)} 
              placeholder="Ask about this document..." 
              className="flex-1 px-4 py-2.5 rounded-xl bg-dark-900/40 border border-white/10 text-sm text-white placeholder:text-dark-500 outline-none focus:border-primary-500/40 transition-colors font-sans" 
            />
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(14,165,233,0.2)' }} 
              whileTap={{ scale: 0.95 }} 
              onClick={handleQuery} 
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-sm font-semibold flex items-center justify-center text-white"
            >
              <Search className="w-4 h-4" />
            </motion.button>
          </div>
          {queryResult && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 transition-all duration-300">
              <p className="text-sm text-dark-200 leading-relaxed">{queryResult}</p>
            </div>
          )}
          <motion.button 
            whileHover={{ scale: 1.01, boxShadow: '0 0 15px rgba(14,165,233,0.1)' }}
            whileTap={{ scale: 0.99 }}
            onClick={() => { setResult(null); setPdfText(''); setQueryResult('') }} 
            className="w-full py-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20 text-sm font-semibold hover:bg-primary-500/20 transition-all btn-ripple"
          >
            Upload Another
          </motion.button>
        </div>
      ) : (
        <div className="text-center py-6 bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
          <p className="text-sm text-red-400 font-medium">{result.message}</p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setResult(null)} 
            className="mt-3 px-5 py-2 rounded-xl bg-red-500/15 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-all"
          >
            Try Again
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
