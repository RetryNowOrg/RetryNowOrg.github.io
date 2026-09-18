const USERS_KEY = "retryNowUsers";
const COMMENTS_KEY = "retryNowComments";
const SESSION_KEY = "retryNowSession";
const PROFILE_KEY = "retryNowProfile";
const MAX_LINKS = 100;
const ADMIN_USERNAME = "admin";

const $ = (selector) => document.querySelector(selector);
const read = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const currentUser = () => localStorage.getItem(SESSION_KEY);

const DEFAULT_PROFILE = {
  image: "img/Screenshot_20260914-200720_KakaoTalk.jpg",
  name: "이담비",
  subtitle: "이담비",
  slogan: "안녕하세요!\n귀여운 소녀 이담비예요!\n#RetryNow 💕",
  links: [
    { title: "토키노 소라", url: "https://m.youtube.com/@TokinoSora" },
    { title: "하나 마키아", url: "https://m.youtube.com/@HanaMacchia" }
  ]
};

function profileData() {
  const saved = read(PROFILE_KEY, {});
  return {
    ...DEFAULT_PROFILE,
    ...saved,
    links: Array.isArray(saved.links) ? saved.links.slice(0, MAX_LINKS) : DEFAULT_PROFILE.links
  };
}

function renderProfile() {
  const profile = profileData();
  const image = $("#profile-image");
  if (image) image.src = profile.image;
  if ($("#profile-name")) $("#profile-name").textContent = profile.name;
  if ($("#profile-subtitle")) $("#profile-subtitle").textContent = profile.subtitle;
  const slogan = $("#profile-slogan");
  if (slogan) {
    slogan.replaceChildren();
    profile.slogan.split("\n").forEach((line, index) => {
      if (index) slogan.append(document.createElement("br"));
      slogan.append(document.createTextNode(line));
    });
  }
  const list = $("#profile-links");
  if (!list) return;
  list.replaceChildren();
  profile.links.forEach((link) => {
    const item = document.createElement("li");
    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = link.title;
    item.append(anchor);
    list.append(item);
  });
}

function updateLinkCount() {
  const container = $("#editor-links");
  const count = container ? container.children.length : 0;
  if ($("#link-limit-count")) $("#link-limit-count").textContent = `${count} / ${MAX_LINKS}`;
  if ($("#add-link")) $("#add-link").disabled = count >= MAX_LINKS;
}

function addEditorLink(link = { title: "", url: "" }) {
  const container = $("#editor-links");
  if (!container || container.children.length >= MAX_LINKS) return;
  const row = document.createElement("div");
  row.className = "editor-link-row";
  row.innerHTML = '<input class="edit-link-title" maxlength="120" placeholder="링크 이름" required><input class="edit-link-url" type="url" placeholder="https://example.com" required><button class="remove-link" type="button">삭제</button>';
  row.querySelector(".edit-link-title").value = link.title || "";
  row.querySelector(".edit-link-url").value = link.url || "";
  row.querySelector(".remove-link").addEventListener("click", () => {
    row.remove();
    updateLinkCount();
  });
  container.append(row);
  updateLinkCount();
}

function openProfileEditor() {
  const profile = profileData();
  $("#edit-profile-image").value = profile.image;
  $("#edit-profile-name").value = profile.name;
  $("#edit-profile-subtitle").value = profile.subtitle;
  $("#edit-profile-slogan").value = profile.slogan;
  const links = $("#editor-links");
  links.replaceChildren();
  profile.links.forEach(addEditorLink);
  updateLinkCount();
  $("#profile-editor-error").textContent = "";
  $("#profile-editor-dialog").showModal();
}

function setupProfileEditor() {
  const open = $("#profile-edit-open");
  const dialog = $("#profile-editor-dialog");
  if (!open || !dialog) return;
  open.addEventListener("click", openProfileEditor);
  $("#profile-editor-close").addEventListener("click", () => dialog.close());
  $("#profile-editor-cancel").addEventListener("click", () => dialog.close());
  $("#add-link").addEventListener("click", () => addEditorLink());
  $("#profile-editor-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const rows = [...document.querySelectorAll(".editor-link-row")];
    const profile = {
      image: $("#edit-profile-image").value.trim(),
      name: $("#edit-profile-name").value.trim(),
      subtitle: $("#edit-profile-subtitle").value.trim(),
      slogan: $("#edit-profile-slogan").value,
      links: rows.map((row) => ({
        title: row.querySelector(".edit-link-title").value.trim(),
        url: row.querySelector(".edit-link-url").value.trim()
      }))
    };
    if (!profile.name || !profile.image) {
      $("#profile-editor-error").textContent = "이름과 이미지 URL을 입력해 주세요.";
      return;
    }
    write(PROFILE_KEY, profile);
    renderProfile();
    dialog.close();
  });
}

function renderAuth() {
  const user = currentUser();
  const status = $("#auth-status");
  if (status) status.textContent = user ? `${user}님으로 로그인됨` : "로그인이 필요해요";
  if ($("#signup-open")) $("#signup-open").hidden = Boolean(user);
  if ($("#login-open")) $("#login-open").hidden = Boolean(user);
  if ($("#logout")) $("#logout").hidden = !user;
  if ($("#comment-form")) $("#comment-form").hidden = !user;
  if ($("#comment-login-hint")) $("#comment-login-hint").hidden = Boolean(user);
}

function renderComments() {
  const container = $("#comments");
  if (!container) return;
  const comments = read(COMMENTS_KEY, []);
  container.replaceChildren();
  comments.forEach((comment) => {
    const item = document.createElement("p");
    item.textContent = `${comment.username}: ${comment.text}`;
    container.append(item);
  });
}

function setupComments() {
  const form = $("#comment-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = $("#comment-text").value.trim();
    if (!text || !currentUser()) return;
    const comments = read(COMMENTS_KEY, []);
    comments.push({ username: currentUser(), text, createdAt: Date.now() });
    write(COMMENTS_KEY, comments);
    form.reset();
    renderComments();
  });
}

function setupAuth() {
  $("#logout")?.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    renderAuth();
  });
  $("#login-open")?.addEventListener("click", () => {
    const username = window.prompt("닉네임을 입력해 주세요.");
    if (username) {
      localStorage.setItem(SESSION_KEY, username.trim());
      renderAuth();
    }
  });
  $("#signup-open")?.addEventListener("click", () => {
    const username = window.prompt("사용할 닉네임을 입력해 주세요.");
    if (username && username.trim().length >= 2) {
      localStorage.setItem(SESSION_KEY, username.trim());
      renderAuth();
    }
  });
}

setupProfileEditor();
setupAuth();
setupComments();
renderProfile();
renderAuth();
renderComments();
