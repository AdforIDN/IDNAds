// Simple GPT and Prebid Manager
let adUnits = [];
let REFRESH_INTERVAL = 30; // seconds

// Basic GPT Setup
window.googletag = window.googletag || { cmd: [] };
window.pbjs = window.pbjs || { que: [] };

// Setup Ad Slots
function initGPT() {
  document.querySelectorAll('.ad-slot').forEach((div, index) => {
    const adUnitPath = div.dataset.adUnit;
    const sizes = JSON.parse(div.dataset.sizes);
    const keywords = div.dataset.keywords.split(',');

    googletag.cmd.push(function () {
      const slot = googletag.defineSlot(adUnitPath, sizes, div.id)
        .addService(googletag.pubads());

      keywords.forEach(keyword => {
        slot.setTargeting('keyword', keyword);
      });

      adUnits.push({ id: div.id, slot: slot });
    });
  });

  googletag.cmd.push(function () {
    googletag.pubads().enableSingleRequest();
    googletag.pubads().collapseEmptyDivs();
    googletag.enableServices();
  });
}

// Request Bids and Display Ad
function requestBidsAndDisplay(divId) {
  pbjs.que.push(function () {
    pbjs.requestBids({
      adUnitCodes: [divId],
      bidsBackHandler: function() {
        googletag.cmd.push(function() {
          pbjs.setTargetingForGPTAsync([divId]);
          googletag.display(divId);
        });
      }
    });
  });
}

// Ad Refresh
function refreshAds() {
  setInterval(() => {
    adUnits.forEach(({ id, slot }) => {
      pbjs.que.push(function() {
        pbjs.requestBids({
          adUnitCodes: [id],
          bidsBackHandler: function() {
            googletag.cmd.push(function() {
              pbjs.setTargetingForGPTAsync([id]);
              googletag.pubads().refresh([slot]);
            });
          }
        });
      });
    });
  }, REFRESH_INTERVAL * 1000);
}

// Fallback ads if no fill
function setupFallback() {
  googletag.pubads().addEventListener('slotRenderEnded', function(event) {
    if (!event.isEmpty) return;
    const div = document.getElementById(event.slot.getSlotElementId());
    if (div) {
      fetch('./ads/fallback-ad.html')
        .then(response => response.text())
        .then(html => {
          div.innerHTML = html;
        });
    }
  });
}

// Infinite Scroll Demo
function setupInfiniteScroll() {
  window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
      const newArticle = document.createElement('div');
      newArticle.innerHTML = `
        <div style="height:600px;">New Article Loaded...</div>
        <div id="ad-slot-${Date.now()}" class="ad-slot" data-ad-unit="/123456789/example-banner" data-sizes="[[300,250]]" data-keywords="news,update"></div>
      `;
      document.getElementById('articles').appendChild(newArticle);
      setTimeout(() => {
        initGPT();
        requestBidsAndDisplay(newArticle.querySelector('.ad-slot').id);
      }, 500);
    }
  });
}

// Initialize All
window.addEventListener('load', function() {
  initGPT();
  setupFallback();
  setupInfiniteScroll();
  adUnits.forEach(({ id }) => requestBidsAndDisplay(id));
  refreshAds();
});
