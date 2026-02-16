// 记录功能

let currentUser = null;
let selectedFoods = [];
let selectedAreas = [];
let recognition = null;
let todayRecords = []; // 存储今日已记录的数据
let recordMode = 'full'; // 'full' = 完整记录, 'meal' = 仅餐次记录

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

    // 加载今日已记录的数据
    await loadTodayRecords();

    // 日期变化时重新加载记录
    document.getElementById('record-date').addEventListener('change', function() {
        loadTodayRecords();
    });

    // 餐次选择监听 - 显示提示
    document.getElementById('meal-type').addEventListener('change', function() {
        updateMealHint();
    });

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
        if (e.agentInvoked) {
            e.respondWith(Promise.resolve({ success: false, error: "User not logged in" }));
            return;
        }
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

        // WebMCP: respond to AI agent if invoked
        if (e.agentInvoked) {
            e.respondWith(Promise.resolve({
                success: true,
                message: "Daily record saved successfully",
                record: {
                    date: recordData.record_date,
                    meal_type: recordData.meal_type,
                    itch_level: recordData.itch_level,
                    mood: recordData.mood
                }
            }));
        }

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

        if (recordData.meal_type) {
            successMsg += `餐次: ${getMealTypeName(recordData.meal_type)}\n`;
        }
        successMsg += `瘙痒程度: ${recordData.itch_level}/10分`;

        // 简化提示，不使用alert
        console.log(successMsg);

        // 重新加载今日记录
        await loadTodayRecords();

        // 根据模式决定如何重置表单
        if (recordMode === 'meal') {
            // 仅餐次模式：只重置饮食相关字段
            resetMealFields();
            // 显示成功提示
            showToast(`✓ ${getMealTypeName(recordData.meal_type)}记录成功！可继续添加其他餐次`);
        } else {
            // 完整模式：重置所有字段
            resetForm();
            showToast('✓ 记录保存成功！');
        }

    } catch (error) {
        console.error('保存失败:', error);
        if (e.agentInvoked) {
            e.respondWith(Promise.resolve({ success: false, error: error.message }));
            return;
        }
        alert('保存失败: ' + error.message);
    }
}

// 获取餐次名称
function getMealTypeName(type) {
    const names = {
        'breakfast': '早餐',
        'lunch': '午餐',
        'dinner': '晚餐',
        'snack': '零食/加餐'
    };
    return names[type] || type;
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

    // 重置记录模式为完整模式
    recordMode = 'full';

    // 隐藏"继续添加餐次"按钮
    document.getElementById('add-meal-btn').style.display = 'none';
    document.getElementById('meal-hint').style.display = 'none';

    // 重新设置日期为今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('record-date').value = today;
}

// 仅重置餐次相关字段
function resetMealFields() {
    // 清空餐次选择
    document.getElementById('meal-type').value = '';

    // 清空食物选择
    document.querySelectorAll('#food-quick-buttons .quick-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
    });
    selectedFoods = [];

    // 清空食物备注
    document.getElementById('food-notes').value = '';

    // 滚动到餐次选择区域
    document.getElementById('meal-type').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 加载今日记录
async function loadTodayRecords() {
    if (!currentUser) return;

    const selectedDate = document.getElementById('record-date').value;

    try {
        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('record_date', selectedDate)
            .order('record_time', { ascending: true });

        if (error) throw error;

        todayRecords = data || [];
        displayTodayRecords();
        updateMealHint();
    } catch (error) {
        console.error('加载今日记录失败:', error);
    }
}

// 显示今日记录
function displayTodayRecords() {
    const container = document.getElementById('today-records-container');
    const list = document.getElementById('today-records-list');
    const count = document.getElementById('today-records-count');

    if (!todayRecords || todayRecords.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    count.textContent = `共 ${todayRecords.length} 条记录`;

    let html = '';

    todayRecords.forEach((record, index) => {
        const time = new Date(record.record_time).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        html += `
            <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #667eea;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600; color: #667eea;">记录 ${index + 1}</span>
                    <span style="font-size: 12px; color: #888;">${time}</span>
                </div>
        `;

        // 餐次信息
        if (record.meal_type) {
            html += `<div style="font-size: 14px; margin-bottom: 4px;">
                <strong>🍽️ ${getMealTypeName(record.meal_type)}:</strong>
                ${(record.food_items || []).join('、') || '无'}
                ${record.food_notes ? ` (${record.food_notes})` : ''}
            </div>`;
        }

        // 运动信息
        if (record.exercise_type) {
            html += `<div style="font-size: 14px; margin-bottom: 4px;">
                <strong>🏃 运动:</strong> ${getExerciseTypeName(record.exercise_type)}`;
            if (record.exercise_duration) {
                html += ` - ${record.exercise_duration}分钟`;
            }
            html += `</div>`;
        }

        // 睡眠信息
        if (record.sleep_duration) {
            html += `<div style="font-size: 14px; margin-bottom: 4px;">
                <strong>😴 睡眠:</strong> ${record.sleep_duration}小时 - 质量${record.sleep_quality}/5分
            </div>`;
        }

        // 症状信息
        html += `<div style="font-size: 14px;">
            <strong>💊 症状:</strong> 瘙痒${record.itch_level}/10分 - ${getMoodName(record.mood)}
        </div>`;

        html += `</div>`;
    });

    list.innerHTML = html;
}

// 获取心情名称
function getMoodName(mood) {
    const names = {
        'good': '😊 心情好',
        'neutral': '😐 一般',
        'bad': '😞 不好'
    };
    return names[mood] || mood;
}

// 继续添加餐次
function addAnotherMeal() {
    // 切换到仅餐次记录模式
    recordMode = 'meal';

    // 只重置餐次相关字段
    resetMealFields();

    // 显示提示
    showToast('请选择餐次，继续记录饮食');
}

// 更新餐次提示
function updateMealHint() {
    const mealType = document.getElementById('meal-type').value;
    const addMealBtn = document.getElementById('add-meal-btn');
    const mealHint = document.getElementById('meal-hint');

    // 检查今日已有多少条记录包含餐次
    const mealCount = todayRecords.filter(r => r.meal_type && r.meal_type !== '').length;

    if (mealType && mealType !== '') {
        // 如果已经有记录，显示继续添加餐次的按钮
        if (mealCount >= 0) {
            addMealBtn.style.display = 'block';
            mealHint.style.display = 'block';
        }
    }
}

// 显示Toast提示
function showToast(message) {
    // 创建toast元素
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4caf50;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 15px;
            font-weight: 500;
            display: none;
            animation: slideDown 0.3s ease-out;
        `;
        document.body.appendChild(toast);

        // 添加CSS动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    toast.textContent = message;
    toast.style.display = 'block';

    // 3秒后自动隐藏
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}
