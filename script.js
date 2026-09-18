const USERS_KEY = "retryNowUsers";
const COMMENTS_KEY = "retryNowComments";
const SESSION_KEY = "retryNowSession";
const PROFILE_KEY = "retryNowProfile";
const MAX_LINKS = 100;
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Admin123!";

const $ = (selector) => document.querySelector(selector);
const dialog = $("#account-dialog");
let step = 1;
let verificationCode = "";
let challengeAnswer = 0;

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

const read = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const currentUser = () => localStorage.getItem(SESSION_KEY);
const isAdmin = () => currentUser() === ADMIN_USERNAME;

function profileData() {
  const saved = read(PROFILE_KEY, {});
  return { ...DEFAULT_PROFILE, ...saved, links: Array.isArray(saved.links) ? saved.links.slice(0, MAX_LINKS) : DEFAULT_PROFILE.links };
}

function renderProfile() {
  const profile = profileData();
  $("#profile-image").src = profile.image;
  $("#profile-name").textContent = profile.name;
  $("#profile-subtitle").textContent = profile.subtitle;
  $("#profile-slogan").innerHTML = "";
  profile.slogan.split("\n").forEach((line, index) => { if (index) $("#profile-slogan").append(document.createElement("br")); $("#profile-slogan").append(document.createTextNode(line)); });
  const list = $("#profile-links");
  list.replaceChildren();
  profile.links.forEach((link) => { const li = document.createElement("li"); const a = document.createElement("a"); a.href = link.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = link.title; li.append(a); list.append(li); });
}

function addEditorLink(link = { title: "", url: "" }) {
  const container = $("#editor-links");
  if (container.children.length >= MAX_LINKS) return;
  const row = document.createElement("div"); row.className = "editor-link-row";
  row.innerHTML = `<input class="edit-link-title" maxlength="120" placeholder="링크 이름" required><input class="edit-link-url" type="url" placeholder="https://example.com" required><button class="remove-link" type="button" aria-label="링크 삭제">삭제</button>`;
  row.querySelector(".edit-link-title").value = link.title; row.querySelector(".edit-link-url").value = link.url;
  row.querySelector(".remove-link").addEventListener("click", () => { row.remove(); updateLinkCount(); });
  container.append(row); updateLinkCount();
}
function updateLinkCount() { const count = $("#editor-links").children.length; $("#link-limit-count").textContent = `${count} / ${MAX_LINKS}`; $("#add-link").disabled = count >= MAX_LINKS; }
function openProfileEditor() { const profile = profileData(); $("#edit-profile-image").value = profile.image; $("#edit-profile-name").value = profile.name; $("#edit-profile-subtitle").value = profile.subtitle; $("#edit-profile-slogan").value = profile.slogan; $("#editor-links").replaceChildren(); profile.links.forEach(addEditorLink); updateLinkCount(); $("#profile-editor-error").textContent = ""; $("#profile-editor-dialog").showModal(); }

$("#profile-edit-open").addEventListener("click", openProfileEditor);
$("#profile-editor-close").addEventListener("click", () => $("#profile-editor-dialog").close());
$("#profile-editor-cancel").addEventListener("click", () => $("#profile-editor-dialog").close());
$("#add-link").addEventListener("click", () => addEditorLink());
$("#profile-editor-form").addEventListener("submit", (event) => { event.preventDefault(); const rows = [...document.querySelectorAll(".editor-link-row")]; if (rows.length > MAX_LINKS) return; const links = rows.map((row) => ({ title: row.querySelector(".edit-link-title").value.trim(), url: row.querySelector(".edit-link-url").value.trim() })); if (!links.every((link) => link.title && link.url)) { $("#profile-editor-error").textContent = "링크 이름과 URL을 모두 입력해 주세요."; return; } write(PROFILE_KEY, { image: $("#edit-profile-image").value.trim(), name: $("#edit-profile-name").value.trim(), subtitle: $("#edit-profile-subtitle").value.trim(), slogan: $("#edit-profile-slogan").value, links }); renderProfile(); $("#profile-editor-dialog").close(); });

async function digest(value) { const data = new TextEncoder().encode(value); const hash = await crypto.subtle.digest("SHA-256", data); return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function ensureDefaultData() { const users = read(USERS_KEY, []); if (!users.length) write(USERS_KEY, [{ username: ADMIN_USERNAME, email: "admin@retrynow.local", passwordHash: "", createdAt: Date.now(), role: "admin" }]); if (!read(COMMENTS_KEY, []).length) write(COMMENTS_KEY, [{ user: "admin", text: "환영합니다! 댓글은 회원만 작성할 수 있어요.", createdAt: Date.now() }]); }
function renderAuth() { const user = currentUser(); if $("#auth-status") { $("#auth-status").textContent = user ? `${user}님으로 로그인됨` : "로그인이 필요해요"; } if $("#comment-form") $("#comment-form").hidden = !user; if $("#comment-login-hint") $("#comment-login-hint").hidden = Boolean(user); if $("#signup-open") $("#signup-open").hidden = Boolean(user); if $("#login-open") $("#login-open").hidden = Boolean(user); if $("#logout") $("#logout").hidden = !user; }
function renderComments() { const container = $("#comments"); if (!container) return; const comments = read(COMMENTS_KEY, []); container.replaceChildren(); if (!comments.length) { container.innerHTML = '<p class="empty">아직 댓글이 없어요. 첫 번째 인사를 남겨보세요!</p>'; return; } comments.slice().reverse().forEach((comment) => { const article = document.createElement("article"); article.className = "comment"; const meta = document.createElement("div"); meta.className = "comment-meta"; meta.textContent = `${comment.user} · ${new Date(comment.createdAt).toLocaleString("ko-KR")}`; const body = document.createElement("p"); body.textContent = comment.text; article.append(meta, body); container.append(article); }); }
function setStep(next) { step = next; $("#step-number").textContent = step; $("#progress-bar").style.width = `${step * 25}%`; document.querySelectorAll("fieldset[data-step]").forEach((field) => { field.hidden = Number(field.dataset.step) !== step; }); $("#back-step").hidden = step === 1; $("#next-step").textContent = step === 4 ? "가입 완료" : "다음"; $("#form-error").textContent = ""; }
function prepareChallenge() { const a = Math.floor(Math.random() * 8) + 2; const b = Math.floor(Math.random() * 8) + 2; challengeAnswer = a + b; $("#challenge-question").textContent = `${a} + ${b} = ?`; }
function openSignup() { $("#dialog-title").textContent = "안전한 회원가입"; $("#account-form").reset(); verificationCode = String(Math.floor(100000 + Math.random() * 900000)); $("#verification-code").textContent = `인증 코드(데모): ${verificationCode}`; prepareChallenge(); setStep(1); dialog.showModal(); }
async function login(email, password) { const userList = read(USERS_KEY, []); const normalizedEmail = (email || "").trim().toLowerCase(); const user = userList.find((item) => item.email === normalizedEmail); if (!user) return alert("가입된 이메일이 없습니다."); const passwordHash = await digest(password); if (user.passwordHash !== passwordHash && !(user.username === ADMIN_USERNAME && password === ADMIN_PASSWORD)) return alert("비밀번호가 일치하지 않습니다."); localStorage.setItem(SESSION_KEY, user.username); renderAuth(); }
function openLogin() { const email = window.prompt("가입한 이메일을 입력해 주세요."); if (!email) return; const password = window.prompt("비밀번호를 입력해 주세요."); if (password) login(email, password); }
function validateStep() { const fieldset = document.querySelector(`fieldset[data-step="${step}"]`); if (!fieldset) return false; if (![...fieldset.querySelectorAll("input")].every((control) => control.checkValidity())) { $("#form-error").textContent = "모든 항목을 정확히 입력해 주세요."; return false; } if (step === 2) { const password = $("#password").value; if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) { $("#form-error").textContent = "비밀번호는 대문자·소문자·숫자·특수문자를 모두 포함해야 해요."; return false; } if (password !== $("#password-confirm").value) { $("#form-error").textContent = "비밀번호가 일치하지 않아요."; return false; } const userList = read(USERS_KEY, []); if (userList.some((user) => user.email === $("#email").value.trim().toLowerCase() || user.username === $("#username").value.trim())) { $("#form-error").textContent = "이미 사용 중인 이메일 또는 닉네임이에요."; return false; } } if (step === 3 && $("#verification-input").value !== verificationCode) { $("#form-error").textContent = "인증 코드가 일치하지 않아요."; return false; } if (step === 4 && Number($("#challenge-answer").value) !== challengeAnswer) { $("#form-error").textContent = "계산 결과가 올바르지 않아요."; return false; } return true; }

$("#next-step").addEventListener("click", async () => { if (!validateStep()) return; if (step < 4) return setStep(step + 1); const userList = read(USERS_KEY, []); userList.push({ username: $("#username").value.trim(), email: $("#email").value.trim().toLowerCase(), passwordHash: await digest($("#password").value), createdAt: Date.now(), role: "member" }); write(USERS_KEY, userList); localStorage.setItem(SESSION_KEY, $("#username").value.trim()); dialog.close(); renderAuth(); renderComments(); });
$("#back-step").addEventListener("click", () => setStep(step - 1)); $("#signup-open").addEventListener("click", openSignup); $("#login-open").addEventListener("click", openLogin); $("#logout").addEventListener("click", () => { localStorage.removeItem(SESSION_KEY); renderAuth(); }); $(".dialog-close").addEventListener("click", () => dialog.close()); $("#comment-text").addEventListener("input", (event) => { $("#comment-count").textContent = event.target.value.length; }); $("#comment-form").addEventListener("submit", (event) => { event.preventDefault(); const text = $("#comment-text").value.trim(); const user = currentUser(); if (!text || !user) return; const comments = read(COMMENTS_KEY, []); comments.push({ user, text, createdAt: Date.now() }); write(COMMENTS_KEY, comments); event.target.reset(); $("#comment-count").textContent = "0"; renderComments(); });
ensureDefaultData(); renderProfile(); renderAuth(); renderComments();
