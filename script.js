const revealButton = document.querySelector(".reveal-button");
const matchCard = document.querySelector(".match-card");
const tags = document.querySelectorAll(".tag");

if (revealButton && matchCard) {
  revealButton.addEventListener("click", () => {
    const isHidden = matchCard.classList.toggle("hidden");
    revealButton.setAttribute("aria-expanded", String(!isHidden));
    revealButton.textContent = isHidden ? "Reveal Match" : "Hide Match";
  });
}

tags.forEach((tag) => {
  tag.addEventListener("click", () => {
    tag.classList.toggle("selected");
  });
});
