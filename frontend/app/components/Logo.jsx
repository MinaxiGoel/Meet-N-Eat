// The plate logo. Not a link (PRD 9.1): it just sits top left.
export default function Logo({ small = false }) {
  return (
    <span className={`logo${small ? " logo-small" : ""}`} aria-label="Meet-N-Eat">
      <span className="logo-plate" aria-hidden="true"><i /><i /><i /></span>
      <span className="logo-word">Meet-<em>N</em>-Eat</span>
    </span>
  );
}
