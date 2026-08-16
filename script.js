
const API_URL = "https://script.google.com/macros/s/AKfycbxS9Mu4qRR6grUPcHGbFtPH4iLwNo8n2_kL38Rz4RSPFEbE7QEeFHCnpC7IhTwIR1VZ/exec";
const STORAGE_KEY = "yukiWardrobeFavoritesV3";

const NO_IMAGE_HTML = `
  <div class="no-image-visual" aria-label="画像なし">
    <div>
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <path d="M52 35c3-17 19-28 34-22 10 4 16 13 17 24" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
        <path d="M80 55 30 96c-6 5-3 15 5 15h90c8 0 11-10 5-15L80 55Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"/>
        <path d="M80 55V43" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
      </svg>
      <strong>NO IMAGE</strong>
      <small>写真を準備中です</small>
    </div>
  </div>`;

const state = {
  items: [],
  filtered: [],
  favorites: new Set(loadFavorites())
};

const q = selector => document.querySelector(selector);
const els = {
  grid: q("#catalogGrid"),
  status: q("#status"),
  resultCount: q("#resultCount"),
  search: q("#searchInput"),
  category: q("#categoryFilter"),
  color: q("#colorFilter"),
  sleeve: q("#sleeveFilter"),
  pattern: q("#patternFilter"),
  reset: q("#resetButton"),
  template: q("#cardTemplate"),
  itemDialog: q("#itemDialog"),
  dialogContent: q("#dialogContent"),
  favoritesDialog: q("#favoritesDialog"),
  favoritesList: q("#favoritesList"),
  emptyFavorites: q("#emptyFavoritesMessage"),
  favoriteTray: q("#favoriteTray"),
  trayCount: q("#trayFavoriteCount"),
  headerCount: q("#headerFavoriteCount"),
  collectionCount: q("#collectionFavoriteCount"),
  viewFavorites: q("#viewFavoritesButton"),
  headerFavorites: q("#headerFavoritesButton"),
  collectionFavorites: q("#collectionFavoritesButton"),
  clientName: q("#clientName"),
  projectName: q("#projectName"),
  shootDate: q("#shootDate"),
  clientNote: q("#clientNote"),
  copyFavorites: q("#copyFavoritesButton"),
  emailFavorites: q("#emailFavoritesButton"),
  shareFavorites: q("#shareFavoritesButton"),
  printFavorites: q("#printFavoritesButton"),
  clearFavorites: q("#clearFavoritesButton"),
  shareMessage: q("#shareMessage"),
  printCreatedDate: q("#printCreatedDate"),
  printClientName: q("#printClientName"),
  printProjectName: q("#printProjectName"),
  printShootDate: q("#printShootDate"),
  printClientNote: q("#printClientNote"),
  printShareText: q("#printShareText"),
  printFavoritesList: q("#printFavoritesList")
};

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.favorites]));
}

const field = (item, names) => {
  for (const name of names) {
    if (item[name] !== undefined && item[name] !== null && String(item[name]).trim() !== "") {
      return String(item[name]).trim();
    }
  }
  return "";
};

const itemId = (item, index = 0) => field(item, ["ID", "Id", "id"]) || `item-${index}`;
const itemName = item =>
  field(item, ["サブカテゴリ", "商品名", "アイテム名", "名称"]) ||
  field(item, ["カテゴリ"]) || "衣装";

function isPublished(item) {
  const value = item["公開"];
  return value === true || ["true", "1", "yes", "公開"].includes(String(value ?? "").trim().toLowerCase());
}

function driveImageUrl(url) {
  if (!url) return "";
  const text = String(url).trim();
  let match = text.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) match = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200` : text;
}

function imageUrls(item) {
  return [
    field(item, ["写真1", "画像1", "着用画像1", "着用写真1", "着用画像", "着用写真"]),
    field(item, ["写真2", "画像2", "着用画像2", "着用写真2", "ハンガー画像"]),
    field(item, ["写真3", "画像3", "着用画像3", "着用写真3"])
  ].map(driveImageUrl);
}

function imageUrl(item) {
  return imageUrls(item).find(Boolean) || "";
}

function uniqueValues(names) {
  return [...new Set(
    state.items
      .map(item => field(item, names))
      .filter(Boolean)
      .flatMap(value => value.split(/[、,／/]/).map(v => v.trim()))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "ja"));
}

function fillSelect(select, values) {
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function setupFilters() {
  fillSelect(els.category, uniqueValues(["カテゴリ"]));
  fillSelect(els.color, uniqueValues(["色", "カラー"]));
  fillSelect(els.sleeve, uniqueValues(["袖丈", "袖"]));
  fillSelect(els.pattern, uniqueValues(["柄"]));
}

function containsSelected(actual, selected) {
  if (!selected) return true;
  return actual.split(/[、,／/]/).map(v => v.trim()).includes(selected);
}

function applyFilters() {
  const query = els.search.value.trim().toLowerCase();

  state.filtered = state.items.filter(item => {
    const searchable = [
      itemName(item),
      field(item, ["カテゴリ"]), field(item, ["色", "カラー"]),
      field(item, ["柄"]), field(item, ["袖丈", "袖"]),
      field(item, ["季節"]), field(item, ["テイスト"]),
      field(item, ["memo", "メモ"])
    ].join(" ").toLowerCase();

    return (!query || searchable.includes(query))
      && containsSelected(field(item, ["カテゴリ"]), els.category.value)
      && containsSelected(field(item, ["色", "カラー"]), els.color.value)
      && containsSelected(field(item, ["袖丈", "袖"]), els.sleeve.value)
      && containsSelected(field(item, ["柄"]), els.pattern.value);
  });

  renderCards();
}

function renderCards() {
  els.grid.replaceChildren();
  els.status.textContent = "";
  els.resultCount.textContent = `${state.filtered.length} ITEMS`;

  if (!state.filtered.length) {
    els.status.textContent = "条件に合う衣装がありません。";
    return;
  }

  state.filtered.forEach(item => {
    const index = state.items.indexOf(item);
    const id = String(itemId(item, index));
    const fragment = els.template.content.cloneNode(true);
    const card = fragment.querySelector(".card");
    const img = fragment.querySelector(".card__image");
    const placeholder = fragment.querySelector(".card__placeholder");
    const heart = fragment.querySelector(".heart-button");
    const url = imageUrl(item);

    placeholder.innerHTML = NO_IMAGE_HTML;
    fragment.querySelector(".card__meta").textContent = field(item, ["カテゴリ"]);
    fragment.querySelector(".card__title").textContent = itemName(item);
    fragment.querySelector(".card__tags").textContent =
      [field(item, ["色"]), field(item, ["柄"]), field(item, ["袖丈"])]
        .filter(Boolean).join(" ・ ");

    if (url) {
      img.src = url;
      img.alt = `${itemName(item)}の写真`;
      img.addEventListener("error", () => card.classList.add("no-image"));
    } else {
      card.classList.add("no-image");
    }

    updateHeart(heart, id);
    heart.addEventListener("click", event => {
      event.stopPropagation();
      toggleFavorite(id);
    });

    fragment.querySelector(".card__image-button")
      .addEventListener("click", () => openItem(item, id));

    els.grid.append(fragment);
  });
}

function updateHeart(button, id) {
  const active = state.favorites.has(String(id));
  button.classList.toggle("is-favorite", active);
  button.textContent = active ? "♥" : "♡";
  button.setAttribute("aria-label", active ? "選択を解除" : "選択アイテムに追加");
}

function toggleFavorite(id) {
  const key = String(id);
  state.favorites.has(key) ? state.favorites.delete(key) : state.favorites.add(key);
  saveFavorites();
  updateFavoriteUI();
  renderCards();
}

function updateFavoriteUI() {
  const count = state.favorites.size;
  els.trayCount.textContent = count;
  els.headerCount.textContent = count;
  els.collectionCount.textContent = count;
  els.favoriteTray.classList.toggle("is-visible", count > 0);
}

function setupGallery(gallery) {
  const track = gallery.querySelector(".photo-gallery__track");
  const dots = [...gallery.querySelectorAll(".photo-gallery__dot")];
  const prev = gallery.querySelector(".photo-gallery__arrow--prev");
  const next = gallery.querySelector(".photo-gallery__arrow--next");

  const update = () => {
    const index = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    prev.disabled = index <= 0;
    next.disabled = index >= dots.length - 1;
  };

  prev.addEventListener("click", () => track.scrollBy({ left: -track.clientWidth, behavior: "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: track.clientWidth, behavior: "smooth" }));
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  gallery.querySelectorAll("img").forEach(img =>
    img.addEventListener("error", () => img.parentElement.innerHTML = NO_IMAGE_HTML)
  );
  update();
}

function openItem(item, id) {
  const details = [
    ["カテゴリ", field(item, ["カテゴリ"])],
    ["色", field(item, ["色"])],
    ["柄", field(item, ["柄"])],
    ["袖丈", field(item, ["袖丈", "袖"])],
    ["季節", field(item, ["季節"])],
    ["テイスト", field(item, ["テイスト"])],
    ["memo", field(item, ["memo", "メモ"])]
  ].filter(([, value]) => value);

  const urls = imageUrls(item);
  const slides = urls.map((url, index) => `
    <div class="photo-gallery__slide">
      ${url ? `<img src="${url}" alt="${itemName(item)}の写真${index + 1}">` : NO_IMAGE_HTML}
    </div>`).join("");

  els.dialogContent.innerHTML = `
    <div class="item-detail">
      <div class="photo-gallery">
        <button class="photo-gallery__arrow photo-gallery__arrow--prev" type="button" aria-label="前の写真">‹</button>
        <div class="photo-gallery__track">${slides}</div>
        <button class="photo-gallery__arrow photo-gallery__arrow--next" type="button" aria-label="次の写真">›</button>
        <div class="photo-gallery__dots" aria-hidden="true">
          ${urls.map((_, i) => `<span class="photo-gallery__dot${i === 0 ? " is-active" : ""}"></span>`).join("")}
        </div>
      </div>
      <div class="item-detail__content">
        <p class="section-kicker">ITEM DETAIL</p>
        <h2>${itemName(item)}</h2>
        <dl class="detail-list">
          ${details.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
        </dl>
        <button id="detailFavoriteButton" class="primary-button favorite-detail-button" type="button"></button>
      </div>
    </div>`;

  setupGallery(els.dialogContent.querySelector(".photo-gallery"));
  const detailButton = q("#detailFavoriteButton");

  const refreshDetailButton = () => {
    const active = state.favorites.has(String(id));
    detailButton.classList.toggle("is-favorite", active);
    detailButton.textContent = active ? "♥ 選択を解除" : "♡ 選択アイテムに追加";
  };

  refreshDetailButton();
  detailButton.addEventListener("click", () => {
    toggleFavorite(id);
    refreshDetailButton();
  });

  els.itemDialog.showModal();
  document.body.classList.add("dialog-open");
}

function favoriteItems() {
  return state.items.filter((item, index) =>
    state.favorites.has(String(itemId(item, index)))
  );
}

function renderFavoritesDialog() {
  const items = favoriteItems();
  els.favoritesList.replaceChildren();
  els.emptyFavorites.hidden = items.length > 0;

  items.forEach(item => {
    const index = state.items.indexOf(item);
    const id = String(itemId(item, index));
    const row = document.createElement("article");
    const url = imageUrl(item);
    row.className = "favorite-row";
    row.innerHTML = `
      ${url ? `<img class="favorite-row__image" src="${url}" alt="">` : `<div class="favorite-row__image">${NO_IMAGE_HTML}</div>`}
      <div>
        <h3>${itemName(item)}</h3>
        <p>${field(item, ["ID"]) || index + 1} ／ ${[field(item, ["カテゴリ"]), field(item, ["色"]), field(item, ["柄"])].filter(Boolean).join(" ／ ")}</p>
      </div>
      <button type="button">解除</button>`;

    row.querySelector("button").addEventListener("click", () => {
      state.favorites.delete(id);
      saveFavorites();
      updateFavoriteUI();
      renderCards();
      renderFavoritesDialog();
    });
    els.favoritesList.append(row);
  });

  els.shareMessage.textContent = "";
}

function openFavorites() {
  renderFavoritesDialog();
  buildPrintDocument();
  els.favoritesDialog.showModal();
  document.body.classList.add("dialog-open");
}

function buildShareText() {
  const items = favoriteItems();
  const lines = items.map((item, index) => {
    const dataIndex = state.items.indexOf(item);
    return `${index + 1}. ${field(item, ["ID"]) || dataIndex + 1}｜${itemName(item)}｜${field(item, ["カテゴリ"])}｜${field(item, ["色"])}`;
  });

  const info = [
    els.clientName.value.trim() ? `作成者名：${els.clientName.value.trim()}` : "",
    els.projectName.value.trim() ? `案件・撮影名：${els.projectName.value.trim()}` : "",
    els.shootDate.value ? `撮影予定日：${els.shootDate.value}` : ""
  ].filter(Boolean);

  return [
    "【YUKI'S WARDROBE 衣装選定リスト】",
    ...info,
    "",
    ...(lines.length ? lines : ["選択アイテムはまだありません。"]),
    els.clientNote.value.trim() ? `\nコーディネート・連絡事項：\n${els.clientNote.value.trim()}` : "",
    "",
    `サイト：${location.href.split("#")[0]}`
  ].filter(value => value !== "").join("\n");
}

async function copyFavorites() {
  try {
    await navigator.clipboard.writeText(buildShareText());
    els.shareMessage.textContent = "選定内容をコピーしました。LINEなどに貼り付けられます。";
  } catch {
    els.shareMessage.textContent = "コピーできませんでした。ブラウザの権限をご確認ください。";
  }
}

function emailFavorites() {
  const subject = encodeURIComponent(`衣装選定リスト${els.projectName.value.trim() ? "｜" + els.projectName.value.trim() : ""}`);
  const body = encodeURIComponent(buildShareText());
  location.href = `mailto:?subject=${subject}&body=${body}`;
}

async function shareFavorites() {
  const text = buildShareText();
  if (navigator.share) {
    try {
      await navigator.share({ title: "YUKI'S WARDROBE 衣装選定リスト", text });
      els.shareMessage.textContent = "共有画面を開きました。";
    } catch (error) {
      if (error.name !== "AbortError") els.shareMessage.textContent = "共有できませんでした。";
    }
  } else {
    await copyFavorites();
  }
}


function formatDateForPrint(value) {
  if (!value) return "未入力";
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function buildPrintDocument() {
  const items = favoriteItems();
  const now = new Date();

  els.printCreatedDate.textContent =
    `作成日：${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  els.printClientName.textContent = els.clientName.value.trim() || "未入力";
  els.printProjectName.textContent = els.projectName.value.trim() || "未入力";
  els.printShootDate.textContent = formatDateForPrint(els.shootDate.value);
  els.printClientNote.textContent = els.clientNote.value.trim() || "なし";
  els.printShareText.textContent = buildShareText();

  els.printFavoritesList.replaceChildren();

  items.forEach((item, listIndex) => {
    const dataIndex = state.items.indexOf(item);
    const url = imageUrl(item);
    const card = document.createElement("article");
    card.className = "print-favorite-card";

    card.innerHTML = `
      ${url
        ? `<img src="${url}" alt="">`
        : `<div class="print-favorite-card__placeholder">${NO_IMAGE_HTML}</div>`}
      <div>
        <h4>${listIndex + 1}. ${itemName(item)}</h4>
        <p>${field(item, ["ID"]) || dataIndex + 1}</p>
        <p>${[
          field(item, ["カテゴリ"]),
          field(item, ["色"]),
          field(item, ["柄"]),
          field(item, ["袖丈"])
        ].filter(Boolean).join(" ／ ")}</p>
      </div>`;

    els.printFavoritesList.append(card);
  });

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "選択アイテムはまだありません。";
    els.printFavoritesList.append(empty);
  }
}

function printFavoritesDocument() {
  buildPrintDocument();
  const images = [...els.printFavoritesList.querySelectorAll("img")];
  const waits = images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
      setTimeout(resolve, 1800);
    });
  });
  Promise.all(waits).then(() => window.print());
}


function closeDialog(dialog) {
  dialog.close();
  document.body.classList.remove("dialog-open");
}

[els.clientName, els.projectName, els.shootDate, els.clientNote]
  .forEach(control => control.addEventListener("input", () => {
    buildPrintDocument();
  }));

[els.search, els.category, els.color, els.sleeve, els.pattern]
  .forEach(control => control.addEventListener("input", applyFilters));

els.reset.addEventListener("click", () => {
  els.search.value = "";
  els.category.value = "";
  els.color.value = "";
  els.sleeve.value = "";
  els.pattern.value = "";
  applyFilters();
});

[els.viewFavorites, els.headerFavorites, els.collectionFavorites]
  .forEach(button => button.addEventListener("click", openFavorites));

document.querySelectorAll(".dialog__close").forEach(button =>
  button.addEventListener("click", () => closeDialog(button.closest("dialog")))
);

[els.itemDialog, els.favoritesDialog].forEach(dialog =>
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog(dialog);
  })
);

els.copyFavorites.addEventListener("click", copyFavorites);
els.emailFavorites.addEventListener("click", emailFavorites);
els.shareFavorites.addEventListener("click", shareFavorites);
els.printFavorites.addEventListener("click", printFavoritesDocument);
els.clearFavorites.addEventListener("click", () => {
  if (!state.favorites.size || confirm("選択アイテムをすべて解除しますか？")) {
    state.favorites.clear();
    saveFavorites();
    updateFavoriteUI();
    renderCards();
    renderFavoritesDialog();
  }
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(element => revealObserver.observe(element));

updateFavoriteUI();

fetch(API_URL, { redirect: "follow" })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(data => {
    if (!Array.isArray(data)) throw new Error("Invalid data");
    state.items = data.filter(item =>
      isPublished(item) && Object.values(item).some(value => String(value ?? "").trim() !== "")
    );
    setupFilters();
    applyFilters();
  })
  .catch(error => {
    console.error(error);
    els.status.innerHTML = "衣装データを読み込めませんでした。<br>Apps Scriptの公開設定をご確認ください。";
    els.resultCount.textContent = "0 ITEMS";
  });
