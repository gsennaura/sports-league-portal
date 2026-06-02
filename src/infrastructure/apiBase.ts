const _raw: string = import.meta.env.VITE_API_BASE_URL ?? "";

// Strip trailing slash and force https:// for non-localhost origins.
// This guards against VITE_API_BASE_URL being accidentally set to http://.
const API_BASE: string = _raw
  ? _raw.replace(/\/$/, "").replace(/^http:\/\/(?!localhost)/i, "https://")
  : "/api";

export { API_BASE };
