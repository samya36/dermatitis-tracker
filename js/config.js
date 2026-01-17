// Supabase配置
// 请在注册Supabase账号后，将以下信息替换为你的项目信息

const SUPABASE_URL = 'https://hpuoczirtzpsnmjcfkbg.supabase.co'; // 例如: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwdW9jemlydHpwc25tamNma2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MzY3NTMsImV4cCI6MjA4NDIxMjc1M30.y1l7Esz1Xc6qejochdGGl6v1PGPDR7e5OAFSh61b_lI'; // 你的匿名密钥

// Gemini API配置
const GEMINI_API_KEY = 'AIzaSyB_5lb95ZCN6j8cae9g2UpZVLIGDxxxijU'; // 在 https://aistudio.google.com/app/apikey 获取
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// 初始化Supabase客户端
let supabase;

// 等待页面加载完成后初始化
if (typeof window !== 'undefined') {
    try {
        if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
            console.error('请先配置Supabase信息！请查看README.md了解如何设置。');
        } else {
            // 使用UMD版本的全局变量
            const { createClient } = window.supabase;
            supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase客户端初始化成功');
        }
    } catch (error) {
        console.error('Supabase初始化失败:', error);
    }
}
