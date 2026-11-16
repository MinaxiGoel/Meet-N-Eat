"use client";

import { GENDERS } from "@/lib/validate";

// Shared by sign-up and Edit profile.
export default function ProfileFields({ values, errors, onChange }) {
  const field = (name, label, props = {}) => (
    <label className={`field${errors[name] ? " has-error" : ""}`}>
      <span className="field-label">{label}</span>
      <input
        name={name}
        value={values[name] || ""}
        onChange={(e) => onChange(name, e.target.value)}
        aria-invalid={Boolean(errors[name])}
        {...props}
      />
      {props.hint && !errors[name] && <small>{props.hint}</small>}
      {errors[name] && <small className="error">{errors[name]}</small>}
    </label>
  );
  const funLength = (values.funFacts || "").length;

  return (
    <>
      <div className="field-row">
        {field("firstName", "First name", { autoComplete: "given-name", maxLength: 50, required: true })}
        {field("lastName", "Last name", { autoComplete: "family-name", maxLength: 50, required: true })}
      </div>

      <fieldset className={`field${errors.gender ? " has-error" : ""}`}>
        <legend className="field-label">Gender</legend>
        <div className="chips">
          {GENDERS.map((g) => (
            <label key={g.value} className={`chip${values.gender === g.value ? " on" : ""}`}>
              <input
                type="radio" name="gender" value={g.value}
                checked={values.gender === g.value}
                onChange={() => onChange("gender", g.value)}
              />
              {g.label}
            </label>
          ))}
        </div>
        {errors.gender ? <small className="error">{errors.gender}</small>
          : <small>We’ll pair you with someone who chose the same option.</small>}
      </fieldset>

      {field("jobTitle", "Current role", { placeholder: "e.g. Product Designer", maxLength: 80, required: true, autoComplete: "organization-title" })}
      {field("company", "Company", { placeholder: "e.g. Lumen Labs", maxLength: 80, required: true, autoComplete: "organization" })}
      {field("linkedinUrl", "LinkedIn profile link", {
        placeholder: "linkedin.com/in/your-name", inputMode: "url", required: true,
        hint: "So your match can find you.",
      })}

      <label className={`field${errors.funFacts ? " has-error" : ""}`}>
        <span className="field-label">Any fun, cool things about you?</span>
        <textarea
          name="funFacts" rows={3} maxLength={200} required
          placeholder="I’m a pet lover, play badminton, and I’m a coffee person ☕"
          value={values.funFacts || ""}
          onChange={(e) => onChange("funFacts", e.target.value)}
          aria-invalid={Boolean(errors.funFacts)}
        />
        <span className="field-foot">
          {errors.funFacts ? <small className="error">{errors.funFacts}</small> : <small>Your match will see this.</small>}
          <small className="counter">{funLength}/200</small>
        </span>
      </label>
    </>
  );
}
