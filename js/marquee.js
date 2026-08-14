(function () {
  function startMarquee(track, direction) {
    if (!track) return;

    var x = 0;
    var speed = 0.28 * (direction < 0 ? -1 : 1);
    var paused = false;
    var strip = track.closest(".score-marquee");

    // Reverse start offset so the opposite-direction track doesn't look empty
    if (direction > 0) {
      var halfStart = track.scrollWidth / 2;
      if (halfStart > 0) x = -halfStart;
    }

    if (strip) {
      strip.addEventListener("mouseenter", function () {
        paused = true;
      });
      strip.addEventListener("mouseleave", function () {
        paused = false;
      });
    }

    function tick() {
      if (!paused) {
        x += speed;
        var half = track.scrollWidth / 2;
        if (half > 0) {
          if (direction < 0 && -x >= half) x += half;
          if (direction > 0 && x >= 0) x -= half;
        }
        track.style.transform = "translate3d(" + x + "px, 0, 0)";
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // Users strip → left; reviews strip → right
  startMarquee(document.querySelector("[data-score-track]"), -1);
  startMarquee(document.querySelector("[data-review-track]"), 1);
})();
