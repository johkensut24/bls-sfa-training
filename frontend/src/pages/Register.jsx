import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserRound, Lock, UserPlus } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

function Register({ setUser }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  const handleFormChange = (e) => {
    setValidationErrors((prev) => ({ ...prev, [e.target.name]: null }));
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.username) errors.username = "Required";
    if (!form.password) errors.password = "Required";
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Mismatch";
      toast.error("Security Check: Passwords do not match.");
      return;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const { confirmPassword, ...dataToSubmit } = form;
      const res = await axios.post("/api/auth/register", dataToSubmit);
      setUser(res.data.user);
      toast.success("Account Registered in Database");
      navigate("/");
    } catch (err) {
      setValidationErrors({
        username: true,
        password: true,
        confirmPassword: true,
      });
      toast.error(err.response?.data?.message || "Registry submission failed.");
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
        {/* Registry Header */}
        <div className="bg-white px-8 pt-10 pb-6 text-center border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1A365D] rounded-full mb-4 shadow-lg text-white">
            <UserPlus size={30} />
          </div>
          <h2 className="text-2xl font-black text-[#1A365D] uppercase tracking-tighter">
            Account Creation
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
            Personnel Enrollment //{" "}
            <span className="text-[#006666]">Official Health Registry</span>
          </p>
        </div>

        <form className="p-8 space-y-6" onSubmit={handleSubmit}>
          {/* Username */}
          <div className="relative">
            <UserRound
              size={18}
              className={`absolute top-[1.4rem] left-4 ${
                focusedField === "username"
                  ? "text-[#006666]"
                  : "text-slate-300"
              }`}
            />
            <label className={getLabelClass("username")}>New Username</label>
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
                focusedField === "password"
                  ? "text-[#006666]"
                  : "text-slate-300"
              }`}
            />
            <label className={getLabelClass("password")}>Set Password</label>
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
              className="absolute right-4 top-[1.3rem] text-slate-300 hover:text-[#006666]"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock
              size={18}
              className={`absolute top-[1.4rem] left-4 ${
                focusedField === "confirmPassword"
                  ? "text-[#006666]"
                  : "text-slate-300"
              }`}
            />
            <label className={getLabelClass("confirmPassword")}>
              Verify Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder=""
              className={`${getInputClass("confirmPassword")} pl-11 pr-12`}
              value={form.confirmPassword}
              onChange={handleFormChange}
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#006666] hover:bg-[#004d4d] text-white py-4 rounded font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-md active:scale-[0.98]"
            >
              Confirm Enrollment
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-[10px] font-black text-[#1A365D] uppercase tracking-widest hover:underline"
            >
              Already Registered? Login Here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
