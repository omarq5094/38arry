let SITE_SETTINGS = null;

async function loadSiteSettings() {
  const defaults = {
    contact_phone: "0533172872",
    whatsapp_message: "السلام عليكم، أرغب بالاستفسار عن عقار",
    office_name: "مكتب العقار",
    office_address: "",
    max_images_per_property: 10,
    allow_customer_register: "yes",
    maintenance_mode: "off",
    homepage_title: "واجهة عقارية حديثة لمكتبك",
    homepage_subtitle: "تجربة عرض سريعة، فلترة واضحة، ونظام مراجعة قبل النشر لضمان جودة الإعلانات."
  };

  SITE_SETTINGS = {
    ...defaults,
    ...(typeof SITE_CONFIG !== "undefined" ? SITE_CONFIG : {})
  };

  applySiteSettings(SITE_SETTINGS);
  return SITE_SETTINGS;
}

function applySiteSettings(settings) {
  if (!settings) return;

  if (settings.max_images_per_property) {
    CONFIG.MAX_IMAGES_PER_PROPERTY = Number(settings.max_images_per_property || CONFIG.MAX_IMAGES_PER_PROPERTY || 10);
  }

  const titleNode = document.querySelector("[data-homepage-title]");
  if (titleNode && settings.homepage_title) {
    titleNode.textContent = settings.homepage_title;
  }

  const subtitleNode = document.querySelector("[data-homepage-subtitle]");
  if (subtitleNode && settings.homepage_subtitle) {
    subtitleNode.textContent = settings.homepage_subtitle;
  }

  document.querySelectorAll("[data-office-name]").forEach((node) => {
    node.textContent = settings.office_name || "";
  });

  document.querySelectorAll("[data-office-address]").forEach((node) => {
    node.textContent = settings.office_address || "";
  });

  if (settings.maintenance_mode === "on") {
    showMaintenanceBanner();
  }

  if (settings.allow_customer_register === "no") {
    document.querySelectorAll("[data-register-link]").forEach((node) => {
      node.classList.add("hidden");
    });
  }
}

function showMaintenanceBanner() {
  if (document.getElementById("maintenanceBanner")) return;

  const banner = document.createElement("div");
  banner.id = "maintenanceBanner";
  banner.className = "maintenance-banner";
  banner.textContent = "الموقع في وضع الصيانة مؤقتًا. قد تكون بعض الخدمات غير متاحة.";

  document.body.prepend(banner);
}

function getContactSettingsFromSiteSettings() {
  const data = SITE_SETTINGS || {};
  const phone = data.contact_phone || CONFIG.CONTACT_PHONE || "";
  const whatsappPhone = data.normalized_phone || CONFIG.WHATSAPP_PHONE || normalizeSaudiPhone(phone);
  const message = data.whatsapp_message || CONFIG.WHATSAPP_MESSAGE || "السلام عليكم، أرغب بالاستفسار عن عقار";

  return {
    phone,
    whatsappPhone,
    message,
    whatsappUrl: whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}` : "",
    callUrl: whatsappPhone ? `tel:+${whatsappPhone}` : ""
  };
}

function normalizeSaudiPhone(phone) {
  let value = String(phone || "").replace(/\s+/g, "").replace(/-/g, "").replace(/\+/g, "");

  if (!value) return "";

  if (value.startsWith("00")) value = value.substring(2);
  if (value.startsWith("0")) value = "966" + value.substring(1);
  if (value.startsWith("5") && value.length === 9) value = "966" + value;

  return /^9665\d{8}$/.test(value) ? value : "";
}
