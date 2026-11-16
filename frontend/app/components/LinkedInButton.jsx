export default function LinkedInButton({ intent = "login", next = "", label = "Continue with LinkedIn" }) {
  const params = new URLSearchParams({ intent, ...(next ? { next } : {}) });
  return (
    <a className="linkedin-button" href={`/api/auth/linkedin?${params}`}>
      <span className="linkedin-in" aria-hidden="true">in</span>
      {label}
    </a>
  );
}
