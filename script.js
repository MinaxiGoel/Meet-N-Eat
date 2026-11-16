// Static design preview interactions (the real app is in frontend/).
document.querySelectorAll("[data-show]").forEach((b) => b.addEventListener("click", (e) => {
  e.preventDefault(); document.getElementById("join").hidden = true; document.getElementById(b.dataset.show).hidden = false;
}));
document.querySelectorAll(".chip input").forEach((input) => input.addEventListener("change", () => {
  input.closest(".chips").querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.contains(input)));
}));
const counter = document.querySelector(".counter");
document.querySelector("textarea")?.addEventListener("input", (e) => { if (counter) counter.textContent = e.target.value.length + "/200"; });
document.querySelector("[data-reveal]")?.addEventListener("click", (e) => {
  e.target.textContent = "Turning the plate…"; setTimeout(() => document.querySelector(".flip").classList.add("flipped"), 250);
});
document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.classList.contains("panel-" + b.dataset.tab)));
  window.scrollTo({ top: 0 });
}));
const menuButton = document.querySelector("[data-menu]");
const menu = document.querySelector(".menu");
menuButton?.addEventListener("click", () => { menu.hidden = !menu.hidden; });
document.addEventListener("pointerdown", (e) => { if (menu && !menu.hidden && !e.target.closest(".profile-menu")) menu.hidden = true; });
document.querySelector("[data-refer]")?.addEventListener("click", (e) => { e.currentTarget.firstChild.textContent = "Link copied! ✅ "; });
document.querySelectorAll(".option input").forEach((input) => input.addEventListener("change", () => {
  document.querySelectorAll(".option").forEach((o) => o.classList.toggle("on", o.contains(input)));
}));
document.querySelector("[data-save]")?.addEventListener("click", () => { document.querySelector("[data-saved]").hidden = false; });
document.querySelector(".banner button")?.addEventListener("click", (e) => e.target.closest(".banner").remove());
