// =================== Team data =================== //
const TEAM_MEMBERS = [
  {
    name: "Seung Jae Lieu",
    img: "assets/7_about/seungjae.jpeg",
    role: "PhD Student <br><br> City and Regional Planning",
    bio: `
      <a class="card-link" href="https://www.linkedin.com/in/lsj97/" target="_blank" rel="noopener noreferrer">
        LinkedIn
      </a>
      <br>
      <a class="card-link" href="https://scholar.google.com/citations?user=heHaGWsAAAAJ&hl=en" target="_blank" rel="noopener noreferrer">
        Google Scholar
      </a>
    `,
  },
  {
    name: "Jaegeon Lee",
    img: "assets/7_about/jaegeon.jpeg",
    role: "PhD Student <br><br> City and Regional Planning",
    bio: `
      <a class="card-link" href="https://www.linkedin.com/in/jaegeon-lee-545b5831a/" target="_blank" rel="noopener noreferrer">
        LinkedIn
      </a>
      <br>
      <a class="card-link" href="https://scholar.google.com/citations?user=PlBDHnIAAAAJ&hl=en" target="_blank" rel="noopener noreferrer">
        Google Scholar
      </a>
    `,
  },
  {
    name: "Sungho Synn",
    img: "assets/7_about/sungho.jpeg",
    role: "Master Student <br><br> City and Regional Planning",
    bio: `
      <a class="card-link" href="https://www.linkedin.com/in/sunghosynn/" target="_blank" rel="noopener noreferrer">
        LinkedIn
      </a>
    `,
  },
  {
    name: "Bryce Jones",
    img: "assets/7_about/bryce.jpg",
    role: "Master Student <br><br> City and Regional Planning",
    bio: `
      <a class="card-link" href="https://www.linkedin.com/in/brycetjones/" target="_blank" rel="noopener noreferrer">
        LinkedIn
      </a>
    `,
  },
  {
    name: "Subhrajit Guhathakurta",
    img: "assets/7_about/subhro.jpg",
    role: "Director <br><br> Center for Urban Resilience and Analytics",
    bio: `
      <a class="card-link" href="https://www.linkedin.com/in/subhro-guhathakurta-b04a868/" target="_blank" rel="noopener noreferrer">
        LinkedIn
      </a>
      <br>
      <a class="card-link" href="https://scholar.google.com/citations?user=q6VQWEUAAAAJ&hl=en" target="_blank" rel="noopener noreferrer">
        Google Scholar
      </a>
    `,
  }
];

// =================== Render cards =================== //
function createCardElement(member) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card__inner">
      <div class="card__face card__face--front">
        <div class="card__front-content">
          <img src="${member.img}" alt="${member.name}" class="pp" />
          <h2>${member.name}</h2>
        </div>
      </div>
      <div class="card__face card__face--back">
        <div class="card__content">
          <div class="card__header">
            <h2>${member.name}</h2>
          </div>
          <div class="card__body">
            <h3>${member.role}</h3>
            <p>${member.bio}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  return card;
}

function renderTeamCards() {
  const grid = document.getElementById("team-grid");
  if (!grid) return;

  TEAM_MEMBERS.forEach(member => {
    const cardEl = createCardElement(member);
    grid.appendChild(cardEl);
  });
}

// =================== Flip behavior =================== //
function attachFlipHandlers() {
  document.querySelectorAll(".card__inner").forEach(card => {
    card.addEventListener("click", function () {
      card.classList.toggle("is-flipped");
    });
  });
}

// =================== Init =================== //
// Script is loaded with `defer` in index.html, but we can still be safe:
document.addEventListener("DOMContentLoaded", () => {
  renderTeamCards();
  attachFlipHandlers();
});
