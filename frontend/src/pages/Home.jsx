import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { CertPDF } from "../components/CertPDF";
import { BatchCertPDF } from "../components/BatchCertPDF";
import { BatchIDPDF } from "../components/BatchIDPDF";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import ManualCropperModal from "../components/ManualCropperModal";
import api from "../api";

// ============================================================================
// CONSTANTS
// ============================================================================

const CERT_PATH = "/api/auth/certificates";
const SETTINGS_PATH = "/api/auth/settings";

const TRAINING_TYPES = [
  { value: "", label: "SELECT..." },
  { value: "Basic Life Support Training", label: "BLS Training" },
  {
    value: "Basic Life Support and Standard First Aid Training",
    label: "BLS and SFA Training",
  },
  {
    value: "Basic Life Support Training of trainers",
    label: "BLS TOT Training",
  },
  {
    value: "Standard First Aid Training of trainers",
    label: "SFA TOT Training",
  },
];

const PARTICIPANT_TYPES = [
  { value: "", label: "TYPE..." },
  { value: "Lay Rescuer", label: "Lay Rescuer" },
  { value: "Healthcare Provider", label: "Healthcare Provider" },
];

const INITIAL_FORM_ROW = {
  tempId: crypto.randomUUID(),
  participant_name: "",
  training_type: "",
  training_date: "",
  venue: "",
  facility: "",
  participant_type: "",
  age: "",
  position: "",
};

const INITIAL_SETTINGS = {
  off1_name: "",
  off1_pos: "",
  off2_name: "",
  off2_pos: "",
  off3_name: "",
  off3_pos: "",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatValue = (field, value) => {
  if (!value) return "";

  // DATE: Capitalize ONLY the first letter
  if (field === "training_date") {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  // TRAINING TYPE: Keep fully UPPERCASE
  if (field === "training_type") {
    return value.toUpperCase();
  }

  // NAME/VENUE/FACILITY/POSITION: Title Case
  if (["participant_name"].includes(field)) {
    return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return value;
};

const getInitialFormRows = () => {
  const saved = localStorage.getItem("registry_draft");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Ensure all rows have tempId
      return parsed.map((row) => ({
        ...row,
        tempId: row.tempId || crypto.randomUUID(),
      }));
    } catch (err) {
      console.error("Error parsing saved draft:", err);
    }
  }
  return [{ ...INITIAL_FORM_ROW }];
};

// ============================================================================
// MEMOIZED DOWNLOAD COMPONENTS
// ============================================================================

const MemoizedBatchDownload = React.memo(
  ({ certs, displayDate, type = "cert", settings }) => {
    const [isPreparing, setIsPreparing] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false); // New explicit state
    const timeoutRef = useRef(null);
    const hasFinishedLoading = useRef(false);

    const generationKey = useMemo(() => {
      return `batch-static-${type}`;
    }, [type]);

    const handleStartPrepare = () => {
      setIsPreparing(true);
      setIsGenerating(true); // Force the spinner to show
      setIsReady(false);
      hasFinishedLoading.current = false;

      // Optional: simulate a tiny delay so the user sees the spinner
      // remove this setTimeout if your PDF is very large and takes time anyway
      setTimeout(() => setIsGenerating(false), 800);
    };

    const handleDownloadFinished = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsPreparing(false);
        setIsReady(false);
        hasFinishedLoading.current = false;
      }, 5000);
    };

    const isCert = type === "cert";

    if (!isPreparing) {
      return (
        <button
          onClick={handleStartPrepare}
          className={`flex items-center gap-2 text-[10px] font-black text-white px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 ${
            isCert
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          <span>{isCert ? "🖨️" : "🪪"}</span>
          {isCert ? "PREPARE BATCH" : "PREPARE IDS"}
        </button>
      );
    }

    return (
      <PDFDownloadLink
        key={generationKey}
        document={
          isCert ? (
            <BatchCertPDF certs={certs} settings={settings || {}} />
          ) : (
            <BatchIDPDF certs={certs} settings={settings || {}} />
          )
        }
        fileName={`BATCH_${type.toUpperCase()}_${displayDate.replace(/\s+/g, "_")}.pdf`}
        onClick={handleDownloadFinished}
        className={`flex items-center gap-2 text-[10px] font-black px-5 py-2.5 rounded-xl shadow-sm transition-all ${
          (isReady || hasFinishedLoading.current) && !isGenerating
            ? "bg-slate-900 text-white hover:bg-emerald-600"
            : "bg-slate-100 text-slate-400 cursor-wait"
        }`}
      >
        {({ loading }) => {
          // Only mark as ready if react-pdf says it's not loading AND our manual spinner is done
          if (!loading && !hasFinishedLoading.current && !isGenerating) {
            hasFinishedLoading.current = true;
            setTimeout(() => setIsReady(true), 100);
          }

          // Show spinner if react-pdf is loading OR if we are in our forced generating state
          const showSpinner =
            isGenerating || (loading && !hasFinishedLoading.current);

          return (
            <div className="flex items-center gap-2 whitespace-nowrap">
              {showSpinner ? (
                <>
                  <div className="h-3 w-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin shrink-0" />
                  <span className="animate-pulse tracking-tight text-[9px]">
                    GENERATING {certs.length} ITEMS...
                  </span>
                </>
              ) : (
                <>
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
                      d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>DOWNLOAD {type.toUpperCase()}S</span>
                </>
              )}
            </div>
          );
        }}
      </PDFDownloadLink>
    );
  },
);

MemoizedBatchDownload.displayName = "MemoizedBatchDownload";

const IndividualDownload = React.memo(({ cert, settings }) => {
  const [showDownload, setShowDownload] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const hasFinishedLoading = useRef(false);

  const generationKey = useMemo(() => {
    return `pdf-${cert._id || cert.id}`;
  }, [cert._id, cert.id]);

  // RESET LOGIC: Reverts UI back to "Prepare PDF"
  const handleDownloadClick = () => {
    // Small delay ensures the browser processes the download trigger before the element unmounts
    setTimeout(() => {
      setShowDownload(false);
      setIsReady(false);
      hasFinishedLoading.current = false;
    }, 1000);
  };

  if (!showDownload) {
    return (
      <button
        onClick={() => setShowDownload(true)}
        className="min-w-[120px] px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg transition-all border border-emerald-100"
      >
        Prepare PDF
      </button>
    );
  }

  return (
    <div
      className="min-w-[120px] inline-flex justify-end"
      /* Trigger reset when clicked */
      onClick={
        isReady || hasFinishedLoading.current ? handleDownloadClick : undefined
      }
    >
      <PDFDownloadLink
        key={generationKey}
        document={<CertPDF data={cert} settings={settings} />}
        fileName={`${cert.participant_name.replace(/\s+/g, "_")}_Cert.pdf`}
        className={`w-full justify-center px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all duration-300 inline-flex items-center ${
          isReady || hasFinishedLoading.current
            ? "bg-slate-900 hover:bg-emerald-600 text-white cursor-pointer"
            : "bg-slate-100 text-slate-400 cursor-wait"
        }`}
      >
        {({ loading }) => {
          if (!loading && !hasFinishedLoading.current) {
            hasFinishedLoading.current = true;
            setTimeout(() => setIsReady(true), 100);
          }

          const currentlyLoading = loading && !hasFinishedLoading.current;

          return (
            <div className="flex items-center gap-2 whitespace-nowrap">
              {currentlyLoading ? (
                <>
                  <div className="h-3 w-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin shrink-0" />
                  <span className="animate-pulse text-[9px]">
                    GENERATING...
                  </span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>SAVE PDF</span>
                </>
              )}
            </div>
          );
        }}
      </PDFDownloadLink>
    </div>
  );
});

IndividualDownload.displayName = "IndividualDownload";

// ============================================================================
// STATS CARD COMPONENT
// ============================================================================

const StatsCard = ({ title, value, icon, color }) => (
  <div
    className={`${color} p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between`}
  >
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
        {title}
      </p>
      <h2 className="text-3xl font-black mt-1 tracking-tighter">{value}</h2>
    </div>
    <span className="text-3xl" aria-hidden="true">
      {icon}
    </span>
  </div>
);

// ============================================================================
// EDIT MODAL COMPONENT (DOH Official Registry Version - Zero Scroll)
// ============================================================================

const EditModal = memo(
  ({ show, onClose, editForm, setEditForm, onSubmit, onDelete }) => {
    const modalRef = useRef(null);

    useEffect(() => {
      if (!show) return;
      const handleEscape = (e) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleEscape);
      modalRef.current?.focus();
      return () => document.removeEventListener("keydown", handleEscape);
    }, [show]);

    if (!show) return null;

    const handleChange = (field, value) => {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1A365D]/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      >
        <div
          ref={modalRef}
          /* UI STRATEGY: Height-capped at 95vh but designed to naturally sit much shorter */
          className="bg-white w-full max-w-2xl shadow-2xl rounded-sm border-t-8 border-[#006666] outline-none animate-in zoom-in-95 duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          {/* 1. HEADER: Slim profile */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
            <div className="flex gap-4 items-center">
              <div className="h-9 w-9 bg-teal-50 rounded flex items-center justify-center border border-teal-100">
                <svg
                  className="w-5 h-5 text-[#006666]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-[14px] font-black text-[#1A365D] uppercase tracking-tight leading-none">
                  Registry Modification
                </h2>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  ID: {editForm.id || "GEN-REF"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-red-500 transition-colors text-xl font-light"
            >
              ×
            </button>
          </div>

          {/* 2. FORM BODY: Optimized for vertical space */}
          <form onSubmit={onSubmit} className="p-6 bg-white">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {/* Full Width Field */}
              <div className="col-span-2 group">
                <label className="text-[9px] font-black text-[#1A365D] uppercase tracking-widest mb-1 block">
                  Subject Identity
                </label>
                <input
                  className="w-full px-3 py-2 bg-[#F8FAFC] border-2 border-slate-100 focus:border-[#006666] outline-none font-bold text-[12px] text-[#1A365D] uppercase transition-all"
                  value={editForm.participant_name || ""}
                  onChange={(e) =>
                    handleChange("participant_name", e.target.value)
                  }
                  required
                />
              </div>

              {/* Full Width Select */}
              <div className="col-span-2 group">
                <label className="text-[9px] font-black text-[#1A365D] uppercase tracking-widest mb-1 block">
                  Training Protocol
                </label>
                <select
                  className="w-full px-3 py-2 bg-[#F8FAFC] border-2 border-slate-100 focus:border-[#006666] outline-none font-bold text-[12px] text-[#1A365D]"
                  value={editForm.training_type || ""}
                  onChange={(e) =>
                    handleChange("training_type", e.target.value)
                  }
                >
                  {TRAINING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compact Grid Fields */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  Inclusive Dates
                </label>
                <input
                  className="w-full px-3 py-2 bg-[#F8FAFC] border-2 border-slate-100 focus:border-[#006666] outline-none font-bold text-[12px]"
                  value={editForm.training_date || ""}
                  onChange={(e) =>
                    handleChange("training_date", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  Venue
                </label>
                <input
                  className="w-full px-3 py-2 bg-[#F8FAFC] border-2 border-slate-100 focus:border-[#006666] outline-none font-bold text-[12px]"
                  value={editForm.venue || ""}
                  onChange={(e) => handleChange("venue", e.target.value)}
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  Health Facility
                </label>
                <input
                  className="w-full px-3 py-2 bg-[#F8FAFC] border-2 border-slate-100 focus:border-[#006666] outline-none font-bold text-[12px]"
                  value={editForm.facility || ""}
                  onChange={(e) => handleChange("facility", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  Designation
                </label>
                <input
                  className="w-full px-3 py-2 bg-[#F8FAFC] border-2 border-slate-100 focus:border-[#006666] outline-none font-bold text-[12px]"
                  value={editForm.position || ""}
                  onChange={(e) => handleChange("position", e.target.value)}
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-[#1A365D] uppercase tracking-widest mb-1 block">
                  Classification
                </label>
                <select
                  className="w-full px-3 py-2 bg-[#F8FAFC] border-2 border-slate-100 focus:border-[#006666] outline-none font-bold text-[12px]"
                  value={editForm.participant_type || ""}
                  onChange={(e) =>
                    handleChange("participant_type", e.target.value)
                  }
                >
                  {PARTICIPANT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  Subject Age
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border-2 border-slate-100 focus:border-[#006666] outline-none font-bold text-[12px]"
                  value={editForm.age || ""}
                  onChange={(e) => handleChange("age", e.target.value)}
                />
              </div>
            </div>

            {/* 3. FOOTER: Integrated actions */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onDelete}
                className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase tracking-[0.15em] flex items-center gap-2 group transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 group-hover:scale-125 transition-transform animate-pulse" />
                Purge Record
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-400 font-black uppercase text-[9px] tracking-widest rounded hover:bg-slate-50 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-[#006666] text-white font-black uppercase text-[9px] tracking-widest rounded hover:bg-[#004D4D] shadow-lg shadow-teal-100 transition-all active:scale-95"
                >
                  Confirm Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  },
);

// ============================================================================
// MAIN HOME COMPONENT
// ============================================================================

function Home({ user, currentView, setCurrentView }) {
  // 1. STATES (Unified at the top)
  const [list, setList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1); // Added missing state
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    participant_name: "",
    training_type: "",
    training_date: "",
    venue: "",
    facility: "",
    participant_type: "",
    age: "",
    position: "",
  });
  const [formRows, setFormRows] = useState(getInitialFormRows);
  const [settings, setSettings] = useState({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [activeOfficerNum, setActiveOfficerNum] = useState(1);
  const [modalSearch, setModalSearch] = useState("");
  const [modalPage, setModalPage] = useState(1);

  const itemsPerPage = 10;
  const modalItemsPerPage = 10;

  // ============================================================================
  // API CALLS
  // ============================================================================

  const fetchCerts = useCallback(async () => {
    try {
      // Changed axios.get(API_URL) to api.get(CERT_PATH)
      const res = await api.get(CERT_PATH);
      setList(res.data);
    } catch (err) {
      console.error("Error fetching certificates:", err);
      toast.error("Failed to load certificates");
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      // Changed axios.get(SETTINGS_API_URL) to api.get(SETTINGS_PATH)
      const response = await api.get(SETTINGS_PATH);
      if (response.data) {
        setSettings(response.data);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      toast.error("Failed to load settings");
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  const handleCroppedImage = useCallback(
    (base64Image) => {
      const key = `off${activeOfficerNum}_sig`; // Dynamically target off1_sig, off2_sig, etc.
      setSettings((prev) => ({ ...prev, [key]: base64Image }));
      setImageToCrop(null);
      toast.success(`Officer ${activeOfficerNum} signature updated!`);
    },
    [activeOfficerNum],
  );

  const saveSettingsToDB = useCallback(async () => {
    setIsSaving(true);
    const loadingToast = toast.loading("Syncing with database...");

    try {
      // Using 'api' automatically includes withCredentials and the correct Port/URL
      await api.post(SETTINGS_PATH, settings);

      toast.success("Database synchronized successfully!", {
        id: loadingToast,
      });
    } catch (err) {
      toast.error("Save failed", { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchCerts();
    fetchSettings();
  }, [fetchCerts, fetchSettings]);

  useEffect(() => {
    localStorage.setItem("registry_draft", JSON.stringify(formRows));
  }, [formRows]);

  // ============================================================================
  // MEMOIZED DATA
  // ============================================================================

  const filteredAndGroupedCerts = useMemo(() => {
    const search = searchTerm.toLowerCase();
    const filtered = list.filter(
      (cert) =>
        cert.participant_name?.toLowerCase().includes(search) ||
        cert.training_date?.toLowerCase().includes(search) ||
        cert.venue?.toLowerCase().includes(search) ||
        cert.facility?.toLowerCase().includes(search),
    );

    const groups = {};
    filtered.forEach((cert) => {
      const dateKey = (cert.training_date || "NODATE")
        .toUpperCase()
        .replace(/\s+/g, "");
      const typeKey = (cert.training_type || "UNSPECIFIED")
        .toUpperCase()
        .replace(/\s+/g, "");
      const batchId = `${dateKey}_${typeKey}`;

      if (!groups[batchId]) {
        groups[batchId] = {
          displayDate: (cert.training_date || "NO DATE")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase(),
          trainingType: (cert.training_type || "UNSPECIFIED")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase(),
          certs: [],
        };
      }
      groups[batchId].certs.push(cert);
    });
    return Object.entries(groups);
  }, [list, searchTerm]);

  const uniqueTrainingDates = useMemo(() => {
    // Filters out nulls/undefined and counts unique date strings
    const dates = list.map((c) => c.training_date).filter(Boolean);
    return [...new Set(dates)].length;
  }, [list]);

  const draftParticipantsCount = useMemo(() => {
    return formRows.filter((r) => {
      // Returns true if ANY of these fields have content
      const hasName = r.participant_name?.trim().length > 0;
      const hasTrainingType = r.training_type?.trim().length > 0;
      const hasDate = r.training_date?.trim().length > 0;
      const hasVenue = r.venue?.trim().length > 0;
      const hasFacility = r.facility?.trim().length > 0;
      const hasParticipantType = r.participant_type?.trim().length > 0;
      const hasAge = r.age?.toString().trim().length > 0;
      const hasPosition = r.position?.trim().length > 0;

      return (
        hasName ||
        hasTrainingType ||
        hasDate ||
        hasVenue ||
        hasFacility ||
        hasParticipantType ||
        hasAge ||
        hasPosition
      );
    }).length;
  }, [formRows]);

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const handleInputChange = useCallback((index, field, value) => {
    setFormRows((prev) => {
      const updatedRows = [...prev];
      updatedRows[index][field] = value;
      return updatedRows;
    });
  }, []);

  const addEmptyRow = useCallback(() => {
    setFormRows((prev) => [
      ...prev,
      { ...INITIAL_FORM_ROW, tempId: crypto.randomUUID() },
    ]);
  }, []);

  const removeRow = useCallback((index) => {
    setFormRows((prev) => {
      if (prev.length > 1) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  }, []);

  const duplicateRow = useCallback((index) => {
    setFormRows((prev) => {
      const newRow = {
        ...prev[index],
        participant_name: "",
        tempId: crypto.randomUUID(),
      };
      const updatedRows = [...prev];
      updatedRows.splice(index + 1, 0, newRow);
      return updatedRows;
    });
  }, []);

  const clearAllRows = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to clear all rows? This will delete your current draft.",
      )
    ) {
      setFormRows([{ ...INITIAL_FORM_ROW, tempId: crypto.randomUUID() }]);
      localStorage.removeItem("registry_draft");
      toast.success("Draft cleared");
    }
  }, []);

  const handleBulkSubmit = useCallback(async () => {
    try {
      const dataToSave = formRows.filter(
        (row) => row.participant_name.trim() !== "",
      );

      if (dataToSave.length === 0) {
        toast.error("No data to save");
        return;
      }

      const loadingToast = toast.loading("Saving batch...");

      // Use Promise.allSettled for better error handling
      const results = await Promise.allSettled(
        dataToSave.map((row) => {
          // Remove tempId before sending to API
          const { tempId, ...rowData } = row;
          return axios.post(CERT_PATH, rowData);
        }),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      toast.dismiss(loadingToast);

      if (failed > 0) {
        toast.warning(`Saved ${succeeded} entries, ${failed} failed`);
      } else {
        toast.success(`Successfully saved ${succeeded} entries!`);
      }

      // Reset state only if at least some succeeded
      if (succeeded > 0) {
        setFormRows([{ ...INITIAL_FORM_ROW, tempId: crypto.randomUUID() }]);
        localStorage.removeItem("registry_draft");
        await fetchCerts();
        setCurrentView("table");
      }
    } catch (err) {
      console.error("Bulk submit error:", err);
      toast.error("Submission failed. Please check your connection.");
    }
  }, [formRows, fetchCerts, setCurrentView]);

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================

  const handleKeyDown = useCallback(
    (e, rowIndex, colIndex) => {
      const tbody = e.target.closest("tbody");
      if (!tbody) return;

      const rows = tbody.querySelectorAll("tr");

      // Intercept 'Enter' only.
      // Up, Down, Left, and Right keys now revert to default browser behavior.
      if (e.key === "Enter") {
        // Don't interfere if the user is currently navigating a dropdown menu
        if (e.target.tagName !== "SELECT") {
          e.preventDefault();

          // VALIDATION: Get the name value of the current row
          const currentName = formRows[rowIndex]?.participant_name || "";
          const isLastRow = rowIndex === rows.length - 1;

          if (isLastRow) {
            // ONLY add a new row if the current participant name has text
            if (currentName.trim() !== "") {
              setFormRows((prev) => [
                ...prev,
                { ...INITIAL_FORM_ROW, tempId: crypto.randomUUID() },
              ]);

              // Wait for render, then focus the first input of the new row
              setTimeout(() => {
                const updatedRows = tbody.querySelectorAll("tr");
                const lastRow = updatedRows[updatedRows.length - 1];
                lastRow?.querySelector("input")?.focus();
              }, 50);
            } else {
              // Optional: Provide feedback if they hit enter on an empty name
              toast.error("Please enter a name before adding a new row");
            }
          } else {
            // JUMP DOWN: If not the last row, move focus to the same column in the next row
            const nextRowElements =
              rows[rowIndex + 1].querySelectorAll("input, select");
            if (nextRowElements[colIndex]) {
              nextRowElements[colIndex].focus();
            }
          }
        }
      }
    },
    [setFormRows, formRows],
  ); // Added formRows to dependencies so validation has current data

  // ============================================================================
  // EDIT MODAL HANDLERS
  // ============================================================================

  const handleEditSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        const loadingToast = toast.loading("Updating record...");

        // 1. Send the update to the server
        await axios.put(`${CERT_PATH}/${editForm.id}`, editForm);

        // 2. MANUALLY UPDATE THE LIST STATE (Registry Table)
        setList((prevList) =>
          prevList.map((cert) =>
            cert._id === editForm.id || cert.id === editForm.id
              ? { ...cert, ...editForm }
              : cert,
          ),
        );

        // 3. MANUALLY UPDATE THE SELECTED BATCH (Modal Table)
        setSelectedBatch((prevBatch) => {
          if (!prevBatch) return null;
          return {
            ...prevBatch,
            certs: prevBatch.certs.map((cert) =>
              cert._id === editForm.id || cert.id === editForm.id
                ? { ...cert, ...editForm }
                : cert,
            ),
          };
        });

        toast.dismiss(loadingToast);
        toast.success("Record updated successfully!");
        setShowEditModal(false);

        // Optional: keep fetchCerts() if you want to ensure total sync with server
        // fetchCerts();
      } catch (err) {
        console.error("Edit submit error:", err);
        toast.error("Failed to update record.");
      }
    },
    [editForm, setList, setSelectedBatch], // Added the setters to dependency array
  );

  const handleDelete = useCallback(async () => {
    if (window.confirm("Permanently delete this record?")) {
      try {
        await axios.delete(`${CERT_PATH}/${editForm.id}`);
        toast.success("Record deleted");

        // 1. Close the Edit Form
        setShowEditModal(false);

        // 2. UPDATE THE MODAL STATE (The "Magic" Step)
        setSelectedBatch((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            certs: prev.certs.filter(
              (cert) => (cert._id || cert.id) !== editForm.id,
            ),
          };
        });

        // 3. Sync the background list
        fetchCerts();
      } catch (err) {
        console.error("Delete error:", err);
        toast.error("Failed to delete record");
      }
    }
  }, [editForm.id, fetchCerts, setSelectedBatch]);

  // --- DATA PROCESSING & SORTING ---
  const { paginatedBatches, totalPages, totalItems, startIndex, endIndex } =
    useMemo(() => {
      // 1. Helper to extract the start date from ranges like "January 23-27, 2026"
      const getSortableDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        try {
          const parts = dateStr.split("-");
          if (parts.length > 1) {
            const monthDay = parts[0].trim(); // "January 23"
            const yearPart = dateStr.split(",")[1] || " 2026"; // " 2026"
            return new Date(`${monthDay},${yearPart}`);
          }
          return new Date(dateStr);
        } catch (e) {
          return new Date(0);
        }
      };

      // 2. Sort filteredAndGroupedCerts (Ascending)
      const sorted = [...filteredAndGroupedCerts].sort((b, a) => {
        return (
          getSortableDate(a[1].displayDate) - getSortableDate(b[1].displayDate)
        );
      });

      // 3. Pagination Math
      const total = sorted.length;
      const pages = Math.ceil(total / itemsPerPage) || 1;
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginated = sorted.slice(start, end);

      // This return object provides the variables for the destructuring above
      return {
        paginatedBatches: paginated,
        totalPages: pages,
        totalItems: total,
        startIndex: start,
        endIndex: end,
      };
    }, [filteredAndGroupedCerts, currentPage, itemsPerPage]);

  // Reset to page 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-20">
      <Toaster position="top-right" />

      {/* --- DASHBOARD VIEW (FULLY STATIC / NO MOVEMENT) --- */}
      {currentView === "home" && (
        <div className="w-full h-full flex flex-col px-10 pt-10 space-y-10 bg-[#F8FAFC]">
          {/* 1. Header Section - Fixed Position */}
          <div className="flex flex-col gap-1 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-2 h-10 bg-[#006666] rounded-full" />
              <h1 className="text-4xl font-black text-[#1A365D] tracking-tighter uppercase leading-none">
                Executive Summary
              </h1>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-6">
              HEMS Official Portal //{" "}
              <span className="text-[#006666]">Personnel Asset Management</span>
            </p>
          </div>

          {/* 2. Stats Grid - No Hover Transitions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col gap-1 relative overflow-hidden border-l-4 border-l-[#006666] shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Verified Participants
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-[#1A365D] tracking-tighter">
                  {list.length}
                </span>
                <span className="text-[10px] font-black text-[#006666] uppercase font-mono">
                  Records
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col gap-1 relative overflow-hidden border-l-4 border-l-[#1A365D] shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Active Curriculums
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-[#1A365D] tracking-tighter">
                  {uniqueTrainingDates}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase font-mono">
                  Batches
                </span>
              </div>
            </div>

            <div className="bg-[#1A365D] rounded-xl p-8 flex flex-col gap-1 relative overflow-hidden">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Pending Certification
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white tracking-tighter">
                  {draftParticipantsCount}
                </span>
                <span className="text-[10px] font-black text-teal-400 uppercase font-mono">
                  Drafts
                </span>
              </div>
            </div>
          </div>

          {/* 3. Main CTA - Static Registry Block */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden border-t-8 border-[#006666] shadow-sm shrink-0">
            <div className="bg-slate-50/50 p-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-[#006666] rounded-full flex items-center justify-center text-white shrink-0">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <div className="text-center md:text-left">
                  <div className="inline-block bg-teal-50 border border-teal-100 px-3 py-1 rounded-full mb-3">
                    <span className="text-[9px] font-black text-[#006666] uppercase tracking-[0.2em]">
                      Deployment Protocol
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-[#1A365D] uppercase tracking-tighter leading-tight">
                    Issue New Credentials
                  </h2>
                  <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-70 italic">
                    Register new health personnel assets into the verifiable
                    registry.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCurrentView("form")}
                className="flex items-center gap-4 px-12 py-6 bg-[#006666] hover:bg-[#004d4d] text-white rounded-xl font-black text-[12px] uppercase tracking-[0.2em] shadow-lg active:translate-y-px"
              >
                START NEW RECORD ENTRY
              </button>
            </div>
          </div>

          {/* 4. Footer - Bottom Anchored, No Padding-Bottom */}
          <div className="flex-1 flex items-end pb-8">
            <div className="w-full flex justify-between items-center border-t border-slate-200 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  System Status: Online
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">
                DOH-HEMS // OFFICIAL REGISTRY 2026
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TABLE VIEW */}
      {currentView === "table" && (
        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#F0F4F8] font-sans select-none">
          {/* DOH OFFICIAL HEADER */}
          <div className="h-[12%] min-h-[85px] max-h-[110px] shrink-0 flex items-center justify-between px-10 bg-white border-b-4 border-[#006666] shadow-md z-10">
            <div className="flex items-center gap-5">
              {/* Emblem Placeholder */}
              <div className="w-12 h-12 rounded-full bg-[#006666] flex items-center justify-center shadow-inner">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-[18px] font-bold text-[#1A365D] tracking-tight uppercase leading-none">
                  Registry Archive
                </h1>
                <span className="text-[10px] font-bold text-[#006666] uppercase tracking-widest mt-1">
                  Department of Health // Official Records
                </span>
              </div>
            </div>

            {/* Search - Clinical Look */}
            <div className="relative w-full max-w-sm ml-10">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                className="w-full bg-[#F8FAFC] border-2 border-slate-200 px-12 py-2 text-[13px] font-semibold text-slate-700 rounded-full focus:border-[#006666] focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                placeholder="Search by Training Code or Date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              {/* CLINICAL TABLE HEADERS */}
              <div className="flex h-12 items-center px-10 bg-[#EDF2F7] border-b border-slate-200 shrink-0">
                <div className="w-[20%] shrink-0 text-[11px] font-bold text-[#4A5568] uppercase tracking-wider">
                  Report Date
                </div>
                <div className="flex-1 text-[11px] font-bold text-[#4A5568] uppercase tracking-wider px-4">
                  Health Training Program
                </div>
                <div className="w-[15%] shrink-0 text-[11px] font-bold text-[#4A5568] uppercase tracking-wider text-right">
                  Verified Records
                </div>
              </div>

              {/* DATA ENTRIES */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {paginatedBatches.length > 0 ? (
                  paginatedBatches.map(([batchId, group]) => (
                    <div
                      key={batchId}
                      onClick={() => setSelectedBatch(group)}
                      className="flex flex-1 min-h-0 items-center px-10 hover:bg-[#F0FFF4] border-b border-slate-100 last:border-0 cursor-pointer group transition-colors"
                    >
                      {/* Date as a Badge */}
                      <div className="w-[20%] shrink-0 flex flex-col">
                        <span className="text-[12px] font-bold text-[#2D3748] group-hover:text-[#006666]">
                          {group.displayDate}
                        </span>
                      </div>

                      {/* Training Description - Structured Box Style */}
                      <div className="flex-1 px-4 min-w-0">
                        <div className="inline-flex items-center w-full max-w-[95%] bg-[#F0F9F9] border-l-4 border-[#006666] px-4 py-2.5 rounded-r-md group-hover:bg-[#006666] group-hover:border-slate-900 transition-all duration-300">
                          <div className="flex flex-col min-w-0">
                            {/* Main Title */}
                            <span className="text-[13px] font-bold text-[#1A365D] group-hover:text-white truncate block tracking-tight leading-tight uppercase">
                              {group.trainingType}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Patient/Cert Count Badge - Compact Clinical Style */}
                      <div className="w-[12%] shrink-0 flex justify-end">
                        <div className="flex items-center gap-3 group-hover:translate-x-[-4px] transition-transform duration-200">
                          <div className="flex flex-col items-end">
                            {/* The Smaller Square Tag */}
                            <div className="relative min-w-[38px] h-7 flex items-center justify-center bg-[#F8FAFC] border border-slate-200 group-hover:border-[#006666] group-hover:bg-white transition-all shadow-sm rounded-sm overflow-hidden">
                              {/* Pinned Accent Strip */}
                              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#1A365D] group-hover:bg-[#006666] transition-colors" />

                              {/* Numerical Data */}
                              <span className="text-[13px] font-mono font-black text-[#1A365D] group-hover:text-[#006666] tabular-nums tracking-tighter pt-0.5">
                                {group.certs.length.toString().padStart(2, "0")}
                              </span>
                            </div>
                          </div>

                          {/* The Chevron Indicator */}
                          <svg
                            className="w-4 h-4 text-slate-300 group-hover:text-[#006666] transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <span className="text-[11px] font-bold uppercase">
                      No Registry Records Found
                    </span>
                  </div>
                )}

                {/* GHOST FILLERS */}
                {[...Array(Math.max(0, 10 - paginatedBatches.length))].map(
                  (_, i) => (
                    <div
                      key={`fill-${i}`}
                      className="flex-1 border-b border-slate-50/50 last:border-0"
                    />
                  ),
                )}
              </div>
            </div>
          </div>

          {/* NAVIGATION FOOTER */}
          <div className="h-16 shrink-0 px-12 flex items-center justify-between bg-white border-t border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#38A169] shadow-[0_0_8px_rgba(56,161,105,0.4)]" />
              <span className="text-[11px] font-bold text-[#4A5568] uppercase tracking-wide">
                Database Connection Active: {totalItems} Entries
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-10 px-6 rounded-md border border-slate-300 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-30"
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                className="h-10 px-8 bg-[#006666] text-white text-[11px] font-bold rounded-md hover:bg-[#004D4D] transition-all shadow-md active:transform active:scale-95 disabled:opacity-30"
                disabled={currentPage === totalPages}
              >
                Next Page
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BATCH DETAIL MODAL */}
      {selectedBatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => {
              setSelectedBatch(null);
              setModalSearch("");
            }}
          />

          {/* Locked Modal Height: 95% on mobile, 90% on desktop */}
          <div className="relative w-full max-w-6xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[95vh] md:h-[90vh] border-t-8 border-[#006666] rounded-t-lg">
            {/* 1. Header - Properly Aligned */}
            <div className="min-h-[80px] md:h-24 shrink-0 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-white p-4 md:px-10 gap-4 md:gap-0">
              {/* Left Section: Icon + Text */}
              <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                {/* Shield/Document Icon */}
                <div className="hidden sm:flex w-12 h-12 bg-[#006666] rounded-full items-center justify-center text-white shadow-lg shrink-0">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>

                {/* Title & Badge Meta */}
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 md:gap-3">
                    <h2 className="text-sm md:text-xl font-black text-[#1A365D] uppercase tracking-tighter truncate">
                      {selectedBatch.displayDate}
                    </h2>
                    <span className="text-[8px] md:text-[10px] font-black bg-teal-50 text-[#006666] border border-teal-200 px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest shrink-0">
                      {selectedBatch.trainingType}
                    </span>
                  </div>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider md:tracking-[0.2em] mt-1 truncate">
                    Registry Record //{" "}
                    <span className="text-[#006666]">
                      {selectedBatch.certs.length} Entries
                    </span>
                  </p>
                </div>
              </div>

              {/* Right Section: Close Button */}
              <div className="w-full md:w-auto">
                <button
                  onClick={() => {
                    setSelectedBatch(null);
                    setModalSearch("");
                  }}
                  className="w-full md:w-auto group flex items-center justify-center gap-2 h-9 md:h-10 px-4 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all rounded-md border border-slate-200"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Close Record
                  </span>
                  <span className="text-xl leading-none mb-0.5">×</span>
                </button>
              </div>
            </div>

            {/* 2. Utility Bar - Responsive Stacking */}
            <div className="h-auto md:h-[76px] shrink-0 px-4 md:px-10 py-3 md:py-0 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3">
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-white border-2 border-slate-200 rounded-full pl-10 pr-4 py-2 text-[12px] font-bold text-slate-700 outline-none focus:border-[#006666]"
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setModalPage(1);
                  }}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
                  🔍
                </span>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <MemoizedBatchDownload
                  certs={selectedBatch.certs}
                  displayDate={selectedBatch.displayDate}
                  type="cert"
                  settings={settings}
                  className="bg-[#006666] hover:bg-[#004d4d] text-white rounded-md shadow-sm"
                />
                <MemoizedBatchDownload
                  certs={selectedBatch.certs}
                  displayDate={selectedBatch.displayDate}
                  type="id"
                  settings={settings}
                  className="bg-[#1A365D] hover:bg-[#122846] text-white rounded-md shadow-sm"
                />
              </div>
            </div>

            {/* 3. Modal Body */}
            <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
              {(() => {
                const filteredCerts = selectedBatch.certs.filter((cert) => {
                  const search = modalSearch.toLowerCase();
                  return (
                    cert.participant_name?.toLowerCase().includes(search) ||
                    cert.facility?.toLowerCase().includes(search)
                  );
                });

                const currentModalItems = filteredCerts.slice(
                  (modalPage - 1) * 10,
                  modalPage * 10,
                );

                return (
                  <div className="flex-1 flex flex-col">
                    {/* Headings - Hidden on Mobile */}
                    <div className="hidden md:flex h-11 items-center px-10 bg-[#EDF2F7] border-b border-slate-200 shrink-0">
                      <div className="w-16 text-center text-[10px] font-black text-slate-500 uppercase">
                        Index
                      </div>
                      <div className="flex-1 px-4 text-[10px] font-black text-slate-500 uppercase">
                        Full Name
                      </div>
                      <div className="w-[20%] px-4 text-[10px] font-black text-slate-500 uppercase">
                        Classification
                      </div>
                      <div className="w-[25%] px-4 text-[10px] font-black text-slate-500 uppercase">
                        Facility
                      </div>
                      <div className="w-48 text-right text-[10px] font-black text-slate-500 uppercase pr-4">
                        Action
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {currentModalItems.map((cert, index) => (
                        <div
                          key={cert._id || cert.id}
                          className="flex-1 flex flex-row items-center px-4 md:px-10 border-b border-slate-100 hover:bg-teal-50/30 group transition-colors min-h-0"
                        >
                          <div className="hidden md:block w-16 text-center font-mono text-[11px] font-bold text-slate-400">
                            {((modalPage - 1) * 10 + index + 1)
                              .toString()
                              .padStart(2, "0")}
                          </div>

                          <div className="flex-1 md:px-4 overflow-hidden flex flex-col">
                            <span className="text-[12px] md:text-[13px] font-bold text-[#1A365D] uppercase truncate">
                              {cert.participant_name}
                            </span>
                            {/* Mobile-only Participant Type sub-text */}
                            <span className="md:hidden text-[10px] text-slate-400 italic truncate uppercase">
                              {cert.participant_type || "No Classification"}
                            </span>
                          </div>

                          <div className="hidden md:block w-[20%] px-4">
                            <span className="text-[9px] font-black text-[#006666] bg-teal-50 px-2 py-1 rounded-sm border border-teal-100 uppercase">
                              {cert.participant_type || "Standard"}
                            </span>
                          </div>

                          <div className="hidden md:block w-[25%] px-4">
                            <span className="text-[11px] font-semibold text-slate-500 truncate block uppercase italic">
                              {cert.facility || "Not Stated"}
                            </span>
                          </div>

                          <div className="w-auto md:w-48 flex justify-end gap-1 md:gap-2">
                            <IndividualDownload
                              cert={cert}
                              settings={settings}
                            />
                            <button
                              onClick={() => {
                                setEditForm({
                                  ...cert,
                                  id: cert._id || cert.id,
                                });
                                setShowEditModal(true);
                              }}
                              className="h-7 md:h-8 px-2 md:px-4 bg-white border border-slate-300 text-[9px] md:text-[10px] font-black text-[#1A365D] uppercase rounded"
                            >
                              Modify
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Filler Rows (Maintain 10 count) */}
                      {currentModalItems.length < 10 &&
                        [...Array(10 - currentModalItems.length)].map(
                          (_, i) => (
                            <div
                              key={`fill-${i}`}
                              className="flex-1 border-b border-slate-50 bg-slate-50/10 hidden md:block"
                            />
                          ),
                        )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 4. Footer */}
            <div className="h-16 shrink-0 bg-white border-t border-slate-200 px-4 md:px-10 flex justify-between items-center">
              <div className="flex items-center gap-3 md:gap-6">
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {modalPage} / {Math.ceil(selectedBatch.certs.length / 10)}
                </span>
                <div className="hidden sm:flex gap-1.5">
                  {[
                    ...Array(
                      Math.min(5, Math.ceil(selectedBatch.certs.length / 10)),
                    ),
                  ].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-4 rounded-full ${modalPage === i + 1 ? "bg-[#006666]" : "bg-slate-200"}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={modalPage === 1}
                  onClick={() => setModalPage((p) => p - 1)}
                  className="px-4 md:px-6 py-2 bg-slate-100 text-[10px] font-black uppercase rounded disabled:opacity-30"
                >
                  Prev
                </button>
                <button
                  disabled={
                    modalPage === Math.ceil(selectedBatch.certs.length / 10)
                  }
                  onClick={() => setModalPage((p) => p + 1)}
                  className="px-4 md:px-6 py-2 bg-[#006666] text-white text-[10px] font-black uppercase rounded shadow-md disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM VIEW */}
      {currentView === "form" && (
        <div className="animate-in fade-in duration-500 space-y-6">
          {/* HEADER SECTION */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center bg-white p-4 md:p-6 rounded-[2rem] border-b-4 border-[#006666] shadow-sm gap-6 lg:gap-0">
            <div className="flex items-center gap-4">
              {/* ICON BESIDE TITLE */}
              <div className="w-12 h-12 rounded-2xl bg-[#F0F9F9] flex items-center justify-center border border-[#006666]/10 shrink-0">
                <svg
                  className="w-6 h-6 text-[#006666]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tighter truncate">
                  Batch Registry Entry
                </h1>
                <p className="text-[10px] font-bold text-[#006666] uppercase tracking-widest mt-1">
                  Rows in draft: {formRows.length}
                </p>
              </div>
            </div>

            {/* BUTTON GROUP - Wraps on mobile, stays inline on desktop */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 md:gap-3">
              <button
                onClick={clearAllRows}
                className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl font-black text-[10px] uppercase transition-colors"
                aria-label="Clear all draft rows"
              >
                Clear All
              </button>

              <button
                onClick={addEmptyRow}
                className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-black text-[10px] uppercase transition-all"
              >
                + Add Row
              </button>

              <button
                onClick={handleBulkSubmit}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 md:px-10 py-3 bg-[#006666] text-white hover:bg-[#004D4D] rounded-xl font-black text-[10px] uppercase shadow-lg shadow-[#006666]/20 transition-all"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="whitespace-nowrap">Confirm & Save</span>
              </button>
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full min-w-[1200px] border-collapse">
              <thead>
                <tr className="bg-[#EDF2F7] border-b border-slate-200">
                  {[
                    "Name",
                    "Training Type",
                    "Dates",
                    "Venue",
                    "Facility",
                    "Type",
                    "Age",
                    "Position",
                    "Tools",
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formRows.map((row, index) => (
                  <tr
                    key={row.tempId}
                    className="focus-within:bg-[#F0F9F9] transition-colors"
                  >
                    {/* Name */}
                    <td className="p-1 border-r border-slate-100">
                      <input
                        className="w-full p-3 bg-transparent text-[11px] font-black text-[#1A365D] outline-none"
                        value={row.participant_name}
                        onKeyDown={(e) => handleKeyDown(e, index, 0)}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            "participant_name",
                            e.target.value,
                          )
                        }
                        onBlur={(e) =>
                          handleInputChange(
                            index,
                            "participant_name",
                            formatValue("participant_name", e.target.value),
                          )
                        }
                        placeholder="Full Name"
                        aria-label={`Participant name, row ${index + 1}`}
                      />
                    </td>

                    {/* Training Type */}
                    <td className="p-1 border-r border-slate-100">
                      <select
                        className="w-full p-3 bg-transparent text-[10px] font-bold text-slate-600 uppercase outline-none"
                        value={row.training_type}
                        onKeyDown={(e) => handleKeyDown(e, index, 1)}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            "training_type",
                            e.target.value,
                          )
                        }
                        aria-label={`Training type, row ${index + 1}`}
                      >
                        {TRAINING_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Dates */}
                    <td className="p-1 border-r border-slate-100">
                      <input
                        className="w-full p-3 bg-transparent text-[11px] font-bold text-slate-600 outline-none"
                        value={row.training_date}
                        onKeyDown={(e) => handleKeyDown(e, index, 2)}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            "training_date",
                            e.target.value,
                          )
                        }
                        onBlur={(e) =>
                          handleInputChange(
                            index,
                            "training_date",
                            formatValue("training_date", e.target.value),
                          )
                        }
                        placeholder="January 21-23, 2026"
                        aria-label={`Training dates, row ${index + 1}`}
                      />
                    </td>

                    {/* Venue */}
                    <td className="p-1 border-r border-slate-100">
                      <input
                        className="w-full p-3 bg-transparent text-[11px] font-bold text-slate-600 outline-none"
                        value={row.venue}
                        onKeyDown={(e) => handleKeyDown(e, index, 3)}
                        onChange={(e) =>
                          handleInputChange(index, "venue", e.target.value)
                        }
                        onBlur={(e) =>
                          handleInputChange(
                            index,
                            "venue",
                            formatValue("venue", e.target.value),
                          )
                        }
                        placeholder="San Fernando City, La Union"
                        aria-label={`Venue, row ${index + 1}`}
                      />
                    </td>

                    {/* Facility */}
                    <td className="p-1 border-r border-slate-100">
                      <input
                        className="w-full p-3 bg-transparent text-[11px] font-bold text-slate-600 outline-none"
                        value={row.facility}
                        onKeyDown={(e) => handleKeyDown(e, index, 4)}
                        onChange={(e) =>
                          handleInputChange(index, "facility", e.target.value)
                        }
                        onBlur={(e) =>
                          handleInputChange(
                            index,
                            "facility",
                            formatValue("facility", e.target.value),
                          )
                        }
                        placeholder="Rural Health Unit 1"
                        aria-label={`Facility, row ${index + 1}`}
                      />
                    </td>

                    {/* Type */}
                    <td className="p-1 border-r border-slate-100">
                      <select
                        className="w-full p-3 bg-transparent text-[10px] font-bold text-slate-600 uppercase outline-none"
                        value={row.participant_type}
                        onKeyDown={(e) => handleKeyDown(e, index, 5)}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            "participant_type",
                            e.target.value,
                          )
                        }
                        aria-label={`Participant type, row ${index + 1}`}
                      >
                        {PARTICIPANT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Age */}
                    <td className="p-1 border-r border-slate-100 w-16">
                      <input
                        type="number"
                        className="w-full p-3 bg-transparent text-[11px] font-bold text-center text-slate-600 outline-none"
                        value={row.age}
                        onKeyDown={(e) => handleKeyDown(e, index, 6)}
                        onChange={(e) =>
                          handleInputChange(index, "age", e.target.value)
                        }
                        placeholder="25"
                        aria-label={`Age, row ${index + 1}`}
                      />
                    </td>

                    {/* Position */}
                    <td className="p-1 border-r border-slate-100">
                      <input
                        className="w-full p-3 bg-transparent text-[11px] font-bold text-slate-600 outline-none"
                        value={row.position}
                        onKeyDown={(e) => handleKeyDown(e, index, 7)}
                        onChange={(e) =>
                          handleInputChange(index, "position", e.target.value)
                        }
                        onBlur={(e) =>
                          handleInputChange(
                            index,
                            "position",
                            formatValue("position", e.target.value),
                          )
                        }
                        placeholder="Health Program Officer I"
                        aria-label={`Position, row ${index + 1}`}
                      />
                    </td>

                    {/* Tools */}
                    <td className="p-1 text-center space-x-2">
                      <button
                        onClick={() => duplicateRow(index)}
                        className="text-slate-400 hover:text-[#006666] transition-colors"
                        title="Duplicate this row"
                        aria-label={`Duplicate row ${index + 1}`}
                      >
                        👯
                      </button>
                      <button
                        onClick={() => removeRow(index)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove this row"
                        aria-label={`Remove row ${index + 1}`}
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      <EditModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        editForm={editForm}
        setEditForm={setEditForm}
        onSubmit={handleEditSubmit}
        onDelete={handleDelete}
      />

      {/* SYSTEM SETTINGS VIEW */}
      {currentView === "settings" && (
        /* REMOVED px-4 AND ADDED w-full TO ENSURE MAXIMUM WIDTH */
        <div className="animate-in fade-in duration-500 space-y-8 h-auto flex flex-col pb-20 w-full">
          {/* HEADER SECTION - NO CONTENT CHANGES */}
          <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-b-4 border-[#006666] shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F9F9] flex items-center justify-center border border-[#006666]/10">
                <svg
                  className="w-6 h-6 text-[#006666]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                  Authority Registry
                </h1>
                <p className="text-[10px] font-bold text-[#006666] uppercase tracking-widest mt-1">
                  Personnel Asset Management
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSettings({})}
                className="px-6 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl font-black text-[10px] uppercase transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={saveSettingsToDB}
                className="flex items-center gap-2 px-10 py-3 bg-[#006666] text-white hover:bg-[#004D4D] rounded-xl font-black text-[10px] uppercase shadow-lg shadow-[#006666]/20 transition-all active:scale-95"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Confirm & Save
              </button>
            </div>
          </div>

          {/* GRID ADJUSTED: xl:grid-cols-12 - TABLE NOW TAKES 10 COLUMNS INSTEAD OF 8 */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start w-full">
            {/* LEFT TABLE: Pushed to col-span-9 for extra width */}
            <div className="xl:col-span-9 space-y-4">
              <div className="grid grid-cols-12 px-8 mb-2">
                <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  #
                </div>
                <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Full Name
                </div>
                <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Designation
                </div>
                <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Actions
                </div>
              </div>

              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className="grid grid-cols-12 items-center bg-white p-2 pl-8 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-[#006666]/20 transition-all group"
                >
                  <div className="col-span-1">
                    <span className="text-lg font-black text-slate-200 group-hover:text-[#006666]/30 transition-colors">
                      0{num}
                    </span>
                  </div>
                  <div className="col-span-4 pr-4">
                    <input
                      className="w-full py-3 bg-transparent text-[15px] font-bold text-slate-700 outline-none placeholder:text-slate-300"
                      value={settings[`off${num}_name`] || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          [`off${num}_name`]: e.target.value,
                        })
                      }
                      placeholder="Type name..."
                    />
                  </div>
                  <div className="col-span-4 pr-4 border-l border-slate-50">
                    <input
                      className="w-full py-3 pl-4 bg-transparent text-[13px] font-medium text-slate-500 outline-none placeholder:text-slate-300"
                      value={settings[`off${num}_pos`] || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          [`off${num}_pos`]: e.target.value,
                        })
                      }
                      placeholder="Type position..."
                    />
                  </div>
                  <div className="col-span-3 flex justify-end pr-2">
                    {num === 1 ? (
                      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <input
                          type="file"
                          id={`sig-${num}`}
                          className="hidden"
                          accept="image/png"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setActiveOfficerNum(1);
                              const reader = new FileReader();
                              reader.onload = () =>
                                setImageToCrop(reader.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label
                          htmlFor={`sig-${num}`}
                          className="px-4 py-2 bg-white text-[#006666] border border-slate-200 rounded-lg text-[10px] font-black uppercase cursor-pointer hover:bg-[#006666] hover:text-white transition-all shadow-sm"
                        >
                          {settings.off1_sig ? "Replace" : "Signature"}
                        </label>
                        {settings.off1_sig && (
                          <button
                            onClick={() =>
                              setSettings({ ...settings, off1_sig: "" })
                            }
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                strokeWidth={2}
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                        Identity Text Only
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT PREVIEW: Condensed to col-span-3 to make room for table */}
            <div className="xl:col-span-3 flex justify-center">
              <div className="sticky top-10 flex flex-col items-center">
                <div className="scale-95 origin-top">
                  {/* CARD CONTAINER */}
                  <div className="w-[320px] h-[204px] bg-white border-[1.5px] border-black p-4 flex flex-col shadow-2xl rounded-[2px] relative overflow-hidden">
                    {/* BACK HEADER */}
                    <div className="flex flex-row items-start mb-2">
                      <img
                        src="/rescue-logo.png"
                        className="w-10 h-10 object-contain"
                        alt="Logo"
                      />
                      <div className="ml-3 flex-1 pt-1">
                        <p className="text-[7.5px] text-black leading-tight">
                          Registration No.:{" "}
                          <span className="font-bold">BLS***-00-000</span>
                        </p>
                        <p className="text-[7.5px] text-black leading-tight">
                          Date Registered:{" "}
                          <span className="font-medium">Month Day, Year</span>
                        </p>
                        <p className="text-[7.5px] text-black leading-tight">
                          Date Renewal:{" "}
                          <span className="font-medium">Month Day, Year</span>
                        </p>
                      </div>
                    </div>

                    {/* CARDHOLDER SIGNATURE AREA */}
                    <div className="mt-1 ml-12 w-[60%] border-t border-black flex flex-col items-center">
                      <p className="text-[5.5px] text-black font-bold uppercase mt-0.5 tracking-tighter">
                        Cardholder's Signature
                      </p>
                    </div>

                    {/* OFFICIALS CONTAINER - USING FIXED SLOTS TO PREVENT OVERLAP */}
                    <div className="mt-auto flex flex-col w-full pb-1">
                      {/* OFFICIAL 1 SLOT */}
                      <div className="h-[42px] flex flex-col items-center justify-end relative">
                        {settings.off1_sig && (
                          <div className="absolute top-0 inset-x-0 flex justify-center pointer-events-none">
                            <img
                              src={settings.off1_sig}
                              className="w-20 h-10 object-contain mix-blend-multiply"
                              alt="signature"
                            />
                          </div>
                        )}
                        <p className="text-[9px] font-black text-black uppercase leading-[1] z-10">
                          {settings.off1_name || "Official Name 01"}
                        </p>
                        <p className="text-[6.5px] font-bold text-slate-500 leading-[1] mt-0.5 z-10">
                          {settings.off1_pos || "Designation"}
                        </p>
                      </div>

                      {/* OFFICIAL 2 SLOT */}
                      <div className="h-[32px] flex flex-col items-center justify-end">
                        <p className="text-[9px] font-black text-black uppercase leading-[1]">
                          {settings.off2_name || "Official Name 02"}
                        </p>
                        <p className="text-[6.5px] font-bold text-slate-500 leading-[1] mt-0.5">
                          {settings.off2_pos || "Designation"}
                        </p>
                      </div>

                      {/* OFFICIAL 3 SLOT */}
                      <div className="h-[32px] flex flex-col items-center justify-end">
                        <p className="text-[9px] font-black text-black uppercase leading-[1]">
                          {settings.off3_name || "Official Name 03"}
                        </p>
                        <p className="text-[6.5px] font-bold text-slate-500 leading-[1] mt-0.5">
                          {settings.off3_pos || "Designation"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-[10px] text-center font-black text-slate-400 uppercase tracking-[0.2em]">
                    Live Back-Side Preview
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {imageToCrop && (
        <ManualCropperModal
          imageSrc={imageToCrop}
          onClose={() => setImageToCrop(null)}
          onSave={handleCroppedImage}
          aspectRatio={3 / 1}
        />
      )}
    </div>
  );
}

export default Home;
