const AUTH_STORAGE_KEY = "realEstateAuth";

function saveAuth(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session || {}));
}

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "{}");
  } catch (_) {
    return {};
  }
}

function getAuthToken() {
  return getAuth().token || "";
}

function getAuthUser() {
  return getAuth().user || null;
}

function isLoggedIn() {
  return Boolean(getAuthToken());
}

function isStaffRole(role) {
  return ["employee", "manager", "admin"].includes(String(role || "").toLowerCase());
}

function requireLogin() {
  if (!isLoggedIn()) {
    location.href = "login.html";
    return false;
  }
  return true;
}

async function authApiPost(payload) {
  const res = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  return res.json();
}

async function authApiGet(action, params = {}) {
  const url = new URL(CONFIG.API_URL);
  url.searchParams.set("action", action);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString());
  return res.json();
}

async function logoutUser() {
  const token = getAuthToken();

  try {
    if (token) {
      await authApiPost({ action: "logoutUser", token });
    }
  } catch (_) {}

  localStorage.removeItem(AUTH_STORAGE_KEY);
  location.href = "login.html";
}

function renderAuthNav() {
  const user = getAuthUser();
  const nodes = document.querySelectorAll("[data-auth-nav]");

  nodes.forEach((node) => {
    if (!user) {
      node.innerHTML = `
        <a href="login.html">دخول</a>
        <a href="register.html">تسجيل</a>
      `;
      return;
    }

    if (isStaffRole(user.role)) {
      node.innerHTML = `
        <a href="index.html">الرئيسية</a>
        <a href="my-properties.html">عقاراتي</a>
        <a href="admin.html">لوحة الموظف</a>
        <button class="theme-toggle" type="button" onclick="logoutUser()">خروج</button>
      `;
      return;
    }

    node.innerHTML = `
      <a href="my-properties.html">عقاراتي</a>
      <button class="theme-toggle" type="button" onclick="logoutUser()">خروج</button>
    `;
  });
}

async function requireStaffPage() {
  if (!requireLogin()) return false;

  const statusNode = document.querySelector("[data-staff-guard-status]");

  try {
    const result = await authApiGet("getCurrentUser", {
      token: getAuthToken()
    });

    if (!result.ok) {
      throw new Error(result.error || "تعذر التحقق من الصلاحية");
    }

    const user = result.user;

    saveAuth({
      token: getAuthToken(),
      user
    });

    if (!isStaffRole(user.role)) {
      if (statusNode) {
        statusNode.className = "status-box error";
        statusNode.textContent = "ليس لديك صلاحية دخول لوحة الموظفين.";
      }

      setTimeout(() => {
        location.href = "my-properties.html";
      }, 900);

      return false;
    }

    return true;
  } catch (error) {
    if (statusNode) {
      statusNode.className = "status-box error";
      statusNode.textContent = error.message;
    }

    setTimeout(() => {
      location.href = "login.html";
    }, 900);

    return false;
  }
}

document.addEventListener("DOMContentLoaded", renderAuthNav);


function requireAuthenticatedPage() {
  if (!isLoggedIn()) {
    const next = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    location.href = `login.html?next=${next}`;
    return false;
  }

  return true;
}
