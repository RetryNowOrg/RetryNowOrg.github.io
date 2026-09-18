const USERS_KEY = "retryNowUsers";
const COMMENTS_KEY = "retryNowComments";
const SESSION_KEY = "retryNowSession";
const $ = (selector) => document.querySelector(selector);
const dialog = $("#account-dialog");
let step = 1;
let verificationCode = "";
let challengeAnswer = 0;

const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const currentUser = () => localStorage.getItem(SESSION_KEY);

async function digest(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function renderAuth() {
  const user = currentUser();
  $("#auth-status").textContent = user ? `${user}님으로 로그인됨` : "로그인이 필요해요";
  $("#comment-form").hidden = !user;
  $("#comment-login-hint").hidden = Boolean(user);
  $("#signup-open").hidden = Boolean(user);
  $("#login-open").hidden = Boolean(user);
  $("#logout").hidden = !user;
}

function renderComments() {
  const comments = read(COMMENTS_KEY, []);
  const container = $("#comments");
  container.replaceChildren();
  if (!comments.length) { container.innerHTML = '<p class="empty">아직 댓글이 없어요. 첫 번째 인사를 남겨보세요!</p>'; return; }
  comments.slice().reverse().forEach((comment) => {
    const article = document.createElement("article");
    article.className = "comment";
    const meta = document.createElement("div"); meta.className = "comment-meta";
    meta.textContent = `${comment.user} · ${new Date(comment.createdAt).toLocaleString("ko-KR")}`;
    const body = document.createElement("p"); body.textContent = comment.text;
    article.append(meta, body); container.append(article);
  });
}

function setStep(next) {
  step = next; $("#step-number").textContent = step; $("#progress-bar").style.width = `${step * 25}%`;
  document.querySelectorAll("fieldset[data-step]").forEach((field) => { field.hidden = Number(field.dataset.step) !== step; });
  $("#back-step").hidden = step === 1; $("#next-step").textContent = step === 4 ? "가입 완료" : "다음"; $("#form-error").textContent = "";
}

function prepareChallenge() { const a = Math.floor(Math.random() * 8) + 2; const b = Math.floor(Math.random() * 8) + 2; challengeAnswer = a + b; $("#challenge-question").textContent = `${a} + ${b} = ?`; }
function openSignup() { $("#dialog-title").textContent = "안전한 회원가입"; $("#account-form").reset(); verificationCode = String(Math.floor(100000 + Math.random() * 900000)); $("#verification-code").textContent = `인증 코드(데모): ${verificationCode}`; prepareChallenge(); setStep(1); dialog.showModal(); }
function openLogin() { const email = prompt("가입한 이메일을 입력해 주세요."); if (!email) return; const password = prompt("비밀번호를 입력해 주세요."); if (!password) return; login(email, password); }

async function login(email, password) {
  const user = read(USERS_KEY, []).find((item) => item.email === email.trim().toLowerCase());
  if (!user || user.passwordHash !== await digest(password)) { alert("이메일 또는 비밀번호가 올바르지 않습니다."); return; }
  localStorage.setItem(SESSION_KEY, user.username); renderAuth();
}

function validateStep() {
  const fieldset = document.querySelector(`fieldset[data-step="${step}"]`);
  const controls = [...fieldset.querySelectorAll("input")];
  if (!controls.every((control) => control.checkValidity())) { $("#form-error").textContent = "모든 항목을 정확히 입력해 주세요."; return false; }
  if (step === 2) {
    const password = $("#password").value;
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) { $("#form-error").textContent = "비밀번호는 대문자·소문자·숫자·특수문자를 모두 포함해야 해요."; return false; }
    if (password !== $("#password-confirm").value) { $("#form-error").textContent = "비밀번호가 일치하지 않아요."; return false; }
    if (read(USERS_KEY, []).some((user) => user.email === $("#email").value.trim().toLowerCase() || user.username === $("#username").value.trim())) { $("#form-error").textContent = "이미 사용 중인 이메일 또는 닉네임이에요."; return false; }
  }
  if (step === 3 && $("#verification-input").value !== verificationCode) { $("#form-error").textContent = "인증 코드가 일치하지 않아요."; return false; }
  if (step === 4 && Number($("#challenge-answer").value) !== challengeAnswer) { $("#form-error").textContent = "계산 결과가 올바르지 않아요."; return false; }
  return true;
}

$("#next-step").addEventListener("click", async () => {
  if (!validateStep()) return;
  if (step < 4) { setStep(step + 1); return; }
  const user = { username: $("#username").value.trim(), email: $("#email").value.trim().toLowerCase(), passwordHash: await digest($("#password").value), createdAt: Date.now() };
  write(USERS_KEY, [...read(USERS_KEY, []), user]); localStorage.setItem(SESSION_KEY, user.username); dialog.close(); renderAuth();
});
$("#back-step").addEventListener("click", () => setStep(step - 1));
$("#signup-open").addEventListener("click", openSignup);
$("#login-open").addEventListener("click", openLogin);
$("#logout").addEventListener("click", () => { localStorage.removeItem(SESSION_KEY); renderAuth(); });
$(".dialog-close").addEventListener("click", () => dialog.close());
$("#comment-text").addEventListener("input", (event) => { $("#comment-count").textContent = event.target.value.length; });
$("#comment-form").addEventListener("submit", (event) => { event.preventDefault(); const text = $("#comment-text").value.trim(); if (!text || !currentUser()) return; write(COMMENTS_KEY, [...read(COMMENTS_KEY, []), { user: currentUser(), text, createdAt: Date.now() }]); event.target.reset(); $("#comment-count").textContent = "0"; renderComments(); });
renderAuth(); renderComments();
