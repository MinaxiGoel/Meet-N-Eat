"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProfileFields from "../components/ProfileFields";
import { validateProfile } from "@/lib/validate";

export default function SignupForm({ initial }) {
  const router = useRouter();
  const [values, setValues] = useState({
    firstName: initial.firstName || "", lastName: initial.lastName || "",
    gender: "", jobTitle: "", company: "", linkedinUrl: "", funFacts: "",
    ageConfirmed: false, termsAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function change(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    const check = validateProfile(values, { requireConsent: true });
    if (!check.ok) { setErrors(check.errors); return; }
    setBusy(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const response = await fetch("/api/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, timezone }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) { router.push("/app?welcome=1"); router.refresh(); return; }
      if (data.errors) setErrors(data.errors);
      setMessage(data.restart ? "restart" : data.error || "");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="linked-as">
        {initial.picture
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={initial.picture} alt="" className="avatar" width={40} height={40} />
          : <span className="avatar avatar-initials" style={{ width: 40, height: 40 }}>in</span>}
        <span>
          <strong>Verified with LinkedIn</strong>
          <small>{initial.email} · your monthly emails come here</small>
        </span>
      </div>

      <ProfileFields values={values} errors={errors} onChange={change} />

      <label className={`check${errors.ageConfirmed ? " has-error" : ""}`}>
        <input type="checkbox" checked={values.ageConfirmed} onChange={(e) => change("ageConfirmed", e.target.checked)} />
        <span>I’m 18 or older.</span>
      </label>
      {errors.ageConfirmed && <small className="error">{errors.ageConfirmed}</small>}
      <label className={`check${errors.termsAccepted ? " has-error" : ""}`}>
        <input type="checkbox" checked={values.termsAccepted} onChange={(e) => change("termsAccepted", e.target.checked)} />
        <span>I agree to the <a href="/terms" target="_blank">Terms</a> and <a href="/privacy" target="_blank">Privacy Policy</a>, and to my profile being shared with my monthly match.</span>
      </label>
      {errors.termsAccepted && <small className="error">{errors.termsAccepted}</small>}

      {message === "restart"
        ? <p className="alert" role="alert">Your LinkedIn sign-in timed out. <a href="/api/auth/linkedin?intent=register">Continue with LinkedIn again</a>.</p>
        : message && <p className="alert" role="alert">{message}</p>}

      <button className="button primary wide" disabled={busy}>{busy ? "Setting your place…" : "Sign up"}</button>
    </form>
  );
}
