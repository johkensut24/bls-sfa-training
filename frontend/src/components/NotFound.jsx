import React from "react";

const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] border-b-8 border-[#006666] shadow-2xl p-12 text-center animate-in fade-in zoom-in duration-500">
        {/* ICON SECTION */}
        <div className="relative mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-[2rem] bg-[#F0F9F9] flex items-center justify-center border-2 border-[#006666]/10 shadow-inner">
            <svg
              className="w-12 h-12 text-[#006666]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          {/* FLOATING 404 TAG */}
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
            Status: 404
          </div>
        </div>

        {/* TEXT SECTION */}
        <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">
          Entry Not Found
        </h1>
        <p className="text-[10px] font-bold text-[#006666] uppercase tracking-[0.4em] mb-8">
          System Access Error
        </p>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            The personnel record or administrative page you are attempting to
            access does not exist in the{" "}
            <span className="text-[#006666] font-bold">Authority Registry</span>{" "}
            database.
          </p>
        </div>

        {/* ACTION BUTTON */}
        <button
          onClick={() => (window.location.href = "/")}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-[#006666] text-white hover:bg-[#004D4D] rounded-2xl font-black text-xs uppercase shadow-xl shadow-[#006666]/30 transition-all active:scale-95"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Return to Registry
        </button>

        <p className="mt-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
          DOH Personnel Asset Management System
        </p>
      </div>
    </div>
  );
};

export default NotFound;
