import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

function Navbar({ user, setUser, currentView, setCurrentView }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = [
    { id: "home", label: "Overview", icon: "📊" },
    { id: "table", label: "Archives", icon: "📁" },
    { id: "form", label: "New Entry", icon: "✍️" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      setUser(null);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Could not complete logout.");
    }
  };

  return (
    <nav className="bg-white border-b-2 border-emerald-800 sticky top-0 z-40 w-full font-sans shadow-sm">
      <Toaster position="top-right" />

      {/* Main Bar Container */}
      <div className="h-16 px-4 md:px-8 flex items-center justify-between w-full">
        {/* LEFT: Branding & Desktop Nav */}
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded bg-emerald-900 text-white"
            >
              {isMenuOpen ? "✕" : "☰"}
            </button>

            {/* DOH Style Logo Branding */}
            <div className="flex flex-col border-l-4 border-emerald-700 pl-3">
              <span className="text-emerald-900 text-[11px] font-black uppercase tracking-tighter leading-none">
                Department of Health
              </span>
              <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-[0.2em] mt-0.5">
                HEMS Admin Portal
              </span>
            </div>
          </div>

          {/* DESKTOP NAV ITEMS - Formal "Tab" Style */}
          <div className="hidden md:flex items-center h-16">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`h-full px-5 flex items-center text-[10px] font-black uppercase tracking-widest transition-all border-b-2
                  ${
                    currentView === item.id
                      ? "border-emerald-700 text-emerald-900 bg-emerald-50/50"
                      : "border-transparent text-slate-400 hover:text-emerald-700 hover:bg-slate-50"
                  }
                `}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end pr-4">
            <span className="text-emerald-950 text-[10px] font-black uppercase tracking-tight">
              {user?.username}
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                Authorized Registrar
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 bg-emerald-900 hover:bg-red-700 text-white px-5 py-2 rounded shadow-md transition-all duration-200"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">
              Exit System
            </span>
            <span className="text-xs opacity-70 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN - Clean Forest Green Theme */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out bg-emerald-900
        ${isMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}
      `}
      >
        <div className="py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-8 py-4 text-[11px] font-black uppercase transition-colors
                ${
                  currentView === item.id
                    ? "bg-emerald-800 text-white border-l-8 border-yellow-400"
                    : "text-emerald-100 hover:bg-emerald-800"
                }
              `}
            >
              <span className="filter grayscale brightness-200">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
