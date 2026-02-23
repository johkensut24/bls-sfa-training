import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";

function Layout({
  children,
  user,
  setUser,
  currentView,
  setCurrentView,
  isCollapsed,
  setIsCollapsed,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // CENTRALIZED NAVIGATION LIST
  const navItems = [
    { id: "home", label: "Registry Overview", icon: "📊" },
    { id: "table", label: "Archive Folders", icon: "📁" },
    { id: "form", label: "Certification Entry", icon: "✍️" },
    { id: "settings", label: "System Settings", icon: "⚙️" },
  ];

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsCollapsed(true);
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setIsCollapsed]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative font-sans">
      {/* --- MOBILE DRAWER (DOH Theme) --- */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-all duration-300 ${mobileMenuOpen ? "visible" : "invisible"}`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 bottom-0 w-72 bg-[#004D4D] shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h1 className="text-white font-black uppercase tracking-tighter italic">
              Registry<span className="text-emerald-400">Asset</span>
            </h1>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-white/60 p-2 hover:bg-white/10 rounded-lg"
            >
              ✕
            </button>
          </div>
          {/* Mobile Nav - Scrollbar Hidden */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-sm uppercase tracking-tight transition-all ${currentView === item.id ? "bg-white/10 text-emerald-400" : "text-white/60 hover:bg-white/5"}`}
              >
                <span className="text-xl">{item.icon}</span> {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* --- DESKTOP SIDEBAR (DOH Theme) --- */}
      <aside
        className={`bg-[#004D4D] text-white hidden md:flex flex-col shadow-2xl sticky top-0 left-0 h-screen z-[60] transition-all duration-300 overflow-visible ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 bg-emerald-400 text-[#004D4D] rounded-full p-1 shadow-xl z-[70] border-2 border-[#004D4D] flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Brand Section */}
        <div className="p-5 mb-4 border-b border-white/5 flex items-center gap-3 overflow-hidden shrink-0">
          <div className="w-10 h-10 bg-emerald-400 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-xl font-black text-[#004D4D]">R</span>
          </div>
          {!isCollapsed && (
            <h1 className="text-lg font-black tracking-tighter uppercase whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
              Registry<span className="text-emerald-400">Asset</span>
            </h1>
          )}
        </div>

        {/* Sidebar Nav - SCROLLBAR REMOVED HERE */}
        <nav className="flex-1 px-3 space-y-1.5 mt-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? "bg-white/10 text-emerald-400 shadow-inner"
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <span
                  className={`text-xl transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`}
                >
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                {/* Active Indicator Pin */}
                {isActive && isCollapsed && (
                  <div className="absolute right-0 w-1 h-6 bg-emerald-400 rounded-l-full" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar
          user={user}
          setUser={setUser}
          currentView={currentView}
          setCurrentView={setCurrentView}
          onMenuOpen={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
