import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { decryptText } from "../utils/crypto";
import api from "../utils/api";
import secureIcon from '../images/secure.png';
import { Button } from './Button';
import { Excalidraw } from "@excalidraw/excalidraw";

const viewSharedNote = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEncrypted, setIsEncrypted] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [decryptedContent, setDecryptedContent] = useState("");
  const [cryptoError, setCryptoError] = useState("");

  useEffect(() => {
    const fetchFileData = async () => {
      try {
        const response = await api.get(`/api/files/${fileId}`);
        const data = response.data;
        setFileData(data);
        if (data.encryption) {
          setIsEncrypted(true);
        } else {
          setDecryptedContent(data.content);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching file:", error);
        setLoading(false);
      }
    };

    fetchFileData();
  }, [fileId]);

  const handleDecrypt = async () => {
    try {
      setCryptoError("");
      const plaintext = await decryptText(fileData.content, fileData.iv, fileData.salt, passcode);
      setDecryptedContent(plaintext);
      setIsEncrypted(false);
    } catch (err) {
      setCryptoError("Invalid passcode or corrupted data.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-medium text-white/50 animate-pulse font-label tracking-widest uppercase">Intercepting Signal...</div>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-2xl font-bold font-headline text-error">
          Signal Lost or Access Denied
        </div>
        <Button variant="secondary" onClick={() => navigate('/Home')}>Return to Command Center</Button>
      </div>
    );
  }

  if (isEncrypted) {
    return (
      <main className="w-full min-h-screen font-body antialiased overflow-y-auto flex items-center justify-center p-4">
        <div className="bg-surface-container-highest border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
          <button onClick={() => navigate('/Home')} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
            ✕
          </button>
          <h2 className="text-2xl font-bold font-headline mb-2 text-center mt-2">Classified Data</h2>
          <p className="text-white/50 mb-8 text-sm text-center">E2E Protected. Passcode required.</p>
          <input 
            type="password" 
            placeholder="Enter secure passcode"
            className="w-full p-3 bg-transparent border border-outline-variant rounded-xl mb-4 outline-none focus:border-primary text-white placeholder-white/30 font-label"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') handleDecrypt(); }}
          />
          {cryptoError && <p className="text-error text-sm mb-4 text-center">{cryptoError}</p>}
          <Button variant="primary" className="w-full justify-center" onClick={handleDecrypt}>
            Unlock Content
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full min-h-screen text-on-surface font-body antialiased overflow-y-auto">
      {/* App Header */}
      <nav className="sticky top-0 bg-[#131313]/70 backdrop-blur border-b border-white/10 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src={secureIcon} alt="icon" className="h-7 w-7 opacity-90" />
          <h3 className="text-xl font-medium tracking-tight text-primary">Secure-NoteBook</h3>
        </div>
        <div className="flex gap-6 items-center">
          <Link className="text-sm font-medium text-white/50 hover:text-primary transition-colors duration-300 hidden sm:block" to="/Home">
            Dashboard
          </Link>
          <Button variant="secondary" size="sm" onClick={() => navigate('/Home')}>
            Close Signal
          </Button>
        </div>
      </nav>

      {/* Note Content Base */}
      <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-surface-container/60 glass-panel border border-outline-variant/15 p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] pointer-events-none"></div>

          {/* Note Title & Meta */}
          <div className="border-b border-outline-variant/10 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white">
                {fileData.fileName}
              </h1>
              <h4 className="text-on-surface-variant font-label text-xs tracking-widest mt-3 uppercase">
                Created on {new Date(fileData.createdAt).toLocaleDateString()}
              </h4>
            </div>
            
            <div className="flex flex-col items-end gap-2 text-right">
              <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-label text-[10px] uppercase tracking-widest font-bold">
                Shared Access
              </span>
              <span className="text-xs text-white/40 font-label tracking-widest">
                Owner: {fileData.email}
              </span>
            </div>
          </div>

          {/* Actual File Content parsed via the Canvas Engine */}
          <div className="bg-[#0b0b0b]/60 rounded-2xl border border-white/5 p-6 md:p-8 min-h-[300px] relative z-10">
            {(() => {
              let parsedData = null;
              let isLegacy = true;

              try {
                const json = JSON.parse(decryptedContent);
                if (json && (json.version === 2 || json.version === 3)) {
                  parsedData = json;
                  isLegacy = false;
                }
              } catch (e) {}

              if (isLegacy) {
                return (
                  <p className="text-white/90 leading-relaxed whitespace-pre-wrap font-sans text-lg">
                    {decryptedContent}
                  </p>
                );
              }
              
              if (parsedData.version === 3) {
                return (
                  <div className="w-full h-[600px] border border-white/10 rounded-xl overflow-hidden pointer-events-auto relative z-10">
                     <Excalidraw 
                        theme="dark" 
                        initialData={parsedData.excalidraw}
                        viewModeEnabled={true}
                     />
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-8">
                  {/* Rich Text Core */}
                  {parsedData.text && (
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap font-sans text-lg border-b border-white/5 pb-6">
                      {parsedData.text}
                    </p>
                  )}
                  
                  {/* Attachments rendering */}
                  {parsedData.attachments && parsedData.attachments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-lime-400 mb-3 tracking-widest uppercase">Encrypted Attachments</h4>
                      <div className="flex flex-wrap gap-4">
                        {parsedData.attachments.map((file, idx) => (
                          <div key={idx} className="bg-surface-container border border-white/10 rounded-xl overflow-hidden shadow-lg w-fit max-w-[280px]">
                            {file.type.includes('image') ? (
                              <div>
                                <img src={file.data} alt="attachment" className="w-full h-auto object-cover max-h-48" />
                                <div className="p-3 text-xs font-bold text-white/50 truncate bg-neutral-900 border-t border-white/5">
                                  {file.name}
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-lime-400">description</span>
                                <span className="text-sm font-medium text-white truncate w-32">{file.name}</span>
                                <a download={file.name} href={file.data} className="bg-primary/20 text-lime-400 hover:bg-primary hover:text-neutral-900 px-3 py-1 rounded-full text-xs font-bold transition-colors">
                                  Download
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Native Excalidraw Viewer */}
                  {parsedData.excalidraw && (
                    <div>
                       <h4 className="text-sm font-bold text-lime-400 mb-3 tracking-widest uppercase">Canvas Drawings</h4>
                       <div className="w-full h-[500px] bg-neutral-900 border border-white/10 rounded-xl overflow-hidden pointer-events-auto">
                         <Excalidraw 
                            theme="dark" 
                            initialData={{ elements: parsedData.excalidraw }}
                            viewModeEnabled={true}
                         />
                       </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Action Footer Button Group */}
          <div className="flex justify-between items-center pt-8 mt-4 relative z-10">
            <Button variant="secondary" onClick={() => navigate('/Home')}>
              Return to Control Center
            </Button>
            <div className="flex gap-4">
              <Button variant="primary" onClick={() => window.print()} title="Export Note View via Print renderer">
                Export Secure Layout
              </Button>
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
};

export default viewSharedNote;
