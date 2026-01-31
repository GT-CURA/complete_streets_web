// fs/6_score_criteria.js
document.addEventListener("DOMContentLoaded", () => {
  const textEl = document.getElementById("sc-text");
  const tableWrap = document.getElementById("sc-table-wrap");
  if (!textEl || !tableWrap) return;

  // ---- Intro text -------------------------------------------------
  const intro = `
    Each attribute value is converted to its corresponding score range of <strong>0&nbsp;–&nbsp;(full marks)</strong>, proportionally based on its observed range and capped at the full marks. These ranges were defined using a hybrid approach that combines empirical data from five benchmark US cities with design thresholds drawn from municipal and federal street design manuals. The table below summarizes the scoring criteria for all eight elements used in the composite score.
  `;
  textEl.innerHTML = intro.trim();

  // ---- Data for rows ----------------------------------------------
  const rows = [
    {
      element: "Sidewalk",
      presence: `Both sides<sup class="footnote-mark">*</sup>`,
      attribute: "Width",
      rule: `Wider sidewalk → higher score <span class="rule-note">(> 5 meters: 10.45 for each side)</span>`,
      fullMark: "21.9",
      popup: `
        For each side of the street, we calculate a score based on sidewalk width. The score increases as sidewalks get wider, up to a threshold of 5 meters (widths above 5 meters always receive the full marks). Scores from both sides are then summed.
        <br>
        <ul>
          <li><span class="equation">Score per side = (width / 5 m) × 10.45</span>, capped at 10.45</li>
          <li>Two sufficiently wide sidewalks can earn up to 21.9 in total</li>
        </ul>
        <br>
        To determine this threshold, we collected ground-truth sidewalk widths from both sides of street segment midpoints across five highly walkable U.S. cities. We then aggregated these measurements and set the 95th percentile value as the maximum threshold. The figure below shows the resulting distribution of sideawlk widths across the five cities (N = 150,395 road segments with a sidewalk present).
        <br><br>
        <div class="sc-svg-wrap">
          <img src="assets/6_score_criteria/sidewalk.png"
              alt="Sidewalk width distribution"
              style="width:100%; max-width:800px; border-radius:8px;" />
        </div>
      `
    },
    {
      element: "Street buffer",
      presence: `Both sides<sup class="footnote-mark">*</sup>`,
      attribute: "Width",
      rule: `Wider buffer → higher score <span class="rule-note">(> 2.5 meters: 9.4 for each side)</span>`,
      fullMark: "18.8",
      popup: `
        For each side of the street, we calculate a score based on street buffer width. The score increases as buffer get wider, up to a threshold of 2.5 meters (widths above 2.5 meters always receive the full marks). Scores from both sides are then summed.
        <br>
        <ul>
          <li><span class="equation">Score per side = (width / 2.5 m) × 9.4</span>, capped at 9.4</li>
          <li>Two sufficiently wide street buffers can earn up to 18.8 in total</li>
        </ul>
        <br>
        To determine this threshold, we collected ground-truth street buffer widths from both sides of points sampled every 20 meters along all street segments in Washington D.C., and set the 90th percentile value as the maximum threshold. The figure below shows the distribution of street buffer widths (N = 48,403 points with a street buffer present).
        <br><br>
        <div class="sc-svg-wrap">
          <img src="assets/6_score_criteria/street_buffer.png"
              alt="Street buffer width distribution"
              style="width:100%; max-width:800px; border-radius:8px;" />
        </div>
      `
    },
    {
      element: "Bike lane",
      presence: "Centerline",
      attribute: "Type",
      rule: `Protected <span class="rule-note">(16.4)</span> &gt; Designated <span class="rule-note">(8.2)</span> &gt; None <span class="rule-note">(0)</span>`,
      fullMark: "16.4",
      popup: `
        For each street, we assign a score based on the presence and type of bike lane. A street with a protected bike lane receives the full score of 16.4; a street with a designated lane but without protection receives half the score (8.2); and a street with no bike lane receives 0.
        <br><br>
        To determine these weights, we referred to the methodology used in calculating the widely used Bike Score®, which assigns twice the weight for bike lanes (equivalent to designated lanes) and three times the weight for bike paths (equivalent to protected lanes). We also reviewed recent empirical studies that estimate the safety impacts of different types of bike infrastructure using crash and near-miss data. The table below summarizes these references.
        <br><br>
        <div class="sc-subtable-wrap">
          <table class="sc-subtable">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Note</th>
                <th>None / Shared</th>
                <th>Designated</th>
                <th>Protected</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a class="popup-link" href="https://www.walkscore.com/bike-score-methodology.shtml" target="_blank">
                    Bike Score®
                  </a>
                </td>
                <td>Weights are assigned based on the value of safety and comport each type of lane provides to bicycle users</td>
                <td>x1</td>
                <td>x2</td>
                <td>x3</td>
              </tr>
              <tr>
                <td>
                  <a class="popup-link" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3519333/" target="_blank">
                    Teschke et al. (2012)
                  </a>
                </td>
                <td>The odds ratio of being injured decreases to 0.53 in designated bike lanes compared to the reference category of no bike lane</td>
                <td>1.00</td>
                <td>0.53</td>
                <td>–</td>
              </tr>
              <tr>
                <td>
                  <a class="popup-link" href="https://rosap.ntl.bts.gov/view/dot/71847" target="_blank">
                    FHWA (2023)
                  </a>
                </td>
                <td>Converting traditional bike lanes to separate bike lanes reduces crash risk to 44-64</td>
                <td>–</td>
                <td>100&#37;</td>
                <td>44–64&#37;</td>
              </tr>
              <tr>
                <td>
                  <a class="popup-link" href="https://hdl.handle.net/1853/73164" target="_blank">
                    Hwang (2023)
                  </a>
                </td>
                <td>Protected bike lanes can nearly halve the incidence rate ratio of near misses compared to the reference category of no bike lane</td>
                <td>100&#37;</td>
                <td>111&#37;</td>
                <td>48&#37;</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
    },
    {
      element: "Transit stop",
      presence: "Within a walkshed",
      attribute: "Accessibility score",
      rule: `Higher accessibility → higher score <span class="rule-note">(> 22 accessibility score: 12.6)</span>`,
      fullMark: "12.6",
      popup: `
        For each street, we calculate a score based on its accessibility to nearby transit stops. The score increases as accessibility improves, up to a threshold of 22 (values above 22 always receive the full marks).
        <br>
        <ul>
          <li><span class="equation">Score = (accessibility score / 22) × 12.6</span>, capped at 12.6</li>
        </ul>
        <br>
        To determine this threshold, we collected real-world accessibility scores from all street segments across five highly transit-friendly U.S. cities. We then aggregated these distributions and used the 90th percentile value as the maximum threshold. The figure below shows the resulting distribution of accessibility scores across the five cities.
        <br><br>
        <div class="sc-svg-wrap">
          <img src="assets/6_score_criteria/transit.png"
              alt="Transit accessibility distribution"
              style="width:100%; max-width:800px; border-radius:8px;" />
        </div>
      `
    },
    {
      element: "Median",
      presence: "Centerline",
      attribute: "<em>NA</em>",
      rule: `Existing <span class="rule-note">(9.3)</span>; None <span class="rule-note">(0)</span>`,
      fullMark: "9.3",
      popup: `
        Since this element does not have an attribute-based scale, its score is assigned as a simple binary indicator. If a street segment is identified as having a median, it receives the full marks (9.3); otherwise, it receives 0.
      `
    },
    {
      element: "POI (amenities)",
      presence: "Within a walkshed",
      attribute: "Accessibility score",
      rule: `Higher accessibility → higher score <span class="rule-note">(> 2.5 accessibility score: 9.2)</span>`,
      fullMark: "9.2",
      popup: `
        For each street, we calculate a score based on its accessibility to nearby amenities. The score increases as accessibility improves, up to a threshold of 2.5 (values above 2.5 always receive the full marks).
        <br>
        <ul>
          <li><span class="equation">Score = (accessibility score / 2.5) × 9.2</span>, capped at 9.2</li>
        </ul>
        <br>
        To determine this threshold, we collected real-world accessibility scores from 10% of all street segments across five highly walkable U.S. cities. We then aggregated these distributions and used the 90th percentile value as the maximum threshold. The figure below shows the resulting distribution of accessibility scores across the five cities.
        <br><br>
        <div class="sc-svg-wrap">
          <img src="assets/6_score_criteria/poi.png"
              alt="POI accessibility distribution"
              style="width:100%; max-width:800px; border-radius:8px;" />
        </div>
      `
    },
    {
      element: "Street parking",
      presence: `Both sides<sup class="footnote-mark">*</sup>`,
      attribute: "<em>NA</em>",
      rule: `Existing <span class="rule-note">(4.6 for each side)</span>; None <span class="rule-note">(0)</span>`,
      fullMark: "9.2",
      popup: `
        Since this element does not have an attribute-based scale, its score is assigned as a simple binary indicator. For each side of the street, if parking is present, that side receives half of the full marks (4.6); otherwise, it receives 0. Scores from both sides are then summed.
      `
    },
    {
      element: "Vehicular road",
      presence: "Centerline",
      attribute: "Number of lanes",
      rule: `Closer to standard<sup class="footnote-mark">**</sup> → higher score`,
      fullMark: "2.6",
      popup: `
        For each street, we assign a score based on how closely its number of vehicular lanes matches the reference value for its corresponding road type. Segments that align with the reference receive the full marks, while segments that deviate receive proportionally lower scores.
        <br>
        <ul>
          <li><span class="equation">Score = 2.6 - (0.8 × | number of lanes - reference value |)</span>; if the absolute difference is 3 or more, the score is set to 0</li>
          <li>A street segment earns the full score (2.6) when its number of lanes matches the reference value</li>
        </ul>
        <br>
        To determine this threshold, we collected ground-truth lane counts for four 
        <a href="https://wiki.openstreetmap.org/wiki/Key:highway" target="_blank" style="color:#6ec9ff; text-decoration:none;">
          OSM-defined road types
        </a>
        across road segments in five highly walkable U.S. cities. We then aggregated these measurements by road type and defined the reference value as the rounded mean number of lanes.
        <br><br>
        <div class="sc-svg-wrap">
          <img src="assets/6_score_criteria/road.png"
              alt="POI accessibility distribution"
              style="width:100%; max-width:800px; border-radius:8px;" />
        </div>
      `
    }
  ];

  const footnoteHTML = `
    <p class="sc-footnote">
      * For elements present on both sides (e.g., sidewalks, buffers, parking), scores are calculated separately per side and then summed.<br>
      ** Standard lane count = 4 for trunk/primary/secondary roads, 3 for tertiary roads.
    </p>
  `;

  // ---- Build table -----------------------------------------------
  const table = document.createElement("table");
  table.className = "sc-table";

  // Header
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Element</th>
      <th>Presence</th>
      <th>Attributes</th>
      <th>Score Range</th>
      <th>Full Marks</th>
    </tr>
  `;
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.element}</td>
      <td>${r.presence}</td>
      <td>${r.attribute}</td>
      <td class="sc-click" data-popup="${encodeURIComponent(r.popup || '')}">
        ${r.rule}
      </td>
      <td>${r.fullMark}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  // Append to wrapper and add footnote
  tableWrap.innerHTML = "";
  tableWrap.appendChild(table);
  tableWrap.insertAdjacentHTML("afterend", footnoteHTML.trim());

  // ---- Popup logic (run AFTER table exists) -----------------------
  const scOverlay = document.getElementById("sc-popup-overlay");
  if (!scOverlay) return;

  const scTitle = scOverlay.querySelector(".wa-popup-title");
  const scBody  = scOverlay.querySelector(".wa-popup-body");
  const scClose = scOverlay.querySelector(".wa-popup-close");

  function scOpenPopup(title, html) {
    if (!scTitle || !scBody) return;
    scTitle.textContent = title;
    scBody.innerHTML = html;

    scOverlay.classList.add("is-visible");       // match CSS
    document.body.classList.add("wa-no-scroll"); // lock scroll (same as WA)
  }

  function scClosePopup() {
    scOverlay.classList.remove("is-visible");
    document.body.classList.remove("wa-no-scroll");
  }

  if (scClose) {
    scClose.addEventListener("click", scClosePopup);
  }

  scOverlay.addEventListener("click", (e) => {
    if (e.target === scOverlay) scClosePopup();
  });

  // Attach click handlers to “Score Range” column
  document.querySelectorAll(".sc-click").forEach((td) => {
    td.addEventListener("click", () => {
      const tr = td.closest("tr");
      if (!tr) return;
      const title = tr.querySelector("td:first-child")?.textContent.trim() || "Score rule";
      const popupHTML = decodeURIComponent(td.dataset.popup || "");

      if (popupHTML) {
        scOpenPopup(title, popupHTML);
      }
    });
  });
});
