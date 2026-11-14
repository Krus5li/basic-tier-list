const STORAGE_KEY = "tier-list";
const TIERS = ["S", "A", "B", "C", "D", "F"];

const titleInput = document.querySelector("#title");
const addForm = document.querySelector("#add-form");
const nameInput = document.querySelector("#item-name");
const clearButton = document.querySelector("#clear");
const statusEl = document.querySelector("#status");
const boardEl = document.querySelector("#board");

let state = loadState();

titleInput.value = state.title;
titleInput.addEventListener("input", () => {
  state.title = titleInput.value;
  save();
});

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  if (statusEl.dataset.kind !== "save") statusEl.hidden = true;

  state.pool.push({ id: crypto.randomUUID(), name, image: "" });
  addForm.reset();
  render();
  save();
});

clearButton.addEventListener("click", () => {
  if (!window.confirm("Clear the title, unranked items, and every tier?")) return;
  state = defaultState();
  titleInput.value = state.title;
  render();
  save();
});

render();

function defaultState() {
  return {
    title: "My Tier List",
    pool: [
      {id: "1", name: "Landing your dream job/financial security", image: ""},
      {id: "2", name: "Having an amazing friend group", image: ""},
      {id: "3", name: "Being in perfect health", image: ""},
      {id: "4", name: "Successfully keeping to your lifestyle habits", image: ""},
      {id: "5", name: "A growing relationship with God", image: ""},
      {id: "6", name: "Travelling around the world", image: ""},
      {id: "7", name: "Punching a person that you really dislike :)", image: ""},
      {id: "8", name: "Winning a lottery", image: ""},
      {id: "9", name: "Dating your ideal person", image: ""},
      {id: "10", name: "Being recognized for your hard work", image: ""}
    ],
    tiers: TIERS.map((id) => ({ id, label: id, items: [] })),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    return defaultState();
  }
}

function normalizeState(parsed) {
  const base = defaultState();
  if (!parsed || typeof parsed !== "object") return base;
  base.title = typeof parsed.title === "string" ? parsed.title : base.title;
  base.pool = Array.isArray(parsed.pool) ? parsed.pool.filter(isItem) : [];
  const savedTiers = Array.isArray(parsed.tiers) ? parsed.tiers : [];
  base.tiers = TIERS.map((id) => {
    const match = savedTiers.find((tier) => tier && tier.id === id);
    return {
      id,
      label: id,
      items: match && Array.isArray(match.items) ? match.items.filter(isItem) : [],
    };
  });
  return base;
}

function isItem(item) {
  return item && typeof item.id === "string" && typeof item.name === "string";
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!statusEl.hidden && statusEl.dataset.kind === "save") {
      statusEl.hidden = true;
    }
  } catch (error) {
    showStatus("Could not save. The list may be too large for browser storage.", "save");
  }
}

function showStatus(message, kind) {
  statusEl.hidden = false;
  statusEl.dataset.kind = kind || "info";
  statusEl.textContent = message;
}

function render() {
  boardEl.replaceChildren();
  boardEl.append(createRow("pool", "Unranked", state.pool));
  for (const tier of state.tiers) {
    boardEl.append(createRow(tier.id, tier.label, tier.items));
  }
}

function createRow(tierId, label, items) {
  const row = document.createElement("section");
  row.className = "row";
  row.dataset.tier = tierId;

  const labelEl = document.createElement("div");
  labelEl.className = "row-label";
  labelEl.textContent = label;

  const zone = document.createElement("div");
  zone.className = "drop-zone";
  zone.dataset.tier = tierId;
  zone.setAttribute("role", "region");
  zone.setAttribute("aria-label", label);

  for (const item of items) {
    zone.append(createCard(item));
  }

  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });
  zone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove("drag-over");
  });
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("drag-over");
    const id = event.dataTransfer.getData("text/plain");
    if (!id) return;
    moveItem(id, items, null);
    render();
    save();
  });

  row.append(labelEl, zone);
  return row;
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = "card";
  card.draggable = true;
  card.dataset.id = item.id;

  const body = document.createElement("div");
  body.className = "card-body";

  const handle = document.createElement("span");
  handle.className = "handle";
  handle.textContent = "⋮⋮";
  handle.setAttribute("role", "button");
  handle.setAttribute("aria-label", `Drag ${item.name}`);
  handle.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    startPointerDrag(event, item, card, handle);
  });

  const name = document.createElement("div");
  name.className = "item-name";
  name.contentEditable = "plaintext-only";
  name.textContent = item.name;
  name.spellcheck = false;
  name.setAttribute("role", "textbox");
  name.setAttribute("aria-label", "Item name");
  name.addEventListener("mousedown", (event) => event.stopPropagation());
  name.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      name.blur();
    }
  });
  name.addEventListener("blur", () => {
    const next = name.textContent.replace(/\s+/g, " ").trim().slice(0, 160);
    item.name = next || item.name;
    name.textContent = item.name;
    save();
  });

  const remove = document.createElement("button");
  remove.className = "remove";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Remove ${item.name}`);
  remove.addEventListener("mousedown", (event) => event.stopPropagation());
  remove.addEventListener("click", () => {
    removeItem(item.id);
    render();
    save();
  });

  body.append(handle, name, remove);
  card.append(body);

  card.addEventListener("dragstart", (event) => {
    if (card.classList.contains("dragging") || event.target.closest(".item-name, .remove")) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));
  card.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });
  card.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData("text/plain");
    if (!id || id === item.id) return;
    const list = listContaining(item.id);
    moveItem(id, list, item.id);
    render();
    save();
  });

  return card;
}

function startPointerDrag(event, item, card, handle) {
  const ghost = card.cloneNode(true);
  ghost.classList.add("ghost");
  ghost.querySelectorAll("input, button").forEach((node) => node.remove());
  document.body.append(ghost);
  card.classList.add("dragging");
  placeGhost(ghost, event);

  const drag = { id: item.id, pointerId: event.pointerId, ghost, card };
  try {
    handle.setPointerCapture(event.pointerId);
  } catch (error) {
    // A pointer that is already gone cannot be captured. Listeners still receive events.
  }

  function onMove(moveEvent) {
    if (moveEvent.pointerId !== drag.pointerId) return;
    moveEvent.preventDefault();
    placeGhost(ghost, moveEvent);
    scrollNearEdge(moveEvent.clientY);
    highlightPointerTarget(moveEvent.clientX, moveEvent.clientY, card);
  }

  function onEnd(endEvent) {
    if (endEvent.pointerId !== drag.pointerId) return;
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onEnd);
    handle.removeEventListener("pointercancel", onEnd);
    const drop = endEvent.type === "pointerup";
    finishPointerDrag(drag, endEvent.clientX, endEvent.clientY, drop);
  }

  handle.addEventListener("pointermove", onMove, { passive: false });
  handle.addEventListener("pointerup", onEnd);
  handle.addEventListener("pointercancel", onEnd);
}

function placeGhost(ghost, event) {
  ghost.style.left = `${event.clientX}px`;
  ghost.style.top = `${event.clientY}px`;
}

function scrollNearEdge(clientY) {
  const edge = 56;
  if (clientY < edge) window.scrollBy(0, -14);
  else if (clientY > window.innerHeight - edge) window.scrollBy(0, 14);
}

function highlightPointerTarget(x, y, sourceCard) {
  document.querySelectorAll(".drag-over").forEach((zone) => zone.classList.remove("drag-over"));
  const target = pointerTargetAt(x, y, sourceCard);
  if (target) target.zone.classList.add("drag-over");
}

function pointerTargetAt(x, y, sourceCard) {
  const element = document.elementFromPoint(x, y);
  if (!element) return null;
  const card = element.closest(".card");
  if (card && card !== sourceCard && !card.classList.contains("ghost")) {
    const zone = card.closest(".drop-zone");
    return zone ? { card, zone } : null;
  }
  const zone = element.closest(".drop-zone");
  return zone ? { card: null, zone } : null;
}

function finishPointerDrag(drag, x, y, drop) {
  drag.ghost.remove();
  document.querySelectorAll(".drag-over").forEach((zone) => zone.classList.remove("drag-over"));
  const target = drop ? pointerTargetAt(x, y, drag.card) : null;
  if (!target || (target.card && target.card.dataset.id === drag.id)) {
    drag.card.classList.remove("dragging");
    return;
  }
  if (target.card) {
    moveItem(drag.id, listContaining(target.card.dataset.id), target.card.dataset.id);
  } else {
    moveItem(drag.id, listForTier(target.zone.dataset.tier), null);
  }
  render();
  save();
}

function listForTier(tierId) {
  if (tierId === "pool") return state.pool;
  const tier = state.tiers.find((entry) => entry.id === tierId);
  return tier ? tier.items : null;
}

function listContaining(id) {
  if (state.pool.some((item) => item.id === id)) return state.pool;
  for (const tier of state.tiers) {
    if (tier.items.some((item) => item.id === id)) return tier.items;
  }
  return null;
}

function removeItem(id) {
  const list = listContaining(id);
  if (!list) return;
  const index = list.findIndex((item) => item.id === id);
  if (index !== -1) list.splice(index, 1);
}

function moveItem(id, targetList, beforeId) {
  if (!targetList) return;
  const source = listContaining(id);
  if (!source) return;
  const index = source.findIndex((item) => item.id === id);
  if (index === -1) return;
  const [item] = source.splice(index, 1);
  let insertAt = targetList.length;
  if (beforeId) {
    const beforeIndex = targetList.findIndex((entry) => entry.id === beforeId);
    if (beforeIndex !== -1) insertAt = beforeIndex;
  }
  targetList.splice(insertAt, 0, item);
}

