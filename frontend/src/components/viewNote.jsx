import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { decryptText } from "../utils/crypto";
import api from "../utils/api";
import secureIcon from '../images/secure.png';
import { Button } from './Button';
import { Excalidraw } from "@excalidraw/excalidraw";

const ViewNote = () => {
  const { fileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [decryptedContent, setDecryptedContent] = useState("");
  const [cryptoError, setCryptoError] = useState("");

  const preDecryptedContent = location.state?.decryptedContent;

  useEffect(() => {
    const fetchFileData = async () => {
      try {
        const response = await api.get(`/api/files/${fileId}`);
        const data = response.data;
        setFileData(data);
        if (data.encryption) {
          if (preDecryptedContent) {
            setDecryptedContent(preDecryptedContent);
            setIsEncrypted(false);
          } else {
            setIsEncrypted(true);
          }
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
  }, [fileId, preDecryptedContent]);

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
        <div className="text-xl font-medium text-white/50 animate-pulse">Decrypting content...</div>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-2xl font-medium text-white/50">
          File not found or access denied.
        </div>
        <Button variant="secondary" onClick={() => navigate('/Home')}>Back to Dashboard</Button>
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
          <h2 className="text-2xl font-bold font-headline mb-2 text-center mt-2">Encrypted Note</h2>
          <p className="text-white/50 mb-8 text-sm text-center">E2E Protected. Enter the passcode to unlock.</p>
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
          <h3 className="text-xl font-medium tracking-tight">Secure-NoteBook</h3>
        </div>
        <div className="flex gap-6 items-center">
          <Link className="text-sm font-medium text-white/50 hover:text-white transition-colors duration-300 hidden sm:block" to="/Home">
            Dashboard
          </Link>
          <Link className="text-sm font-medium text-white/50 hover:text-white transition-colors duration-300 hidden sm:block" to="/create">
            Create Note
          </Link>
          <Button variant="secondary" size="sm" onClick={() => navigate('/Home')}>
            Close
          </Button>
        </div>
      </nav>

      {/* Note Content Base */}
      <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-neutral-900 border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl">
          
          {/* Note Title & Meta */}
          <div className="border-b border-white/10 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-medium">
                {fileData.fileName}
              </h1>
              <h4 className="text-white/30 text-sm mt-3">
                Created on {new Date(fileData.createdAt).toLocaleDateString()}
              </h4>
            </div>
            {preDecryptedContent && (
              <span className="bg-lime-400/10 text-lime-400 border border-lime-400/20 px-3 py-1 rounded-full text-xs font-medium">
                Decrypted via Dashboard
              </span>
            )}
          </div>

          {/* Actual File Content parsed via the Canvas Engine */}
          <div className="bg-neutral-950/50 rounded-2xl border border-white/5 p-6 md:p-8 min-h-[300px]">
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
                       <div className="w-full h-[500px] border border-white/10 rounded-xl overflow-hidden pointer-events-auto">
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
          <div className="flex justify-between items-center pt-8 mt-4">
            <Button variant="secondary" onClick={() => navigate('/Home')}>
              Back to list
            </Button>
            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => window.print()} title="Export Note View via Print renderer">
                Export Layout
              </Button>
              <Button variant="primary" onClick={() => navigate(`/edit/${fileId}`)}>
                Edit Content
              </Button>
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
};

export default ViewNote;
