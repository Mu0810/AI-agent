import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Image as ImageIcon, FileText, Loader2, Search } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="glass rounded-2xl p-6 mb-4 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gradient">Upload File</h3>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-dark-400" /></button>
      </div>

      {!result ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragActive ? 'border-primary-400 bg-primary-500/10' : 'border-white/10 hover:border-white/20'}`}
        >
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /><p className="text-sm text-dark-300">Uploading...</p></div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-dark-400 mx-auto mb-3" />
              <p className="text-sm text-dark-300 mb-1">Drag & drop or click to upload</p>
              <p className="text-xs text-dark-500">Images (JPG, PNG) or PDF documents</p>
            </>
          )}
        </div>
      ) : result.type === 'image' ? (
        <div className="space-y-4">
          <img src={result.url} alt="Uploaded" className="max-h-64 rounded-lg border border-white/10" />
          <div className="glass rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2"><ImageIcon className="w-4 h-4 text-primary-400" /><span className="text-sm font-medium text-white">Analysis</span></div>
            <p className="text-sm text-dark-200">{result.analysis}</p>
          </div>
          <button onClick={() => { setResult(null); setPdfText('') }} className="w-full py-2 rounded-lg bg-primary-500/20 text-primary-400 text-sm hover:bg-primary-500/30">Upload Another</button>
        </div>
      ) : result.type === 'pdf' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-accent-400" /><span className="text-sm text-white">{result.filename}</span><span className="text-xs text-dark-400">({result.pages} pages)</span></div>
          <div className="glass rounded-lg p-4 max-h-48 overflow-y-auto scrollbar-thin"><pre className="text-xs text-dark-300 whitespace-pre-wrap">{pdfText}</pre></div>
          <div className="flex gap-2">
            <input type="text" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about this document..." className="flex-1 px-3 py-2 rounded-lg bg-dark-900/50 border border-white/10 text-sm text-white placeholder:text-dark-500 outline-none" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleQuery} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-sm"><Search className="w-4 h-4" /></motion.button>
          </div>
          {queryResult && <div className="glass rounded-lg p-4"><p className="text-sm text-dark-200">{queryResult}</p></div>}
          <button onClick={() => { setResult(null); setPdfText(''); setQueryResult('') }} className="w-full py-2 rounded-lg bg-primary-500/20 text-primary-400 text-sm hover:bg-primary-500/30">Upload Another</button>
        </div>
      ) : (
        <div className="text-center py-4"><p className="text-sm text-red-400">{result.message}</p><button onClick={() => setResult(null)} className="mt-3 px-4 py-2 rounded-lg bg-primary-500/20 text-primary-400 text-sm">Try Again</button></div>
      )}
    </motion.div>
  )
}
