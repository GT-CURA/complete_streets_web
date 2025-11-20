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
    data: `
      <ol style="margin:0; padding-left:18px;">
        <li>For one side of the road, two street view images with different pitch angles (0° and −10°)</li>
      </ol>`,
    how: `
      <ol style="margin:0; padding-left:18px;">
        <li>Capture two street view images perpendicular to the road direction</li>
        <li>Apply semantic segmentation and Canny edge detection to extract sidewalk top and bottom edges</li>
        <li>Use trigonometric functions to calculate sidewalk width</li>
        <li>For cases where sidewalk edges are not correctly detected via the deep learning model, use a manual annotation tool to complement</li>
      </ol>
      <div style="margin-top:8px;">
        Find out more details on calculating sidewalk width <a href="https://doi.org/10.1177/23998083251369602" target="_blank" style="color:#03A9F4; text-decoration:underline;">here</a>.
      </div>`,
    output: `Sidewalk presence and estimated width`,
    link: "https://github.com/GT-CURA/complete_streets/tree/main/step2_elements/sidewalk"
  },
  "bike-lane": {
    title: "Bike lane",
    pill:  "Bike lane",
    data: `
      <ol style="margin:0; padding-left:18px;">
        <li>Two opposite direction street view images and one co-located aerial image</li>
        <li>Pretrained model for bike lane detection and classification</li>
      </ol>`,
    how: `
      <ol style="margin:0; padding-left:18px;">
        <li>Download three co-located images for each road segment point</li>
        <li>Apply the pretrained model to identify bike lane presence and type</li>
      </ol>
      <div style="margin-top:8px;">
        Find out how we trained the model <a href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5599538" target="_blank" style="color:#03A9F4; text-decoration:underline;">here</a>.
      </div>`,
    output: `No bike lane, designated, or protected`,
    link: "https://github.com/GT-CURA/complete_streets/tree/main/step2_elements/bike_lane"
  },
  "amenities": {
    title: "Amenities",
    pill:  "Amenities",
    data: `
      <ol style="margin:0; padding-left:18px;">
        <li>POI datasets, including coordinates, NAICS code, and operating hour information</li>
        <li>Table showing amenity weights for each type (based on NAICS codes)</li>
      </ol>`,
    how: `
      <ol style="margin:0; padding-left:18px;">
        <li>Generate a walkshed around each target road segment</li>
        <li>Identify POIs within each walkshed that support daily needs</li>
        <li>Compute amenity weights using three components: popularity (average monthly visits), intensity (average dwell time), and operating hours</li>
        <li>Derive a composite accessibility score for each road segment, accounting for both amenity density and segment length</li>
      </ol>`,
    output: `A composite accessibility score`,
    link: "https://github.com/GT-CURA/complete_streets/tree/main/step2_elements/amenities"
  },
  "transit-stop": {
    title: "Transit stop",
    pill:  "Transit stop",
    data: `
      <ol style="margin:0; padding-left:18px;">
        <li>GTFS files</li>
      </ol>`,
    how: `
      <ol style="margin:0; padding-left:18px;">
        <li>Load and merge GTFS feeds</li>
        <li>Calculate stop significance using route diversity, connectivity, service frequency, and amenity quality</li>
        <li>Calculate the street-level transit accessibility score by combining stop significance scores</li>
      </ol>`,
    output: `Street-level transit accessibility metrics`,
    link:  "https://github.com/GT-CURA/complete_streets/tree/main/step2_elements/transit_stop"
  },
  "median": {
    title: "Median",
    pill:  "Median",
    data: `
      <ol style="margin:0; padding-left:18px;">
        <li>A GeoJSON file containing road LineString geometries</li>
      </ol>`,
    how: `
      <ol style="margin:0; padding-left:18px;">
        <li>Retrieve nearby road geometries using OSMnx</li>
        <li>For single-carriageway roads, assign <em>no</em> to indicate the absence of a physical median</li>
        <li>For dual-carriageway roads, assign <em>yes</em> to indicate the presence of a physical median separating two parallel, opposite-direction segments</li>
      </ol>`,
    output: `A label indicating whether a road segment contains a median`,
    link:  "https://github.com/GT-CURA/complete_streets/tree/main/step2_elements/median"
  },
  "vehicular": {
    title: "Vehicular road",
    pill:  "Vehicular road",
    data: `
      <ol style="margin:0; padding-left:18px;">
        <li>A GeoJSON file containing road LineString geometries</li>
      </ol>`,
    how: `
      <ol style="margin:0; padding-left:18px;">
        <li>Retrieve nearby road geometries using OSMnx.</li>
        <li>For single-carriageway roads, determine the number of lanes based on the narrowest portion of the segment</li>
        <li>For dual-carriageway roads, determine the lane count for each direction at the narrowest portion and sum them to obtain the total number of vehicular lanes</li>
      </ol>`,
    output: `The total number of vehicular lanes assigned to each road segment`,
    link:  "https://github.com/GT-CURA/complete_streets/tree/main/step2_elements/vehicular_road"
  },
  "street-buffer": {
    title: "Street buffer",
    pill:  "Street buffer",
    data: `
      <ol style="margin:0; padding-left:18px;">
        <li>For one side of the road, two street view images with different pitch angles (0° and −10°)</li>
      </ol>`,
    how: `
      <ol style="margin:0; padding-left:18px;">
        <li>Capture two street view images perpendicular to the road direction</li>
        <li>Apply semantic segmentation and Canny edge detection to extract the sidewalk bottom edge and road edge</li>
        <li>Use trigonometric functions to calculate street buffer width</li>
        <li>For cases where sidewalk or road edges are not correctly detected via the deep learning model, use a manual annotation tool to complement</li>
      </ol>`,
    output: `Street buffer presence and estimated width`,
    link:  "https://github.com/GT-CURA/complete_streets/tree/main/step2_elements/street_buffer"
  },
  "parking": {
    title: "Street parking",
    pill:  "Street parking",
    data: `
      <ol style="margin:0; padding-left:18px;">
        <li>For each side of the road, six Google Street View images at approximately 10-meter intervals</li>
      </ol>`,
    how: `
      <ol style="margin:0; padding-left:18px;">
        <li>Detect parking signs using a fine-tuned YOLO object detection model</li>
        <li>Detect vehicles and classify them as stationary or moving using YOLO instance segmentation combined with geometric projection</li>
        <li>Use trigonometric functions to calculate street buffer width</li>
        <li>Merge sign and vehicle detections to classify each road segment as <em>Parking</em> or <em>No Parking</em></li>
      </ol>`,
    output: `Street parking presence`,
    link:  "https://github.com/GT-CURA/complete_streets/tree/main/step2_elements/street_parking"
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
