import React, { useState } from "react";
import api from "../api";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserRound, Lock, ShieldCheck } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { API_URL } from "../api";

function Login({ setUser }) {
  const location = useLocation();
  const [form, setForm] = useState({
    // Use the passed username if it exists, otherwise empty
    username: location.state?.registeredUsername || "",
    password: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [focusedField, setFocusedField] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleFormChange = (e) => {
    setValidationErrors((prev) => ({ ...prev, [e.target.name]: null }));
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation check
    const errors = {};
    if (!form.username) errors.username = "Required";
    if (!form.password) errors.password = "Required";

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Access Denied: Missing Credentials");
      return;
    }

    // START LOADING
    setIsAuthenticating(true);

    try {
      const res = await api.post("/api/auth/login", form);

      setUser(res.data.user);
      toast.success("Identity Verified");
      navigate("/");
    } catch (err) {
      setValidationErrors({ username: true, password: true });
      toast.error(
        err.response?.data?.message || "Invalid Registry Credentials",
      );
    } finally {
      // STOP LOADING (whether success or fail)
      setIsAuthenticating(false);
    }
  };

  const getInputClass = (fieldName) => {
    const baseClass =
      "w-full bg-white border-2 p-3 pt-6 rounded-md text-[14px] font-medium normal-case outline-none transition-all";
    if (validationErrors[fieldName]) {
      return `${baseClass} border-red-500 bg-red-50/30 text-red-900`;
    }
    return `${baseClass} border-slate-200 focus:border-[#006666] text-slate-700`;
  };

  const getLabelClass = (fieldName) => {
    const isActive = form[fieldName] || focusedField === fieldName;
    let classes =
      "absolute pointer-events-none left-11 transition-all duration-200 uppercase font-black tracking-widest";

    if (validationErrors[fieldName]) {
      classes += " text-red-500";
    } else if (isActive) {
      classes += " text-[#006666]";
    } else {
      classes += " text-slate-400";
    }

    return isActive
      ? `${classes} top-2 text-[9px]`
      : `${classes} top-4 text-[11px]`;
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-50 p-4">
      <Toaster position="top-right" />

      <div className="w-full max-w-md bg-white shadow-2xl overflow-hidden border-t-8 border-[#006666] rounded-t-lg">
        {/* Header Section */}
        <div className="bg-white px-8 pt-10 pb-6 text-center border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#006666] rounded-full mb-4 shadow-lg text-white">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-black text-[#1A365D] uppercase tracking-tighter">
            Registry Access
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
            Official DOH Training Portal //{" "}
            <span className="text-[#006666]">Authorized Personnel Only</span>
          </p>
        </div>

        <form className="p-8 space-y-6" onSubmit={handleSubmit}>
          {/* Username */}
          <div className="relative">
            <UserRound
              size={18}
              className={`absolute top-[1.4rem] left-4 ${
                validationErrors.username
                  ? "text-red-500"
                  : focusedField === "username"
                    ? "text-[#006666]"
                    : "text-slate-300"
              }`}
            />
            <label className={getLabelClass("username")}>System Username</label>
            <input
              type="text"
              name="username"
              placeholder=""
              className={`${getInputClass("username")} pl-11`}
              value={form.username}
              onChange={handleFormChange}
              onFocus={() => setFocusedField("username")}
              onBlur={() => setFocusedField(null)}
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock
              size={18}
              className={`absolute top-[1.4rem] left-4 ${
                validationErrors.password
                  ? "text-red-500"
                  : focusedField === "password"
                    ? "text-[#006666]"
                    : "text-slate-300"
              }`}
            />
            <label className={getLabelClass("password")}>
              Security Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder=""
              className={`${getInputClass("password")} pl-11 pr-12`}
              value={form.password}
              onChange={handleFormChange}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
            <button
              type="button"
              className="absolute right-4 top-[1.3rem] text-slate-300 hover:text-[#006666] transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isAuthenticating} // Disable to prevent double-clicks
              className={`w-full flex items-center justify-center gap-3 py-4 rounded font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-md active:scale-[0.98] ${
                isAuthenticating
                  ? "bg-slate-400 cursor-wait"
                  : "bg-[#1A365D] hover:bg-[#006666] text-white"
              }`}
            >
              {isAuthenticating ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                "Authenticate Identity"
              )}
            </button>
          </div>

          <div className="text-center pt-4">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              All access attempts are logged <br />
              under Department of Health Security Protocols
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
