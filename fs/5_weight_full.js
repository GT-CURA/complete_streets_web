// fs/5_weight_full.js
// Builds Section 5: three workflow panels + one full-mark bar panel

(function(){
  const root = document.getElementById('wa-flow');
  if (!root) return;

  // --------- Helper to create a card ----------
  function card(opts){
    const div = document.createElement('div');
    div.className = 'wa-card ' + (opts.extraClass || '');
    div.innerHTML = `
      <div class="wa-kicker">${opts.kicker || ''}</div>
      <h3 class="wa-title">${opts.title}</h3>
      ${opts.subtitle ? `<p class="wa-subtitle">${opts.subtitle}</p>` : ''}
      ${opts.body || ''}
    `;
    return div;
  }

  // --------- Card 1: Data collection ----------
  const card1Body = `
    <div class="wa-steps">
      <div class="wa-step wa-step-click" data-popup="collect-manuals">
        Collect municipal-level Complete Streets design manuals
      </div>
      <div class="wa-step wa-step-click" data-popup="text-preprocess">
        Text pre-processing
      </div>
      <div class="wa-step wa-step-click" data-popup="extract-sentences">
        Extract sentences containing the eight key street elements
      </div>
    <div class="wa-mini-table">
      <div class="wa-mini-table-header">Output</div>
      <div>Sentence sets for each element containing relevant text references</div>
    </div>

    <!-- Example data sheet illustration -->
    <div class="wa-sheet-stack">
      <div class="wa-sheet back-2"></div>
      <div class="wa-sheet back-1"></div>
      <div class="wa-sheet front">
        <div class="wa-sheet-header">
          <span>N</span><span>Sentence</span>
        </div>
        <div class="wa-sheet-row">
          <span>1</span><span><em>Sidewalk</em> is …</span>
        </div>
        <div class="wa-sheet-row">
          <span>2</span><span>There is … on <em>sidewalk</em>.</span>
        </div>
        <div class="wa-sheet-row">
          <span>⋮</span><span>…</span>
        </div>
        <div class="wa-sheet-row">
          <span>N<sub>a</sub></span><span>This aims to … <em>sidewalk</em> …</span>
        </div>
      </div>
    </div>
  `;

  const card1 = card({
    kicker: 'Step 1',
    title: 'Data collection',
    subtitle: 'Prepare CS documents for text analysis',
    body: card1Body
  });

  // --------- Card 2: Measure contribution score ----------
  const card2Body = `
    <div class="wa-steps">
      <div class="wa-step wa-step-click" data-popup="llm-filter">
        Use an LLM to filter sentences for evaluation suitability
      </div>
      <div class="wa-step wa-step-click" data-popup="zero-shot-scores">
        Apply zero-shot classification to score each sentence's contribution to five CS benefits
      </div>
    </div>
    <div class="wa-mini-table">
      <div class="wa-mini-table-header">Output</div>
      <div>Sentence–benefit matrix (N × 5) with sigmoid-based contribution scores</div>
    </div>

    <!-- Example sentence–benefit matrix illustration -->
    <div class="wa-sheet-stack wa-sheet-stack-matrix">
      <div class="wa-sheet back-2"></div>
      <div class="wa-sheet back-1"></div>
      <div class="wa-sheet front wa-sheet-matrix">
        <div class="wa-sheet-header-matrix">
          <span>N</span>
          <span>Sentence</span>
          <span>B₁</span>
          <span>B₂</span>
          <span>B₃</span>
          <span>B₄</span>
          <span>B₅</span>
        </div>

        <div class="wa-sheet-row-matrix">
          <span>1</span>
          <span>…</span>
          <span>0.01</span>
          <span>0.21</span>
          <span>0.82</span>
          <span>0.02</span>
          <span>0.00</span>
        </div>

        <div class="wa-sheet-row-matrix">
          <span>2</span>
          <span>…</span>
          <span>0.01</span>
          <span>0.81</span>
          <span>0.02</span>
          <span>0.02</span>
          <span>0.00</span>
        </div>

        <div class="wa-sheet-row-matrix">
          <span>⋮</span>
          <span>…</span>
          <span></span><span></span><span></span><span></span><span></span>
        </div>

        <div class="wa-sheet-row-matrix">
          <span>N<sub>b</sub></span>
          <span>…</span>
          <span>0.01</span>
          <span>0.01</span>
          <span>0.72</span>
          <span>0.25</span>
          <span>0.00</span>
        </div>
      </div>
    </div>
  `;

  const card2 = card({
    kicker: 'Step 2',
    title: 'Measure contribution score',
    subtitle: 'Quantify how strongly each sentence supports each benefit',
    body: card2Body
  });

  // --------- Card 3: Calculate element weights ----------
  const card3Body = `
    <div class="wa-steps">
      <div class="wa-step">
        Aggregate contribution scores across all sentences for each element
      </div>
    </div>

    <!-- Example outputs between Step 1 and Step 2 of this card -->
    <div class="wa-step3-examples">
      <!-- 1) Sum of scores by element and benefit -->
      <div class="wa-example-block">
        <div class="wa-example-caption">Sum of scores by element and benefit</div>
        <table class="wa-example-table wa-example-table-wide wa-example-table-sum">
          <thead>
            <tr>
              <th>Element</th>
              <th>B₁</th>
              <th>B₂</th>
              <th>B₃</th>
              <th>B₄</th>
              <th>B₅</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sidewalk</td>
              <td>93</td>
              <td>6</td>
              <td>9</td>
              <td>58</td>
              <td>78</td>
              <td>244</td>
            </tr>
            <tr>
              <td>Street buffer</td>
              <td>16</td>
              <td>2</td>
              <td>37</td>
              <td>11</td>
              <td>61</td>
              <td>127</td>
            </tr>
            <tr>
              <td colspan="7" style="text-align:center;">⋮</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 2) Number of valid sentences per element (stacked below) -->
      <div class="wa-example-block">
        <div class="wa-example-caption">Number of valid sentences per element</div>
        <table class="wa-example-table wa-example-table-wide wa-example-table-n">
          <thead>
            <tr>
              <th>Element</th>
              <th>B₁</th>
              <th>B₂</th>
              <th>B₃</th>
              <th>B₄</th>
              <th>B₅</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sidewalk</td>
              <td>232</td>
              <td>9</td>
              <td>32</td>
              <td>111</td>
              <td>302</td>
              <td>686</td>
            </tr>
            <tr>
              <td>Street buffer</td>
              <td>47</td>
              <td>1</td>
              <td>64</td>
              <td>26</td>
              <td>211</td>
              <td>349</td>
            </tr>
            <tr>
              <td colspan="7" style="text-align:center;">⋮</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="wa-steps">
      <div class="wa-step wa-step-click" data-popup="compute-weights">
        Compute element weights (full marks) by combining 
        <span class="wa-text-blue">total contribution</span> and 
        <span class="wa-text-red">balance across benefits</span>
      </div>
    </div>
  `;


  const card3 = card({
    kicker: 'Step 3',
    title: 'Calculate element weights',
    subtitle: 'Convert contribution scores into full marks for each element',
    body: card3Body
  });

  // --------- Card 4: Full-mark bars ----------
  // Same max values you use in the composite popup bars
  const SCORE_ITEMS = [
    { label: 'Sidewalk',        max: 21.9 },
    { label: 'Street buffer',   max: 18.8 },
    { label: 'Bike lane',       max: 16.4 },
    { label: 'Transit stop',    max: 12.6 },
    { label: 'Median',          max: 9.3  },
    { label: 'POI (amenities)', max: 9.2  },
    { label: 'Street parking',  max: 9.2  },
    { label: 'Vehicular road',  max: 2.6  }
  ];

  const GLOBAL_FULL_MAX = Math.max(...SCORE_ITEMS.map(s => s.max));

  function barColor(val, max){
    if (!isFinite(val) || !isFinite(max) || max <= 0){
      val = 0; max = 1;
    }
    const t = Math.max(0, Math.min(1, val / max));
    const hue = 180 + 30 * t;       // blue → teal as weight increases
    const sat = 85;
    const light = 55;
    return `hsl(${hue} ${sat}% ${light}%)`;
  }

  function fmt(v){
    if (!isFinite(v)) return '0';
    const x = Number(v);
    return x.toFixed(1).replace(/\.0$/, '');
  }

  function buildBarsHTML(){
    return SCORE_ITEMS.map(({label, max}) => {
      const frac = max / GLOBAL_FULL_MAX;
      const trackWidth = 20 + frac * 80;       // 60–100% of column width
      const color = barColor(max, GLOBAL_FULL_MAX);

      return `
        <div class="wa-bar-row">
          <div class="wa-bar-label">${label}</div>
          <div class="wa-bar-track" style="width:${trackWidth}%;">
            <div class="wa-bar-fill" style="width:100%; background:${color};"></div>
          </div>
          <div class="wa-bar-value">${fmt(max)}</div>
        </div>
      `;
    }).join('');
  }

  const card4Body = `
    <div class="wa-bars-wrap">
      ${buildBarsHTML()}
    </div>
  `;

  const card4 = card({
    kicker: 'Full marks',
    title: 'Element weights in the Composite Completeness Score',
    subtitle: 'Relative contribution of each element (0–100 scale, normalized).',
    body: card4Body,
    extraClass: 'wa-card-bars'
  });

  // Append all four cards horizontally
  root.appendChild(card1);
  root.appendChild(card2);
  root.appendChild(card3);
  root.appendChild(card4);
  
  // ---------- Popup logic for Weight Assignment ----------
  const POPUP_CONTENT = {
    'collect-manuals': {
      title: 'Collect municipal-level CS design manuals',
      body: `We collect 73 Complete Streets design guidebooks and plans from multiple municipalities in North America. These include 58 cities, 4 counties, 5 regions, and 6 states.`,
      img: 'assets/5_weight_assignment/collect-manuals.png'
    },
    'text-preprocess': {
      title: 'Text pre-processing',
      body: `Each city has its own design template, so we clean and standardize the manuals (e.g., remove boilerplate text, normalize headings, split into sentences) to ensure that all sentences are evaluated consistently across documents.`
    },
    'extract-sentences': {
      title: 'Extract sentences for the eight key street elements',
      body: `We extract sentences that explicitly mention sidewalks, buffers, bike lanes, transit stops, medians, vehicular lanes, street parking, and amenities. Synonymous terms for each element are also included; for example, <i>bike path</i> is treated as equivalent to <i>bike lane</i>.`
    },
    'llm-filter': {
      title: 'Filter sentences with an LLM',
      body: `Not every sentence that contains a keyword actually defines, recommends, or evaluates a design element. We use a large language model to filter out sentences that are off-topic or purely descriptive, keeping only those suitable for contribution scoring.`
    },
    'zero-shot-scores': {
      title: 'Assess how strongly the sentence identifies benefits with a NLI',
      body: `For each remaining sentence, we apply zero-shot classification (i.e., zero-shot learning for natural language inference) to estimate how strongly it supports each of the five Complete Streets benefits: <em>community</em>, <em>economy</em>, <em>environment</em>, <em>health</em>, and <em>safety</em>, as described in <a href="https://www.smartgrowthamerica.org/knowledge-hub/resources/best-complete-streets-policies-2025-pdf/" target="_blank" style="color:#6ec9ff; text-decoration:none;">Best Complete Streets Policies</a> by the <i><a href="https://www.smartgrowthamerica.org/programs-and-coalitions/national-complete-streets-coalition/" target="_blank" style="color:#6ec9ff; text-decoration:none;">National Complete Streets Coalition</a></i>. The model produces sigmoid scores ranging from 0 to 1 for each benefit, indicating the degree of semantic alignment between a sentence and each benefit description.`,
      img: 'assets/5_weight_assignment/zero-shot-scores.png'
    },
    'compute-weights': {
      title: 'Compute element weights (full marks)',
      body: `To determine the final weight for each element, we consider not only the total sum of contribution scores across benefits but also the number of valid sentences associated with each element. This approach recognizes that both the <strong>overall magnitude of contribution</strong> and the <strong>balance of support across the five benefits</strong> are important. The resulting values are then normalized so that the full marks across all elements sum to 100, producing the final element weights used in the <em>Composite Completeness Score</em>.`,
      img: 'assets/5_weight_assignment/compute-weights.png'
    }
  };

  function setupWaPopup(){
    const overlay = document.getElementById('wa-popup-overlay');
    if (!overlay) return;

    const titleEl = overlay.querySelector('.wa-popup-title');
    const bodyEl  = overlay.querySelector('.wa-popup-body');
    const closeBtn = overlay.querySelector('.wa-popup-close');

    function openPopup(id){
      const info = POPUP_CONTENT[id];
      if (!info) return;
      titleEl.textContent = info.title;
      bodyEl.innerHTML    = info.body;

      const oldImg = overlay.querySelector('.wa-popup-img');
      if (oldImg) oldImg.remove();

      // Add image if defined for this popup
      if (info.img) {
        const img = document.createElement('img');
        img.src = info.img;
        img.alt = info.title;
        img.className = 'wa-popup-img';
        bodyEl.insertAdjacentElement('afterend', img);
      }

      overlay.classList.add('is-visible');
      document.body.classList.add('wa-no-scroll');
    }

    function closePopup(){
      overlay.classList.remove('is-visible');
      document.body.classList.remove('wa-no-scroll');
    }

    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closePopup();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePopup();
    });

    document.querySelectorAll('.wa-step[data-popup]').forEach(step => {
      step.addEventListener('click', () => {
        openPopup(step.dataset.popup);
      });
    });
  }

  // run after DOM is ready for this section
  setupWaPopup();
})();

