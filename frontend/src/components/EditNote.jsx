import React, { useState, useEffect } from 'react';
import { Link, useParams } from "react-router-dom";
import api from '../utils/api';
import { useNavigate } from "react-router-dom";
import { encryptText, decryptText } from '../utils/crypto';
import secureIcon from '../images/secure.png';
import { Button } from './Button';
import { Excalidraw } from "@excalidraw/excalidraw";

const EditNote = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [excalidrawElements, setExcalidrawElements] = useState(null);

  const [message, setMessage] = useState("");
  const [encryption, setEncryption] = useState(false);
  const [shareable, setShareable] = useState(false);
  const [passcode, setPasscode] = useState("");
  
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPasscode, setUnlockPasscode] = useState("");
  const [cryptoError, setCryptoError] = useState("");
  const [cryptoData, setCryptoData] = useState({ iv: "", salt: "", ciphertext: "" });

  const navigate = useNavigate();
  const { fileId } = useParams();

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await api.get(`/api/notes/${fileId}`);
        const { fileName, content, encryption, shareable, iv, salt } = response.data;

        setTitle(fileName);
        setEncryption(encryption);
        setShareable(shareable);
        
        if (encryption) {
           setIsLocked(true);
           setCryptoData({ iv, salt, ciphertext: content });
        } else {
           loadContentEngine(content);
        }
      } catch (error) {
        console.error("Error fetching the note:", error);
        setMessage("Failed to load note data.");
      }
    };
    fetchNote();
  }, [fileId]);

  const loadContentEngine = (rawText) => {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && (parsed.version === 2 || parsed.version === 3)) {
         setContent(parsed.text || "");
         setAttachments(parsed.attachments || []);
         let excalidrawRaw = parsed.excalidraw;
         if (excalidrawRaw && Array.isArray(excalidrawRaw)) {
             setExcalidrawElements(excalidrawRaw);
             setShowCanvas(true);
         } else if (excalidrawRaw && excalidrawRaw.elements) {
             setExcalidrawElements(excalidrawRaw.elements);
             setShowCanvas(true);
         }
      } else {
         setContent(rawText);
      }
    } catch(e) {
      setContent(rawText);
    }
  };

  const handleUnlock = async () => {
    try {
      setCryptoError("");
      const plaintext = await decryptText(cryptoData.ciphertext, cryptoData.iv, cryptoData.salt, unlockPasscode);
      loadContentEngine(plaintext);
      setPasscode(unlockPasscode);
      setIsLocked(false);
    } catch (err) {
      setCryptoError("Invalid passcode.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title && !content && attachments.length === 0 && !excalidrawElements) {
      setMessage("Please add some content, attachments, or a drawing to save.");
      return;
    }

    const payload = JSON.stringify({
      version: 2,
      text: content,
      attachments: attachments,
      excalidraw: excalidrawElements
    });

    let finalContent = payload;
    let finalIv, finalSalt;

    if (encryption) {
      if (!passcode) {
        setMessage("Passcode is required for encrypted notes.");
        return;
      }
      try {
        const encryptedParams = await encryptText(payload, passcode);
        finalContent = encryptedParams.ciphertext;
        finalIv = encryptedParams.iv;
        finalSalt = encryptedParams.salt;
      } catch (err) {
        setMessage("Failed to encrypt note.");
        return;
      }
    }

    const updatedFileData = {
      fileName: title,
      content: finalContent,
      encryption,
      shareable,
      iv: finalIv,
      salt: finalSalt
    };

    try {
      await api.put(`/api/notes/${fileId}`, updatedFileData);
      setMessage("Updated Successfully");
      navigate("/Home");
    } catch (error) {
      setMessage("An error occurred while updating the file.");
    }
  };

  if (isLocked) {
    return (
      <main className="w-full min-h-screen font-body antialiased overflow-y-auto flex items-center justify-center p-4">
        <div className="bg-surface-container-highest border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
          <button onClick={() => navigate('/Home')} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">✕</button>
          <h2 className="text-2xl font-bold font-headline mb-2 text-center mt-2">Unlock to Edit</h2>
          <p className="text-white/50 mb-8 text-sm text-center">E2E Protected. Passcode required.</p>
          <input 
            type="password" 
            placeholder="Enter secure passcode"
            className="w-full p-3 bg-transparent border border-outline-variant rounded-xl mb-4 outline-none focus:border-primary text-white placeholder-white/30 font-label"
            value={unlockPasscode}
            onChange={(e) => setUnlockPasscode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
          />
          {cryptoError && <p className="text-error text-sm mb-4 text-center">{cryptoError}</p>}
          <Button variant="primary" className="w-full justify-center" onClick={handleUnlock}>Unlock</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen font-body antialiased overflow-y-auto">
      <nav className="sticky top-0 bg-[#131313]/70 backdrop-blur border-b border-white/10 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src={secureIcon} alt="icon" className="h-7 w-7 opacity-90" />
          <h3 className="text-xl font-medium tracking-tight text-white">Secure-NoteBook</h3>
        </div>
        <div className="flex gap-6 items-center">
          <Link className="text-sm font-medium text-white/50 hover:text-white transition-colors duration-300 hidden sm:block" to="/Home">Dashboard</Link>
          <Button variant="secondary" size="sm" onClick={() => navigate('/Home')}>Cancel</Button>
        </div>
      </nav>

      <div className="container max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl lg:text-5xl font-medium mb-12 text-white">Modify Note Node</h1>
        
        <div className="bg-neutral-900 border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit}>
            <input
              name="title"
              className="bg-transparent border border-white/15 rounded-xl px-5 py-4 w-full outline-none focus:border-lime-400 transition-colors placeholder-white/30 text-xl font-medium mb-6 text-white"
              placeholder="Give an epic title..."
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            
            <textarea
              name="content"
              className="bg-transparent border border-white/15 rounded-xl px-5 py-4 w-full outline-none focus:border-lime-400 transition-colors placeholder-white/30 text-lg min-h-[200px] resize-y mb-4 text-white"
              placeholder="Edit your text..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>

            {/* Attachments Display */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-6">
                {attachments.map((file, idx) => (
                  <div key={idx} className="bg-neutral-800 border border-white/10 rounded-lg p-3 flex items-center gap-3 relative group">
                    <span className="material-symbols-outlined text-lime-400">{file.type.includes('image') ? 'image' : 'description'}</span>
                    <span className="text-sm font-medium text-white truncate max-w-[150px]">{file.name}</span>
                    <button 
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Excalidraw Canvas Display */}
            {showCanvas && (
              <div className="w-full h-[500px] bg-neutral-900 border border-white/15 rounded-xl mb-6 overflow-hidden relative">
                <button 
                  type="button" 
                  onClick={() => { setShowCanvas(false); setExcalidrawElements(null); }}
                  className="absolute top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white font-bold p-2 rounded flex items-center gap-2 text-sm shadow-xl"
                >
                  <span className="material-symbols-outlined">delete</span> Remove Canvas
                </button>
                <Excalidraw 
                  theme="dark" 
                  initialData={excalidrawElements ? { elements: excalidrawElements } : null}
                  onChange={(elements) => setExcalidrawElements(elements)} 
                />
              </div>
            )}

            {/* Attachment Controls */}
            <div className="flex gap-4 mb-8">
              <label className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-white/10 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-bold text-white">
                <span className="material-symbols-outlined text-lime-400">upload_file</span>
                Attach File
                <input 
                  type="file" 
                  className="hidden" 
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAttachments(prev => [...prev, { name: file.name, type: file.type, data: reader.result }]);
                      };
                      reader.readAsDataURL(file);
                    });
                  }} 
                />
              </label>

              {!showCanvas && (
                <button 
                  type="button" 
                  onClick={() => setShowCanvas(true)}
                  className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-white/10 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-bold text-white"
                >
                  <span className="material-symbols-outlined text-lime-400">draw</span>
                  Open Canvas
                </button>
              )}
            </div>

            <div className="bg-neutral-950/50 rounded-2xl border border-white/5 p-6 mb-8">
              <h4 className="text-lg font-medium mb-4 text-white">Security Settings</h4>
              <div className="flex flex-col sm:flex-row gap-8">
                <label className="flex items-center cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" checked={encryption} onChange={() => setEncryption(!encryption)} className="sr-only" />
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${encryption ? "bg-lime-400 border-lime-400" : "bg-transparent border-white/20 group-hover:border-white/50"}`}>
                      {encryption && <svg className="w-4 h-4 text-neutral-950 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <span className="ml-3 font-medium text-white/80 group-hover:text-white transition-colors">E2E Encryption</span>
                </label>
                <label className="flex items-center cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" checked={shareable} onChange={() => setShareable(!shareable)} className="sr-only" />
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${shareable ? "bg-lime-400 border-lime-400" : "bg-transparent border-white/20 group-hover:border-white/50"}`}>
                      {shareable && <svg className="w-4 h-4 text-neutral-950 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <span className="ml-3 font-medium text-white/80 group-hover:text-white transition-colors">Shareable</span>
                </label>
              </div>
              <div className={`mt-6 transition-all duration-300 overflow-hidden ${encryption ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <label className="block text-sm font-medium text-white/50 mb-2 pl-2">Passcode required to unlock</label>
                <input
                  type="password"
                  className="bg-transparent border border-white/15 rounded-xl px-4 py-3 w-full outline-none focus:border-red-400 transition-colors placeholder-white/30 text-white"
                  placeholder="Set your secure passcode..."
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full flex justify-center !py-4 text-lg">Update Note</Button>
            {message && <p className="text-red-400 text-center mt-6 font-medium bg-red-400/10 py-3 rounded-lg border border-red-400/20">{message}</p>}
          </form>
        </div>
      </div>
    </main>
  );
};

export default EditNote;
