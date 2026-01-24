// 认证逻辑

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 等待Supabase初始化
    try {
        await initSupabase();
    } catch (error) {
        showError('初始化失败: ' + error.message);
        return;
    }

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
        console.error('Supabase未初始化');
        return;
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            console.error('获取用户信息失败:', error);
            return;
        }

        if (user) {
            // 用户已登录，跳转到应用主界面
            window.location.href = 'app.html';
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
    }
}

// 登录函数
async function login(email, password) {
    if (!supabase) {
        showError('系统未初始化，请刷新页面重试');
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
        let errorMessage = '登录失败';

        // 提供更友好的错误提示
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = '邮箱或密码错误';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = '请先验证邮箱';
        } else if (error.message) {
            errorMessage = '登录失败: ' + error.message;
        }

        showError(errorMessage);
    } finally {
        showLoading(false);
    }
}

// 注册函数
async function signup(email, password) {
    if (!supabase) {
        showError('系统未初始化，请刷新页面重试');
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
        let errorMessage = '注册失败';

        if (error.message) {
            errorMessage = '注册失败: ' + error.message;
        }

        showError(errorMessage);
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
