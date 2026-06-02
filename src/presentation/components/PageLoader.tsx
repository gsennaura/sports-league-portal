import React from "react";

const spinnerStyle: React.CSSProperties = {
  display: "block",
  width: 44,
  height: 44,
  animation: "pageloader-spin 0.85s linear infinite",
  transformOrigin: "center",
};

const containerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "40vh",
  width: "100%",
};

export function PageLoader() {
  return (
    <div style={containerStyle}>
      <svg style={spinnerStyle} viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="18" stroke="#313244" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r="18"
          stroke="#89b4fa"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="75 38"
        />
      </svg>
      <style>{`
        @keyframes pageloader-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
