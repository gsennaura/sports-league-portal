export function PageLoader() {
  return (
    <div className="page-loader">
      <svg className="page-loader__spinner" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="18" stroke="var(--c-border)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r="18"
          stroke="var(--c-link)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="75 38"
        />
      </svg>
    </div>
  );
}
