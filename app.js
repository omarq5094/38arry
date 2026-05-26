const api = CONFIG.API_URL;

let allProperties = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof requireAuthenticatedPage === "function" && !requireAuthenticatedPage()) return;
  if (typeof loadSiteSettings === "function") await loadSiteSettings();
  if (document.getElementById("propertiesGrid")) {
    loadPublicProperties();
    loadPublicStats();
    loadPublicContactSettings();
    setupFilters();
  }

  if (document.getElementById("propertyForm")) {
    setupPropertyForm();
    setupImagePreview();
    loadPublicContactSettings();
  }

  if (document.getElementById("propertyDetails")) {
    loadPropertyDetails();
    setupLeadForm();
    loadPublicContactSettings();
  }
});

async function apiGet(action, params = {}) {
  const url = new URL(api);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString());
  return res.json();
}

async function apiPost(payload) {
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function loadPublicProperties() {
  const status = document.getElementById("publicStatus");
  const grid = document.getElementById("propertiesGrid");

  try {
    status.classList.remove("hidden");
    status.textContent = "جاري تحميل العقارات...";
    const result = await apiGet("getPublicProperties", { token: getAuthToken() });

    if (!result.ok) throw new Error(result.error || "فشل تحميل العقارات");

    allProperties = sortFeaturedFirst(result.data || []);
    renderProperties(allProperties);
    updatePublicPublishedCount(allProperties.length);

    status.textContent = allProperties.length
      ? `تم تحميل ${allProperties.length} عقار.`
      : "لا توجد عقارات منشورة حتى الآن.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
    grid.innerHTML = "";
  }
}

function setupFilters() {
  const toggleBtn = document.getElementById("toggleAdvancedFiltersBtn");
  const advancedPanel = document.getElementById("advancedFiltersPanel");

  if (toggleBtn && advancedPanel) {
    toggleBtn.addEventListener("click", () => {
      advancedPanel.classList.toggle("hidden");
      toggleBtn.textContent = advancedPanel.classList.contains("hidden") ? "بحث متقدم" : "إخفاء المتقدم";
    });
  }

  const clearBtn = document.getElementById("clearFiltersBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      ["searchInput", "cityFilter", "districtFilter", "typeFilter", "purposeFilter", "minPriceFilter", "maxPriceFilter", "minAreaFilter", "maxAreaFilter", "bedroomsFilter", "sortFilter"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      applyFilters();
    });
  }

  ["searchInput", "cityFilter", "districtFilter", "typeFilter", "purposeFilter", "minPriceFilter", "maxPriceFilter", "minAreaFilter", "maxAreaFilter", "bedroomsFilter", "sortFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", applyFilters);
  });
}

function applyFilters() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const city = (document.getElementById("cityFilter")?.value || "").trim().toLowerCase();
  const district = (document.getElementById("districtFilter")?.value || "").trim().toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const purpose = document.getElementById("purposeFilter").value;
  const minPrice = Number(document.getElementById("minPriceFilter")?.value || 0);
  const maxPrice = Number(document.getElementById("maxPriceFilter")?.value || 0);
  const minArea = Number(document.getElementById("minAreaFilter")?.value || 0);
  const maxArea = Number(document.getElementById("maxAreaFilter")?.value || 0);
  const bedrooms = Number(document.getElementById("bedroomsFilter")?.value || 0);
  const sort = document.getElementById("sortFilter")?.value || "";

  let filtered = allProperties.filter(p => {
    const text = `${p.title || ""} ${p.city || ""} ${p.district || ""} ${p.description || ""}`.toLowerCase();
    const price = Number(p.price || 0);
    const area = Number(p.area || 0);
    const rooms = Number(p.bedrooms || 0);

    return (!q || text.includes(q)) &&
      (!city || String(p.city || "").toLowerCase().includes(city)) &&
      (!district || String(p.district || "").toLowerCase().includes(district)) &&
      (!type || p.type === type) &&
      (!purpose || p.purpose === purpose) &&
      (!minPrice || price >= minPrice) &&
      (!maxPrice || price <= maxPrice) &&
      (!minArea || area >= minArea) &&
      (!maxArea || area <= maxArea) &&
      (!bedrooms || rooms >= bedrooms);
  });

  filtered = sortProperties(filtered, sort);
  renderProperties(filtered);
}

function sortProperties(properties, sort) {
  const list = [...properties];

  if (sort === "price_asc") {
    return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }

  if (sort === "price_desc") {
    return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }

  if (sort === "area_desc") {
    return list.sort((a, b) => Number(b.area || 0) - Number(a.area || 0));
  }

  if (sort === "bedrooms_desc") {
    return list.sort((a, b) => Number(b.bedrooms || 0) - Number(a.bedrooms || 0));
  }

  if (sort === "newest") {
    return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  return sortFeaturedFirst(list);
}

function sortFeaturedFirst(properties) {
  return [...properties].sort((a, b) => {
    const af = String(a.is_featured || "").toLowerCase() === "yes" ? 1 : 0;
    const bf = String(b.is_featured || "").toLowerCase() === "yes" ? 1 : 0;
    if (bf !== af) return bf - af;
    return new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0);
  });
}

function renderProperties(properties) {
  const grid = document.getElementById("propertiesGrid");

  if (!properties.length) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = properties.map(property => {
    const image = getCoverImage(property.images);
    const hasImage = hasPropertyImage(property);
    return `
      <article class="property-card ${hasImage ? "" : "no-image-card"}">
        ${hasImage ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(property.title || "عقار")}" onerror="this.closest('.property-card').classList.add('no-image-card'); this.remove();" />` : ""}
        <div class="card-body">
          ${String(property.is_featured || "").toLowerCase() === "yes" ? `<span class="status-pill ok">مثبت</span>` : ""}
          <h3>${escapeHtml(property.title || "عقار بدون عنوان")}</h3>
          <div class="meta">${escapeHtml(property.city || "")} - ${escapeHtml(property.district || "")}</div>
          <div class="price">${renderPublicPrice(property)}</div>
          <div class="meta">${translateType(property.type)} • ${translatePurpose(property.purpose)} • ${property.area || "-"} م²</div>
          <div class="actions">
            <a class="primary-btn" href="property.html?id=${encodeURIComponent(property.property_id || property.id || property.ID || "")}">عرض التفاصيل</a>
            ${property.map_url ? `<a class="secondary-btn" href="${escapeHtml(property.map_url)}" target="_blank">Google Maps</a>` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function hasPropertyImage(property) {
  return Array.isArray(property.images) && property.images.some((img) => img && (img.drive_file_id || img.image_url));
}

function setupPropertyForm() {
  const form = document.getElementById("propertyForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = document.getElementById("submitStatus");
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true);
    status.className = "status-box";
    status.textContent = "جاري إرسال العقار ورفع الصور...";
    status.classList.remove("hidden");

    try {
      const fd = new FormData(form);
      const imagesInput = document.getElementById("propertyImagesInput") || form.elements.images;
      const files = Array.from(imagesInput.files || []);
      const maxImages = CONFIG.MAX_IMAGES_PER_PROPERTY || 10;

      if (files.length > maxImages) {
        throw new Error(`الحد الأقصى هو ${maxImages} صور لكل عقار.`);
      }

      const images = await Promise.all(files.map(fileToBase64Payload));

      const payload = {
        action: "submitProperty",
        token: typeof getAuthToken === "function" ? getAuthToken() : "",
        owner_name: fd.get("owner_name"),
        owner_phone: fd.get("owner_phone"),
        title: fd.get("title"),
        type: fd.get("type"),
        purpose: fd.get("purpose"),
        city: fd.get("city"),
        district: fd.get("district"),
        price: fd.get("price"),
        show_price: form.elements.show_price && form.elements.show_price.checked ? "yes" : "no",
        area: fd.get("area"),
        bedrooms: fd.get("bedrooms"),
        bathrooms: fd.get("bathrooms"),
        map_url: fd.get("map_url"),
        latitude: fd.get("latitude"),
        longitude: fd.get("longitude"),
        description: fd.get("description"),
        images
      };

      const result = await apiPost(payload);

      if (!result.ok) throw new Error(result.error || "فشل إرسال العقار");

      status.classList.add("success");
      status.textContent = (result.message || "تم إرسال العقار للمراجعة بنجاح.") + (typeof isLoggedIn === "function" && isLoggedIn() ? " يمكنك متابعة الإعلان من صفحة عقاراتي." : "");
      setButtonLoading(submitButton, false);
      form.reset();
      clearSelectedImagesPreview();
    } catch (error) {
      status.classList.add("error");
      status.textContent = error.message;
      setButtonLoading(submitButton, false);
    }
  });
}

async function loadPropertyDetails() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const status = document.getElementById("propertyStatus");
  const box = document.getElementById("propertyDetails");

  if (!id) {
    status.classList.add("error");
    status.textContent = "رقم العقار غير موجود في الرابط.";
    return;
  }

  try {
    const result = await apiGet("getPropertyById", {
      token: getAuthToken(), property_id: id });
    if (!result.ok) throw new Error(result.error || "تعذر تحميل العقار");

    const p = result.data;
    document.title = p.title || "تفاصيل العقار";
    box.innerHTML = renderPropertyDetails(p);
    box.classList.remove("hidden");
    status.classList.add("hidden");
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

function renderPropertyDetails(p) {
  const images = Array.isArray(p.images) ? p.images : [];
  const gallery = images.length
    ? images.slice(0, 4).map(img => `<img src="${escapeHtml(resolveImageUrl(img))}" onerror="this.src='https://placehold.co/800x500?text=No+Image'" />`).join("")
    : `<img src="https://placehold.co/800x500?text=No+Image" />`;

  const map = p.latitude && p.longitude
    ? `<div class="map-box"><iframe loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(p.latitude + "," + p.longitude)}&z=15&output=embed"></iframe></div>`
    : "";

  return `
    <div class="gallery">${gallery}</div>
    <h2>${escapeHtml(p.title || "عقار")}</h2>
    <p>${escapeHtml(p.description || "لا يوجد وصف.")}</p>
    <div class="details-grid">
      <div class="detail-item"><strong>السعر</strong>${renderPublicPrice(p)}</div>
      <div class="detail-item"><strong>المدينة</strong>${escapeHtml(p.city || "-")}</div>
      <div class="detail-item"><strong>الحي</strong>${escapeHtml(p.district || "-")}</div>
      <div class="detail-item"><strong>المساحة</strong>${p.area || "-"} م²</div>
      <div class="detail-item"><strong>النوع</strong>${translateType(p.type)}</div>
      <div class="detail-item"><strong>الغرض</strong>${translatePurpose(p.purpose)}</div>
      <div class="detail-item"><strong>الغرف</strong>${p.bedrooms || "-"}</div>
      <div class="detail-item"><strong>دورات المياه</strong>${p.bathrooms || "-"}</div>
    </div>
    <div class="actions">
      ${p.map_url ? `<a class="secondary-btn" href="${escapeHtml(p.map_url)}" target="_blank">فتح الموقع في Google Maps</a>` : ""}
    </div>
    ${map}
  `;
}

function setupLeadForm() {
  const form = document.getElementById("leadForm");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const params = new URLSearchParams(location.search);
    const property_id = params.get("id");
    const status = document.getElementById("leadStatus");
    status.className = "status-box";
    status.textContent = "جاري إرسال الطلب...";
    status.classList.remove("hidden");

    try {
      const fd = new FormData(form);
      const result = await apiPost({
        action: "submitLead",
        property_id,
        customer_name: fd.get("customer_name"),
        customer_phone: fd.get("customer_phone"),
        request_type: fd.get("request_type"),
        message: fd.get("message")
      });

      if (!result.ok) throw new Error(result.error || "فشل إرسال الطلب");

      status.classList.add("success");
      status.textContent = result.message || "تم إرسال الطلب بنجاح.";
      form.reset();
    } catch (error) {
      status.classList.add("error");
      status.textContent = error.message;
    }
  });
}

function fileToBase64Payload(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error(`الصورة ${file.name} أكبر من 5MB`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve({
      filename: file.name,
      base64: reader.result
    });
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    reader.readAsDataURL(file);
  });
}

function getFirstImage(property) {
  if (Array.isArray(property.images) && property.images.length) {
    return resolveImageUrl(property.images[0]);
  }
  return "https://placehold.co/800x500?text=No+Image";
}

function renderPublicPrice(property) {
  if (String(property.price_hidden || "").toLowerCase() === "yes") {
    return "السعر عند التواصل";
  }

  if (property.price === undefined || property.price === null || property.price === "") {
    return "السعر عند التواصل";
  }

  return `${formatPrice(property.price)} ريال`;
}

function formatPrice(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-US");
}

function translateType(type) {
  const map = { villa: "فيلا", apartment: "شقة", land: "أرض", building: "عمارة", shop: "محل" };
  return map[type] || type || "-";
}

function translatePurpose(purpose) {
  const map = { sale: "بيع", rent: "إيجار" };
  return map[purpose] || purpose || "-";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function resolveImageUrl(imgOrUrl) {
  if (!imgOrUrl) return "https://placehold.co/800x500?text=No+Image";

  if (typeof imgOrUrl === "object") {
    if (imgOrUrl.drive_file_id) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(imgOrUrl.drive_file_id)}&sz=w1200`;
    }

    if (imgOrUrl.image_url) {
      return normalizeDriveImageUrl(imgOrUrl.image_url);
    }

    return "https://placehold.co/800x500?text=No+Image";
  }

  return normalizeDriveImageUrl(String(imgOrUrl));
}

function normalizeDriveImageUrl(url) {
  if (!url) return "https://placehold.co/800x500?text=No+Image";

  const text = String(url);

  const idMatch = text.match(/[?&]id=([^&]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(idMatch[1])}&sz=w1200`;
  }

  const fileMatch = text.match(/\/file\/d\/([^/]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileMatch[1])}&sz=w1200`;
  }

  return text;
}


async function loadPublicStats() {
  const node = document.getElementById("publicPublishedCount");
  if (!node) return;

  try {
    const result = await apiGet("getPublicStats", { token: getAuthToken() });
    if (!result.ok) throw new Error(result.error || "stats error");
    updatePublicPublishedCount(result.data.active_properties || 0);
  } catch (_) {
    updatePublicPublishedCount(allProperties.length || 0);
  }
}

function updatePublicPublishedCount(value) {
  const node = document.getElementById("publicPublishedCount");
  if (node) node.textContent = value || 0;
}


function resolveImageUrl(imgOrUrl) {
  if (!imgOrUrl) return "https://placehold.co/800x500?text=No+Image";

  if (typeof imgOrUrl === "object") {
    if (imgOrUrl.drive_file_id) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(imgOrUrl.drive_file_id)}&sz=w1200`;
    }

    if (imgOrUrl.image_url) {
      return normalizeDriveImageUrl(imgOrUrl.image_url);
    }

    return "https://placehold.co/800x500?text=No+Image";
  }

  return normalizeDriveImageUrl(String(imgOrUrl));
}

function normalizeDriveImageUrl(url) {
  if (!url) return "https://placehold.co/800x500?text=No+Image";

  const text = String(url);
  const idMatch = text.match(/[?&]id=([^&]+)/);

  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(idMatch[1])}&sz=w1200`;
  }

  const fileMatch = text.match(/\/file\/d\/([^/]+)/);

  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileMatch[1])}&sz=w1200`;
  }

  return text;
}

function getCoverImage(images) {
  if (!Array.isArray(images) || !images.length) {
    return "https://placehold.co/800x500?text=No+Image";
  }

  const cover = images.find((img) => String(img.is_cover || "").toLowerCase() === "yes");
  return resolveImageUrl(cover || images[0]);
}

function translateStatus(status) {
  const map = {
    pending: "تحت المراجعة",
    active: "منشور",
    needs_update: "يحتاج تعديل",
    rejected: "مرفوض",
    hidden: "مخفي",
    sold: "مباع",
    rented: "مؤجر",
    deleted_by_owner: "محذوف من المالك"
  };

  return map[String(status || "").toLowerCase()] || status || "-";
}

function getStatusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "ok";
  if (s === "pending") return "wait";
  if (s === "needs_update") return "warn";
  if (s === "rejected" || s === "deleted_by_owner") return "bad";
  if (s === "sold" || s === "rented") return "ok";
  return "";
}


function setupImagePreview() {
  const input = document.getElementById("propertyImagesInput");
  const clearBtn = document.getElementById("clearSelectedImagesBtn");

  if (!input) return;

  input.addEventListener("change", renderSelectedImagesPreview);

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearSelectedImagesPreview();
    });
  }
}

function renderSelectedImagesPreview() {
  const input = document.getElementById("propertyImagesInput");
  const wrapper = document.getElementById("selectedImagesPreview");
  const grid = document.getElementById("selectedImagesGrid");
  const count = document.getElementById("selectedImagesCount");

  if (!input || !wrapper || !grid || !count) return;

  const files = Array.from(input.files || []);
  const maxImages = CONFIG.MAX_IMAGES_PER_PROPERTY || 10;

  if (!files.length) {
    clearSelectedImagesPreview();
    return;
  }

  count.textContent = `${files.length} / ${maxImages}`;

  if (files.length > maxImages) {
    count.className = "status-pill bad";
  } else {
    count.className = "status-pill wait";
  }

  grid.innerHTML = "";

  files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "selected-image-card";

    const img = document.createElement("img");
    img.alt = `صورة ${index + 1}`;
    img.src = URL.createObjectURL(file);

    const meta = document.createElement("div");
    meta.className = "selected-image-meta";
    meta.textContent = `${index + 1}. ${file.name} • ${formatFileSize(file.size)}`;

    item.appendChild(img);
    item.appendChild(meta);
    grid.appendChild(item);
  });

  wrapper.classList.remove("hidden");
}

function clearSelectedImagesPreview() {
  const wrapper = document.getElementById("selectedImagesPreview");
  const grid = document.getElementById("selectedImagesGrid");
  const count = document.getElementById("selectedImagesCount");

  if (grid) grid.innerHTML = "";
  if (count) {
    count.textContent = `0 / ${CONFIG.MAX_IMAGES_PER_PROPERTY || 10}`;
    count.className = "status-pill wait";
  }
  if (wrapper) wrapper.classList.add("hidden");
}

function formatFileSize(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)}MB`;
}

let publicContactSettings = null;

async function loadPublicContactSettings() {
  try {
    const result = await apiGet("getContactSettings");
    if (!result.ok) return;

    publicContactSettings = result.data || null;
    renderPublicContactButtons(publicContactSettings);
  } catch (_) {}
}

function renderPublicContactButtons(settings) {
  if (!settings || !settings.phone) return;

  const nodes = document.querySelectorAll("[data-public-contact]");
  nodes.forEach((node) => {
    node.innerHTML = `
      <a class="whatsapp-btn" href="${escapeHtml(settings.whatsapp_url)}" target="_blank">WhatsApp</a>
      <a class="call-btn" href="${escapeHtml(settings.call_url)}">اتصال مباشر</a>
    `;
  });
}


function setButtonLoading(button, isLoading, loadingText = "جاري الإرسال...") {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    button.classList.add("is-loading");
    return;
  }

  button.disabled = false;
  button.textContent = button.dataset.originalText || "إرسال";
  button.classList.remove("is-loading");
}
