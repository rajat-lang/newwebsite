const pillars = [...document.querySelectorAll("[data-pillar]")];
const modes = [...document.querySelectorAll("[data-deck] .mode")];
const nav = document.querySelector(".nav");
const storySection = document.querySelector(".story");
const scenes = [...document.querySelectorAll("[data-scene]")];
const storySteps = [...document.querySelectorAll(".story-step")];
const scoreDisplay = document.querySelector("[data-score-display]");
const deckShell = document.querySelector("[data-deck]");
const deckBack = document.querySelector("[data-deck-back]");
const ctaShell = document.querySelector("[data-cta-deck]");
const ctaBack = document.querySelector("[data-cta-back]");

let activePillar = 0;
let pillarTimer;

/* ---------- Nav scroll state ---------- */
function onScrollNav() {
  nav?.classList.toggle("is-scrolled", window.scrollY > 12);
}
window.addEventListener("scroll", onScrollNav, { passive: true });
onScrollNav();

/* ---------- Hero pillars ---------- */
const PILLAR_CYCLE_MS = 3600;
const PILLAR_ANIM_MS = 2400;
let pillarAnimCancel = null;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function runTween(duration, onUpdate) {
  let raf = 0;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    onUpdate(easeOutCubic(t), t);
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function mixHex(a, b, t) {
  const parse = (hex) => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const to = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${to(ar + (br - ar) * t)}${to(ag + (bg - ag) * t)}${to(ab + (bb - ab) * t)}`;
}

function scoreToOffset(score) {
  // pathLength=100; higher score → less remaining offset
  const min = 600;
  const max = 800;
  const progress = Math.min(1, Math.max(0, (score - min) / (max - min)));
  return 100 * (1 - progress);
}

function resetPillarVisuals() {
  const scoreEl = document.querySelector("[data-pillar-score]");
  const gauge = document.querySelector("[data-pillar-gauge]");
  const discount = document.querySelector("[data-pillar-discount]");
  const cash = document.querySelector("[data-pillar-cash]");
  const loan = document.querySelector("[data-pillar-loan]");

  if (scoreEl) {
    scoreEl.textContent = "650";
    scoreEl.classList.add("is-warn");
    scoreEl.classList.remove("is-good");
    scoreEl.style.color = "";
  }
  if (gauge) {
    gauge.style.stroke = "var(--gold)";
    gauge.setAttribute("stroke-dashoffset", String(scoreToOffset(650)));
  }
  if (discount) discount.textContent = "−0%";
  if (cash) cash.textContent = "+₹0";
  if (loan) loan.textContent = "₹0.0L";
}

function animateMonitor(pillar) {
  const scoreEl = pillar.querySelector("[data-pillar-score]");
  const gauge = pillar.querySelector("[data-pillar-gauge]");
  if (!scoreEl || !gauge) return () => {};

  scoreEl.classList.add("is-warn");
  scoreEl.classList.remove("is-good");

  return runTween(PILLAR_ANIM_MS, (eased) => {
    const score = 650 + (750 - 650) * eased;
    scoreEl.textContent = String(Math.round(score));
    const color = mixHex("#c9a227", "#1a9a6c", eased);
    scoreEl.style.color = color;
    gauge.style.stroke = color;
    gauge.setAttribute("stroke-dashoffset", String(scoreToOffset(score)));
    if (eased >= 1) {
      scoreEl.classList.remove("is-warn");
      scoreEl.classList.add("is-good");
    }
  });
}

function animateImprove(pillar) {
  const el = pillar.querySelector("[data-pillar-discount]");
  if (!el) return () => {};
  return runTween(PILLAR_ANIM_MS, (eased) => {
    el.textContent = `−${Math.round(42 * eased)}%`;
  });
}

function animateManage(pillar) {
  const el = pillar.querySelector("[data-pillar-cash]");
  if (!el) return () => {};
  return runTween(PILLAR_ANIM_MS, (eased) => {
    el.textContent = `+₹${Math.round(240 * eased)}`;
  });
}

function animateGrow(pillar) {
  const el = pillar.querySelector("[data-pillar-loan]");
  if (!el) return () => {};
  return runTween(PILLAR_ANIM_MS, (eased) => {
    el.textContent = `₹${(5.2 * eased).toFixed(1)}L`;
  });
}

const pillarAnimators = [animateMonitor, animateImprove, animateManage, animateGrow];

function setPillar(index) {
  if (pillarAnimCancel) {
    pillarAnimCancel();
    pillarAnimCancel = null;
  }

  activePillar = (index + pillars.length) % pillars.length;
  pillars.forEach((el, i) => el.classList.toggle("is-active", i === activePillar));

  // Reset all visuals, then animate the active one from its start value
  resetPillarVisuals();
  const active = pillars[activePillar];
  const animator = pillarAnimators[activePillar];
  if (active && animator) {
    pillarAnimCancel = animator(active);
  }
}

function startPillarCycle() {
  stopPillarCycle();
  setPillar(activePillar);
  pillarTimer = window.setInterval(() => setPillar(activePillar + 1), PILLAR_CYCLE_MS);
}

function stopPillarCycle() {
  if (pillarTimer) window.clearInterval(pillarTimer);
  pillarTimer = 0;
}

pillars.forEach((el, i) => {
  el.addEventListener("mouseenter", () => {
    stopPillarCycle();
    setPillar(i);
  });
  el.addEventListener("focus", () => {
    stopPillarCycle();
    setPillar(i);
  });
  el.addEventListener("click", () => setPillar(i));
});

document.querySelector("[data-pillars]")?.addEventListener("mouseleave", () => {
  if (!deckShell?.classList.contains("is-flipped")) startPillarCycle();
});
startPillarCycle();

/* ---------- AI modes → flip card + live sessions ---------- */
function panelsIn(root) {
  return [...(root || document).querySelectorAll("[data-connect]")];
}

function flipDeck(mode) {
  if (!deckShell) return;
  endSessionsIn(deckShell);
  panelsIn(deckShell).forEach((panel) => {
    panel.classList.toggle("is-on", panel.dataset.connect === mode);
  });
  deckShell.classList.add("is-flipped");
  deckShell.classList.remove("is-tilting");
  deckShell.style.transform = "";
  if (deckBack) deckBack.setAttribute("aria-hidden", "false");
  stopPillarCycle();
}

function unflipDeck() {
  if (!deckShell) return;
  endSessionsIn(deckShell);
  deckShell.classList.remove("is-flipped");
  if (deckBack) deckBack.setAttribute("aria-hidden", "true");
  startPillarCycle();
}

function flipCta(mode) {
  if (!ctaShell) return;
  endSessionsIn(ctaShell);
  panelsIn(ctaShell).forEach((panel) => {
    panel.classList.toggle("is-on", panel.dataset.connect === mode);
  });
  ctaShell.classList.add("is-flipped");
  if (ctaBack) ctaBack.setAttribute("aria-hidden", "false");
}

function unflipCta() {
  if (!ctaShell) return;
  endSessionsIn(ctaShell);
  ctaShell.classList.remove("is-flipped");
  if (ctaBack) ctaBack.setAttribute("aria-hidden", "true");
}

modes.forEach((btn) => {
  btn.addEventListener("click", () => flipDeck(btn.dataset.mode));
});

document.querySelector("[data-deck-unflip]")?.addEventListener("click", unflipDeck);

document.querySelectorAll("[data-cta-mode]").forEach((btn) => {
  btn.addEventListener("click", () => flipCta(btn.dataset.ctaMode));
});

document.querySelector("[data-cta-unflip]")?.addEventListener("click", unflipCta);

const CALL_LINES = [
  "Connected · negotiating HDFC overdue ₹48,200",
  "Desk offered −42% settlement if paid this week",
  "Confirming payment plan · score lift expected +38",
];

const CHAT_REPLIES = [
  "Your fastest lift: settle the HDFC overdue at −42%, then drop utilisation under 30%.",
  "I can open a settlement call or draft a 7-day action plan — which do you prefer?",
  "After those two moves, most profiles in your cohort cross 750 within 45–60 days.",
];

const VIDEO_CAPTIONS = [
  "Starting secure video room…",
  "Here’s your utilisation spike — cards at 89%.",
  "Next: idle revolving accounts dragging age of credit.",
  "I’ll mark two actions you can clear this week.",
];

let callTimerId = 0;
let callLineId = 0;
let callSeconds = 0;
let videoCaptionId = 0;
let chatReplyIndex = 0;

function formatTimer(total) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function startCallSession(panel) {
  const status = panel.querySelector("[data-call-status]");
  const timer = panel.querySelector("[data-call-timer]");
  const transcript = panel.querySelector("[data-call-transcript]");
  const muteBtn = panel.querySelector("[data-call-mute]");
  if (!status || !timer || !transcript) return;

  callSeconds = 0;
  timer.textContent = "00:00";
  status.textContent = "CONNECTING…";
  transcript.innerHTML = "<li>Dialling settlement desk · HDFC overdue…</li>";
  if (muteBtn) {
    muteBtn.textContent = "Mute";
    muteBtn.classList.remove("is-muted");
  }

  window.setTimeout(() => {
    if (!panel.classList.contains("is-live")) return;
    status.textContent = "ON CALL · AI AGENT";
    let i = 0;
    const pushLine = () => {
      if (!panel.classList.contains("is-live") || i >= CALL_LINES.length) return;
      const li = document.createElement("li");
      li.textContent = CALL_LINES[i++];
      transcript.appendChild(li);
      transcript.scrollTop = transcript.scrollHeight;
      if (i < CALL_LINES.length) {
        callLineId = window.setTimeout(pushLine, 2200);
      }
    };
    pushLine();
  }, 900);

  callTimerId = window.setInterval(() => {
    callSeconds += 1;
    timer.textContent = formatTimer(callSeconds);
  }, 1000);
}

function startChatSession(panel) {
  const thread = panel.querySelector("[data-chat-thread]");
  if (!thread) return;
  thread.innerHTML =
    '<div class="chat-bubble ai">Hi — I’ve scanned your report. You have 3 score blockers. Want the fastest path to 750+?</div>';
  chatReplyIndex = 0;
  const input = panel.querySelector(".chat-compose input");
  window.setTimeout(() => input?.focus(), 200);
}

function startVideoSession(panel) {
  const caption = panel.querySelector("[data-video-caption]");
  if (!caption) return;
  let i = 0;
  caption.textContent = VIDEO_CAPTIONS[0];
  const tick = () => {
    if (!panel.classList.contains("is-live")) return;
    i = Math.min(i + 1, VIDEO_CAPTIONS.length - 1);
    caption.textContent = VIDEO_CAPTIONS[i];
    if (i < VIDEO_CAPTIONS.length - 1) {
      videoCaptionId = window.setTimeout(tick, 2600);
    }
  };
  videoCaptionId = window.setTimeout(tick, 1600);
}

function clearSessionTimers() {
  window.clearInterval(callTimerId);
  window.clearTimeout(callLineId);
  window.clearTimeout(videoCaptionId);
  callTimerId = 0;
  callLineId = 0;
  videoCaptionId = 0;
}

function endSession(panel) {
  if (!panel) return;
  clearSessionTimers();
  panel.classList.remove("is-live");
  const session = panel.querySelector("[data-session]");
  if (session) session.hidden = true;
}

function endSessionsIn(root) {
  clearSessionTimers();
  panelsIn(root).forEach((panel) => endSession(panel));
}

function endAllSessions() {
  endSessionsIn(document);
}

function startSession(mode, root) {
  const scope = root || document;
  const panelList = panelsIn(scope);
  const panel = panelList.find((p) => p.dataset.connect === mode);
  if (!panel) return;
  endSessionsIn(scope);
  panelList.forEach((p) => p.classList.toggle("is-on", p === panel));
  panel.classList.add("is-live");
  const session = panel.querySelector("[data-session]");
  if (session) session.hidden = false;

  if (mode === "call") startCallSession(panel);
  if (mode === "chat") startChatSession(panel);
  if (mode === "video") startVideoSession(panel);
}

document.querySelectorAll("[data-start-session]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const root =
      btn.closest("[data-deck], [data-cta-deck]") || document;
    startSession(btn.dataset.startSession, root);
  });
});

document.querySelectorAll("[data-end-session]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const panel = btn.closest("[data-connect]");
    endSession(panel);
  });
});

document.querySelectorAll("[data-call-mute]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const muted = btn.classList.toggle("is-muted");
    btn.textContent = muted ? "Unmute" : "Mute";
  });
});

document.querySelectorAll("[data-chat-form]").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const panel = form.closest("[data-connect]");
    const thread = panel?.querySelector("[data-chat-thread]");
    const input = form.querySelector("input");
    if (!thread || !input) return;
    const text = input.value.trim();
    if (!text) return;

    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble user";
    userBubble.textContent = text;
    thread.appendChild(userBubble);
    input.value = "";
    thread.scrollTop = thread.scrollHeight;

    window.setTimeout(() => {
      if (!panel.classList.contains("is-live")) return;
      const reply = document.createElement("div");
      reply.className = "chat-bubble ai";
      reply.textContent = CHAT_REPLIES[chatReplyIndex % CHAT_REPLIES.length];
      chatReplyIndex += 1;
      thread.appendChild(reply);
      thread.scrollTop = thread.scrollHeight;
    }, 650);
  });
});

/* ---------- Story scroll storytelling ---------- */
const SCENE_COUNT = scenes.length;
const storyTimeline = document.querySelector(".story-timeline");
let activeScene = -1;

function scrollActiveStepIntoView(step) {
  if (!storyTimeline || !step || window.matchMedia("(min-width: 901px)").matches) {
    return;
  }
  const railRect = storyTimeline.getBoundingClientRect();
  const stepRect = step.getBoundingClientRect();
  const delta =
    stepRect.left - railRect.left - (railRect.width - stepRect.width) / 2;
  storyTimeline.scrollBy({ left: delta, behavior: "smooth" });
}

function setScene(index) {
  const i = Math.max(0, Math.min(SCENE_COUNT - 1, index));
  if (i === activeScene) return;
  activeScene = i;

  scenes.forEach((scene, idx) => scene.classList.toggle("is-active", idx === i));
  storySteps.forEach((step, idx) => {
    const active = idx === i;
    const done = idx < i;
    step.classList.toggle("is-active", active);
    step.classList.toggle("is-done", done);
    if (active) scrollActiveStepIntoView(step);
  });

  if (i === 0 && scoreDisplay) {
    animateNumber(scoreDisplay, 582, 700);
  }
  if (i === 1) {
    startIssueReveal();
  } else {
    resetIssueReveal();
  }
  if (i === 4) {
    const rise = document.querySelector("[data-rise-score]");
    if (rise) animateNumber(rise, 768, 900);
  }
}

const issueItems = [...document.querySelectorAll('[data-scene="1"] .issue')];
const scanLabel = document.querySelector("[data-scan-label]");
let issueRevealTimers = [];

function resetIssueReveal() {
  issueRevealTimers.forEach((id) => window.clearTimeout(id));
  issueRevealTimers = [];
  issueItems.forEach((el) => el.classList.remove("is-shown"));
  if (scanLabel) scanLabel.textContent = "SCANNING REPORT…";
}

function startIssueReveal() {
  resetIssueReveal();
  const labels = [
    "SCANNING REPORT…",
    "FOUND 1 ISSUE…",
    "FOUND 2 ISSUES…",
    "FOUND 3 ISSUES…",
    "4 PROBLEMS FOUND",
  ];
  if (scanLabel) scanLabel.textContent = labels[0];

  issueItems.forEach((el, idx) => {
    const delay = 550 + idx * 750;
    issueRevealTimers.push(
      window.setTimeout(() => {
        el.classList.add("is-shown");
        if (scanLabel) scanLabel.textContent = labels[idx + 1];
      }, delay)
    );
  });
}

function storyProgress() {
  if (!storySection) return 0;
  const rect = storySection.getBoundingClientRect();
  const total = storySection.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  const scrolled = -rect.top;
  return Math.min(1, Math.max(0, scrolled / total));
}

function onStoryScroll() {
  const progress = storyProgress();
  const index = Math.min(
    SCENE_COUNT - 1,
    Math.floor(progress * SCENE_COUNT)
  );
  setScene(index);
}

window.addEventListener("scroll", onStoryScroll, { passive: true });
onStoryScroll();

/* ---------- Number animation ---------- */
const animated = new WeakMap();

function animateNumber(el, target, duration = 800) {
  if (animated.get(el) === target) return;
  animated.set(el, target);
  const start = performance.now();
  const from = Number(el.textContent.replace(/\D/g, "")) || 0;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(from + (target - from) * eased));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- Pointer tilt on AI deck card (also inlined in index.html) ---------- */

/* ---------- Reveal on enter for lenders / loans ---------- */
const revealables = document.querySelectorAll(
  ".loan-offer, .network-core, .section-head, .cta-panel, .impact-metric"
);

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealables.forEach((el) => {
    el.classList.add("will-reveal");
    io.observe(el);
  });
}

/* ---------- Lender network scroll rotation (handled inline in index.html) ---------- */
