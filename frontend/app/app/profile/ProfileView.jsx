"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "../../components/Avatar";
import ProfileFields from "../../components/ProfileFields";
import { genderLabel, validateProfile } from "@/lib/validate";

function timeZones(current) {
  let zones = [];
  try { zones = Intl.supportedValuesOf("timeZone"); } catch { zones = []; }
  return zones.includes(current) ? zones : [current, ...zones];
}

export default function ProfileView({ me }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(me);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, message: "", error: "" });
  const zones = useMemo(() => timeZones(me.timezone), [me.timezone]);

  function change(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  async function request(body) {
    setState({ busy: true, message: "", error: "" });
    const response = await fetch("/api/me", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.errors) setErrors(data.errors);
      setState({ busy: false, message: "", error: data.error || "Please check the highlighted fields." });
      return null;
    }
    router.refresh();
    return data.member;
  }

  async function save(event) {
    event.preventDefault();
    const check = validateProfile(values);
    if (!check.ok) { setErrors(check.errors); return; }
    const member = await request({ ...values });
    if (member) {
      setValues(member);
      setEditing(false);
      setState({ busy: false, message: "Saved! ✅", error: "" });
    }
  }

  async function removePhoto() {
    const member = await request({ removePhoto: true });
    if (member) { setValues(member); setState({ busy: false, message: "Photo removed.", error: "" }); }
  }

  const rows = [
    ["Name", `${me.firstName} ${me.lastName}`],
    ["Current role", me.jobTitle],
    ["Company", me.company],
    ["Fun, cool things", me.funFacts],
    ["LinkedIn", <a key="li" href={me.linkedinUrl} target="_blank" rel="noopener noreferrer">{me.linkedinUrl.replace("https://www.", "")}</a>],
    ["Gender", genderLabel(me.gender)],
    ["Email", me.email],
    ["Time zone", me.timezone.replace(/_/g, " ")],
  ];

  return (
    <section className="profile-card">
      <Link href="/app" className="back-link">‹ Back</Link>
      <div className="profile-top">
        <Avatar person={values} size={88} />
        <div>
          <h1>{me.firstName} {me.lastName}</h1>
          <p className="muted">{me.jobTitle} · {me.company}</p>
          <p className="photo-actions">
            <a href="/api/auth/linkedin?intent=login&next=/app/profile">Refresh photo from LinkedIn</a>
            {me.photoUrl && <> · <button className="link" onClick={removePhoto} disabled={state.busy}>Remove photo</button></>}
          </p>
        </div>
      </div>

      {state.message && <p className="success" role="status">{state.message}</p>}
      {state.error && <p className="alert" role="alert">{state.error}</p>}

      {!editing ? (
        <>
          <dl className="details">
            {rows.map(([label, value]) => (<div key={label}><dt>{label}</dt><dd>{value}</dd></div>))}
          </dl>
          <p className="small-print">Your match sees your photo, name, role, company, fun things and LinkedIn link. Never your email or gender.</p>
          <button className="button primary wide" onClick={() => { setEditing(true); setState({ busy: false, message: "", error: "" }); }}>Edit</button>
        </>
      ) : (
        <form className="form" onSubmit={save} noValidate>
          <ProfileFields values={values} errors={errors} onChange={change} />
          <label className="field">
            <span className="field-label">Time zone</span>
            <select value={values.timezone} onChange={(e) => change("timezone", e.target.value)}>
              {zones.map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>)}
            </select>
            <small>We send your emails at 9:00 in this time zone.</small>
          </label>
          <p className="small-print">Your email always follows your LinkedIn account. If you change your gender, it applies from the next pairing round.</p>
          <div className="form-actions">
            <button type="button" className="link" onClick={() => { setEditing(false); setValues(me); setErrors({}); }}>Cancel</button>
            <button className="button primary" disabled={state.busy}>{state.busy ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
