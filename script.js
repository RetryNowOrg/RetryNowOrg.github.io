const USERS_KEY = "retryNowUsers";
const COMMENTS_KEY = "retryNowComments";
const SESSION_KEY = "retryNowSession";
const ADMIN_KEY = "retryNowAdmin";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Admin123!";

const $ = (selector) => document.querySelector(selector);
const dialog = $("#account-dialog");
let step = 1;
let verificationCode = "";
let challengeAnswer = 0;

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
const isAdmin = () => currentUser() === ADMIN_USERNAME;

async function digest(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function ensureDefaultData() {
  const users = read(USERS_KEY, []);
  if (!users.length) {
    write(USERS_KEY, [{
      username: ADMIN_USERNAME,
      email: "admin@retrynow.local",
      passwordHash: "",
      createdAt: Date.now(),
      role: "admin"
    }]);
  }

  if (!read(COMMENTS_KEY, []).length) {
    write(COMMENTS_KEY, [
      { user: "admin", text: "환영합니다! 댓글은 회원만 작성할 수 있어요.", createdAt: Date.now() }
    ]);
  }
}

function renderAuth() {
  const user = currentUser();
  const status = $("#auth-status");
  if (status) status.textContent = user ? `${user}님으로 로그인됨` : "로그인이 필요해요";

  if ($("#comment-form")) $("#comment-form").hidden = !user;
  if ($("#comment-login-hint")) $("#comment-login-hint").hidden = Boolean(user);
  if ($("#signup-open")) $("#signup-open").hidden = Boolean(user);
  if ($("#login-open")) $("#login-open").hidden = Boolean(user);
  if ($("#logout")) $("#logout").hidden = !user;
}

function renderComments() {
  const container = $("#comments");
  if (!container) return;

  const comments = read(COMMENTS_KEY, []);
  container.replaceChildren();

  if (!comments.length) {
    container.innerHTML = '<p class="empty">아직 댓글이 없어요. 첫 번째 인사를 남겨보세요!</p>';
    return;
  }

  comments
    .slice()
    .reverse()
    .forEach((comment) => {
      const article = document.createElement("article");
      article.className = "comment";

      const meta = document.createElement("div");
      meta.className = "comment-meta";
      meta.textContent = `${comment.user} · ${new Date(comment.createdAt).toLocaleString("ko-KR")}`;

      const body = document.createElement("p");
      body.textContent = comment.text;

      article.append(meta, body);
      container.append(article);
    });
}

function setStep(next) {
  step = next;
  $("#step-number").textContent = step;
  $("#progress-bar").style.width = `${step * 25}%`;

  document.querySelectorAll("fieldset[data-step]").forEach((field) => {
    field.hidden = Number(field.dataset.step) !== step;
  });

  $("#back-step").hidden = step === 1;
  $("#next-step").textContent = step === 4 ? "가입 완료" : "다음";
  $("#form-error").textContent = "";
}

function prepareChallenge() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  challengeAnswer = a + b;
  $("#challenge-question").textContent = `${a} + ${b} = ?`;
}

function openSignup() {
  $("#dialog-title").textContent = "안전한 회원가입";
  $("#account-form").reset();
  verificationCode = String(Math.floor(100000 + Math.random() * 900000));
  $("#verification-code").textContent = `인증 코드(데모): ${verificationCode}`;
  prepareChallenge();
  setStep(1);
  dialog.showModal();
}

async function login(email, password) {
  const userList = read(USERS_KEY, []);
  const normalizedEmail = (email || "").trim().toLowerCase();
  const user = userList.find((item) => item.email === normalizedEmail);
  if (!user) {
    alert("가입된 이메일이 없습니다.");
    return;
  }

  const passwordHash = await digest(password);
  if (user.passwordHash !== passwordHash && !(user.username === ADMIN_USERNAME && password === ADMIN_PASSWORD)) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  localStorage.setItem(SESSION_KEY, user.username);
  renderAuth();
}

function openLogin() {
  const email = window.prompt("가입한 이메일을 입력해 주세요.");
  if (!email) return;
  const password = window.prompt("비밀번호를 입력해 주세요.");
  if (!password) return;
  login(email, password);
}

function validateStep() {
  const fieldset = document.querySelector(`fieldset[data-step="${step}"]`);
  if (!fieldset) return false;

  const controls = [...fieldset.querySelectorAll("input")];
  if (!controls.every((control) => control.checkValidity())) {
    $("#form-error").textContent = "모든 항목을 정확히 입력해 주세요.";
    return false;
  }

  if (step === 2) {
    const password = $("#password").value;
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      $("#form-error").textContent = "비밀번호는 대문자·소문자·숫자·특수문자를 모두 포함해야 해요.";
      return false;
    }

    if (password !== $("#password-confirm").value) {
      $("#form-error").textContent = "비밀번호가 일치하지 않아요.";
      return false;
    }

    const userList = read(USERS_KEY, []);
    const exists = userList.some((user) => user.email === $("#email").value.trim().toLowerCase() || user.username === $("#username").value.trim());
    if (exists) {
      $("#form-error").textContent = "이미 사용 중인 이메일 또는 닉네임이에요.";
      return false;
    }
  }

  if (step === 3 && $("#verification-input").value !== verificationCode) {
    $("#form-error").textContent = "인증 코드가 일치하지 않아요.";
    return false;
  }

  if (step === 4 && Number($("#challenge-answer").value) !== challengeAnswer) {
    $("#form-error").textContent = "계산 결과가 올바르지 않아요.";
    return false;
  }

  return true;
}

$("#next-step").addEventListener("click", async () => {
  if (!validateStep()) return;

  if (step < 4) {
    setStep(step + 1);
    return;
  }

  const userList = read(USERS_KEY, []);
  const user = {
    username: $("#username").value.trim(),
    email: $("#email").value.trim().toLowerCase(),
    passwordHash: await digest($("#password").value),
    createdAt: Date.now(),
    role: "member"
  };

  userList.push(user);
  write(USERS_KEY, userList);
  localStorage.setItem(SESSION_KEY, user.username);
  dialog.close();
  renderAuth();
  renderComments();
});

$("#back-step").addEventListener("click", () => setStep(step - 1));
$("#signup-open").addEventListener("click", openSignup);
$("#login-open").addEventListener("click", openLogin);
$("#logout").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  renderAuth();
});

$(".dialog-close").addEventListener("click", () => dialog.close());

$("#comment-text").addEventListener("input", (event) => {
  $("#comment-count").textContent = event.target.value.length;
});

$("#comment-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const text = $("#comment-text").value.trim();
  const user = currentUser();

  if (!text || !user) return;

  const comments = read(COMMENTS_KEY, []);
  comments.push({ user, text, createdAt: Date.now() });
  write(COMMENTS_KEY, comments);

  event.target.reset();
  $("#comment-count").textContent = "0";
  renderComments();
});

ensureDefaultData();
renderAuth();
renderComments();
