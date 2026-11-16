export function initials(first = "", last = "") {
  return `${first.trim()[0] || ""}${last.trim()[0] || ""}`.toUpperCase() || "☺";
}

export default function Avatar({ person, size = 40, className = "" }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (person?.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`avatar ${className}`} style={style} src={person.photoUrl} alt="" />;
  }
  return <span className={`avatar avatar-initials ${className}`} style={style} aria-hidden="true">{initials(person?.firstName, person?.lastName)}</span>;
}
