// Side menu: active-group highlight + smooth scrolling + section tracking
(function(){
  const nav     = document.querySelector('.nav');
  const main    = document.querySelector('main');
  const links   = Array.from(document.querySelectorAll('.nav a'));

  if(!nav || !main || links.length === 0) return;

  // Map each section ID to a logical group
  const SECTION_GROUP = {
    overview:     'overview',      // 1st page (Cover)
    methodology:  'overview',      // 2nd page (Research Objective)
    mapbox:       'overview',      // 3rd page (Map)
    s4:           'method',        // 4th page (Data collection)
    s5:           'method',        // 5th page (Weight assignment 1)
    s6:           'method',        // 6th page (Weight assignment 2)
    about:        'about'          // last page (about)
  };

  // For quick lookup of which nav <a> to activate per group
  const LINK_FOR_GROUP = {
    overview: links.find(a => a.dataset.key === 'overview'),
    method:   links.find(a => a.dataset.key === 'method'),
    about:    links.find(a => a.dataset.key === 'about')
  };

  // Smooth scroll
  links.forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if(!href || !href.startsWith('#')) return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      if(!target) return;

      e.preventDefault();
      // Scroll within the nearest scrollable container (window or <main>)
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Update URL hash without jumping
      history.pushState(null, '', href);
    });
  });

  // Helper to set active group (updates nav class & link active state)
  let currentGroup = null;

  function setActiveGroup(group){
    if(group === currentGroup) return;
    currentGroup = group;

    // Remove any previous group class
    nav.classList.remove('overview-active', 'method-active', 'about-active');

    if(group === 'overview') nav.classList.add('overview-active');
    else if(group === 'method') nav.classList.add('method-active');
    else if(group === 'about') nav.classList.add('about-active');

    // Toggle .active on links + aria-current
    links.forEach(a => {
      const isActive = (a === LINK_FOR_GROUP[group]);
      a.classList.toggle('active', isActive);
      if(isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  // Observe which section is most visible
  const sections = Array.from(document.querySelectorAll('main > section[id]'));

  // Decide the root for IntersectionObserver
  const cs = getComputedStyle(main);
  const isMainScrollable = ['auto', 'scroll', 'overlay'].includes(cs.overflowY);
  const ioRoot = isMainScrollable ? main : null;

  let visibleRatios = new Map();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      if(!SECTION_GROUP[id]) return;
      if(entry.isIntersecting){
        visibleRatios.set(id, entry.intersectionRatio);
      }else{
        visibleRatios.delete(id);
      }
    });

    // Pick the section with the highest intersection ratio
    let topId = null, topRatio = 0;
    visibleRatios.forEach((ratio, id) => {
      if(ratio > topRatio){ topRatio = ratio; topId = id; }
    });

    if(topId){
      setActiveGroup(SECTION_GROUP[topId]);
    }
  }, {
    root: ioRoot,
    threshold: buildThresholds()
  });

  sections.forEach(sec => observer.observe(sec));

  // Initialize on load (use hash or first section)
  window.addEventListener('load', () => {
    const fromHash = location.hash && location.hash.slice(1);
    const id = fromHash && SECTION_GROUP[fromHash] ? fromHash : (sections[0]?.id || 'overview');
    setActiveGroup(SECTION_GROUP[id]);
  });

  // Utility: dense thresholds for steadier "most visible" choice
  function buildThresholds(){
    const t = [];
    for(let i=0;i<=20;i++) t.push(i/20);
    return t;
  }
})();
