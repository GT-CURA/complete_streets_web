// Reveal-on-scroll for page 4 (safe to run multiple times)
(function(){
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  els.forEach(el => io.observe(el));
})();

// Color mapping per element
const COLOR_MAP = {
  "sidewalk":       "#F7D5A2",
  "street-buffer":  "#B7D978",
  "parking":        "#A2C6DB",
  "vehicular":      "#CECDBB",
  "median":         "#7EB0CC",
  "transit-stop":   "#FEE569",
  "bike-lane":      "#C3E275",
  "amenities":      "#EBC4E3"
};

// --- D3 overlay with 8 elements (fixed markers) ---
(function(){
  if (typeof d3 === 'undefined') return;

  const img = document.getElementById('dc-image');
  const imgNext = document.getElementById('dc-image-next');
  const svg = d3.select('#dc-overlay');

  // guard: need both images and the svg overlay
  if (!img || !imgNext || !svg.node()) return;

  // ---- Image swapping config ----
  const IMAGE_MAP = {
    "sidewalk":       "assets/4_street_elements/sidewalk.jpg",
    "street-buffer":  "assets/4_street_elements/street buffer.jpg",
    "parking":        "assets/4_street_elements/street parking.jpg",
    "vehicular":      "assets/4_street_elements/vehicular road.jpg",
    "median":         "assets/4_street_elements/median.jpg",
    "transit-stop":   "assets/4_street_elements/transit stop.jpg",
    "bike-lane":      "assets/4_street_elements/bike lane.jpg",
    "amenities":      "assets/4_street_elements/amenities.jpg"
  };

  // Base image to restore on hover-out
  const BASE_IMAGE_SRC = img.getAttribute('data-base-src') || img.currentSrc || img.src;

  // Preload to avoid flicker
  (function preloadAll(){
    Object.values(IMAGE_MAP).forEach(src => {
      if (!src) return;
      const im = new Image();
      im.src = src;
    });
  })();

  // ---------- Crossfade helper ----------
  function crossfadeTo(newSrc) {
    if (!newSrc) return;
    if (img.src === newSrc) return; // already showing

    // ensure next image starts hidden (no transition jump)
    imgNext.style.transition = 'none';
    imgNext.style.opacity = 0;
    // reflow
    void imgNext.offsetWidth;
    // restore transition for fade
    imgNext.style.transition = 'opacity 0.45s ease';

    imgNext.onload = () => {
      // fade the top image in
      imgNext.style.opacity = 1;

      const onEnd = () => {
        imgNext.removeEventListener('transitionend', onEnd);
        // commit: set base to new, hide next for future swaps
        img.src = newSrc;
        imgNext.style.transition = 'none';
        imgNext.style.opacity = 0;
        imgNext.src = '';
        // re-enable transition next time
        void imgNext.offsetWidth;
        imgNext.style.transition = 'opacity 0.45s ease';
      };
      imgNext.addEventListener('transitionend', onEnd, { once: true });
    };

    imgNext.src = newSrc; // start loading new image
  }

  // --- Glow filter definition (once per SVG) ---
  const defs = svg.append("defs");
  const filter = defs.append("filter")
    .attr("id", "glow")
    .attr("x", "-50%").attr("y", "-50%")
    .attr("width", "200%").attr("height", "200%");
  filter.append("feGaussianBlur")
    .attr("stdDeviation", 3)
    .attr("result", "blur");
  const merge = filter.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  // Marker anchor positions (percent of image)
  const FIXED_POINTS = [
    { id:"sidewalk",      label:"Sidewalk",        xPct:13.961, yPct:90.78  },
    { id:"bike-lane",     label:"Bike lane",       xPct:70.974, yPct:49.925 },
    { id:"amenities",     label:"Amenities",       xPct:80.693, yPct:40.451 },
    { id:"transit-stop",  label:"Transit stop",    xPct:56.818, yPct:22.318 },
    { id:"median",        label:"Median",          xPct:50.150, yPct:34.533 },
    { id:"vehicular",     label:"Vehicular road",  xPct:52.987, yPct:74.579 },
    { id:"street-buffer", label:"Street buffer",   xPct:32.403, yPct:58.942 },
    { id:"parking",       label:"Street parking",  xPct:39.957, yPct:44.687 }
  ];

  function render(){
    if (!img.complete || !img.naturalWidth) return;

    const rect = img.getBoundingClientRect();
    const w = rect.width, h = rect.height;

    svg.attr('width', w).attr('height', h)
       .attr('viewBox', `0 0 ${w} ${h}`);

    const data = FIXED_POINTS.map(p => ({
      ...p,
      x: (p.xPct / 100) * w,
      y: (p.yPct / 100) * h
    }));

    svg.selectAll('g.marker')
      .data(data, d => d.id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('class', 'marker')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .style('cursor', 'pointer')
            // Hover: glow + dim others + crossfade image
            .on('mouseenter', function(event, d){
              const color = COLOR_MAP[d.id] || '#fff';
              const self  = d3.select(this);

              // circle glow
              self.select('circle')
                  .attr('stroke', color)
                  .attr('stroke-width', 4)
                  .attr('filter', 'url(#glow)');

              // dim all other labels, keep this one normal
              svg.selectAll('g.marker').classed('dim', true);
              self.classed('dim', false);

              // swap big image via crossfade
              const src = IMAGE_MAP[d.id];
              if (src) crossfadeTo(src);
            })
            .on('mouseleave', function(){
              const self = d3.select(this);

              // reset glow
              self.select('circle')
                  .attr('stroke', '#333')
                  .attr('stroke-width', 1.5)
                  .attr('filter', null);

              // undim all labels
              svg.selectAll('g.marker').classed('dim', false);

              // restore base image
              crossfadeTo(BASE_IMAGE_SRC);
            })
            // click only opens the side panel
            .on('click', (event, d) => setActiveElement(d.id));

          g.append('circle')
            .attr('r', 8)
            .attr('fill', d => COLOR_MAP[d.id] || "#fff")
            .attr('fill-opacity', 0.25)
            .attr('stroke', "#333")
            .attr('stroke-width', 1.5);

          g.append('text')
            .attr('x', 14)
            .attr('y', 5)
            .style('font-size', '16px')
            .style('pointer-events', 'auto') // label should trigger hover too
            .text(d => d.label);

          return g;
        },
        update => update.attr('transform', d => `translate(${d.x},${d.y})`)
      );
  }

  // Render initially and keep in sync with resizes
  if (!img.complete) {
    img.addEventListener('load', render, { once: true });
  } else {
    render();
  }
  new ResizeObserver(render).observe(img);
  window.addEventListener('resize', render);
})();

// ---------- Dynamic side panel content ----------
const DC_CONTENT = {
  "sidewalk": {
    title: "Sidewalk",
    pill:  "Sidewalk",
    data:  `• Street-level imagery (GSV)`,
    how:   `Run a CV model on street-view frames to detect sidewalk edges and estimate width.`,
    output:`Sidewalk presence, side (L/R), estimated width`,
    link:  "https://doi.org/10.1177/23998083251369602"
  },
  "bike-lane": {
    title: "Bike lane",
    pill:  "Bike lane",
    data:  `• Street-view imagery (two views) + satellite tiles<br>• Training labels for designated vs. protected`,
    how:   `A mid-fusion transformer fuses two GSV views with satellite to classify ‘no lane / designated / protected’.`,
    output:`Bike lane type`,
    link:  "https://example.com/bike-lane"
  },
  "amenities": {
    title: "Amenities",
    pill:  "Amenities",
    data:  `• POI datasets Advan`,
    how:   `Aggregate POIs...`,
    output:`Accessibility scores`,
    link:  "https://example.com/amenities"
  },
  "transit-stop": {
    title: "Transit stop",
    pill:  "Transit stop",
    data:  `• GTFS <br> • GSVs`,
    how:   ``,
    output:`Stop presence, shelter flag, and service frequency bucket.`,
    link:  "https://example.com/transit"
  },
  "median": {
    title: "Median",
    pill:  "Median",
    data:  `• GDOT`,
    how:   `-`,
    output:`Median presence`,
    link:  "https://example.com/median"
  },
  "vehicular": {
    title: "Vehicular road",
    pill:  "Vehicular road",
    data:  `• GDOT`,
    how:   `-`,
    output:`Lane count`,
    link:  "https://example.com/vehicular"
  },
  "street-buffer": {
    title: "Street buffer",
    pill:  "Street buffer",
    data:  `• Street-view segmentation`,
    how:   `Detect buffer...`,
    output:`Buffer presence, and width`,
    link:  "https://example.com/street-buffer"
  },
  "parking": {
    title: "Street parking",
    pill:  "Street parking",
    data:  `• GSV`,
    how:   `2 Approches.`,
    output:`Parking presence, side, and restriction class`,
    link:  "https://example.com/parking"
  }
};

// Cache DOM (guard if any missing)
const panelEl = document.getElementById('dc-panel');
const titleEl = document.getElementById('panel-title');
const accEl   = document.getElementById('dc-accordion');
const linkEl  = document.getElementById('panel-link');

if (panelEl && titleEl && accEl && linkEl) {
  clearPanel();

  function clearPanel(){
    panelEl.classList.add('is-empty');
    titleEl.textContent = "";
    const dataP = accEl.querySelector('.acc-panel[data-k="data"]');
    const howP  = accEl.querySelector('.acc-panel[data-k="how"]');
    const outP  = accEl.querySelector('.acc-panel[data-k="output"]');
    if (dataP) dataP.innerHTML = "";
    if (howP)  howP.innerHTML  = "";
    if (outP)  outP.innerHTML  = "";
    linkEl.classList.add('disabled');
    linkEl.href = "#";
    closeAllAccordion();
  }

  // Fill accordion for a given element id
  window.setActiveElement = function(id){
    const c = DC_CONTENT[id];
    if (!c) return;

    panelEl.classList.remove('is-empty');
    titleEl.textContent = c.title;

    const dataP = accEl.querySelector('.acc-panel[data-k="data"]');
    const howP  = accEl.querySelector('.acc-panel[data-k="how"]');
    const outP  = accEl.querySelector('.acc-panel[data-k="output"]');
    if (dataP) dataP.innerHTML = c.data || "";
    if (howP)  howP.innerHTML  = c.how || "";
    if (outP)  outP.innerHTML  = c.output || "";

    if (c.link) {
      linkEl.href = c.link;
      linkEl.classList.remove('disabled');
    } else {
      linkEl.href = "#";
      linkEl.classList.add('disabled');
    }

    // open the first accordion item
    closeAllAccordion();
    const first = accEl.querySelector('.acc-item');
    if (first){
      first.classList.add('open');
      adjustPanelMaxHeight(first);
    }
  };

  // Accordion behavior: only one open
  accEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.acc-btn');
    if (!btn) return;

    const item = btn.closest('.acc-item');
    if (item.classList.contains('open')) {
      item.classList.remove('open');
      const p = item.querySelector('.acc-panel');
      if (p) p.style.maxHeight = null;
      return;
    }

    closeAllAccordion();
    item.classList.add('open');
    adjustPanelMaxHeight(item);
  });

  function closeAllAccordion(){
    accEl.querySelectorAll('.acc-item').forEach(it => {
      it.classList.remove('open');
      const p = it.querySelector('.acc-panel');
      if (p) p.style.maxHeight = null;
    });
  }

  function adjustPanelMaxHeight(item){
    const p = item.querySelector('.acc-panel');
    if (!p) return;
    p.style.maxHeight = p.scrollHeight + 'px';
  }
}
