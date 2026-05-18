import {
  clearAccessToken,
  getMe,
  getStoredAccessToken,
  login,
  logout,
  signup,
  storeAccessToken
} from '../lib/api.js';

const statusEl = document.querySelector('[data-auth-status]');
const userEl = document.querySelector('[data-auth-user]');
const signupForm = document.querySelector('[data-signup-form]');
const loginForm = document.querySelector('[data-login-form]');
const meButton = document.querySelector('[data-me-button]');
const logoutButton = document.querySelector('[data-logout-button]');

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('회원가입 요청 중...');

  try {
    const payload = formToObject(signupForm);
    const result = await signup(payload);
    handleAuthResult(result, '회원가입이 완료되었습니다.');
  } catch (error) {
    showError(error);
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('로그인 요청 중...');

  try {
    const payload = formToObject(loginForm);
    const result = await login(payload);
    handleAuthResult(result, '로그인되었습니다.');
  } catch (error) {
    showError(error);
  }
});

meButton.addEventListener('click', async () => {
  setStatus('사용자 정보를 확인하는 중...');

  try {
    const result = await getMe();
    renderUser(result.user);
    setStatus('로그인 상태입니다.');
  } catch (error) {
    clearAccessToken();
    showError(error);
  }
});

logoutButton.addEventListener('click', async () => {
  setStatus('로그아웃 요청 중...');

  try {
    await logout();
    renderUser(null);
    setStatus('로그아웃되었습니다.');
  } catch (error) {
    showError(error);
  }
});

if (getStoredAccessToken()) {
  meButton.click();
}

function handleAuthResult(result, message) {
  storeAccessToken(result.accessToken);
  renderUser(result.user);
  setStatus(message);
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function renderUser(user) {
  if (!user) {
    userEl.textContent = '로그인된 사용자가 없습니다.';
    return;
  }

  userEl.textContent = JSON.stringify({
    user_id: user.user_id,
    email: user.email,
    nickname: user.nickname,
    auth_user_id: user.provider_user_id,
    last_login_at: user.last_login_at
  }, null, 2);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function showError(error) {
  setStatus(error.message);
}
