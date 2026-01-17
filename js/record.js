// 记录功能

let currentUser = null;
let selectedFoods = [];
let selectedAreas = [];
let recognition = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 检查用户登录状态
    await checkAuthStatus();

    // 初始化快捷按钮
    initQuickButtons();

    // 初始化表单提交
    document.getElementById('recordForm').addEventListener('submit', handleFormSubmit);

    // 初始化语音识别
    initSpeechRecognition();
});

// 检查认证状态
async function checkAuthStatus() {
    if (!supabase) {
        alert('请先配置Supabase。查看README.md了解详情。');
        window.location.href = 'index.html';
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // 未登录，跳转到登录页
        window.location.href = 'index.html';
        return;
    }

    currentUser = user;
    // 显示用户邮箱
    document.getElementById('user-email').textContent = user.email;
}

// 初始化快捷按钮
function initQuickButtons() {
    // 食物快捷按钮
    const foodButtons = document.querySelectorAll('#food-quick-buttons .quick-btn');
    foodButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const food = this.dataset.food;
            if (this.classList.contains('selected')) {
                // 取消选择
                this.classList.remove('selected');
                selectedFoods = selectedFoods.filter(f => f !== food);
            } else {
                // 选择
                this.classList.add('selected');
                selectedFoods.push(food);
            }
        });
    });

    // 受影响部位快捷按钮
    const areaButtons = document.querySelectorAll('#affected-areas-buttons .quick-btn');
    areaButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const area = this.dataset.area;
            if (this.classList.contains('selected')) {
                // 取消选择
                this.classList.remove('selected');
                selectedAreas = selectedAreas.filter(a => a !== area);
            } else {
                // 选择
                this.classList.add('selected');
                selectedAreas.push(area);
            }
        });
    });
}

// 初始化语音识别
function initSpeechRecognition() {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        document.getElementById('voice-btn').disabled = true;
        document.getElementById('voice-status').textContent = '你的浏览器不支持语音输入';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('voice-input').value = transcript;
        document.getElementById('voice-status').textContent = '✓ 识别完成';
    };

    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        document.getElementById('voice-status').textContent = '识别失败: ' + event.error;
    };

    recognition.onend = function() {
        document.getElementById('voice-btn').textContent = '开始语音输入';
    };
}

// 开始语音输入
function startVoiceInput() {
    if (!recognition) {
        alert('你的浏览器不支持语音输入');
        return;
    }

    document.getElementById('voice-status').textContent = '🎤 正在识别...';
    document.getElementById('voice-btn').textContent = '识别中...';

    try {
        recognition.start();
    } catch (error) {
        console.error('启动语音识别失败:', error);
        document.getElementById('voice-status').textContent = '启动失败';
        document.getElementById('voice-btn').textContent = '开始语音输入';
    }
}

// 处理表单提交
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!currentUser) {
        alert('请先登录');
        return;
    }

    // 收集表单数据
    const recordData = {
        user_id: currentUser.id,
        record_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        record_time: new Date().toISOString(),

        // 饮食
        meal_type: document.getElementById('meal-type').value || null,
        food_items: selectedFoods.length > 0 ? selectedFoods : null,
        food_notes: document.getElementById('food-notes').value || null,

        // 运动
        exercise_type: document.getElementById('exercise-type').value || null,
        exercise_duration: parseInt(document.getElementById('exercise-duration').value) || null,
        exercise_intensity: document.getElementById('exercise-intensity').value || null,

        // 睡眠
        sleep_quality: parseInt(document.getElementById('sleep-quality').value),
        sleep_duration: parseFloat(document.getElementById('sleep-duration').value) || null,
        sleep_notes: document.getElementById('sleep-notes').value || null,

        // 症状
        itch_level: parseInt(document.getElementById('itch-level').value),
        affected_areas: selectedAreas.length > 0 ? selectedAreas : null,
        symptom_notes: document.getElementById('symptom-notes').value || null,
        mood: document.getElementById('mood').value,

        // 语音输入
        voice_input: document.getElementById('voice-input').value || null,
    };

    // 保存到Supabase
    try {
        const { data, error } = await supabase
            .from('daily_records')
            .insert([recordData]);

        if (error) throw error;

        alert('✓ 记录保存成功！');

        // 重置表单
        resetForm();
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 重置表单
function resetForm() {
    document.getElementById('recordForm').reset();

    // 重置快捷按钮
    document.querySelectorAll('.quick-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
    });

    selectedFoods = [];
    selectedAreas = [];

    // 重置滑块显示
    updateSliderValue('sleep-quality-value', 3);
    updateSliderValue('itch-level-value', 5);

    // 清空语音输入
    document.getElementById('voice-input').value = '';
    document.getElementById('voice-status').textContent = '';
}
