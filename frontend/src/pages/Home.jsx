import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UploadCloud, FileText, Loader2, Copy, Check, Clock, Lock, 
  EyeOff, Eye, Hash, User, Power, ShieldAlert, LogIn, UserPlus
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Home = () => {
  // --- AUTH STATES ---
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || null);
  const [authMode, setAuthMode] = useState('none'); // 'none', 'login', 'register'
  const [authForm, setAuthForm] = useState({ userId: '', email: '', password: '' });
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  // --- DASHBOARD STATES ---
  const [dashboardLinks, setDashboardLinks] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);

  // --- UPLOAD STATES ---
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); 
  const [password, setPassword] = useState('');     
  const [oneTime, setOneTime] = useState(false);
  const [maxViews, setMaxViews] = useState('');
  const [copied, setCopied] = useState(false);

  // --- AUTHENTICATION LOGIC ---
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = authMode === 'login' 
        ? { loginId: authForm.userId, password: authForm.password }
        : authForm;
      
      const res = await axios.post(API_URL + endpoint, payload);
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.userId);
      setToken(res.data.token);
      setUsername(res.data.userId);
      setAuthMode('none');
      
      setAuthForm({ userId: '', email: '', password: '' }); 
      setShowAuthPassword(false); 
      
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.error || "Authentication failed");
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    setShowDashboard(false);
    setAuthMode('none');
    
    setAuthForm({ userId: '', email: '', password: '' }); 
    setShowAuthPassword(false); 
  };

  // --- DASHBOARD LOGIC ---
  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/dashboard/links`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardLinks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchDashboard();
  }, [token]);

  const toggleLinkStatus = async (id) => {
    try {
      await axios.put(`${API_URL}/dashboard/links/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboard(); 
    } catch (err) { alert("Failed to toggle link status"); }
  };

  // --- UPLOAD LOGIC ---
  const handleUpload = async () => {
    if (mode === 'text' && !text.trim()) return alert("Please enter text");
    if (mode === 'file' && !file) return alert("Please select a file");

    setLoading(true);
    const formData = new FormData();
    if (expiryDate) formData.append('userExpiry', expiryDate);
    if (password) formData.append('password', password);
    if (maxViews) formData.append('maxViews', maxViews);
    formData.append('oneTimeView', oneTime);
    if (mode === 'text') formData.append('text', text);
    if (mode === 'file') formData.append('file', file);

    try {
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await axios.post(`${API_URL}/upload`, formData, { headers });
      setShareLink(`${window.location.origin}/${res.data.shareId}`);
      if (token) fetchDashboard(); 
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally { setLoading(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setShareLink(''); setText(''); setFile(null); 
    setExpiryDate(''); setPassword(''); setOneTime(false); setMaxViews('');
  };

  // --- UI RENDERERS ---
  const renderAuthForm = () => (
    <div className="w-full max-w-lg bg-slate-800 p-8 rounded-xl shadow-xl border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
      
      <div className="flex flex-col items-center mb-8">
        <div className="bg-blue-600/20 p-4 rounded-full mb-4">
          {authMode === 'login' ? <LogIn size={32} className="text-blue-500" /> : <UserPlus size={32} className="text-blue-500" />}
        </div>
        <h2 className="text-2xl font-bold text-white">
          {authMode === 'login' ? 'Welcome Back' : 'Create an Account'}
        </h2>
        <p className="text-slate-400 text-sm mt-2 text-center">
          {authMode === 'login' ? 'Login to manage your secure links and dashboard.' : 'Sign up to track, manage, and delete your shared links.'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-slate-400 font-semibold mb-1 block">User ID / Username</label>
          <input 
            type="text" 
            placeholder="e.g. johndoe123" 
            required 
            className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            value={authForm.userId} 
            onChange={(e) => setAuthForm({...authForm, userId: e.target.value})} 
          />
        </div>
        
        {authMode === 'register' && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <label className="text-xs text-slate-400 font-semibold mb-1 block">Email Address</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              required 
              className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              value={authForm.email} 
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})} 
            />
          </div>
        )}
        
        <div>
          <label className="text-xs text-slate-400 font-semibold mb-1 block">Password</label>
          <div className="relative">
            <input 
              type={showAuthPassword ? "text" : "password"} 
              placeholder="••••••••" 
              required 
              className="w-full bg-slate-900 border border-slate-600 text-white p-3 pr-10 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              value={authForm.password} 
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})} 
            />
            <button 
              type="button"
              onClick={() => setShowAuthPassword(!showAuthPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-lg hover:shadow-blue-500/20">
          {authMode === 'login' ? 'Login Securely' : 'Create Account'}
        </button>
        
        {/* Toggle between Login and Register directly */}
        <div className="flex flex-col items-center mt-4 space-y-2">
          {authMode === 'login' ? (
            <span className="text-sm text-slate-400">
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => setAuthMode('register')} 
                className="text-blue-400 hover:text-white font-semibold transition-colors"
              >
                Register
              </button>
            </span>
          ) : (
            <span className="text-sm text-slate-400">
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => setAuthMode('login')} 
                className="text-blue-400 hover:text-white font-semibold transition-colors"
              >
                Login
              </button>
            </span>
          )}
          
          {/* UPDATED: Added underline and underline-offset-2 */}
          <button 
            type="button" 
            onClick={() => {
              setAuthMode('none');
              setAuthForm({ userId: '', email: '', password: '' }); 
              setShowAuthPassword(false);
            }} 
            className="text-xs text-slate-500 mt-2 hover:text-slate-300 transition-colors flex items-center gap-1 underline underline-offset-2"
          >
            Cancel and go back to Upload
          </button>
        </div>

      </form>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
      
      {/* HEADER BAR FOR LOGGED IN USERS */}
      {token && (
        <div className="w-full max-w-4xl bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3 text-white font-bold">
            <div className="bg-blue-600 p-2 rounded-full"><User size={20} /></div>
            Welcome, {username}
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowDashboard(!showDashboard)} className="text-blue-400 hover:text-white transition-colors text-sm font-semibold flex items-center gap-2">
              {showDashboard ? "Back to Upload" : "View My Links"}
            </button>
            <button onClick={logout} className="text-red-400 hover:text-red-300 transition-colors text-sm font-semibold flex items-center gap-1">
              <Power size={16} /> Logout
            </button>
          </div>
        </div>
      )}

      {/* CONDITIONAL RENDER: DASHBOARD vs AUTH FORM vs UPLOAD FORM */}
      {showDashboard && token ? (
        
        // --- 1. DASHBOARD VIEW ---
        <div className="w-full bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700 overflow-x-auto animate-in fade-in duration-200">
          <h2 className="text-xl font-bold text-white mb-4">Your Link Vault</h2>
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-3 rounded-tl-lg">Link / File</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3">Expires</th>
                <th className="p-3">Views</th>
                <th className="p-3 rounded-tr-lg">Action</th>
              </tr>
            </thead>
            <tbody>
              {dashboardLinks.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-slate-500">No links created yet.</td></tr>}
              {dashboardLinks.map(link => (
                <tr key={link.shareId} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="p-3">
                    <a href={`/${link.shareId}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-mono">
                      {window.location.host}/{link.shareId}
                    </a>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                       {link.type === 'file' ? <UploadCloud size={10}/> : <FileText size={10}/>} {link.originalName || 'Text Data'}
                    </div>
                  </td>
                  <td className="p-3">
                    {link.status === 'active' && <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">Active</span>}
                    {link.status === 'deactivated' && <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs">Deactivated</span>}
                    {link.status === 'expired' && <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs flex items-center w-max gap-1"><ShieldAlert size={12}/> Expired</span>}
                  </td>
                  <td className="p-3 text-xs">{new Date(link.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-xs">{new Date(link.expireAt).toLocaleString()}</td>
                  <td className="p-3 text-xs">
                    {link.oneTimeView ? "One-Time" : `${link.views} / ${link.maxViews || '∞'}`}
                  </td>
                  <td className="p-3">
                    {link.status !== 'expired' && (
                      <button onClick={() => toggleLinkStatus(link.shareId)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition-colors">
                        {link.status === 'active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : authMode !== 'none' ? (

        // --- 2. AUTHENTICATION VIEW ---
        renderAuthForm()

      ) : (

        // --- 3. UPLOAD VIEW ---
        <div className="w-full max-w-lg bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
          
          {shareLink ? (
             <div className="text-center space-y-4">
               <div className="bg-green-500/10 text-green-400 p-3 rounded-lg border border-green-500/20">🎉 Secure Link Generated!</div>
               <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
                 <input type="text" readOnly value={shareLink} className="bg-transparent flex-1 outline-none text-slate-300 text-sm px-2"/>
                 <button onClick={copyToClipboard} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors">{copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}</button>
               </div>
               <button onClick={resetForm} className="text-sm text-slate-400 hover:text-white mt-4 underline">Upload Another</button>
             </div>
          ) : (
             <>
               <div className="flex bg-slate-900 rounded-lg p-1 mb-6">
                 <button onClick={() => setMode('text')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Paste Text</button>
                 <button onClick={() => setMode('file')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'file' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Upload File</button>
               </div>

               <div className="mb-4">
                 {mode === 'text' ? (
                   <textarea className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Paste sensitive text..." value={text} onChange={(e) => setText(e.target.value)}/>
                 ) : (
                   <div className="border-2 border-dashed border-slate-600 rounded-lg h-40 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-700/50 relative cursor-pointer">
                     <input type="file" onChange={(e) => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                     {file ? <div className="text-white font-medium">{file.name}</div> : <><UploadCloud size={32} className="mb-2" />Click or drag file</>}
                   </div>
                 )}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <label className="text-xs text-slate-400 flex items-center gap-2 mb-2 font-semibold"><Clock size={14} /> Expiration</label>
                    <input type="datetime-local" className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded p-2 focus:outline-none focus:border-blue-500" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} min={new Date().toISOString().slice(0, 16)}/>
                 </div>
                 <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <label className="text-xs text-slate-400 flex items-center gap-2 mb-2 font-semibold"><Lock size={14} /> Password</label>
                    <input type="password" placeholder="Optional..." className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded p-2 focus:outline-none focus:border-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} />
                 </div>
                 <div className={`p-3 rounded-lg border transition-all ${oneTime ? 'bg-slate-900/20 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-900/50 border-slate-700'}`}>
                    <label className="text-xs text-slate-400 flex items-center gap-2 mb-2 font-semibold"><Hash size={14} /> Max Views</label>
                    <input type="number" min="1" disabled={oneTime} placeholder={oneTime ? "Disabled" : "e.g. 5"} className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded p-2 focus:outline-none focus:border-blue-500 disabled:bg-slate-900" value={maxViews} onChange={(e) => {setMaxViews(e.target.value); if(e.target.value) setOneTime(false);}} />
                 </div>
                 <div className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${maxViews ? 'bg-slate-900/20 border-slate-800 opacity-50 cursor-not-allowed' : oneTime ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-900/50 border-slate-700'}`} onClick={() => {if(!maxViews) setOneTime(!oneTime)}}>
                    <label className="text-xs text-slate-400 flex items-center gap-2 font-semibold cursor-pointer"><EyeOff size={14} className={oneTime ? "text-red-400" : ""}/> One-Time View</label>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${oneTime ? 'bg-red-500 border-red-500' : 'border-slate-600'}`}>{oneTime && <Check size={10} className="text-white" />}</div>
                 </div>
               </div>

               <button onClick={handleUpload} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                 {loading ? <Loader2 className="animate-spin" /> : 'Create Secure Link'}
               </button>
             </>
          )}
          
          {/* LOGIN/REGISTER PROMPTS (Only visible if not logged in) */}
          {!token && (
            <div className="mt-6 pt-4 border-t border-slate-700 text-center flex flex-col items-center">
               <span className="text-sm text-slate-400">Want to track and manage your links?</span>
               <div className="flex gap-4 mt-2">
                 <button onClick={() => setAuthMode('login')} className="text-blue-400 hover:text-white font-semibold transition-colors">Login</button>
                 <span className="text-slate-600">•</span>
                 <button onClick={() => setAuthMode('register')} className="text-blue-400 hover:text-white font-semibold transition-colors">Create Account</button>
               </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default Home;