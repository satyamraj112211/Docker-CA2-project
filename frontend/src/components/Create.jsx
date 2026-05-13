import React, { useState } from 'react';
import { Link } from "react-router-dom";
import api from '../utils/api';
import { useNavigate } from "react-router-dom";
import { encryptText } from '../utils/crypto';
import secureIcon from '../images/secure.png';
import { Button } from './Button';
import { Excalidraw } from "@excalidraw/excalidraw";

const Create = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [excalidrawElements, setExcalidrawElements] = useState(null);
  
  const [message, setMessage] = useState("");

  const [encryption, setEncryption] = useState(false);
  const [shareable, setShareable] = useState(false);
  const [passcode, setPasscode] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title && !content && attachments.length === 0 && !excalidrawElements) {
      setMessage("Please add some content, attachments, or a drawing to save.");
      return;
    }

    // Serialize payload (Google Keep Style architecture)
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
        console.error("Encryption failed:", err);
        setMessage("Failed to encrypt note.");
        return;
      }
    }

    const fileData = {
      fileName: title,
      content: finalContent,
      encryption,
      shareable,
      iv: finalIv,
      salt: finalSalt
    };

    try {
      const response = await api.post("/api/upload", fileData);
      setMessage(response.data.message || "Uploaded Successfully");
      navigate("/Home");
    } catch (error) {
      console.error("Error:", error);
      setMessage("An error occurred while uploading the file.");
    }
  };

  return (
    <main className="w-full min-h-screen font-body antialiased overflow-y-auto">
      {/* App Header */}
      <nav className="sticky top-0 bg-[#131313]/70 backdrop-blur border-b border-white/10 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src={secureIcon} alt="icon" className="h-7 w-7 opacity-90" />
          <h3 className="text-xl font-medium tracking-tight text-white">Secure-NoteBook</h3>
        </div>
        <div className="flex gap-6 items-center">
          <Link className="text-sm font-medium text-white/50 hover:text-white transition-colors duration-300 hidden sm:block" to="/Home">
            Dashboard
          </Link>
          <Button variant="secondary" size="sm" onClick={() => navigate('/Home')}>
            Cancel
          </Button>
        </div>
      </nav>

      <div className="container max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl lg:text-5xl font-medium mb-12 text-white">Create Vault Note</h1>
        
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
              placeholder="Start jotting down your sensitive information..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>

            {/* Attachments Display */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-6">
                {attachments.map((file, idx) => (
                  <div key={idx} className="bg-neutral-800 border border-white/10 rounded-lg p-3 flex items-center gap-3 relative group">
                    <span className="material-symbols-outlined text-lime-400">
                      {file.type.includes('image') ? 'image' : 'description'}
                    </span>
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
                {/* Encryption Checkbox */}
                <label className="flex items-center cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={encryption}
                      onChange={() => setEncryption(!encryption)}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${encryption ? "bg-lime-400 border-lime-400" : "bg-transparent border-white/20 group-hover:border-white/50"}`}>
                      {encryption && (
                        <svg className="w-4 h-4 text-neutral-950 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 font-medium text-white/80 group-hover:text-white transition-colors">E2E Encryption</span>
                </label>

                {/* Shareable Checkbox */}
                <label className="flex items-center cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={shareable}
                      onChange={() => setShareable(!shareable)}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${shareable ? "bg-lime-400 border-lime-400" : "bg-transparent border-white/20 group-hover:border-white/50"}`}>
                      {shareable && (
                        <svg className="w-4 h-4 text-neutral-950 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 font-medium text-white/80 group-hover:text-white transition-colors">Shareable</span>
                </label>
              </div>

              {/* Passcode Input Area */}
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

            <Button type="submit" variant="primary" className="w-full flex justify-center !py-4 text-lg">
              Create Secure Note
            </Button>
            
            {message && (
              <p className="text-red-400 text-center mt-6 font-medium bg-red-400/10 py-3 rounded-lg border border-red-400/20">{message}</p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
};

export default Create;
