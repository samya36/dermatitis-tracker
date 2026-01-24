// 记录功能

let currentUser = null;
let selectedFoods = [];
let selectedAreas = [];
let recognition = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 等待Supabase初始化
    try {
        await initSupabase();
    } catch (error) {
        alert('初始化失败: ' + error.message);
        window.location.href = 'index.html';
        return;
    }

    // 检查用户登录状态
    await checkAuthStatus();

    // 初始化快捷按钮
    initQuickButtons();

    // 初始化日期选择器
    initDatePicker();

    // 初始化表单提交
    document.getElementById('recordForm').addEventListener('submit', handleFormSubmit);

    // 运动时长输入监听 - 提示用户选择运动类型
    document.getElementById('exercise-duration').addEventListener('input', function() {
        const duration = this.value;
        const typeSelect = document.getElementById('exercise-type');

        if (duration && duration.trim() !== '' && (!typeSelect.value || typeSelect.value === '')) {
            // 高亮运动类型选择框
            typeSelect.style.borderColor = '#ffa726';
            typeSelect.style.borderWidth = '2px';
        } else {
            // 恢复正常样式
            typeSelect.style.borderColor = '';
            typeSelect.style.borderWidth = '';
        }
    });

    // 运动类型选择监听 - 移除高亮
    document.getElementById('exercise-type').addEventListener('change', function() {
        this.style.borderColor = '';
        this.style.borderWidth = '';
    });

    // 初始化语音识别
    initSpeechRecognition();
});

// 检查认证状态
async function checkAuthStatus() {
    if (!supabase) {
        alert('系统未初始化，请刷新页面重试');
        window.location.href = 'index.html';
        return;
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            // 未登录，跳转到登录页
            window.location.href = 'index.html';
            return;
        }

        currentUser = user;
        // 显示用户邮箱
        document.getElementById('user-email').textContent = user.email;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        window.location.href = 'index.html';
    }
}

// 初始化日期选择器
function initDatePicker() {
    const dateInput = document.getElementById('record-date');
    if (dateInput) {
        // 设置默认值为今天
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;

        // 设置最大值为今天（不能选择未来日期）
        dateInput.max = today;
    }
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

    // 表单验证：如果填写了运动时长，必须选择运动类型
    const exerciseDuration = document.getElementById('exercise-duration').value;
    const exerciseType = document.getElementById('exercise-type').value;

    if (exerciseDuration && exerciseDuration.trim() !== '' && (!exerciseType || exerciseType === '')) {
        alert('⚠️ 请选择运动类型！\n\n你填写了运动时长，但没有选择运动类型。');
        document.getElementById('exercise-type').focus();
        return;
    }

    // 获取选择的日期
    const selectedDate = document.getElementById('record-date').value;

    // 收集表单数据
    const recordData = {
        user_id: currentUser.id,
        record_date: selectedDate, // 使用用户选择的日期
        record_time: new Date().toISOString(),

        // 饮食
        meal_type: document.getElementById('meal-type').value || null,
        food_items: selectedFoods.length > 0 ? selectedFoods : null,
        food_notes: document.getElementById('food-notes').value || null,

        // 运动
        exercise_type: document.getElementById('exercise-type').value || null,
        exercise_duration: (function() {
            const duration = document.getElementById('exercise-duration').value;
            return duration && duration.trim() !== '' ? parseInt(duration) : null;
        })(),
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

    // 打印调试信息（方便检查数据）
    console.log('=== 准备保存的记录数据 ===');
    console.log('日期:', recordData.record_date);
    console.log('运动类型:', recordData.exercise_type);
    console.log('运动时长:', recordData.exercise_duration, '分钟');
    console.log('运动强度:', recordData.exercise_intensity);
    console.log('瘙痒程度:', recordData.itch_level);
    console.log('完整数据:', recordData);
    console.log('========================');

    // 保存到Supabase
    try {
        const { data, error } = await supabase
            .from('daily_records')
            .insert([recordData]);

        if (error) throw error;

        console.log('✓ 数据已成功保存到数据库');

        // 构建保存成功的详细提示
        let successMsg = '✓ 记录保存成功！\n\n';
        successMsg += `日期: ${selectedDate}\n`;

        if (recordData.exercise_type) {
            successMsg += `运动: ${getExerciseTypeName(recordData.exercise_type)}`;
            if (recordData.exercise_duration) {
                successMsg += ` - ${recordData.exercise_duration}分钟`;
            }
            if (recordData.exercise_intensity) {
                successMsg += ` - ${getIntensityName(recordData.exercise_intensity)}`;
            }
            successMsg += '\n';
        } else if (recordData.exercise_duration) {
            successMsg += `运动时长: ${recordData.exercise_duration}分钟（未指定类型）\n`;
        }

        successMsg += `瘙痒程度: ${recordData.itch_level}/10分`;

        alert(successMsg);

        // 重置表单
        resetForm();
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 辅助函数 - 获取运动类型名称
function getExerciseTypeName(type) {
    const names = {
        'walk': '散步',
        'run': '跑步',
        'yoga': '瑜伽',
        'gym': '健身房',
        'swim': '游泳',
        'cycle': '骑行',
        'other': '其他'
    };
    return names[type] || type;
}

// 辅助函数 - 获取强度名称
function getIntensityName(intensity) {
    const names = {
        'low': '轻度',
        'medium': '中度',
        'high': '高强度'
    };
    return names[intensity] || intensity;
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
