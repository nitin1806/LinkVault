import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, Loader2, Copy, Check, Clock, Lock, EyeOff, Hash } from 'lucide-react';

// Change to 5001 if you changed your backend port
const API_URL = 'http://localhost:5000/api';

const Home = () => {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  
  // Advanced Options States
  const [expiryDate, setExpiryDate] = useState(''); 
  const [password, setPassword] = useState('');     
  const [oneTime, setOneTime] = useState(false);
  const [maxViews, setMaxViews] = useState('');
  
  const [copied, setCopied] = useState(false);

  const handleUpload = async () => {
    if (mode === 'text' && !text.trim()) return alert("Please enter some text");
    if (mode === 'file' && !file) return alert("Please select a file");

    setLoading(true);
    const formData = new FormData();
    
    // --- CRITICAL FIX: SEND SETTINGS FIRST ---
    // We append these BEFORE the file so Multer reads them correctly.
    if (expiryDate) formData.append('userExpiry', expiryDate);
    if (password) formData.append('password', password);
    if (maxViews) formData.append('maxViews', maxViews);
    formData.append('oneTimeView', oneTime);

    // --- SEND CONTENT LAST ---
    if (mode === 'text') formData.append('text', text);
    if (mode === 'file') formData.append('file', file);
    
    try {
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShareLink(`${window.location.origin}/${res.data.shareId}`);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setShareLink(''); 
    setText(''); 
    setFile(null); 
    setExpiryDate('');
    setPassword('');
    setOneTime(false);
    setMaxViews('');
  };

  // --- LOGIC: HANDLE MUTUAL EXCLUSION ---
  const handleOneTimeToggle = () => {
    if (maxViews) return; // Don't toggle if Max Views is set
    setOneTime(!oneTime);
  };

  const handleMaxViewsChange = (e) => {
    const val = e.target.value;
    setMaxViews(val);
    // If user types a number, ensure One-Time is OFF
    if (val) setOneTime(false);
  };

  return (
    <div className="w-full max-w-lg bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
      
      {shareLink ? (
        // --- RESULT VIEW ---
        <div className="text-center space-y-4">
          <div className="bg-green-500/10 text-green-400 p-3 rounded-lg border border-green-500/20">
            🎉 Secure Link Generated!
          </div>
          
          <div className="text-sm text-slate-400">
             {oneTime ? <span className="text-red-400 font-bold">⚠️ Link expires after 1 view.</span> : 
             password ? "Locked with password." : "Link is ready to share."}
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
            <input type="text" readOnly value={shareLink} className="bg-transparent flex-1 outline-none text-slate-300 text-sm px-2"/>
            <button onClick={copyToClipboard} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors">
              {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
            </button>
          </div>
          
          <button onClick={resetForm} className="text-sm text-slate-400 hover:text-white mt-4 underline">
            Upload Another
          </button>
        </div>
      ) : (
        // --- UPLOAD FORM ---
        <>
          <div className="flex bg-slate-900 rounded-lg p-1 mb-6">
            <button onClick={() => setMode('text')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <div className="flex items-center justify-center gap-2"><FileText size={16} /> Paste Text</div>
            </button>
            <button onClick={() => setMode('file')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'file' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              <div className="flex items-center justify-center gap-2"><UploadCloud size={16} /> Upload File</div>
            </button>
          </div>

          <div className="mb-4">
            {mode === 'text' ? (
              <textarea className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Paste your sensitive text here..." value={text} onChange={(e) => setText(e.target.value)}/>
            ) : (
              <div className="border-2 border-dashed border-slate-600 rounded-lg h-40 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-700/50 transition-all relative">
                <input type="file" onChange={(e) => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                {file ? (
                  <div className="text-center"><p className="text-white font-medium">{file.name}</p><p className="text-xs">{(file.size / 1024).toFixed(1)} KB</p></div>
                ) : (
                  <><UploadCloud size={32} className="mb-2" /><p>Click or drag file to upload</p></>
                )}
              </div>
            )}
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            
            {/* Expiry */}
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
              <label className="text-xs text-slate-400 flex items-center gap-2 mb-2 font-semibold">
                <Clock size={14} /> Expiration
              </label>
              <input 
                type="datetime-local" 
                className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded p-2 focus:outline-none focus:border-blue-500"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Password */}
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
              <label className="text-xs text-slate-400 flex items-center gap-2 mb-2 font-semibold">
                <Lock size={14} /> Password
              </label>
              <input 
                type="password" 
                className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded p-2 focus:outline-none focus:border-blue-500"
                placeholder="Optional..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {/* Max Views */}
            <div className={`p-3 rounded-lg border transition-all ${oneTime ? 'bg-slate-900/20 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-900/50 border-slate-700'}`}>
              <label className="text-xs text-slate-400 flex items-center gap-2 mb-2 font-semibold">
                <Hash size={14} /> Max Views
              </label>
              <input 
                type="number" 
                min="1"
                className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded p-2 focus:outline-none focus:border-blue-500 disabled:bg-slate-900 disabled:text-slate-600"
                placeholder={oneTime ? "Disabled" : "e.g. 5"}
                value={maxViews}
                onChange={handleMaxViewsChange}
                disabled={oneTime} 
              />
            </div>

            {/* One-Time View */}
            <div 
              className={`p-3 rounded-lg border transition-all flex items-center justify-between 
                ${maxViews ? 'bg-slate-900/20 border-slate-800 opacity-50 cursor-not-allowed' : 
                  oneTime ? 'bg-red-500/10 border-red-500/50 cursor-pointer' : 'bg-slate-900/50 border-slate-700 cursor-pointer'}`} 
              onClick={handleOneTimeToggle}
            >
              <div>
                <label className={`text-xs flex items-center gap-2 font-semibold ${maxViews ? 'cursor-not-allowed text-slate-600' : 'cursor-pointer text-slate-400'}`}>
                    <EyeOff size={14} className={oneTime ? "text-red-400" : ""} /> One-Time View
                </label>
              </div>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors 
                ${maxViews ? 'border-slate-800 bg-slate-900' : 
                  oneTime ? 'bg-red-500 border-red-500' : 'border-slate-600 bg-slate-800'}`}>
                  {oneTime && <Check size={12} className="text-white" />}
              </div>
            </div>

          </div>

          <button onClick={handleUpload} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : 'Create Secure Link'}
          </button>
        </>
      )}
    </div>
  );
};

export default Home;