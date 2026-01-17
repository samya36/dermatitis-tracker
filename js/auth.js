// 认证逻辑

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 检查用户是否已登录
    checkUser();

    // 表单切换
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    showSignup.addEventListener('click', function(e) {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        hideError();
    });

    showLogin.addEventListener('click', function(e) {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        hideError();
    });

    // 登录表单提交
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await login(email, password);
    });

    // 注册表单提交
    document.getElementById('signupForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;

        if (password !== confirmPassword) {
            showError('两次输入的密码不一致');
            return;
        }

        if (password.length < 6) {
            showError('密码至少需要6位');
            return;
        }

        await signup(email, password);
    });
});

// 检查用户登录状态
async function checkUser() {
    if (!supabase) {
        showError('请先配置Supabase。查看README.md了解详情。');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // 用户已登录，跳转到应用主界面
        window.location.href = 'app.html';
    }
}

// 登录函数
async function login(email, password) {
    if (!supabase) {
        showError('请先配置Supabase。查看README.md了解详情。');
        return;
    }

    showLoading(true);
    hideError();

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // 登录成功，跳转到应用主界面
        window.location.href = 'app.html';
    } catch (error) {
        console.error('登录失败:', error);
        showError('登录失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 注册函数
async function signup(email, password) {
    if (!supabase) {
        showError('请先配置Supabase。查看README.md了解详情。');
        return;
    }

    showLoading(true);
    hideError();

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) throw error;

        // 注册成功
        if (data.user) {
            // 检查是否需要邮箱确认
            if (data.user.identities && data.user.identities.length === 0) {
                showError('该邮箱已被注册，请直接登录');
            } else if (data.user.confirmed_at) {
                // 自动登录
                window.location.href = 'app.html';
            } else {
                // 需要邮箱确认
                showSuccess('注册成功！请检查邮箱并点击确认链接。');
                // 3秒后切换到登录表单
                setTimeout(() => {
                    document.getElementById('signup-form').style.display = 'none';
                    document.getElementById('login-form').style.display = 'block';
                }, 3000);
            }
        }
    } catch (error) {
        console.error('注册失败:', error);
        showError('注册失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 显示加载状态
function showLoading(show) {
    const loading = document.getElementById('loading');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (show) {
        loading.style.display = 'block';
        loginForm.style.display = 'none';
        signupForm.style.display = 'none';
    } else {
        loading.style.display = 'none';
    }
}

// 显示错误信息
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// 隐藏错误信息
function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'none';
}

// 显示成功信息
function showSuccess(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.className = 'success-message';
    errorDiv.style.display = 'block';
}
