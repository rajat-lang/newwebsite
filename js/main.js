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
  updateImpactScrollHint();
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

/* ---------- Expand flipped AI card into modal ---------- */
(function initAiExpand() {
  const overlay = document.querySelector("[data-ai-expand]");
  const dialog = document.querySelector("[data-ai-expand-dialog]");
  const slot = document.querySelector("[data-ai-expand-slot]");
  if (!overlay || !dialog || !slot) return;

  let sourceHost = null;
  let sourceFace = null;
  let closeTimer = 0;

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }

  function setOriginFromRect(rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const finalW = Math.min(1120, vw - 24);
    const finalH = Math.min(900, vh * 0.92);
    const finalLeft = (vw - finalW) / 2;
    const finalTop = (vh - finalH) / 2;
    const ox = rect.left + rect.width / 2 - (finalLeft + finalW / 2);
    const oy = rect.top + rect.height / 2 - (finalTop + finalH / 2);
    const scale = Math.max(0.72, Math.min(rect.width / finalW, 0.96));
    dialog.style.setProperty("--expand-ox", `${ox.toFixed(1)}px`);
    dialog.style.setProperty("--expand-oy", `${oy.toFixed(1)}px`);
    dialog.style.setProperty("--expand-scale", String(scale.toFixed(3)));
  }

  function openExpand(btn) {
    if (sourceHost) return;
    const face = btn.closest(".ai-deck-back, .cta-back");
    const host = face?.querySelector("[data-connect-host]");
    if (!face || !host) return;

    window.clearTimeout(closeTimer);
    sourceHost = host;
    sourceFace = face;
    const rect = face.getBoundingClientRect();
    setOriginFromRect(rect);

    slot.appendChild(host);
    face.classList.add("is-content-expanded");
    const note = face.querySelector("[data-expanded-note]");
    if (note) note.hidden = false;

    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("ai-expand-open");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add("is-open"));
    });
  }

  function closeExpand() {
    if (!sourceHost || !sourceFace) {
      overlay.classList.remove("is-open");
      overlay.hidden = true;
      document.body.classList.remove("ai-expand-open");
      return;
    }

    const restore = () => {
      sourceFace.appendChild(sourceHost);
      sourceFace.classList.remove("is-content-expanded");
      const note = sourceFace.querySelector("[data-expanded-note]");
      if (note) note.hidden = true;
      sourceHost = null;
      sourceFace = null;
      overlay.hidden = true;
      document.body.classList.remove("ai-expand-open");
      dialog.style.removeProperty("--expand-ox");
      dialog.style.removeProperty("--expand-oy");
      dialog.style.removeProperty("--expand-scale");
    };

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    if (prefersReducedMotion()) {
      restore();
      return;
    }
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(restore, 480);
  }

  document.querySelectorAll("[data-deck-expand]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openExpand(btn);
    });
  });

  overlay.querySelectorAll("[data-ai-expand-close]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      closeExpand();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) {
      e.stopPropagation();
      closeExpand();
    }
  });

  // Keep content on the card if user unflips while expanded
  const wrapUnflip = (fn) => () => {
    if (sourceHost && sourceFace) {
      closeExpand();
      window.setTimeout(fn, prefersReducedMotion() ? 0 : 500);
      return;
    }
    fn();
  };

  const unflipBtn = document.querySelector("[data-deck-unflip]");
  const ctaUnflipBtn = document.querySelector("[data-cta-unflip]");
  if (unflipBtn) {
    unflipBtn.addEventListener(
      "click",
      (e) => {
        if (!sourceHost) return;
        e.stopImmediatePropagation();
        wrapUnflip(unflipDeck)();
      },
      true
    );
  }
  if (ctaUnflipBtn) {
    ctaUnflipBtn.addEventListener(
      "click",
      (e) => {
        if (!sourceHost) return;
        e.stopImmediatePropagation();
        wrapUnflip(unflipCta)();
      },
      true
    );
  }
})();

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
      btn.closest("[data-deck], [data-cta-deck], [data-ai-expand]") || document;
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

/* ---------- Story agent intro (scroll dark merge) ---------- */
const agentScene = document.querySelector("[data-agent-scene]");
const agentSticky = agentScene?.querySelector(".story-agent-sticky");
const agentVeil = document.querySelector("[data-agent-veil]");
const agentNode = document.querySelector("[data-gs-agent]");
const agentLine = document.querySelector("[data-agent-line]");
const agentCopy = document.querySelector("[data-agent-copy]");
const agentScanCopy = document.querySelector("[data-agent-scan-copy]");
const agentSideCopy = document.querySelector("[data-agent-side-copy]");
const agentProgressEl = document.querySelector("[data-agent-progress]");
const agentExplode = document.querySelector("[data-agent-explode]");
const agentExplodeCopy = document.querySelector("[data-agent-explode-copy]");
const agentResolveCopy = document.querySelector("[data-agent-resolve-copy]");
const agentScoreCopy = document.querySelector("[data-agent-score-copy]");
const agentPayCopy = document.querySelector("[data-agent-pay-copy]");
const agentRewardsCopy = document.querySelector("[data-agent-rewards-copy]");
const agentScoreImprove = document.querySelector("[data-agent-score-improve]");
const agentPay = document.querySelector("[data-agent-pay]");
const agentPayRewardFx = document.querySelector("[data-pay-reward-fx]");
const agentPayRewardFly = document.querySelector("[data-pay-reward-fly]");
const agentPayPoints = [...document.querySelectorAll("[data-pay-points]")].sort(
  (a, b) =>
    Number(a.getAttribute("data-pay-points")) -
    Number(b.getAttribute("data-pay-points"))
);
const agentPayPointsNums = agentPayPoints.map((el) =>
  el.querySelector(".pay-points-num")
);
const agentPayCards = [0, 1, 2].map((i) =>
  document.querySelector(`.story-agent-pay-card[data-pay-card="${i}"]`)
);
const agentPayCardHost = document.querySelector(".story-agent-pay-card-host");
const agentPayMiddleCard = agentPayCardHost?.querySelector(
  ".story-agent-pay-card"
);
const agentPayEmitter = document.querySelector("[data-pay-emitter]");
const agentPhone = document.querySelector("[data-agent-phone]");
const agentPhoneStage = document.querySelector("[data-agent-phone-stage]");
const agentConfetti = document.querySelector("[data-agent-confetti]");
const phoneScoreHud = document.querySelector("[data-phone-score]");
const scoreNumEl = document.querySelector("[data-score-num]");
const scoreLabelEl = document.querySelector("[data-score-label]");
const explodeWraps = [
  ...document.querySelectorAll("[data-explode-wrap]"),
].sort(
  (a, b) =>
    Number(a.getAttribute("data-explode-wrap")) -
    Number(b.getAttribute("data-explode-wrap"))
);
const featureStrip = document.querySelector("[data-feature-strip]");
const featureTrack = document.querySelector("[data-feature-track]");
const storyBody = document.querySelector("[data-story-body]");
let agentAwake = false;
let agentDarkLatched = false;
let agentAllLatched = false;
let agentHowtoLatched = false;
let agentScanLatched = false;
let agentShiftSmooth = 0;
let phoneShowSmooth = 0;
let scanLayoutSmooth = 0;
let explodeSmooth = 0;
let resolveSmooth = 0;
let scoreImproveSmooth = 0;
let payWithUsSmooth = 0;
let payRewardsSmooth = 0;
let agentScoreValue = 550;
let lastScoreStep = -1;
let scoreConfettiFired = false;
let scoreConfettiRaf = 0;
let scoreConfettiParts = [];
let payRewardFxFired = false;
let payCoinsPlaying = false;
let payCoinsDone = false;
let payCoinsReleased = false;
let payCoinsHoldTimer = 0;
let payShimmerTimer = 0;
let payCoinsScrollYAtStart = 0;
let payCoinsExitQueued = false;
const PAY_SHIMMER_MS = 1050;
const PAY_PILL_LEAD_MS = 0;
const PAY_REWARD_COIN_SRCS = [
  "assets/agent-screens/reward-coin-new-a.svg",
  "assets/agent-screens/reward-coin-new-b.svg",
  "assets/agent-screens/reward-coin-new-c.svg",
  "assets/agent-screens/reward-coin-new-d.svg",
  "assets/agent-screens/reward-coin-new-e.svg",
];
const PAY_REWARD_COIN_COUNT = 5;
const PAY_POINTS_TOTALS = [250, 200, 100];
const PAY_MIDDLE_CARD_SRC = "assets/agent-screens/pay-card-1.svg?v=2";
const PAY_MIDDLE_CARD_SHIMMER_SRC =
  "assets/agent-screens/pay-card-1-shimmer.svg?v=1";
let payPointsValues = [0, 0, 0];
let payPointsBumpTimers = [0, 0, 0];
let payCoinEnterTimers = [];

const SCORE_CONFETTI_COLORS = [
  "#6ec4f8",
  "#52b0f2",
  "#4aacef",
  "#f4c430",
  "#ff8a4c",
  "#ffffff",
  "#c5e4fc",
];

function preferReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function stopScoreConfetti() {
  if (scoreConfettiRaf) {
    cancelAnimationFrame(scoreConfettiRaf);
    scoreConfettiRaf = 0;
  }
  scoreConfettiParts = [];
  if (agentConfetti) {
    agentConfetti.classList.remove("is-on");
    const ctx = agentConfetti.getContext?.("2d");
    if (ctx) ctx.clearRect(0, 0, agentConfetti.width, agentConfetti.height);
  }
}

function fireScoreConfetti() {
  if (!agentConfetti || !agentPhoneStage || preferReducedMotion()) return;
  stopScoreConfetti();

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = agentConfetti.clientWidth || 1;
  const cssH = agentConfetti.clientHeight || 1;
  agentConfetti.width = Math.round(cssW * dpr);
  agentConfetti.height = Math.round(cssH * dpr);
  const ctx = agentConfetti.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const originX = cssW * 0.5;
  /* Horizontally centered; vertically between phone center and top edge */
  const originY = cssH * 0.41;
  const count = 88;
  /* Punchy launch + strong drag keeps the blast radius in check */
  const timeScale = 1.05;
  const maxRadius = Math.min(cssW, cssH) * 0.34;
  scoreConfettiParts = Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.2;
    const speed = 11 + Math.random() * 10;
    return {
      x: originX + (Math.random() - 0.5) * 14,
      y: originY + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed * (0.65 + Math.random() * 0.5),
      vy: Math.sin(angle) * speed - 4.2,
      w: 4 + Math.random() * 5,
      h: 7 + Math.random() * 9,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.45,
      color: SCORE_CONFETTI_COLORS[i % SCORE_CONFETTI_COLORS.length],
      life: 1,
      decay: 0.012 + Math.random() * 0.014,
      gravity: 0.08 + Math.random() * 0.04,
      drag: 0.94,
    };
  });

  agentConfetti.classList.add("is-on");
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, cssW, cssH);
    let alive = 0;
    for (const p of scoreConfettiParts) {
      if (p.life <= 0) continue;
      /* Fractional timeScale: one full step + a partial step */
      const steps = Math.floor(timeScale);
      const frac = timeScale - steps;
      for (let s = 0; s < steps + (frac > 0 ? 1 : 0); s += 1) {
        const k = s < steps ? 1 : frac;
        p.vx *= Math.pow(p.drag, k);
        p.vy = p.vy * Math.pow(p.drag, k) + p.gravity * k;
        p.x += p.vx * k;
        p.y += p.vy * k;
        p.rot += p.vr * k;
        p.life -= p.decay * k;
        const dx = p.x - originX;
        const dy = p.y - originY;
        const dist = Math.hypot(dx, dy);
        if (dist > maxRadius) {
          /* Soft clamp — keep pieces inside the blast radius */
          const scale = maxRadius / dist;
          p.x = originX + dx * scale;
          p.y = originY + dy * scale;
          p.vx *= 0.35;
          p.vy *= 0.35;
          p.life *= 0.85;
        }
        if (p.life <= 0) break;
      }
      if (p.life <= 0) continue;
      alive += 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.2));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
      ctx.restore();
    }
    if (alive > 0 && elapsed < 2800) {
      scoreConfettiRaf = requestAnimationFrame(tick);
    } else {
      stopScoreConfetti();
    }
  }

  scoreConfettiRaf = requestAnimationFrame(tick);
}

function setPayPoints(cardIndex, n) {
  payPointsValues[cardIndex] = n;
  if (agentPayPointsNums[cardIndex]) {
    agentPayPointsNums[cardIndex].textContent = `+${n}`;
  }
}

function bumpPayPoints(cardIndex, step) {
  const cap = PAY_POINTS_TOTALS[cardIndex] ?? 0;
  const next = Math.min(cap, payPointsValues[cardIndex] + step);
  setPayPoints(cardIndex, next);
  const pointsEl = agentPayPoints[cardIndex];
  if (!pointsEl) return;
  pointsEl.classList.remove("is-bump");
  void pointsEl.offsetWidth;
  pointsEl.classList.add("is-bump");
  if (payPointsBumpTimers[cardIndex]) {
    clearTimeout(payPointsBumpTimers[cardIndex]);
  }
  payPointsBumpTimers[cardIndex] = window.setTimeout(() => {
    pointsEl.classList.remove("is-bump");
    payPointsBumpTimers[cardIndex] = 0;
  }, 280);
}

function stopPayRewardFx() {
  payRewardFxFired = false;
  payCoinsPlaying = false;
  payCoinsReleased = false;
  payCoinsScrollYAtStart = 0;
  payCoinsExitQueued = false;
  if (payCoinsHoldTimer) {
    clearTimeout(payCoinsHoldTimer);
    payCoinsHoldTimer = 0;
  }
  if (payShimmerTimer) {
    clearTimeout(payShimmerTimer);
    payShimmerTimer = 0;
  }
  payPointsBumpTimers.forEach((id) => {
    if (id) clearTimeout(id);
  });
  payPointsBumpTimers = [0, 0, 0];
  payCoinEnterTimers.forEach((id) => clearTimeout(id));
  payCoinEnterTimers = [];
  if (agentPayRewardFly) agentPayRewardFly.innerHTML = "";
  payPointsValues = [0, 0, 0];
  agentPayPoints.forEach((el, i) => {
    setPayPoints(i, 0);
    el.classList.remove("is-bump");
  });
  agentPayCardHost?.classList.remove("is-shimmer", "is-emit");
  if (agentPayMiddleCard) agentPayMiddleCard.src = PAY_MIDDLE_CARD_SRC;
  agentPayRewardFx?.classList.remove("is-on");
  agentPayRewardFx?.setAttribute("aria-hidden", "true");
}

function payCoinsHoldScrollY() {
  if (!agentScene) return 0;
  const total = Math.max(agentScene.offsetHeight - window.innerHeight, 1);
  return agentPinScrollY() + total * AGENT_REWARDS_END;
}

/* During the finale, park at the rewards beat until coins + numbers finish */
function clampPayCoinsScroll() {
  if (programmaticNav || !payCoinsPlaying || payCoinsDone) return false;
  const hold = payCoinsHoldScrollY();
  if (window.scrollY > hold + 0.5) {
    payCoinsExitQueued = true;
    window.scrollTo(0, hold);
    return true;
  }
  return false;
}

function advanceToLightAfterRewards() {
  const loans = document.getElementById("loans");
  if (loans) {
    scrollPageToY(0, { smooth: true, resolveEl: loans });
    return;
  }
  if (!agentScene) return;
  const total = Math.max(agentScene.offsetHeight - window.innerHeight, 1);
  scrollPageToY(agentPinScrollY() + total + 24, { smooth: true });
}

function finishPayRewardCoins() {
  if (!payCoinsPlaying && payCoinsDone) return;
  payCoinsPlaying = false;
  payCoinsDone = true;
  payCoinsHoldTimer = 0;
  /* Coins have finished their flight — clear them so they fully disappear */
  agentPayRewardFly?.querySelectorAll(".pay-fly-coin").forEach((el) => el.remove());
  /* Lock final +N totals in case a bump timer was mid-flight */
  agentPayPoints.forEach((_, i) => setPayPoints(i, PAY_POINTS_TOTALS[i] ?? 0));
  placePayPointPills();

  /* After the finale, continue into the light section */
  requestAnimationFrame(() => {
    advanceToLightAfterRewards();
    payCoinsExitQueued = false;
  });
}

function revealPayRewardsStep() {
  payCoinsReleased = true;
  paintAgentIntro(agentProgress());
}

/* Top corners of each card graphic inside the 383×723 pay layers */
const PAY_CARD_CORNER_ORIGINS = [
  { x: 51.44 / 383, y: 210.44 / 723 }, // orange — top-left
  { x: 331 / 383, y: 285.5 / 723 }, // blue — top-right
  { x: 331 / 383, y: 362.2 / 723 }, // pink — top-right
];

function placePayPointPills() {
  if (!agentPayRewardFly || !agentPayRewardFx?.classList.contains("is-on")) {
    return;
  }
  const flyRect = agentPayRewardFly.getBoundingClientRect();
  if (flyRect.width < 8 || flyRect.height < 8) return;

  agentPayCards.forEach((card, cardIndex) => {
    if (!card) return;
    /* Middle card fans via the host wrapper */
    const layer =
      cardIndex === 1 && agentPayCardHost ? agentPayCardHost : card;
    const cardRect = layer.getBoundingClientRect();
    const origin = PAY_CARD_CORNER_ORIGINS[cardIndex];
    if (!origin || cardRect.width < 8) return;

    const sourceX = cardRect.left + cardRect.width * origin.x;
    const sourceY = cardRect.top + cardRect.height * origin.y;
    const ox = ((sourceX - flyRect.left) / flyRect.width) * 100;
    const oy = ((sourceY - flyRect.top) / flyRect.height) * 100;
    const pointsEl = agentPayPoints[cardIndex];
    if (!pointsEl) return;
    pointsEl.style.left = `${ox.toFixed(2)}%`;
    /* Sit just above the corner — small gap so the pill doesn’t kiss the card */
    pointsEl.style.top = `${(oy - 1.2).toFixed(2)}%`;
  });
}

function spawnPayRewardCoins() {
  if (!agentPayRewardFly) return;
  agentPayCardHost?.classList.add("is-emit");
  agentPayRewardFx.classList.add("is-on");
  agentPayRewardFx.setAttribute("aria-hidden", "false");
  payPointsValues = [0, 0, 0];
  /* Copy swaps the instant the +N pills appear above the cards. */
  revealPayRewardsStep();
  placePayPointPills();

  const flyRect = agentPayRewardFly.getBoundingClientRect();
  const phoneH = agentPay?.clientHeight || 520;
  const risePx = Math.round(phoneH * -0.2);
  const coinN = PAY_REWARD_COIN_COUNT;
  let maxEnd = 0;
  const srcs = PAY_REWARD_COIN_SRCS.slice();
  for (let s = srcs.length - 1; s > 0; s -= 1) {
    const j = Math.floor(Math.random() * (s + 1));
    const tmp = srcs[s];
    srcs[s] = srcs[j];
    srcs[j] = tmp;
  }

  agentPayCards.forEach((card, cardIndex) => {
    if (!card || !flyRect.width || !flyRect.height) return;
    const layer =
      cardIndex === 1 && agentPayCardHost ? agentPayCardHost : card;
    const cardRect = layer.getBoundingClientRect();
    const origin = PAY_CARD_CORNER_ORIGINS[cardIndex];
    const sourceX = cardRect.left + cardRect.width * origin.x;
    const sourceY = cardRect.top + cardRect.height * origin.y;
    const ox = ((sourceX - flyRect.left) / flyRect.width) * 100;
    const oy = ((sourceY - flyRect.top) / flyRect.height) * 100;
    const pointsEl = agentPayPoints[cardIndex];
    if (pointsEl) {
      setPayPoints(cardIndex, 0);
      pointsEl.style.left = `${ox.toFixed(2)}%`;
      pointsEl.style.top = `${(oy - 1.2).toFixed(2)}%`;
    }
    const total = PAY_POINTS_TOTALS[cardIndex] ?? 0;
    const step = Math.round(total / coinN);
    const pillH = pointsEl?.offsetHeight || 18;
    /* Coins launch from just above the pill, never overlapping it. */
    const launchY = -(pillH + 14);

    for (let i = 0; i < coinN; i += 1) {
      const el = document.createElement("div");
      el.className = "pay-fly-coin";
      el.style.left = `${ox.toFixed(2)}%`;
      el.style.top = `${oy.toFixed(2)}%`;
      const img = document.createElement("img");
      img.src = srcs[(i + cardIndex * 2) % srcs.length];
      img.alt = "";
      img.width = 64;
      img.height = 64;
      img.draggable = false;
      const spinSec = 1.8 + Math.random() * 1.4;
      const spinDir = Math.random() > 0.5 ? 1 : -1;
      img.style.setProperty("--coin-spin", `${spinSec}s`);
      img.style.setProperty("--coin-spin-dir", String(spinDir));
      img.style.animationDelay = `-${(Math.random() * spinSec).toFixed(2)}s`;
      el.appendChild(img);
      agentPayRewardFly.appendChild(el);

      const startX = (Math.random() - 0.5) * 5;
      const startY = launchY + (Math.random() - 0.5) * 4;
      const size = 0.88 + Math.random() * 0.25;
      const delay =
        PAY_PILL_LEAD_MS + cardIndex * 45 + i * 48 + Math.random() * 20;
      const dur = 680 + Math.random() * 220;
      maxEnd = Math.max(maxEnd, delay + dur);

      const xf = (x, y, sc) =>
        `translate3d(calc(-50% + ${x}px), ${y}px, 0) scale(${sc})`;

      el.animate(
        [
          {
            offset: 0,
            opacity: 0,
            transform: xf(startX, startY, size * 0.4),
          },
          {
            offset: 0.14,
            opacity: 1,
            transform: xf(startX, startY + risePx * 0.22, size),
          },
          {
            offset: 0.58,
            opacity: 1,
            transform: xf(startX, risePx * 0.68, size),
          },
          {
            offset: 1,
            opacity: 0,
            transform: xf(startX, risePx, size * 0.76),
          },
        ],
        {
          duration: dur,
          delay,
          easing: "cubic-bezier(0.16, 0.72, 0.2, 1)",
          fill: "forwards",
        }
      );

      payCoinEnterTimers.push(
        window.setTimeout(() => {
          if (!payRewardFxFired) return;
          const add =
            i === coinN - 1
              ? total - payPointsValues[cardIndex]
              : step;
          if (add > 0) bumpPayPoints(cardIndex, add);
        }, delay + dur * 0.55)
      );
    }
  });

  payCoinsHoldTimer = window.setTimeout(() => {
    payCoinsHoldTimer = 0;
    finishPayRewardCoins();
  }, Math.ceil(maxEnd + 220));
}

function firePayRewardFx() {
  if (!agentPayRewardFx || !agentPayRewardFly) return;
  if (preferReducedMotion()) {
    payRewardFxFired = true;
    payCoinsPlaying = false;
    payCoinsDone = true;
    payCoinsReleased = true;
    agentPayCardHost?.classList.add("is-shimmer", "is-emit");
    agentPayRewardFx.classList.add("is-on");
    agentPayRewardFx.setAttribute("aria-hidden", "false");
    agentPayPoints.forEach((_, i) =>
      setPayPoints(i, PAY_POINTS_TOTALS[i] ?? 0)
    );
    revealPayRewardsStep();
    requestAnimationFrame(() => advanceToLightAfterRewards());
    return;
  }

  stopPayRewardFx();
  payRewardFxFired = true;
  payCoinsPlaying = true;
  payCoinsDone = false;
  payCoinsReleased = false;
  payCoinsScrollYAtStart = window.scrollY;
  payCoinsExitQueued = window.scrollY > payCoinsHoldScrollY() - 2;
  agentPayCardHost?.classList.add("is-shimmer");
  if (agentPayMiddleCard) {
    agentPayMiddleCard.src = PAY_MIDDLE_CARD_SHIMMER_SRC;
  }

  /* Cards are already in final fan seats — shoot coins on the next frame */
  if (payShimmerTimer) {
    clearTimeout(payShimmerTimer);
    payShimmerTimer = 0;
  }
  requestAnimationFrame(() => {
    if (!payRewardFxFired || payCoinsDone) return;
    spawnPayRewardCoins();
    /* Park on the finale while the burst plays */
    const hold = payCoinsHoldScrollY();
    if (Math.abs(window.scrollY - hold) > 2) {
      window.scrollTo(0, hold);
    }
  });
}

/*
 * Two hard beats:
 * 1) From first fold → always stop on agent-only (no cards)
 * 2) Next scroll (after a brief settle) → unlock and free-scroll
 */
let agentSoloParked = false;
let agentCardsUnlocked = false;
let agentTouchStartY = 0;
let agentCachedPinY = 0;
let agentLocking = false;
let agentParkedAt = 0;
let programmaticNav = false;
let programmaticNavTimer = 0;
let programmaticNavToken = 0;
const AGENT_SOLO_SETTLE_MS = 320;

function isMobileViewport() {
  return window.matchMedia?.("(max-width: 719px)")?.matches === true;
}
/*
 * Chapter progress map (fraction of scene height):
 *  0 → 0.09     grow + copy + solo hold (grow finishes ~0.032)
 *  0.09 → 0.125 agent + text only (brief wait before cards)
 *  0.125 → 0.24 feature cards L→R
 *  0.24 → 0.255 howto beat
 *  0.255 → 0.32 agent→phone
 *  0.32 → 0.40  scan hold
 *  0.40 → 0.43  report explodes into screen2
 *  0.43 → 0.44  hold exploded
 *  0.44 → 0.72  resolve issues
 *  0.72 → 0.80  cards implode back into phone
 *  0.80 → 0.825 phone flips to score improves (fast)
 *  0.825 → 0.89  score hold
 *  0.89 → 0.925  pay-with-us screen + cards rise
 *  0.925 → 0.93   pay hold
 *  0.93 → 0.97    cards fan + coins (non-blocking; scroll stays free)
 *  0.97 → 1.00    end → light section
 */
const AGENT_SOLO_MAX_P = 0.09;
const AGENT_STRIP_START = 0.125;
const AGENT_STRIP_END = 0.24;
const AGENT_HOWTO_HOLD_END = 0.255;
const AGENT_PHONE_END = 0.32;
const AGENT_SCAN_HOLD_END = 0.4;
const AGENT_EXPLODE_END = 0.43;
const AGENT_RESOLVE_START = 0.44;
const AGENT_RESOLVE_END = 0.72;
const AGENT_IMPLODE_END = 0.8;
const AGENT_SCORE_START = 0.8;
const AGENT_SCORE_END = 0.825;
const AGENT_PAY_START = 0.89;
const AGENT_PAY_END = 0.925;
const AGENT_REWARDS_START = 0.93;
const AGENT_REWARDS_END = 0.97;

/* Card order: left → top → enquiries → utilisation */
const RESOLVE_ORDER = [0, 1, 3, 2];
const SCORE_STEPS = [
  { score: 550, label: "VERY BAD", color: "#e11d2e" },
  { score: 640, label: "AVERAGE", color: "#e67e22" },
  { score: 720, label: "GOOD", color: "#2ecc71" },
  { score: 780, label: "GREAT", color: "#52b0f2" },
  { score: 810, label: "GREAT", color: "#52b0f2" },
];

function applyScoreStep(stepIndex, animate) {
  const step = SCORE_STEPS[Math.max(0, Math.min(SCORE_STEPS.length - 1, stepIndex))];
  if (scoreLabelEl) {
    scoreLabelEl.textContent = step.label;
    scoreLabelEl.style.color = step.color;
  }
  agentSticky?.style.setProperty("--score-label-color", step.color);
  if (!animate) {
    agentScoreValue = step.score;
    if (scoreNumEl) scoreNumEl.textContent = String(Math.round(agentScoreValue));
    lastScoreStep = stepIndex;
    return;
  }
  if (lastScoreStep === stepIndex) return;
  lastScoreStep = stepIndex;
  const from = agentScoreValue;
  const to = step.score;
  const start = performance.now();
  const dur = 520;
  function tick(now) {
    const t = clamp01((now - start) / dur);
    const eased = smoothstep(t);
    agentScoreValue = from + (to - from) * eased;
    if (scoreNumEl) scoreNumEl.textContent = String(Math.round(agentScoreValue));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function refreshAgentPinY() {
  if (!agentScene) return 0;
  agentCachedPinY =
    agentScene.getBoundingClientRect().top + window.scrollY;
  return agentCachedPinY;
}

function agentPinScrollY() {
  return agentCachedPinY || refreshAgentPinY();
}

function agentSoloMaxScrollY() {
  if (!agentScene) return agentPinScrollY();
  const total = Math.max(agentScene.offsetHeight - window.innerHeight, 1);
  return agentPinScrollY() + total * AGENT_SOLO_MAX_P;
}

function beginProgrammaticNav(ms = 8000) {
  programmaticNav = true;
  document.documentElement.classList.add("is-nav-scrolling");
  window.clearTimeout(programmaticNavTimer);
  /* Failsafe only — normal unlock is endProgrammaticNav() when the anim finishes */
  programmaticNavTimer = window.setTimeout(endProgrammaticNav, ms);
}

function endProgrammaticNav() {
  window.clearTimeout(programmaticNavTimer);
  programmaticNavTimer = 0;
  programmaticNav = false;
  document.documentElement.classList.remove("is-nav-scrolling");
}

function navOffset() {
  const navEl = document.querySelector(".nav");
  return (navEl?.offsetHeight || 72) + 12;
}

function pageYOf(el) {
  if (!el) return 0;
  return el.getBoundingClientRect().top + window.scrollY;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* Distance-based scroll so nav jumps still fly through every section */
function scrollPageToY(targetY, { smooth = true, onDone, resolveEl = null } = {}) {
  const token = ++programmaticNavToken;
  const resolveY = () => {
    if (resolveEl?.isConnected) {
      return Math.max(0, Math.round(pageYOf(resolveEl) - navOffset()));
    }
    return Math.max(0, Math.round(targetY));
  };

  let y = resolveY();
  const startY = window.scrollY;
  const dist = Math.abs(y - startY);

  if (!smooth || dist < 2 || prefersReducedMotion()) {
    beginProgrammaticNav(400);
    window.scrollTo(0, resolveY());
    if (token === programmaticNavToken) {
      onDone?.();
      endProgrammaticNav();
    }
    return;
  }

  /*
   * Fast fly-through: still visits every section, but at a quick pace.
   * ~4200 px/s with short min/max so long chapters don't linger.
   * Keep programmaticNav until RAF finishes — a short timeout used to
   * abort mid-agent-chapter when paint lagged behind wall-clock duration.
   */
  const duration = Math.min(1600, Math.max(280, dist / 4.2));
  beginProgrammaticNav(Math.max(duration + 4000, 6000));
  const t0 = performance.now();

  const frame = (now) => {
    if (token !== programmaticNavToken) return;
    const t = Math.min(1, (now - t0) / duration);
    if (t >= 1) {
      window.scrollTo(0, resolveY());
      if (token === programmaticNavToken) {
        onDone?.();
        endProgrammaticNav();
      }
      return;
    }
    const next = startY + (y - startY) * easeInOutCubic(t);
    window.scrollTo(0, next);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function scrollToNavTarget(hash, { smooth = true } = {}) {
  const id = String(hash || "").replace(/^#/, "");
  if (!id || id === "top") {
    scrollPageToY(0, {
      smooth,
      onDone: () => {
        agentSoloParked = false;
        agentCardsUnlocked = false;
        agentParkedAt = 0;
        refreshAgentPinY();
      },
    });
    if (history.replaceState) history.replaceState(null, "", "#top");
    return;
  }

  if (id === "how-it-works") {
    goToAgentSolo(smooth);
    if (history.replaceState) history.replaceState(null, "", "#how-it-works");
    return;
  }

  const el = document.getElementById(id);
  if (!el) return;

  /* Jumping past the agent chapter — unlock so lockToAgentSolo can't pull us back */
  agentCardsUnlocked = true;
  agentSoloParked = false;
  stopPayRewardFx();
  payCoinsDone = true;
  refreshAgentPinY();
  scrollPageToY(pageYOf(el) - navOffset(), {
    smooth,
    resolveEl: el,
    onDone: () => {
      /* Hard-land after fly-through in case layout shifted during the agent chapter */
      window.scrollTo(0, Math.max(0, Math.round(pageYOf(el) - navOffset())));
      paintAgentIntro(agentProgress());
    },
  });
  if (history.replaceState) history.replaceState(null, "", `#${id}`);
}

/* Hard-land on the finished agent-only screen (never past into cards) */
function lockToAgentSolo() {
  if (!agentScene || agentLocking || programmaticNav) return;
  /* On mobile, hard clamps kill momentum and make the page feel stuck */
  if (isMobileViewport()) {
    unlockAgentCards();
    return;
  }
  const soloMaxY = agentSoloMaxScrollY();
  const y = window.scrollY;
  const wasParked = agentSoloParked;
  agentSoloParked = true;
  agentCardsUnlocked = false;
  if (!wasParked) agentParkedAt = performance.now();

  if (Math.abs(y - soloMaxY) > 1.5) {
    agentLocking = true;
    window.scrollTo({ top: soloMaxY, behavior: "auto" });
    requestAnimationFrame(() => {
      agentLocking = false;
    });
  }
}

function unlockAgentCards() {
  agentCardsUnlocked = true;
  agentSoloParked = false;
}

function goToAgentSolo(smooth = true) {
  if (!agentScene) return;
  refreshAgentPinY();
  agentCardsUnlocked = false;
  agentSoloParked = true;
  agentParkedAt = performance.now();
  const soloMaxY = agentSoloMaxScrollY();
  scrollPageToY(soloMaxY, {
    smooth,
    onDone: () => {
      agentSoloParked = true;
      agentCardsUnlocked = false;
      paintAgentIntro(agentProgress());
    },
  });
}

document.querySelectorAll("[data-goto-agent-solo]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    scrollToNavTarget("#how-it-works", { smooth: true });
  });
});

document.querySelectorAll(".nav-brand[href='#top'], .footer-logo[href='#top']").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    closeNavMenu();
    scrollToNavTarget("#top", { smooth: true });
  });
});

const navEl = document.querySelector(".nav");
const navToggle = document.querySelector("[data-nav-toggle]");

function setNavMenuOpen(open) {
  if (!navEl || !navToggle) return;
  navEl.classList.toggle("is-menu-open", open);
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

function closeNavMenu() {
  setNavMenuOpen(false);
}

navToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  setNavMenuOpen(!navEl?.classList.contains("is-menu-open"));
});

document.addEventListener("click", (e) => {
  if (!navEl?.classList.contains("is-menu-open")) return;
  if (navEl.contains(e.target)) return;
  closeNavMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeNavMenu();
});

window.addEventListener(
  "resize",
  () => {
    if (window.matchMedia("(min-width: 720px)").matches) closeNavMenu();
  },
  { passive: true }
);

document.querySelectorAll(".nav-links a[href^='#']").forEach((el) => {
  el.addEventListener("click", (e) => {
    const href = el.getAttribute("href");
    if (!href || href === "#") return;
    e.preventDefault();
    closeNavMenu();
    scrollToNavTarget(href, { smooth: true });
  });
});

if (location.hash === "#how-it-works") {
  requestAnimationFrame(() => scrollToNavTarget("#how-it-works", { smooth: false }));
} else if (location.hash && location.hash !== "#top") {
  requestAnimationFrame(() => scrollToNavTarget(location.hash, { smooth: false }));
}

function agentSoloSettled() {
  return (
    agentSoloParked &&
    !agentCardsUnlocked &&
    performance.now() - agentParkedAt >= AGENT_SOLO_SETTLE_MS
  );
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function smoothstep(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/* Strip: emerge left-of-center → crawl right → merge right-of-center */
function stripTravelEase(t) {
  const x = clamp01(t);
  if (x < 0.07) {
    return (x / 0.07) * 0.07;
  }
  if (x < 0.88) {
    return 0.07 + ((x - 0.07) / 0.81) * 0.81;
  }
  return 0.88 + ((x - 0.88) / 0.12) * 0.12;
}

function agentProgress() {
  if (!agentScene) return 0;
  const rect = agentScene.getBoundingClientRect();
  const total = agentScene.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return clamp01(-rect.top / total);
}

const DARK_BEATS = [
  AGENT_STRIP_START,
  AGENT_HOWTO_HOLD_END,
  AGENT_PHONE_END,
  AGENT_EXPLODE_END,
  AGENT_RESOLVE_END,
  AGENT_SCORE_END,
  AGENT_PAY_END,
  AGENT_REWARDS_START,
  1,
];

function scrollToAgentProgress(targetP) {
  if (!agentScene) return;
  refreshAgentPinY();
  const total = Math.max(agentScene.offsetHeight - window.innerHeight, 1);
  const y = agentPinScrollY() + total * clamp01(targetP);
  window.scrollTo({ top: y, behavior: "smooth" });
}

function goToNextDarkBeat() {
  if (!agentScene || !agentSticky?.classList.contains("is-dark")) return;

  if (!agentCardsUnlocked) {
    unlockAgentCards();
    scrollToAgentProgress(AGENT_STRIP_START + 0.008);
    return;
  }

  const p = agentProgress();
  const next = DARK_BEATS.find((beat) => beat > p + 0.018) ?? 1;

  if (next >= 0.999) {
    payCoinsPlaying = false;
    payCoinsDone = true;
    document.getElementById("loans")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    return;
  }

  if (payCoinsPlaying && !payCoinsDone && next >= AGENT_REWARDS_START) {
    payCoinsPlaying = false;
    payCoinsDone = true;
  }

  scrollToAgentProgress(next);
}

function paintAgentIntro(p) {
  if (!agentSticky || !agentScene) return;

  const rect = agentScene.getBoundingClientRect();
  const vh = window.innerHeight || 1;

  /*
   * White: agent rises bottom → centre (never past it).
   * At centre (pin) → dark dissolves on; grow starts from that seat.
   * End of chapter → unlatch after the coin finale finishes, then light.
   */
  const pastLastBeat = p >= AGENT_REWARDS_END;
  const coinsFinaleActive = payCoinsPlaying || (payRewardFxFired && !payCoinsDone);
  const mobileExit =
    isMobileViewport() && pastLastBeat && payCoinsDone && !payCoinsPlaying;
  const stillCovering = rect.bottom > vh * 0.5;
  const pinned = rect.top <= 1;
  const chapterDone =
    (!coinsFinaleActive && rect.bottom <= vh * 1.02) || mobileExit;
  if (pinned && stillCovering && !chapterDone) {
    agentDarkLatched = true;
  } else if (
    !coinsFinaleActive &&
    (rect.top > 24 || rect.bottom < vh * 0.88 || chapterDone)
  ) {
    agentDarkLatched = false;
  }
  const shouldDark = agentDarkLatched;
  const exitPeek =
    !shouldDark &&
    !mobileExit &&
    !coinsFinaleActive &&
    rect.top <= 24 &&
    rect.bottom > vh * 0.12;

  const rise = shouldDark
    ? 1
    : exitPeek
      ? 1
      : rect.top < vh && rect.bottom > vh * 0.15
        ? smoothstep(clamp01(1 - Math.max(rect.top, 0) / vh))
        : 0;
  const shouldPeek = !shouldDark && (exitPeek || rise > 0.02);

  agentSticky.classList.toggle("is-dark", shouldDark);
  agentSticky.classList.toggle("is-peeking", shouldPeek);
  agentSticky.classList.toggle("is-chapter-exit", mobileExit && !shouldDark);
  agentSticky.classList.remove("is-exiting");
  agentVeil?.classList.toggle("is-on", shouldDark);
  document.documentElement.classList.toggle("story-dark", shouldDark);
  agentSticky.style.setProperty("--agent-rise", rise.toFixed(4));

  /* At centre (rise=1) scale≈0.24; dark grow snaps up quickly from there */
  let scale;
  if (shouldDark) {
    const grow = smoothstep(p / 0.032);
    scale = 0.24 + grow * 0.76;
  } else if (shouldPeek) {
    scale = 0.14 + rise * 0.1;
  } else {
    scale = 0.14;
  }
  agentSticky.style.setProperty("--agent-scale", scale.toFixed(4));

  const copy = shouldDark ? smoothstep((p - 0.018) / 0.028) : 0;
  agentSticky.style.setProperty("--agent-copy", copy.toFixed(4));

  /* Cards after the agent-only hold; then scrub L→R in the center band */
  const stripSpan = Math.max(AGENT_STRIP_END - AGENT_STRIP_START, 0.001);
  const stripT =
    shouldDark && agentCardsUnlocked
      ? clamp01((p - AGENT_STRIP_START) / stripSpan)
      : 0;
  /* Soft emerge / merge — not a hard cut at the screen edge */
  const stripIn = smoothstep(stripT / 0.1);
  const stripOut = 1 - smoothstep((stripT - 0.86) / 0.12);
  const stripShow = stripIn * stripOut;
  const stripPos = stripTravelEase(stripT);
  /* Shorter travel + long scroll = much slower L→R drift */
  const stripX = -16 + stripPos * 32;
  agentSticky.style.setProperty("--strip-show", stripShow.toFixed(4));
  agentSticky.style.setProperty("--strip-x", `${stripX.toFixed(2)}vw`);
  featureStrip?.setAttribute("aria-hidden", stripShow < 0.08 ? "true" : "false");

  /*
   * “all of” when the strip’s midpoint crosses the screen/agent center.
   * Once in, stay latched through card exit until chapter resets or
   * the user scrolls the strip back past center.
   */
  if (!shouldDark || !agentCardsUnlocked) {
    agentAllLatched = false;
  } else if (featureTrack && stripShow > 0.15) {
    const tr = featureTrack.getBoundingClientRect();
    const stripMid = tr.left + tr.width / 2;
    const viewMid = window.innerWidth / 2;
    if (stripMid >= viewMid - 6) agentAllLatched = true;
    else if (stripMid < viewMid - 48) agentAllLatched = false;
  }
  agentLine?.classList.toggle("is-all", agentAllLatched);

  /* Cards gone → latch “How do we do this?” until scroll-back */
  if (
    shouldDark &&
    agentCardsUnlocked &&
    agentAllLatched &&
    stripT >= 0.98
  ) {
    agentHowtoLatched = true;
  } else if (!shouldDark || !agentCardsUnlocked || stripT < 0.86) {
    agentHowtoLatched = false;
  }
  /* Once past phone/explode, keep howto latched so resolve can play */
  if (shouldDark && p >= AGENT_PHONE_END && agentCardsUnlocked) {
    agentHowtoLatched = true;
  }
  const isHowto = agentHowtoLatched;
  agentCopy?.classList.toggle("is-howto", isHowto);

  /*
   * After howto delay: agent drifts right + phone dissolves in.
   * Then scan hold → report explodes into screen2 → AI resolves issues.
   */
  let agentShiftTarget = 0;
  let phoneShowTarget = 0;
  let scanLayoutTarget = 0;
  let explodeTarget = 0;
  let resolveTarget = 0;
  let scoreImproveTarget = 0;
  if (shouldDark && isHowto && p > AGENT_HOWTO_HOLD_END) {
    const moveSpan = Math.max(AGENT_PHONE_END - AGENT_HOWTO_HOLD_END, 0.001);
    const moveT = clamp01((p - AGENT_HOWTO_HOLD_END) / moveSpan);
    /* Soft ease-in-out so the center→scanner drift isn’t abrupt */
    const ease = smoothstep(smoothstep(moveT));
    agentShiftTarget = Math.min(1, ease);
    /* Phone arrives after the agent has already begun drifting */
    phoneShowTarget = smoothstep((ease - 0.22) / 0.62);
    scanLayoutTarget = smoothstep((ease - 0.3) / 0.58);
    if (p >= AGENT_PHONE_END) {
      agentShiftTarget = 1;
      phoneShowTarget = 1;
      scanLayoutTarget = 1;
    }
  }
  if (shouldDark && isHowto && p > AGENT_SCAN_HOLD_END) {
    const explodeSpan = Math.max(AGENT_EXPLODE_END - AGENT_SCAN_HOLD_END, 0.001);
    const explodeT = clamp01((p - AGENT_SCAN_HOLD_END) / explodeSpan);
    explodeTarget = smoothstep(smoothstep(explodeT));
    if (p >= AGENT_EXPLODE_END) explodeTarget = 1;
    agentShiftTarget = 1;
    phoneShowTarget = 1;
    scanLayoutTarget = 1;
  }
  if (shouldDark && isHowto && p > AGENT_RESOLVE_START) {
    const resolveSpan = Math.max(AGENT_RESOLVE_END - AGENT_RESOLVE_START, 0.001);
    const resolveT = clamp01((p - AGENT_RESOLVE_START) / resolveSpan);
    resolveTarget = smoothstep(resolveT);
    if (p >= AGENT_RESOLVE_END) resolveTarget = 1;
    explodeTarget = 1;
    agentShiftTarget = 1;
    phoneShowTarget = 1;
    scanLayoutTarget = 1;
  }
  /* After resolve: cards implode back into the phone (reverse of explode) */
  if (shouldDark && isHowto && p > AGENT_RESOLVE_END) {
    resolveTarget = 1;
    agentShiftTarget = 1;
    phoneShowTarget = 1;
    scanLayoutTarget = 1;
    const implodeSpan = Math.max(AGENT_IMPLODE_END - AGENT_RESOLVE_END, 0.001);
    const implodeT = clamp01((p - AGENT_RESOLVE_END) / implodeSpan);
    explodeTarget = 1 - smoothstep(implodeT);
    if (p >= AGENT_IMPLODE_END) explodeTarget = 0;
  }
  /* Flip immediately once cards are gone — short scroll span */
  if (shouldDark && isHowto && p >= AGENT_SCORE_START) {
    const scoreSpan = Math.max(AGENT_SCORE_END - AGENT_SCORE_START, 0.001);
    const scoreT = clamp01((p - AGENT_SCORE_START) / scoreSpan);
    scoreImproveTarget = scoreT;
    if (p >= AGENT_SCORE_END) scoreImproveTarget = 1;
    resolveTarget = 1;
    agentShiftTarget = 1;
    scanLayoutTarget = 1;
    phoneShowTarget = 1;
    explodeTarget = 0;
  }
  /* After score holds: swap phone face to pay-with-us */
  let payWithUsTarget = 0;
  if (shouldDark && isHowto && p >= AGENT_PAY_START) {
    const paySpan = Math.max(AGENT_PAY_END - AGENT_PAY_START, 0.001);
    const payT = clamp01((p - AGENT_PAY_START) / paySpan);
    payWithUsTarget = payT;
    if (p >= AGENT_PAY_END) payWithUsTarget = 1;
    scoreImproveTarget = 1;
    resolveTarget = 1;
    agentShiftTarget = 1;
    scanLayoutTarget = 1;
    phoneShowTarget = 1;
    explodeTarget = 0;
  }
  let payRewardsTarget = 0;
  if (shouldDark && isHowto && p >= AGENT_REWARDS_START) {
    const rewardsSpan = Math.max(AGENT_REWARDS_END - AGENT_REWARDS_START, 0.001);
    const rewardsT = clamp01((p - AGENT_REWARDS_START) / rewardsSpan);
    payRewardsTarget = smoothstep(rewardsT);
    if (p >= AGENT_REWARDS_END) payRewardsTarget = 1;
    payWithUsTarget = 1;
    scoreImproveTarget = 1;
    resolveTarget = 1;
    agentShiftTarget = 1;
    scanLayoutTarget = 1;
    phoneShowTarget = 1;
    explodeTarget = 0;
  }

  /* Smooth follow — lower rate = less whip on scroll ticks */
  const follow = !shouldDark ? 1 : isHowto ? 0.15 : 0.18;
  const imploding =
    shouldDark && isHowto && p > AGENT_RESOLVE_END && p < AGENT_SCORE_END;
  agentShiftSmooth += (agentShiftTarget - agentShiftSmooth) * follow;
  phoneShowSmooth += (phoneShowTarget - phoneShowSmooth) * follow;
  scanLayoutSmooth += (scanLayoutTarget - scanLayoutSmooth) * follow;
  /* Snap cards shut quickly so flip isn’t waiting on lerp lag */
  explodeSmooth +=
    (explodeTarget - explodeSmooth) * (imploding ? 0.42 : isHowto ? 0.18 : 1);
  resolveSmooth += (resolveTarget - resolveSmooth) * (isHowto ? 0.07 : 1);
  /* Flip is 1:1 with scroll — no delay after collapse */
  scoreImproveSmooth = scoreImproveTarget;
  payWithUsSmooth = payWithUsTarget;
  payRewardsSmooth = payRewardsTarget;
  if (!shouldDark || Math.abs(agentShiftTarget - agentShiftSmooth) < 0.0008) {
    agentShiftSmooth = agentShiftTarget;
    phoneShowSmooth = phoneShowTarget;
    scanLayoutSmooth = scanLayoutTarget;
  }
  if (!shouldDark || Math.abs(explodeTarget - explodeSmooth) < 0.0008) {
    explodeSmooth = explodeTarget;
  }
  if (!shouldDark || Math.abs(resolveTarget - resolveSmooth) < 0.0008) {
    resolveSmooth = resolveTarget;
  }

  const agentShift = agentShiftSmooth;
  const phoneShow = phoneShowSmooth;
  const scanLayout = scanLayoutSmooth;
  const explode = explodeSmooth;
  const resolve = resolveSmooth;
  const scoreImprove = scoreImproveSmooth;
  const payWithUs = payWithUsSmooth;
  const payRewards = payRewardsSmooth;
  /* Vertical settle lags horizontal move so it doesn’t drop onto the phone early */
  const agentShiftY = smoothstep((agentShift - 0.18) / 0.82);
  /* Size shrink starts mid-move, finishes as we seat */
  const agentShrink = smoothstep((agentShift - 0.28) / 0.72);

  agentSticky.style.setProperty("--agent-shift", agentShift.toFixed(4));
  agentSticky.style.setProperty("--agent-shift-y", agentShiftY.toFixed(4));
  agentSticky.style.setProperty("--agent-shrink", agentShrink.toFixed(4));
  agentSticky.style.setProperty("--phone-show", phoneShow.toFixed(4));
  agentSticky.style.setProperty("--scan-layout", scanLayout.toFixed(4));
  agentSticky.style.setProperty("--explode", explode.toFixed(4));
  agentSticky.style.setProperty("--resolve", resolve.toFixed(4));
  agentSticky.style.setProperty("--score-improve", scoreImprove.toFixed(4));
  /* 0→1 drives a full 180° Y flip of the phone stage */
  agentSticky.style.setProperty("--score-flip", scoreImprove.toFixed(4));
  agentSticky.style.setProperty("--pay-with-us", payWithUs.toFixed(4));
  agentSticky.style.setProperty("--pay-rewards", payRewards.toFixed(4));
  /* Cards rise from bottom with a short stagger after the phone dissolves in */
  const cardRise = smoothstep(clamp01((payWithUs - 0.08) / 0.92));
  const card0 = smoothstep(clamp01((cardRise - 0.0) / 0.78));
  const card1 = smoothstep(clamp01((cardRise - 0.12) / 0.78));
  const card2 = smoothstep(clamp01((cardRise - 0.24) / 0.78));
  agentSticky.style.setProperty("--pay-card-0", card0.toFixed(4));
  agentSticky.style.setProperty("--pay-card-1", card1.toFixed(4));
  agentSticky.style.setProperty("--pay-card-2", card2.toFixed(4));
  /* Copy swap is discrete + CSS timed (not scroll-scrubbed crossfade) */
  const resolveCopy = smoothstep(clamp01(resolve / 0.12));
  const scoreImproveCopy = smoothstep(clamp01(scoreImprove / 0.35));
  agentSticky.style.setProperty("--resolve-copy", resolveCopy.toFixed(4));
  agentSticky.style.setProperty(
    "--score-improve-copy",
    scoreImproveCopy.toFixed(4)
  );

  let sideCopyStep = "scan";
  if (payCoinsReleased) sideCopyStep = "rewards";
  else if (payWithUs >= 0.45) sideCopyStep = "pay";
  else if (scoreImprove >= 0.45) sideCopyStep = "score";
  else if (resolveCopy >= 0.45) sideCopyStep = "resolve";
  else if (explode >= 0.45) sideCopyStep = "explode";
  agentScanCopy?.classList.toggle("is-on", sideCopyStep === "scan");
  agentExplodeCopy?.classList.toggle("is-on", sideCopyStep === "explode");
  agentResolveCopy?.classList.toggle("is-on", sideCopyStep === "resolve");
  agentScoreCopy?.classList.toggle("is-on", sideCopyStep === "score");
  agentPayCopy?.classList.toggle("is-on", sideCopyStep === "pay");
  agentRewardsCopy?.classList.toggle("is-on", sideCopyStep === "rewards");
  /* No scroll-scrubbed grey exit — veil dissolves when dark unlatches */
  document.documentElement.style.setProperty("--agent-exit", "0");
  agentSticky.style.setProperty("--agent-exit", "0");
  agentVeil?.classList.remove("is-exiting");

  /* Stagger cards so they lift off the report in sequence */
  for (let i = 0; i < 4; i += 1) {
    const t = clamp01((explode - i * 0.07) / 0.78);
    const staggered = smoothstep(smoothstep(t));
    agentSticky.style.setProperty(`--explode-${i}`, staggered.toFixed(4));
  }

  /* Resolve: agent stays on the active card through the red→green flip */
  let fixedCount = 0;
  const holdResolved =
    resolve >= 0.995 ||
    scoreImprove > 0.02 ||
    (shouldDark && isHowto && p >= AGENT_RESOLVE_END);
  if (holdResolved) {
    fixedCount = RESOLVE_ORDER.length;
    const lastId = RESOLVE_ORDER[RESOLVE_ORDER.length - 1];
    const showAgent = explode > 0.55 && scoreImprove < 0.2;
    explodeWraps.forEach((wrap, i) => {
      wrap.classList.add("is-fixed");
      const stay = showAgent && i === lastId;
      wrap.classList.toggle("is-working", stay);
      wrap
        .querySelector("[data-card-agent]")
        ?.setAttribute("aria-hidden", stay ? "false" : "true");
    });
  } else if (resolve > 0.02 && explode > 0.85) {
    const n = RESOLVE_ORDER.length;
    const slot = resolve * n;
    const activeSlot = Math.min(n - 1, Math.floor(slot));
    const local = slot - activeSlot;
    /* local: 0–0.62 working, 0.62+ tag fixed — agent keeps blinking either way */
    for (let s = 0; s < n; s += 1) {
      const cardId = RESOLVE_ORDER[s];
      const wrap = explodeWraps[cardId];
      if (!wrap) continue;
      const agentEl = wrap.querySelector("[data-card-agent]");
      if (s < activeSlot) {
        wrap.classList.add("is-fixed");
        wrap.classList.remove("is-working");
        agentEl?.setAttribute("aria-hidden", "true");
        fixedCount += 1;
      } else if (s === activeSlot) {
        wrap.classList.add("is-working");
        agentEl?.setAttribute("aria-hidden", "false");
        if (local >= 0.62) {
          wrap.classList.add("is-fixed");
          fixedCount += 1;
        } else {
          wrap.classList.remove("is-fixed");
        }
      } else {
        wrap.classList.remove("is-working", "is-fixed");
        agentEl?.setAttribute("aria-hidden", "true");
      }
    }
  } else {
    explodeWraps.forEach((wrap) => {
      wrap.classList.remove("is-working", "is-fixed");
      wrap.querySelector("[data-card-agent]")?.setAttribute("aria-hidden", "true");
    });
  }

  const scoreStep = resolve < 0.02 ? 0 : Math.min(SCORE_STEPS.length - 1, fixedCount);
  applyScoreStep(scoreStep, resolve > 0.02 && shouldDark && scoreImprove < 0.35);
  const hudOn =
    (explode > 0.35 || resolve > 0.02) && scoreImprove < 0.35;
  phoneScoreHud?.classList.toggle("is-on", hudOn);
  phoneScoreHud?.setAttribute("aria-hidden", hudOn ? "false" : "true");

  /* Ray length + seat agent at scan start; travel only downward from there */
  if (agentNode && agentPhone && phoneShow > 0.15 && explode < 0.85) {
    const a = agentNode.getBoundingClientRect();
    const ph = agentPhone.getBoundingClientRect();
    const stickyBox = agentSticky.getBoundingClientRect();
    if (ph.width > 8 && a.width > 1 && stickyBox.height > 8) {
      const fromX = a.left + a.width * 0.5;
      const overhang = Math.max(22, ph.width * 0.07);
      const desiredViewport = Math.max(ph.width, ph.right + overhang - fromX);
      const scaleX = a.width / Math.max(agentNode.offsetWidth, 1);
      const scaleY = a.height / Math.max(agentNode.offsetHeight, 1);
      const rayW = desiredViewport / Math.max(scaleX, 0.12);
      agentSticky.style.setProperty("--scan-ray-width", `${rayW.toFixed(1)}px`);

      /* Loan list band on screen1: seat at top of band, scan down into fade.
       * On mobile the phone sits higher and fades sooner — keep the scan
       * inside the opaque screenshot, not the black gap below it. */
      const mobileScan = window.matchMedia("(max-width: 719px)").matches;
      /* Mobile phone is cropped/faded sooner — keep the whole scan in the list band */
      const scanTopY = ph.top + ph.height * (mobileScan ? 0.2 : 0.36);
      const scanBotY = ph.top + ph.height * (mobileScan ? 0.36 : 0.74);
      const seatPct =
        ((scanTopY - stickyBox.top) / stickyBox.height) * 100;
      agentSticky.style.setProperty(
        "--agent-seat-top",
        `${seatPct.toFixed(2)}%`
      );
      /* Animation origin is seated Y (0); only --scan-y-bot is travel distance */
      const yBot = (scanBotY - scanTopY) / Math.max(scaleY, 0.12);
      agentSticky.style.setProperty("--scan-y-top", "0px");
      agentSticky.style.setProperty("--scan-y-bot", `${yBot.toFixed(1)}px`);
    }
  }

  /* Start auto-scan only once seated; stop while exploding / resolving / score */
  if (
    shouldDark &&
    agentShift >= 0.98 &&
    phoneShow >= 0.98 &&
    explode < 0.2 &&
    resolve < 0.02 &&
    scoreImprove < 0.02
  ) {
    agentScanLatched = true;
  } else if (
    !shouldDark ||
    agentShift < 0.82 ||
    phoneShow < 0.82 ||
    explode >= 0.35 ||
    resolve > 0.02 ||
    scoreImprove > 0.02
  ) {
    agentScanLatched = false;
  }
  agentSticky.classList.toggle("is-scan-running", agentScanLatched);
  agentSticky.classList.toggle("is-score", scoreImprove > 0.5);
  agentPhoneStage?.setAttribute(
    "aria-hidden",
    phoneShow < 0.08 ? "true" : "false"
  );
  agentPhone?.setAttribute(
    "aria-hidden",
    phoneShow < 0.08 || scoreImprove > 0.5 ? "true" : "false"
  );
  agentSideCopy?.setAttribute(
    "aria-hidden",
    scanLayout < 0.12 ? "true" : "false"
  );
  agentScanCopy?.setAttribute(
    "aria-hidden",
    sideCopyStep === "scan" && scanLayout >= 0.12 ? "false" : "true"
  );
  agentExplode?.setAttribute("aria-hidden", explode < 0.08 ? "true" : "false");
  agentExplodeCopy?.setAttribute(
    "aria-hidden",
    sideCopyStep === "explode" ? "false" : "true"
  );
  agentResolveCopy?.setAttribute(
    "aria-hidden",
    sideCopyStep === "resolve" ? "false" : "true"
  );
  agentScoreCopy?.setAttribute(
    "aria-hidden",
    sideCopyStep === "score" ? "false" : "true"
  );
  agentPayCopy?.setAttribute(
    "aria-hidden",
    sideCopyStep === "pay" ? "false" : "true"
  );
  agentRewardsCopy?.setAttribute(
    "aria-hidden",
    sideCopyStep === "rewards" ? "false" : "true"
  );
  agentScoreImprove?.setAttribute(
    "aria-hidden",
    scoreImprove < 0.5 ? "true" : "false"
  );
  const payOn = payWithUs >= 0.45;
  const rewardsOn = payRewards >= 0.35;
  agentScoreImprove?.classList.toggle("is-pay", payOn);
  agentScoreImprove?.classList.toggle("is-rewards", rewardsOn);
  agentPay?.classList.toggle("is-on", payOn);
  agentPay?.classList.toggle("is-rewards", rewardsOn);
  agentPay?.setAttribute("aria-hidden", payOn ? "false" : "true");
  agentSticky.classList.toggle("is-rewards", rewardsOn);

  /* Burst confetti from behind the card the instant the flip lands */
  if (scoreImprove >= 0.98 && shouldDark && isHowto) {
    if (!scoreConfettiFired) {
      scoreConfettiFired = true;
      fireScoreConfetti();
    }
  } else if (scoreImprove < 0.82 || !shouldDark) {
    if (scoreConfettiFired) {
      scoreConfettiFired = false;
      stopScoreConfetti();
    }
  }

  /* Coins the instant the fan seats — park until the burst finishes, then light */
  if (payRewards >= 0.92 && shouldDark && isHowto && !programmaticNav) {
    if (!payRewardFxFired) firePayRewardFx();
  } else if (
    !programmaticNav &&
    !payCoinsPlaying &&
    (payRewards < 0.55 || (!shouldDark && p < AGENT_REWARDS_START))
  ) {
    if (payRewardFxFired || payCoinsDone) {
      stopPayRewardFx();
      payCoinsDone = false;
    }
  }
  /* Keep +N pills locked to card top-corners while the fan settles */
  if (payRewardFxFired && payRewards >= 0.45) {
    placePayPointPills();
  }
  clampPayCoinsScroll();

  /* Progress: explode → 1; resolve → 2; score → 3; pay → 4; rewards → 5 */
  let progressStep = "0";
  if (payCoinsReleased) progressStep = "5";
  else if (payWithUs >= 0.45) progressStep = "4";
  else if (scoreImproveCopy >= 0.45) progressStep = "3";
  else if (resolveCopy >= 0.45) progressStep = "2";
  else if (explode >= 0.45) progressStep = "1";
  agentProgressEl?.setAttribute("data-step", progressStep);

  const awake = shouldPeek || shouldDark;
  if (awake !== agentAwake) {
    agentNode?.classList.toggle("is-awake", awake);
    agentAwake = awake;
  }

  /* Keep lerping while settling after scroll stops */
  if (
    shouldDark &&
    (Math.abs(agentShiftTarget - agentShiftSmooth) > 0.002 ||
      Math.abs(phoneShowTarget - phoneShowSmooth) > 0.002 ||
      Math.abs(explodeTarget - explodeSmooth) > 0.002 ||
      Math.abs(resolveTarget - resolveSmooth) > 0.002 ||
      Math.abs(scoreImproveTarget - scoreImproveSmooth) > 0.002)
  ) {
    requestAnimationFrame(() => paintAgentIntro(agentProgress()));
  }
  updateImpactScrollHint();
}

function onAgentScroll() {
  if (!agentScene || agentLocking) return;

  const vh = window.innerHeight || 1;
  const y = window.scrollY;
  const pinY = agentPinScrollY();
  const soloMaxY = agentSoloMaxScrollY();
  const sceneRun = Math.max(agentScene.offsetHeight - vh, 1);

  /* Keep chapter visuals painting during nav flyovers; only skip hard resets/locks */
  if (y < pinY - vh * 0.5 && !programmaticNav) {
    agentSoloParked = false;
    agentCardsUnlocked = false;
    agentAllLatched = false;
    agentHowtoLatched = false;
    agentScanLatched = false;
    agentShiftSmooth = 0;
    phoneShowSmooth = 0;
    scanLayoutSmooth = 0;
    explodeSmooth = 0;
    resolveSmooth = 0;
    scoreImproveSmooth = 0;
    payWithUsSmooth = 0;
    payRewardsSmooth = 0;
    scoreConfettiFired = false;
    stopScoreConfetti();
    stopPayRewardFx();
    payCoinsDone = false;
    lastScoreStep = -1;
    applyScoreStep(0, false);
    agentParkedAt = 0;
    refreshAgentPinY();
  }

  /*
   * From first fold: never past the finished agent-only screen.
   * A little further scroll after settle unlocks cards.
   * Mobile skips the clamp so touch momentum stays intact.
   */
  if (!programmaticNav) {
    if (isMobileViewport()) {
      if (!agentCardsUnlocked && y > soloMaxY + 4) {
        unlockAgentCards();
      }
    } else if (!agentCardsUnlocked && y > soloMaxY + 4 && y < pinY + sceneRun * 0.9) {
      if (agentSoloSettled()) {
        unlockAgentCards();
      } else {
        lockToAgentSolo();
      }
    } else if (y >= pinY - 4 && y <= soloMaxY + 4) {
      if (!agentSoloParked && !agentCardsUnlocked) {
        agentSoloParked = true;
        agentParkedAt = performance.now();
      }
    }
  }

  paintAgentIntro(agentProgress());
}

function onAgentWheel(e) {
  if (!agentScene || programmaticNav || isMobileViewport()) return;

  const y = window.scrollY;
  const pinY = agentPinScrollY();
  const soloMaxY = agentSoloMaxScrollY();
  const goingDown = e.deltaY > 0;

  /* Park through the coin finale; continue only after it finishes */
  if (payCoinsPlaying && !payCoinsDone && goingDown) {
    const hold = payCoinsHoldScrollY();
    if (y + e.deltaY > hold) {
      payCoinsExitQueued = true;
      e.preventDefault();
      window.scrollTo(0, hold);
      return;
    }
  }

  if (!goingDown && y < pinY - 2) {
    agentSoloParked = false;
    agentCardsUnlocked = false;
    agentParkedAt = 0;
    refreshAgentPinY();
    return;
  }

  if (!goingDown || agentCardsUnlocked) return;

  /* Hard flick / scroll from above → clamp to finished agent screen */
  if (y < pinY - 2) {
    if (y + e.deltaY > soloMaxY) {
      e.preventDefault();
      lockToAgentSolo();
      paintAgentIntro(agentProgress());
    }
    return;
  }

  /* In solo zone: grow freely; stop at soloMax until a little further scroll */
  if (!agentSoloParked) {
    agentSoloParked = true;
    agentParkedAt = performance.now();
  }

  if (y + e.deltaY > soloMaxY + 1) {
    if (agentSoloSettled()) {
      unlockAgentCards();
      return;
    }
    e.preventDefault();
    lockToAgentSolo();
    paintAgentIntro(agentProgress());
  }
}

function onAgentTouchStart(e) {
  if (!e.touches?.[0]) return;
  agentTouchStartY = e.touches[0].clientY;
}

function onAgentTouchMove(e) {
  /* Never hijack touch scrolling on mobile — clampPayCoinsScroll parks via scroll */
  if (isMobileViewport()) return;
  if (!agentScene || !e.touches?.[0] || programmaticNav) return;

  const y = window.scrollY;
  const pinY = agentPinScrollY();
  const soloMaxY = agentSoloMaxScrollY();
  const dy = agentTouchStartY - e.touches[0].clientY;

  if (payCoinsPlaying && !payCoinsDone && dy > 8) {
    const hold = payCoinsHoldScrollY();
    if (y + dy > hold) {
      payCoinsExitQueued = true;
      e.preventDefault();
      window.scrollTo(0, hold);
      return;
    }
  }

  if (agentCardsUnlocked) return;
  if (dy <= 8) return;

  if (y < pinY - 2) {
    if (y + dy > soloMaxY) {
      e.preventDefault();
      lockToAgentSolo();
      paintAgentIntro(agentProgress());
    }
    return;
  }

  if (!agentSoloParked) {
    agentSoloParked = true;
    agentParkedAt = performance.now();
  }

  if (y + dy > soloMaxY + 1) {
    if (agentSoloSettled()) {
      unlockAgentCards();
      return;
    }
    e.preventDefault();
    lockToAgentSolo();
    paintAgentIntro(agentProgress());
  }
}

window.addEventListener("wheel", onAgentWheel, { passive: false });
window.addEventListener("touchstart", onAgentTouchStart, { passive: true });
/* Non-passive touchmove only on desktop — it kills mobile momentum site-wide */
if (!isMobileViewport()) {
  window.addEventListener("touchmove", onAgentTouchMove, { passive: false });
}
window.addEventListener("resize", refreshAgentPinY, { passive: true });
refreshAgentPinY();

document.querySelector("[data-story-scroll-next]")?.addEventListener("click", (e) => {
  e.preventDefault();
  goToNextDarkBeat();
});

function updateImpactScrollHint() {
  const hint = document.querySelector(".impact-scroll-hint");
  if (!hint) return;
  const cards = document.querySelector("[data-impact] .impact-metrics");
  const sticky = document.querySelector(".story-agent-sticky");
  const agent = document.querySelector("[data-gs-agent]");
  const vh = window.innerHeight || 1;
  const cardsRect = cards?.getBoundingClientRect();
  const pastCards = !!cardsRect && cardsRect.bottom < vh - 48;
  const stageOn =
    !!sticky &&
    (sticky.classList.contains("is-peeking") || sticky.classList.contains("is-dark"));
  const agentRect = agent?.getBoundingClientRect();
  const agentOnScreen =
    stageOn &&
    !!agentRect &&
    agentRect.top < vh - 40 &&
    agentRect.bottom > 20;
  /* Once the agent has scrolled off the top, never show over later white sections */
  const scrolledPastAgent = !!agentRect && agentRect.bottom <= 40;
  hint.classList.toggle("is-on", pastCards && !agentOnScreen && !scrolledPastAgent);
}

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
  const root = storyBody || storySection;
  if (!root) return 0;
  const rect = root.getBoundingClientRect();
  const total = root.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  const scrolled = -rect.top;
  return Math.min(1, Math.max(0, scrolled / total));
}

function onStoryScroll() {
  onAgentScroll();
  if (SCENE_COUNT <= 0) return;
  const progress = storyProgress();
  const index = Math.min(
    SCENE_COUNT - 1,
    Math.floor(progress * SCENE_COUNT)
  );
  setScene(index);
}

window.addEventListener("scroll", onStoryScroll, { passive: true });
window.addEventListener("resize", onStoryScroll, { passive: true });
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

/* ---------- Reveal on enter for lenders / loans / impact ---------- */
const impactSection = document.querySelector("[data-impact]");
const impactCountEls = [...document.querySelectorAll("[data-impact-count]")];
const revealables = document.querySelectorAll(
  ".loan-wall, .network-core, .section-head, .cta-panel"
);

function formatImpactCount(value, { decimals, commas, prefix, suffix }) {
  let num = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  if (commas) {
    num = num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return `${prefix}${num}${suffix}`;
}

function animateImpactCounts() {
  if (
    !impactCountEls.length ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  ) {
    return;
  }

  const duration = 900;
  impactCountEls.forEach((el, i) => {
    const to = Number(el.getAttribute("data-count-to") || 0);
    const prefix = el.getAttribute("data-count-prefix") || "";
    const suffix = el.getAttribute("data-count-suffix") || "";
    const decimals = Number(el.getAttribute("data-count-decimals") || 0);
    const commas = el.getAttribute("data-count-commas") === "true";
    /* Start near the end so the tick feels light, not a full count-up */
    const from = to * 0.82;
    const delay = i * 70;
    const startAt = performance.now() + delay;

    function tick(now) {
      if (now < startAt) {
        requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / duration);
      const eased = 1 - Math.pow(1 - t, 2.4);
      const value = from + (to - from) * eased;
      el.textContent = formatImpactCount(value, {
        decimals,
        commas,
        prefix,
        suffix,
      });
      if (t < 1) requestAnimationFrame(tick);
      else {
        el.textContent = formatImpactCount(to, {
          decimals,
          commas,
          prefix,
          suffix,
        });
      }
    }

    requestAnimationFrame(tick);
  });
}

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

  if (impactSection) {
    const impactIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            animateImpactCounts();
            impactIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.28 }
    );
    impactIo.observe(impactSection);
  }
} else if (impactSection) {
  impactSection.classList.add("is-inview");
  animateImpactCounts();
}

/* ---------- FAQ accordion (one open at a time, height animated) ---------- */
const faqItems = [...document.querySelectorAll(".faq-item")];
faqItems.forEach((item) => {
  const trigger = item.querySelector(".faq-trigger");
  if (!trigger) return;
  trigger.addEventListener("click", () => {
    const willOpen = !item.classList.contains("is-open");
    faqItems.forEach((other) => {
      const open = other === item && willOpen;
      other.classList.toggle("is-open", open);
      other.querySelector(".faq-trigger")?.setAttribute("aria-expanded", String(open));
    });
  });
});

/* ---------- Lender network scroll rotation (handled inline in index.html) ---------- */

/* ---------- Score potential modal ---------- */
(function initPotentialModal() {
  const overlay = document.querySelector("[data-potential-overlay]");
  const dialog = document.querySelector("[data-potential-dialog]");
  const currentInput = document.querySelector("[data-potential-current]");
  const errorEl = document.querySelector("[data-potential-error]");
  const slider = document.querySelector("[data-potential-slider]");
  const track = document.querySelector("[data-potential-track]");
  const currentMark = document.querySelector("[data-current-mark]");
  const targetMark = document.querySelector("[data-target-mark]");
  const currentLabel = document.querySelector("[data-current-label]");
  const targetLabel = document.querySelector("[data-target-label]");
  const unlockHeading = document.querySelector("[data-unlock-heading]");
  const loanEl = document.querySelector('[data-benefit="loan"]');
  const ccEl = document.querySelector('[data-benefit="cc"]');
  const emiEl = document.querySelector('[data-benefit="emi"]');
  const timeEl = document.querySelector('[data-benefit="time"]');
  const timeSubEl = document.querySelector('[data-benefit-sub="time"]');
  const askStep = document.querySelector('[data-potential-step="ask"]');
  const resultsStep = document.querySelector('[data-potential-step="results"]');
  if (!overlay || !currentInput || !slider || !track) return;

  const SCORE_MIN = 300;
  const SCORE_MAX = 900;
  const STEP = 5;
  let currentScore = 650;
  let targetScore = 750;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function roundTo(n, step) {
    return Math.round(n / step) * step;
  }

  function benefitsAt(score) {
    const t = clamp((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN), 0, 1);
    const ease = t * t;
    return {
      loan: roundTo(lerp(50000, 4000000, ease), 10000),
      cc: roundTo(lerp(15000, 350000, ease), 1000),
      emi: roundTo(lerp(0, 8000, ease), 100),
    };
  }

  function formatInr(n) {
    if (n >= 10000000) {
      const cr = n / 10000000;
      return `₹${cr >= 10 ? Math.round(cr) : cr.toFixed(1).replace(/\.0$/, "")}Cr`;
    }
    if (n >= 100000) {
      const l = n / 100000;
      const s = l >= 10 ? String(Math.round(l)) : l.toFixed(1).replace(/\.0$/, "");
      return `₹${s}L`;
    }
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }

  function monthsToTarget(from, to) {
    const gap = Math.max(0, to - from);
    if (gap === 0) return 0;
    return clamp(Math.round(gap / 40), 2, 18);
  }

  function monthCopy(m) {
    return `${m}–${m + 1} months`;
  }

  function scoreToPct(score) {
    return ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
  }

  function parseScore(value) {
    const n = Number.parseInt(String(value).replace(/\D/g, ""), 10);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  function validScore(n) {
    return n != null && n >= SCORE_MIN && n <= SCORE_MAX;
  }

  function setChipState(score) {
    document.querySelectorAll("[data-score-chip]").forEach((chip) => {
      chip.classList.toggle("is-on", Number(chip.dataset.scoreChip) === score);
    });
  }

  function positionMarks(current, target) {
    if (currentMark) currentMark.style.left = `${scoreToPct(current)}%`;
    if (targetMark) targetMark.style.left = `${scoreToPct(target)}%`;
    if (currentLabel) currentLabel.textContent = String(current);
    if (targetLabel) targetLabel.textContent = String(target);
    slider.setAttribute("aria-valuenow", String(target));
    slider.setAttribute("aria-valuemin", String(current));
    slider.setAttribute("aria-valuetext", `${target} target score`);
  }

  function renderBenefits(current, target) {
    const atTarget = benefitsAt(target);
    const headingScore = target;
    if (unlockHeading) {
      unlockHeading.textContent = `What you unlock at ${headingScore}+`;
    }
    if (loanEl) {
      loanEl.innerHTML = `Loan eligibility upto <strong>${formatInr(atTarget.loan)}</strong>`;
    }
    if (ccEl) {
      ccEl.innerHTML = `Credit card limit upto <strong>${formatInr(atTarget.cc)}</strong>`;
    }
    if (emiEl) {
      emiEl.innerHTML = `EMI savings upto <strong>${formatInr(atTarget.emi)} / month</strong>`;
    }
    if (timeEl) {
      if (target <= current) {
        timeEl.innerHTML = `<strong>${current}</strong> is where you are today`;
        if (timeSubEl) timeSubEl.textContent = "Drag right to see what a higher score unlocks.";
      } else {
        const months = monthsToTarget(current, target);
        timeEl.innerHTML = `High chance to reach ${target}+ in <strong>${monthCopy(months)}</strong>`;
        if (timeSubEl) {
          timeSubEl.textContent = "Based on typical credit history and active management.";
        }
      }
    }
    positionMarks(current, target);
  }

  function showStep(name, instant) {
    [askStep, resultsStep].forEach((step) => {
      const on = step.dataset.potentialStep === name;
      if (instant) step.style.transition = "none";
      step.classList.toggle("is-active", on);
      step.toggleAttribute("inert", !on);
      step.setAttribute("aria-hidden", String(!on));
    });
    if (instant) {
      requestAnimationFrame(() => {
        [askStep, resultsStep].forEach((step) => {
          step.style.transition = "";
        });
      });
    }
  }

  let closeTimer = 0;

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }

  function openModal() {
    window.clearTimeout(closeTimer);
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("potential-open");
    showStep("ask", true);
    errorEl.hidden = true;
    setChipState(parseScore(currentInput.value));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add("is-open"));
    });
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    const finish = () => {
      overlay.hidden = true;
      document.body.classList.remove("potential-open");
    };
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(finish, 480);
  }

  function showResults() {
    const parsed = parseScore(currentInput.value);
    if (!validScore(parsed)) {
      errorEl.hidden = false;
      currentInput.focus();
      return;
    }
    errorEl.hidden = true;
    currentScore = parsed;
    targetScore = currentScore >= 750 ? clamp(currentScore + 50, SCORE_MIN, SCORE_MAX) : 750;
    renderBenefits(currentScore, targetScore);
    showStep("results");
  }

  function setTarget(score) {
    const next = clamp(roundTo(score, STEP), currentScore, SCORE_MAX);
    if (next === targetScore) return;
    targetScore = next;
    renderBenefits(currentScore, targetScore);
  }

  function scoreFromPointer(clientX) {
    const rect = track.getBoundingClientRect();
    if (!rect.width) return targetScore;
    const t = clamp((clientX - rect.left) / rect.width, 0, 1);
    return SCORE_MIN + t * (SCORE_MAX - SCORE_MIN);
  }

  document.querySelectorAll("[data-potential-open]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });
  });

  overlay.querySelectorAll("[data-potential-close]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const href = el.getAttribute("href") || "";
      if (el.tagName === "A" && href.startsWith("#") && href.length > 1) {
        e.preventDefault();
        closeModal();
        const target = document.querySelector(href);
        requestAnimationFrame(() => {
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }
      e.preventDefault();
      closeModal();
    });
  });

  document.querySelector("[data-potential-show]")?.addEventListener("click", showResults);
  document.querySelector("[data-potential-back]")?.addEventListener("click", () => showStep("ask"));

  currentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      showResults();
    }
  });

  currentInput.addEventListener("input", () => {
    errorEl.hidden = true;
    setChipState(parseScore(currentInput.value));
  });

  document.querySelectorAll("[data-score-chip]").forEach((chip) => {
    chip.addEventListener("click", () => {
      currentInput.value = chip.dataset.scoreChip;
      setChipState(Number(chip.dataset.scoreChip));
      errorEl.hidden = true;
      currentInput.focus();
    });
  });

  document.querySelectorAll("[data-score-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = Number(btn.dataset.scoreStep);
      const base = parseScore(currentInput.value) ?? 650;
      const next = clamp(base + step, SCORE_MIN, SCORE_MAX);
      currentInput.value = String(next);
      setChipState(next);
      errorEl.hidden = true;
    });
  });

  slider.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    slider.classList.add("is-dragging");
    slider.setPointerCapture?.(e.pointerId);
    slider.focus({ preventScroll: true });
    setTarget(scoreFromPointer(e.clientX));
  });

  slider.addEventListener("pointermove", (e) => {
    if (!slider.classList.contains("is-dragging")) return;
    e.preventDefault();
    setTarget(scoreFromPointer(e.clientX));
  });

  const endDrag = (e) => {
    if (!slider.classList.contains("is-dragging")) return;
    slider.classList.remove("is-dragging");
    slider.releasePointerCapture?.(e.pointerId);
  };
  slider.addEventListener("pointerup", endDrag);
  slider.addEventListener("pointercancel", endDrag);

  slider.addEventListener("keydown", (e) => {
    const jumps = {
      ArrowLeft: -STEP,
      ArrowDown: -STEP,
      ArrowRight: STEP,
      ArrowUp: STEP,
      PageDown: -STEP * 10,
      PageUp: STEP * 10,
    };
    if (e.key in jumps) {
      e.preventDefault();
      setTarget(targetScore + jumps[e.key]);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setTarget(currentScore);
    } else if (e.key === "End") {
      e.preventDefault();
      setTarget(SCORE_MAX);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });

  dialog?.addEventListener("click", (e) => e.stopPropagation());
})();

