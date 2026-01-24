// 数据展示功能

let historyData = [];

// 加载历史记录
async function loadHistory() {
    if (!currentUser) return;

    const dateRange = document.getElementById('date-range').value;
    const historyList = document.getElementById('history-list');

    historyList.innerHTML = '<p style="text-align: center; color: #888;">加载中...</p>';

    try {
        // 计算日期范围
        let query = supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('record_date', { ascending: false })
            .order('record_time', { ascending: false });

        if (dateRange !== 'all') {
            const days = parseInt(dateRange);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            query = query.gte('record_date', startDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query;

        if (error) throw error;

        historyData = data || [];

        if (historyData.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #888;">还没有记录，快去记录吧！</p>';
            return;
        }

        // 显示记录
        displayRecords(historyData);

        // 显示图表
        displayCharts(historyData);
    } catch (error) {
        console.error('加载失败:', error);
        historyList.innerHTML = '<p style="text-align: center; color: #f44;">加载失败: ' + error.message + '</p>';
    }
}

// 显示记录列表
function displayRecords(records) {
    const historyList = document.getElementById('history-list');

    let html = '';

    records.forEach(record => {
        const date = new Date(record.record_date);
        const dateStr = date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });

        // 构建运动信息
        let exerciseInfo = '';
        if (record.exercise_type && record.exercise_type !== '') {
            exerciseInfo = `<div class="record-detail"><strong>运动：</strong>${getExerciseTypeName(record.exercise_type)}`;
            if (record.exercise_duration) {
                exerciseInfo += ` - ${record.exercise_duration}分钟`;
            }
            if (record.exercise_intensity) {
                exerciseInfo += ` - ${getIntensityName(record.exercise_intensity)}`;
            }
            exerciseInfo += `</div>`;
        } else if (record.exercise_duration) {
            // 如果只填写了时长但没选类型，也显示出来
            exerciseInfo = `<div class="record-detail"><strong>运动：</strong>未指定类型 - ${record.exercise_duration}分钟`;
            if (record.exercise_intensity) {
                exerciseInfo += ` - ${getIntensityName(record.exercise_intensity)}`;
            }
            exerciseInfo += `</div>`;
        }

        html += `
            <div class="record-item">
                <div class="record-date">${dateStr}</div>
                ${record.meal_type ? `<div class="record-detail"><strong>饮食：</strong>${getMealTypeName(record.meal_type)} - ${(record.food_items || []).join('、') || '无'}${record.food_notes ? ' (' + record.food_notes + ')' : ''}</div>` : ''}
                ${exerciseInfo}
                ${record.sleep_duration ? `<div class="record-detail"><strong>睡眠：</strong>${record.sleep_duration}小时 - 质量${record.sleep_quality}分${record.sleep_notes ? ' (' + record.sleep_notes + ')' : ''}</div>` : ''}
                <div class="record-detail"><strong>症状：</strong>瘙痒${record.itch_level}分 - ${(record.affected_areas || []).join('、') || '无特定部位'} - 心情${getMoodName(record.mood)}${record.symptom_notes ? ' (' + record.symptom_notes + ')' : ''}</div>
                ${record.voice_input ? `<div class="record-detail"><strong>语音记录：</strong>${record.voice_input}</div>` : ''}
            </div>
        `;
    });

    historyList.innerHTML = html;
}

// 显示图表
function displayCharts(records) {
    // 准备数据
    const dates = records.map(r => new Date(r.record_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })).reverse();
    const itchLevels = records.map(r => r.itch_level).reverse();
    const sleepQualities = records.map(r => r.sleep_quality).reverse();

    // 检查是否已有图表容器
    let chartsContainer = document.getElementById('charts-container');
    if (!chartsContainer) {
        chartsContainer = document.createElement('div');
        chartsContainer.id = 'charts-container';
        chartsContainer.style.marginTop = '30px';
        document.getElementById('history-list').insertAdjacentElement('beforebegin', chartsContainer);
    }

    chartsContainer.innerHTML = `
        <h3 style="margin-bottom: 20px; color: #667eea;">数据趋势</h3>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <canvas id="itch-chart"></canvas>
        </div>
        <div style="background: white; padding: 20px; border-radius: 8px;">
            <canvas id="sleep-chart"></canvas>
        </div>
    `;

    // 瘙痒趋势图
    const itchCtx = document.getElementById('itch-chart').getContext('2d');
    new Chart(itchCtx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '瘙痒程度',
                data: itchLevels,
                borderColor: '#f44',
                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '瘙痒程度趋势'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: '瘙痒程度 (1-10)'
                    }
                }
            }
        }
    });

    // 睡眠质量图
    const sleepCtx = document.getElementById('sleep-chart').getContext('2d');
    new Chart(sleepCtx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '睡眠质量',
                data: sleepQualities,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '睡眠质量趋势'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    title: {
                        display: true,
                        text: '睡眠质量 (1-5)'
                    }
                }
            }
        }
    });
}

// 导出PDF
async function exportPDF() {
    if (historyData.length === 0) {
        alert('没有数据可以导出');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 标题
        doc.setFontSize(20);
        doc.text('Dermatitis Health Report', 20, 20);

        doc.setFontSize(12);
        doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 30);
        doc.text(`Total Records: ${historyData.length}`, 20, 40);

        let y = 50;

        // 汇总统计
        const avgItch = (historyData.reduce((sum, r) => sum + r.itch_level, 0) / historyData.length).toFixed(1);
        const avgSleep = (historyData.reduce((sum, r) => sum + r.sleep_quality, 0) / historyData.length).toFixed(1);

        doc.text('Summary:', 20, y);
        y += 10;
        doc.setFontSize(10);
        doc.text(`Average Itch Level: ${avgItch}/10`, 30, y);
        y += 7;
        doc.text(`Average Sleep Quality: ${avgSleep}/5`, 30, y);
        y += 15;

        // 最近记录
        doc.setFontSize(12);
        doc.text('Recent Records:', 20, y);
        y += 10;

        doc.setFontSize(9);
        historyData.slice(0, 10).forEach(record => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            const date = new Date(record.record_date).toLocaleDateString();
            doc.text(`Date: ${date}`, 30, y);
            y += 6;
            doc.text(`Itch: ${record.itch_level}/10, Sleep: ${record.sleep_quality}/5, Mood: ${record.mood}`, 30, y);
            y += 6;

            if (record.food_items && record.food_items.length > 0) {
                doc.text(`Food: ${record.food_items.join(', ')}`, 30, y);
                y += 6;
            }

            y += 4;
        });

        // 保存PDF
        doc.save('dermatitis-report.pdf');
        alert('✓ PDF导出成功！');
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败: ' + error.message);
    }
}

// 辅助函数
function getMealTypeName(type) {
    const names = {
        'breakfast': '早餐',
        'lunch': '午餐',
        'dinner': '晚餐',
        'snack': '零食'
    };
    return names[type] || type;
}

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

function getIntensityName(intensity) {
    const names = {
        'low': '轻度',
        'medium': '中度',
        'high': '高强度'
    };
    return names[intensity] || intensity;
}

function getMoodName(mood) {
    const names = {
        'good': '好',
        'neutral': '一般',
        'bad': '不好'
    };
    return names[mood] || mood;
}
