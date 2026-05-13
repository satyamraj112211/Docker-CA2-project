import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { useNavigate, Link } from "react-router-dom";
import { decryptText } from "../utils/crypto";
import logoUrl from '../assets/images/logo.svg';

// Retained specific icons inside the logic if needed, but styling prefers Google Material Symbols.
import { 
  RiImageAddLine,
  RiUploadCloud2Line,
  RiEditLine,
  RiSettings3Line,
  RiUser3Line,
  RiQuestionLine,
  RiLogoutBoxRLine,
} from "react-icons/ri";

const HomePage = () => {
  const [files, setFiles] = useState([]);
  const [sortedFiles, setSortedFiles] = useState([]);
  const [fileId, setFileId] = useState(null);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deleteFileId, setDeleteFileId] = useState(null);
  
  const [showPasscodePopup, setShowPasscodePopup] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [selectedEncryptedFile, setSelectedEncryptedFile] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [isKidsProfile, setIsKidsProfile] = useState(false);

  // New Dashboard States
  const [currentTab, setCurrentTab] = useState("vault"); // "vault" | "pinned" | "shared" | "archived"

  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/api/files")
      .then((response) => {
        setFiles(response.data);
        setSortedFiles(response.data);
      })
      .catch((error) => {
        console.error("Error fetching files:", error);
        navigate("/login");
      });
  }, [navigate]);

  useEffect(() => {
    const fetchSharedFiles = async () => {
      try {
        const response = await api.get("/api/shared-files");
        setSharedFiles(response.data);
      } catch (error) {
        console.error("Error fetching shared files:", error);
      }
    };
    fetchSharedFiles();
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get("/api/current-user");
        setCurrentUser(response.data);
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      const response = await api.get("/api/logout");
      if (response.data === "Logged out") {
        navigate("/login");
      }
    } catch (error) {
      console.error(error.response?.data || "Logout failed");
    }
  };

  const handleDeleteFileConfirmation = (fileId) => {
    setDeleteFileId(fileId);
    setShowDeletePopup(true); 
  };

  const deleteFile = async (fileId) => {
    try {
      await api.delete(`/api/files/${fileId}`);
      setFiles(files.filter(file => file._id !== fileId));
      setSortedFiles(sortedFiles.filter(file => file._id !== fileId));
      setShowDeletePopup(false);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  // Toggle Pinned / Archived Logic
  const toggleNoteState = async (fileId, field, currentValue) => {
    try {
      await api.patch(`/api/notes/${fileId}/toggle`, { [field]: !currentValue });
      
      // Update local state to reflect UI instantly
      setSortedFiles(prev => prev.map(f => f._id === fileId ? { ...f, [field]: !currentValue } : f));
      setFiles(prev => prev.map(f => f._id === fileId ? { ...f, [field]: !currentValue } : f));
    } catch (error) {
      console.error(`Error toggling ${field}:`, error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/api/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleShareFile = async () => {
    if (!selectedUser) {
      alert("Please select a user to share with.");
      return;
    }
    try {
      const response = await api.post(
        "/api/shareFile", 
        { fileId, email: selectedUser, senderEmail: currentUser?.email }, 
      );
      if (response.data.success) {
        alert("File shared successfully!");
        setShowSharePopup(false);
      } else {
        alert("Failed to share file. Try again.");
      }
    } catch (error) {
      console.error("Error sharing file:", error);
      alert("Error occurred while sharing the file.");
    }
  };

  const handleViewNote = (file) => {
    if (file.encrypted) {
      setSelectedEncryptedFile(file);
      setPasscode("");
      setPasscodeError("");
      setShowPasscodePopup(true);
    } else {
      navigate(`/view/${file._id}`);
    }
  };

  const submitPasscode = async () => {
    if (!passcode) {
      setPasscodeError("Passcode is required");
      return;
    }
    setIsDecrypting(true);
    setPasscodeError("");
    try {
      const response = await api.get(`/api/files/${selectedEncryptedFile._id}`);
      const fileData = response.data;
      try {
        const plaintext = await decryptText(fileData.content, fileData.iv, fileData.salt, passcode);
        setShowPasscodePopup(false);
        navigate(`/view/${selectedEncryptedFile._id}`, { state: { decryptedContent: plaintext } });
      } catch (err) {
        setPasscodeError("Invalid passcode or corrupted data.");
      }
    } catch (error) {
      console.error("Error fetching file for decryption:", error);
      setPasscodeError("Unable to fetch file data.");
    } finally {
      setIsDecrypting(false);
    }
  };

  // Filter rendering based on active Sidebar Tab
  let displayedFiles = [];
  if (currentTab === "vault") {
    displayedFiles = sortedFiles.filter(f => !f.isArchived); // Everything unarchived
  } else if (currentTab === "pinned") {
    displayedFiles = sortedFiles.filter(f => f.isPinned && !f.isArchived); // Only pinned
  } else if (currentTab === "archived") {
    displayedFiles = sortedFiles.filter(f => f.isArchived); // Only archived
  }

  const remainingTime = (expiry) => {
    const diff = new Date(expiry) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate('/Home')}>
            <img src={logoUrl} alt="Secure-NoteBook Logo" className="h-8 max-w-full select-none" />
          </div>
          <div className="hidden md:flex items-center gap-8 font-['Inter'] font-medium text-sm tracking-tight text-white pl-20">
            <Link className="text-[#a3e635] border-b-2 border-[#a3e635] pb-1 transition-colors duration-200" to="/Home">Dashboard</Link>
            <Link className="text-zinc-400 font-normal hover:text-[#a3e635] transition-colors duration-200" to="/create">Create Note</Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-zinc-400 hover:text-[#a3e635] cursor-pointer transition-colors hidden sm:block">notifications</span>
            <button onClick={() => navigate('/create')} className="hidden sm:block bg-primary px-4 py-1.5 rounded-full text-on-primary font-semibold text-sm active:scale-95 transition-transform duration-150">
                + New Note
            </button>
            <div className="relative ml-2">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center justify-center size-9 rounded-full overflow-hidden border-2 border-transparent hover:border-lime-400 transition-colors focus:outline-none focus:border-lime-400 shrink-0"
              >
                <img 
                  src={`https://ui-avatars.com/api/?name=${currentUser?.name || currentUser?.email || 'U'}&background=262626&color=a3e635&font-size=0.4`} 
                  alt="User Avatar" 
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Dropdown Menu Overlay */}
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 mt-3 w-64 bg-surface-container-high shadow-2xl z-50 border border-white/10 select-none overflow-hidden" style={{ borderRadius: '8px' }}>
                    <div className="flex items-center gap-3 p-4 border-b border-white/5">
                      <div className="size-12 rounded-full overflow-hidden shrink-0 filter grayscale">
                        <img src={`https://ui-avatars.com/api/?name=${currentUser?.name || currentUser?.email || 'U'}&background=333333&color=ffffff&font-size=0.4`} alt="User" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col truncate overflow-hidden">
                        <span className="font-medium text-white text-[15px]">{currentUser?.name || 'Tammy Park'}</span>
                        <span className="text-sm text-white/40 truncate">{currentUser?.email || '@tamp'}</span>
                      </div>
                    </div>

                    <div className="p-4">
                      <button 
                        onClick={() => { setShowProfileMenu(false); setShowAddProfileModal(true); }}
                        className="w-full bg-primary hover:bg-primary-dim text-on-primary font-bold py-2.5 rounded transition-colors flex items-center justify-center gap-2 mb-2"
                      >
                        <span className="text-xl leading-none -mt-1">+</span> Add profile
                      </button>
                    </div>

                    <div className="flex flex-col pb-2">
                      <button className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-white w-full text-left font-medium">
                        <RiEditLine className="text-xl shrink-0 opacity-80" /> Edit profiles
                      </button>
                      <button className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-white w-full text-left font-medium">
                        <RiSettings3Line className="text-xl shrink-0 opacity-80" /> App settings
                      </button>
                      <button className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-white w-full text-left font-medium">
                        <RiUser3Line className="text-xl shrink-0 opacity-80" /> Account
                      </button>
                      <button className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-white w-full text-left font-medium">
                        <RiQuestionLine className="text-xl shrink-0 opacity-80" /> Help
                      </button>
                      <div className="h-px bg-white/5 my-1 mx-4"></div>
                      <button 
                        onClick={(e) => { setShowProfileMenu(false); handleLogout(e); }}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-white w-full text-left font-medium"
                      >
                        <RiLogoutBoxRLine className="text-xl shrink-0 opacity-80" /> Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* SideNavBar (Desktop Only) */}
      <aside className="hidden md:flex flex-col h-screen fixed left-0 top-0 py-8 w-64 bg-background border-r border-[#494847]/15 mt-16 z-30">
        <div className="px-6 mb-8">
          <h2 className="text-lg font-black text-primary tracking-tight">The Obsidian Sanctum</h2>
          <p className="font-label uppercase text-[10px] tracking-widest text-zinc-500">Protocol Active</p>
        </div>
        <nav className="flex-1 space-y-1">
          <div onClick={() => setCurrentTab('vault')} className={`flex items-center px-6 py-3 cursor-pointer group transition-all duration-300 ${currentTab === 'vault' ? 'bg-surface-container text-primary border-l-4 border-primary font-bold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#131313] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined mr-3" style={currentTab === 'vault' ? { fontVariationSettings: "'FILL' 1" } : {}}>lock</span>
            <span className="font-label uppercase text-xs tracking-widest">Vault</span>
          </div>
          <div onClick={() => setCurrentTab('pinned')} className={`flex items-center px-6 py-3 cursor-pointer group transition-all duration-300 ${currentTab === 'pinned' ? 'bg-surface-container text-primary border-l-4 border-primary font-bold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#131313] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined mr-3" style={currentTab === 'pinned' ? { fontVariationSettings: "'FILL' 1" } : {}}>push_pin</span>
            <span className="font-label uppercase text-xs tracking-widest">Pinned</span>
          </div>
          <div onClick={() => setCurrentTab('shared')} className={`flex items-center px-6 py-3 cursor-pointer group transition-all duration-300 ${currentTab === 'shared' ? 'bg-surface-container text-primary border-l-4 border-primary font-bold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#131313] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined mr-3" style={currentTab === 'shared' ? { fontVariationSettings: "'FILL' 1" } : {}}>group</span>
            <span className="font-label uppercase text-xs tracking-widest">Shared</span>
          </div>
          <div onClick={() => setCurrentTab('archived')} className={`flex items-center px-6 py-3 cursor-pointer group transition-all duration-300 ${currentTab === 'archived' ? 'bg-surface-container text-primary border-l-4 border-primary font-bold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#131313] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined mr-3" style={currentTab === 'archived' ? { fontVariationSettings: "'FILL' 1" } : {}}>inventory_2</span>
            <span className="font-label uppercase text-xs tracking-widest">Archived</span>
          </div>
        </nav>
        <div className="px-6 mt-auto pb-[100px]">
          <button onClick={() => navigate('/create')} className="w-full py-3 bg-surface-container rounded-lg border border-primary/20 text-primary font-label uppercase text-xs tracking-widest hover:bg-primary/10 transition-colors">
            Secure Vault
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-24 pb-12 md:pl-72 px-6 max-w-screen-2xl mx-auto">
        {/* Header Section */}
        <header className="mb-12">
          <h1 className="text-5xl font-extrabold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-on-surface to-on-surface-variant">
            Control Center
          </h1>
          <p className="font-label text-sm text-secondary tracking-widest uppercase">Encryption Status: AES-256 ACTIVE</p>
        </header>

        {/* Global Horizontal Shared With Me Showcase (Hidden if we actively clicked Shared Tab to view full grid) */}
        {currentTab === 'vault' && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">share</span>
              <h3 className="font-headline text-xl font-bold">Shared With Me</h3>
            </div>
            
            <div className="glass-panel bg-surface-container-high/40 rounded-2xl p-6 flex gap-6 overflow-x-auto no-scrollbar">
              {sharedFiles.length === 0 ? (
                <p className="text-on-surface-variant font-label text-sm w-full font-bold">Waiting for incoming signals...</p>
              ) : (
                  sharedFiles.map((file) => (
                    <div key={file._id} className="min-w-[320px] bg-surface-container-highest/50 p-5 rounded-xl border border-outline-variant/10 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Incoming Data</span>
                          {file.expiry ? (
                            <div className="bg-error/10 text-error px-2 py-0.5 rounded-full text-[10px] font-label font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(255,115,81,0.2)]">
                              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                              Expires: {remainingTime(file.expiry)}
                            </div>
                          ) : (
                            <div className="bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full text-[10px] font-label font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">lock_clock</span>
                              Permanent
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1 truncate">{file.fileName}</p>
                        <p className="text-xs text-on-surface-variant font-label">from: {file.email}</p>
                      </div>
                      <div className="mt-6">
                        <button onClick={() => navigate(`/sharedView/${file._id}`)} className="text-[#a3e635] text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform">
                          View Secret <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        )}

        {/* Notes Grid Based on Active Tab */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">
                {currentTab === 'vault' ? 'cached' : currentTab === 'pinned' ? 'push_pin' : currentTab === 'archived' ? 'inventory_2' : 'group'}
              </span>
              <h3 className="font-headline text-xl font-bold capitalize">{currentTab} Notes</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* If currently in completely Shared view mode, map the large grid of shared! */}
            {currentTab === "shared" && sharedFiles.length === 0 && (
              <p className="text-on-surface-variant col-span-full">No shared files found.</p>
            )}
            {currentTab === "shared" && sharedFiles.map(file => (
              <div key={file._id} className="group bg-surface-container/60 glass-panel p-6 rounded-2xl border border-outline-variant/15 hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] pointer-events-none group-hover:bg-primary/10 transition-all"></div>
                <div className="flex justify-between items-start mb-10 z-10 relative">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-label font-bold flex items-center gap-1.5 border border-primary/20">
                    <span className="material-symbols-outlined text-[14px]">share</span>
                    Shared
                  </div>
                </div>
                <h4 className="text-2xl font-bold tracking-tight mb-2 truncate group-hover:text-primary transition-colors z-10 relative">{file.fileName}</h4>
                <p className="font-label text-[10px] text-on-surface-variant tracking-widest mb-10 z-10 relative uppercase">OWNER: {file.email}</p>
                <div className="flex flex-col gap-4 z-10 relative">
                  <button onClick={() => navigate(`/sharedView/${file._id}`)} className="w-full py-2.5 bg-surface-container-highest text-sm font-bold rounded-lg border border-outline-variant/10 hover:bg-surface-bright transition-colors text-white">
                    View Secret
                  </button>
                </div>
              </div>
            ))}

            {/* Default Mapping for Vault, Pinned, and Archived */}
            {currentTab !== "shared" && displayedFiles.length === 0 && (
               <p className="text-white/30 text-sm font-label uppercase tracking-widest col-span-full w-full py-8 text-center italic">No data nodes discovered in this sector.</p>
            )}
            
            {currentTab !== "shared" && displayedFiles.map(file => (
              <div key={file._id} className="group bg-surface-container/60 glass-panel p-6 rounded-2xl border border-outline-variant/15 hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] pointer-events-none group-hover:bg-primary/10 transition-all"></div>
                
                <div className="flex justify-between items-start mb-10 z-10 relative">
                  {file.encrypted ? (
                    <div className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-[10px] font-label font-bold flex items-center gap-1.5 border border-secondary/20">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                      Encrypted
                    </div>
                  ) : (
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-label font-bold flex items-center gap-1.5 border border-primary/20">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Available
                    </div>
                  )}
                  
                  {/* Action Toolbar */}
                  <div className="flex gap-3">
                    <button onClick={() => toggleNoteState(file._id, "isPinned", file.isPinned)} title={file.isPinned ? "Unpin Note" : "Pin Note"}>
                      <span className={`material-symbols-outlined transition-colors text-[20px] ${file.isPinned ? 'text-primary' : 'text-zinc-600 hover:text-primary'}`} style={file.isPinned ? {fontVariationSettings:"'FILL' 1"} : {}}>push_pin</span>
                    </button>
                    <button onClick={() => toggleNoteState(file._id, "isArchived", file.isArchived)} title={file.isArchived ? "Unarchive" : "Archive Note"}>
                      <span className={`material-symbols-outlined transition-colors text-[20px] ${file.isArchived ? 'text-primary' : 'text-zinc-600 hover:text-primary'}`} style={file.isArchived ? {fontVariationSettings:"'FILL' 1"} : {}}>inventory_2</span>
                    </button>
                    <button onClick={() => handleDeleteFileConfirmation(file._id)} title="Delete Note">
                      <span className="material-symbols-outlined text-zinc-600 hover:text-error transition-colors text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
                
                <h4 className="text-2xl font-bold tracking-tight mb-2 truncate group-hover:text-primary transition-colors z-10 relative">{file.fileName}</h4>
                <p className="font-label text-xs text-on-surface-variant tracking-widest mb-10 z-10 relative uppercase">LAST_MODIFIED: {file.createdAt?.substring(0,10)}</p>

                <div className="flex flex-col gap-4 z-10 relative">
                  <button onClick={() => handleViewNote(file)} className="w-full py-2.5 bg-surface-container-highest text-sm font-bold rounded-lg border border-outline-variant/10 hover:bg-surface-bright transition-colors text-white">
                    View contents
                  </button>
                  {file.shareable && (
                    <button onClick={() => { setFileId(file._id); fetchUsers(); setShowSharePopup(true); }} className="text-[#a3e635] text-[11px] font-label font-bold uppercase tracking-[0.2em] text-center hover:opacity-80 transition-opacity">
                      Share access
                    </button>
                  )}
                </div>
              </div>
            ))}

            {currentTab === 'vault' && (
              <div onClick={() => navigate('/create')} className="group border-2 border-dashed border-outline-variant/20 rounded-2xl flex flex-col items-center justify-center p-12 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer z-10 relative min-h-[280px]">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl text-zinc-500 group-hover:text-primary">add</span>
                </div>
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-bold">Initialize New entry</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FAB (Mobile) */}
      <button onClick={() => navigate('/create')} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-[0_10px_25px_rgba(163,230,53,0.3)] flex items-center justify-center z-50">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* MODALS */}
      {showPasscodePopup && (
        <div className="fixed inset-0 bg-[#0e0e0e]/80 backdrop-blur z-50 flex justify-center items-center p-4">
          <div className="bg-surface-container-highest border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 font-headline">Encrypted Vault</h2>
            <p className="text-white/50 mb-6 text-sm">Enter the passcode to unlock this core.</p>
            <input
              type="password"
              className="w-full p-3 bg-surface border border-white/15 rounded-xl mb-2 outline-none focus:border-primary text-white placeholder-white/30 font-label"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') submitPasscode(); }}
            />
            {passcodeError && <p className="text-error text-sm mb-4">{passcodeError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 font-bold text-sm bg-surface-container hover:bg-surface-bright rounded-full text-white" onClick={() => setShowPasscodePopup(false)}>
                Cancel
              </button>
              <button className="px-4 py-2 font-bold text-sm bg-primary hover:bg-primary-dim rounded-full text-on-primary" onClick={submitPasscode}>
                {isDecrypting ? "Unlocking..." : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
      {showAddProfileModal && (
        <div className="fixed inset-0 bg-[#0e0e0e]/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div 
            className="bg-surface-container-high p-8 md:p-10 max-w-[432px] w-full shadow-2xl relative" 
            style={{ borderRadius: '8px' }}
          >
            <button 
              onClick={() => setShowAddProfileModal(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h2 className="text-[28px] font-bold mb-8 text-white tracking-tight">Add profile</h2>
            <div className="flex gap-4 mb-8 items-center">
              <div className="size-[84px] rounded-full bg-surface-bright flex items-center justify-center shrink-0 border border-transparent hover:border-white/10 transition-colors cursor-pointer">
                <RiImageAddLine className="text-4xl text-white/50" />
              </div>
              <button className="bg-surface-bright hover:bg-surface-variant text-white/90 text-sm py-3.5 px-6 rounded transition-colors flex items-center gap-2 border border-transparent flex-grow justify-center font-bold shadow-sm" type="button">
                <RiUploadCloud2Line className="text-lg opacity-80" /> Upload image
              </button>
            </div>
            <div className="mb-8">
              <input
                type="text"
                placeholder="Profile name"
                className="w-full bg-transparent border border-outline-variant hover:border-outline focus:border-primary text-white p-4 rounded text-base outline-none transition-all placeholder:text-white/40"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 mb-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={isKidsProfile}
                  onChange={() => setIsKidsProfile(!isKidsProfile)}
                />
                <div className="w-[42px] h-[24px] bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#666] peer-checked:after:bg-on-primary peer-checked:bg-primary after:border-transparent after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
              <span className="text-base text-white font-bold">Kid's profile</span>
            </div>
            <p className="text-white/50 text-[15px] leading-relaxed mb-10 pr-2">
              A profile with curated content and features, and a simplified user interface.
            </p>
            <button 
              onClick={() => {
                setShowAddProfileModal(false);
                setNewProfileName("");
                setIsKidsProfile(false);
              }}
              className="w-full bg-primary hover:bg-primary-dim text-on-primary font-bold py-4 rounded text-lg transition-colors shadow-lg"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {showSharePopup && (
        <div className="fixed inset-0 bg-[#0e0e0e]/80 backdrop-blur z-50 flex justify-center items-center p-4">
          <div className="bg-surface-container-highest border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold font-headline mb-6">Share Access</h2>
            <select
              className="w-full p-3 bg-surface border border-white/10 rounded-xl mb-6 outline-none focus:border-primary font-label"
              value={selectedUser || ""}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">Select an investigator</option>
              {users.map((user) => (
                <option key={user._id} value={user.email}>
                  {user.email}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 font-bold text-sm bg-surface-container hover:bg-surface-bright rounded-full text-white" onClick={() => setShowSharePopup(false)}>
                Cancel
              </button>
              <button className="px-4 py-2 font-bold text-sm bg-primary hover:bg-primary-dim rounded-full text-on-primary" onClick={handleShareFile}>
                Share Note
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePopup && (
        <div className="fixed inset-0 bg-[#0e0e0e]/80 backdrop-blur z-50 flex justify-center items-center p-4">
          <div className="bg-surface-container-highest border border-error/50 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold font-headline mb-4 text-error">Destroy Note?</h2>
            <p className="text-white/50 mb-8 text-sm">This action perfectly obliterates the record from our cluster. Are you sure you wish to proceed?</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 font-bold text-sm bg-surface-container hover:bg-surface-bright rounded-full text-white" onClick={() => setShowDeletePopup(false)}>
                Retain
              </button>
              <button 
                onClick={() => deleteFile(deleteFileId)}
                className="px-4 py-2 font-bold text-sm bg-error/10 text-error border border-error/20 rounded-full hover:bg-error hover:text-white transition-all duration-300"
              >
                Destroy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;