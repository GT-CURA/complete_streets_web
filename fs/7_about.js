// =================== About Class =================== //
document.querySelectorAll(".card__inner").forEach(card => {
  card.addEventListener("click", function () {
    card.classList.toggle('is-flipped');
  });
});