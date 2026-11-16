// The plate drawing used on the landing page (as the Register button) and in the app.
export default function Plate({ label, className = "" }) {
  return (
    <span className={`plate ${className}`} aria-hidden={label ? undefined : "true"}>
      <span className="plate-rim" />
      <span className="plate-well" />
      <span className="plate-leaf plate-leaf-one">✳</span>
      <span className="plate-leaf plate-leaf-two">✳</span>
      {label && <span className="plate-label">{label}</span>}
    </span>
  );
}
