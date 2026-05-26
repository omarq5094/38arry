document.addEventListener("DOMContentLoaded", () => {
  if (!requireLogin()) return;
  const user = getAuthUser();
  document.getElementById("welcomeTitle").textContent = user ? `مرحبًا ${user.name}` : "لوحة العميل";
  document.getElementById("refreshBtn").addEventListener("click", loadMyProperties);
  loadMyProperties();
});

async function loadMyProperties() {
  const status = document.getElementById("myStatus");
  const grid = document.getElementById("myPropertiesGrid");
  status.className = "status-box";
  status.textContent = "جاري تحميل عقاراتك...";
  grid.innerHTML = "";
  try {
    const result = await authApiGet("getMyProperties", { token: getAuthToken() });
    if (!result.ok) throw new Error(result.error || "تعذر تحميل العقارات");
    const properties = result.data || [];
    status.textContent = properties.length ? `لديك ${properties.length} إعلان.` : "لا توجد عقارات مرتبطة بحسابك حتى الآن.";
    grid.innerHTML = properties.map(renderMyPropertyCard).join("");
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

function renderMyPropertyCard(property) {
  const id = property.property_id || "";
  const image = getCoverImage(property.images);
  const hasImage = Array.isArray(property.images) && property.images.some((img) => img && (img.drive_file_id || img.image_url));
  const status = String(property.status || "").toLowerCase();
  return `
    <article class="property-card ${hasImage ? "" : "no-image-card"}">
      ${hasImage ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(property.title || "عقار")}" onerror="this.closest('.property-card').classList.add('no-image-card'); this.remove();" />` : ""}
      <div class="card-body">
        <span class="status-pill ${getStatusClass(status)}">${translateStatus(status)}</span>
        <h3>${escapeHtml(property.title || "عقار بدون عنوان")}</h3>
        <div class="meta">${escapeHtml(property.city || "")} - ${escapeHtml(property.district || "")}</div>
        <div class="price">${formatPrice(property.price)} ريال</div>
        <div class="meta">رقم العقار: ${escapeHtml(id)}</div>
        ${status === "needs_update" ? `<div class="status-box error">إعلانك يحتاج تعديل: ${escapeHtml(property.review_note || "راجع ملاحظة الموظف ثم أعد الإرسال.")}</div>` : (property.review_note ? `<div class="status-box">${escapeHtml(property.review_note)}</div>` : "")}
        <div class="actions">
          ${status === "active" ? `<a class="primary-btn" href="property.html?id=${encodeURIComponent(id)}">عرض المنشور</a>` : ""}
          ${(["active","needs_update","pending"].includes(status)) ? `<a class="warning-btn" href="edit-property.html?id=${encodeURIComponent(id)}">${status === "active" ? "تعديل وإعادة للمراجعة" : "تعديل الإعلان"}</a>` : ""}
          ${status !== "deleted_by_owner" ? `<button class="danger-btn" type="button" onclick="deleteMyProperty('${escapeAttr(id)}')">حذف الإعلان</button>` : ""}
        </div>
      </div>
    </article>`;
}

function getFirstImage(property) {
  return Array.isArray(property.images) && property.images.length ? resolveImageUrl(property.images[0]) : "https://placehold.co/800x500?text=No+Image";
}
function getStatusClass(status) { return status === "active" ? "ok" : status === "pending" ? "wait" : status === "needs_update" ? "warn" : status === "rejected" ? "bad" : ""; }
function translateStatus(status) {
  return ({ pending:"تحت المراجعة", active:"منشور", needs_update:"يحتاج تعديل", rejected:"مرفوض", hidden:"مخفي", sold:"مباع", rented:"مؤجر" })[status] || status || "-";
}
function formatPrice(value) { return Number(value || 0).toLocaleString("en-US"); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

async function deleteMyProperty(propertyId) {
  const confirmed = confirm("هل أنت متأكد من حذف الإعلان؟ لن يظهر للزوار ولن يظهر للموظفين ضمن المراجعة.");
  if (!confirmed) return;

  const status = document.getElementById("myStatus");
  status.className = "status-box";
  status.textContent = "جاري حذف الإعلان...";

  try {
    const result = await authApiPost({
      action: "deleteMyProperty",
      token: getAuthToken(),
      property_id: propertyId
    });

    if (!result.ok) throw new Error(result.error || "فشل حذف الإعلان");

    status.classList.add("success");
    status.textContent = result.message || "تم حذف الإعلان.";
    await loadMyProperties();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

function escapeAttr(value) {
  return String(value ?? "").replaceAll("'", "\\'");
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
