import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  FileDown, Copy, Check, AlertCircle, Lock, Unlock, EyeOff, 
  Hash, Music, FileText, File, Trash2, Clock 
} from 'lucide-react'; // Added Clock here

// Change to 5001 if using port 5001
const API_URL = 'http://localhost:5000/api';

const ViewContent = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Password States
  const [isLocked, setIsLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  
  // UI States
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false); 
  const [isDeleted, setIsDeleted] = useState(false); 

  useEffect(() => {
    fetchContent();
  }, [id]);

  const fetchContent = async (pwd = '') => {
    try {
      setLoading(true);
      setUnlockError('');
      
      const url = pwd ? `${API_URL}/content/${id}?password=${pwd}` : `${API_URL}/content/${id}`;
      const res = await axios.get(url);
      
      setData(res.data);
      setIsLocked(false);
    } catch (err) {
      if (err.response?.status === 401) {
        setIsLocked(true);
        setError(null);
      } else if (err.response?.status === 403) {
        setUnlockError('Incorrect password');
        setIsLocked(true);
      } else {
        setError('Link expired or not found.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    fetchContent(passwordInput);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this content? It will be gone forever.")) return;

    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/content/${id}`);
      setIsDeleted(true); 
    } catch (err) {
      alert("Failed to delete content. It might already be gone.");
    } finally {
      setDeleting(false);
    }
  };

  const copyContent = () => {
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleTextDownload = () => {
      const element = document.createElement("a");
      const file = new Blob([data.content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = "shared-content.txt";
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
  };

  const handleFileDownload = async () => {
      setDownloading(true);
      try {
        const response = await axios.get(data.content, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', data.originalName || 'downloaded-file');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        window.open(data.content, '_blank');
      } finally {
        setDownloading(false);
      }
  };

  const getFileType = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'mpeg'].includes(ext)) return 'audio';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'other';
  };

  const renderPreview = () => {
      const type = getFileType(data.originalName);
      switch (type) {
        case 'image': return <img src={data.content} className="w-full h-auto max-h-[500px] object-contain bg-slate-900 rounded-lg border border-slate-700 mb-6" />;
        case 'video': return <video controls src={data.content} className="w-full max-h-[500px] bg-slate-900 rounded-lg border border-slate-700 mb-6" />;
        case 'audio': return <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 mb-6 text-center"><Music size={48} className="text-purple-400 mb-4 inline-block" /><audio controls src={data.content} className="w-full" /></div>;
        case 'pdf': return <iframe src={data.content} className="w-full h-[500px] bg-slate-900 rounded-lg border border-slate-700 mb-6"></iframe>;
        default: return <div className="bg-slate-900/50 p-10 rounded-lg border border-slate-700 mb-6 text-center text-slate-500"><File size={64} className="mb-4 opacity-50 inline-block" /><p>No preview available</p></div>;
      }
  };

  // --- UI BADGES ---
  const renderOneTimeWarning = () => {
    if (data?.oneTimeView) {
      return (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-4 flex items-start gap-3 text-sm animate-pulse">
          <EyeOff size={20} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-base mb-1">Self-Destructed</span>
            This link has been deleted from the server. <br/>
            If you refresh this page, the content will be lost forever.
          </div>
        </div>
      );
    }
    return null;
  };

  const renderViewLimit = () => {
    if (data?.maxViews) {
      const remaining = data.maxViews - data.views;
      return (
          <div className="bg-orange-500/10 border border-orange-500/50 text-orange-200 px-3 py-2 rounded-lg mb-4 text-sm flex items-center gap-2">
              <Hash size={16} />
              <span>
                  <b>View {data.views} of {data.maxViews}</b>. 
                  {remaining <= 0 
                      ? " Content deleted." 
                      : ` ${remaining} view(s) remaining.`}
              </span>
          </div>
      );
    }
    return null;
  };

  // --- NEW: EXPIRY CLOCK ---
  const renderExpiryInfo = () => {
    if (data?.expireAt) {
      // Convert the backend timestamp into a readable local date/time
      const date = new Date(data.expireAt);
      const formattedDate = date.toLocaleString([], { 
        month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });

      return (
        <div className="bg-blue-500/10 border border-blue-500/50 text-blue-200 px-3 py-2 rounded-lg mb-6 text-sm flex items-center gap-2">
            <Clock size={16} />
            <span>
                Auto-deletes on: <b>{formattedDate}</b>
            </span>
        </div>
      );
    }
    return null;
  };

  // --- RENDER STATES ---

  if (isDeleted) {
    return (
      <div className="text-center p-8 bg-slate-800 rounded-xl border border-red-500/30 mt-10 w-full max-w-md mx-auto">
        <Trash2 size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Content Deleted</h2>
        <p className="text-slate-400">You have manually deleted this content. It is no longer accessible.</p>
        <a href="/" className="inline-block mt-6 text-blue-400 hover:underline">Create a new link</a>
      </div>
    );
  }

  if (loading && !isLocked) return <div className="text-slate-400 animate-pulse mt-10 text-center">Loading content...</div>;

  if (isLocked) {
    return (
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 mt-10 mx-auto">
        <div className="text-center mb-6">
          <div className="bg-blue-600/20 p-4 rounded-full inline-block mb-4">
            <Lock size={32} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-white">Password Required</h2>
          <p className="text-slate-400 text-sm mt-2">This content is protected by the sender.</p>
        </div>

        <form onSubmit={handleUnlock}>
          <input 
            type="password" 
            placeholder="Enter Password" 
            className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 mb-4"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            autoFocus
          />
          {unlockError && <p className="text-red-400 text-sm mb-4 flex items-center gap-2"><AlertCircle size={14}/> {unlockError}</p>}
          
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
            <Unlock size={18} /> Unlock Content
          </button>
        </form>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-slate-800 rounded-xl border border-red-500/30 mt-10">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Unavailable</h2>
        <p className="text-slate-400">{error}</p>
        <a href="/" className="inline-block mt-6 text-blue-400 hover:underline">Create a new link</a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
       
       {renderOneTimeWarning()}
       {renderViewLimit()}
       {renderExpiryInfo()} {/* Injection of the new clock badge */}

       <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          {data.type === 'text' ? <FileText className="text-blue-400"/> : <FileDown className="text-green-400"/>}
          {data.type === 'text' ? 'Shared Text' : data.originalName}
        </h2>
        
        <div className="flex gap-2">
           {data.protected && <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20 flex items-center gap-1"><Lock size={10}/> Protected</span>}
        </div>
      </div>

      {data.type === 'text' ? (
        <div className="flex flex-col gap-4">
          <div className="relative group">
            <pre className="bg-slate-900 p-6 rounded-lg text-slate-300 font-mono whitespace-pre-wrap text-sm max-h-[60vh] overflow-y-auto border border-slate-700 shadow-inner">{data.content}</pre>
            <button onClick={copyContent} className="absolute top-4 right-4 p-2 bg-slate-700/80 hover:bg-slate-600 text-white rounded-md shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100">{copied ? <Check size={18} className="text-green-400"/> : <Copy size={18}/>}</button>
          </div>
          <div className="flex justify-end gap-3">
             <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors border border-red-500/30 px-3 py-2 rounded-lg hover:bg-red-500/10">
                <Trash2 size={16} /> {deleting ? "Deleting..." : "Delete Now"}
             </button>
             <button onClick={handleTextDownload} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 px-3 py-2 rounded-lg hover:bg-blue-500/10">
                <FileDown size={16} /> Download .txt
             </button>
          </div>
        </div>
      ) : (
        <div>
          {renderPreview()}
          <div className="flex flex-col items-center gap-4">
            <button onClick={handleFileDownload} disabled={downloading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-wait">
              {downloading ? "Loading..." : <><FileDown size={20} /> Download {data.originalName}</>}
            </button>
            <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 mt-2">
                <Trash2 size={12} /> {deleting ? "Deleting..." : "Delete this file immediately"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewContent;