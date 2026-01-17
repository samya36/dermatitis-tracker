// Supabase配置示例
// 复制此文件为 config.js 并填入你的真实配置

const SUPABASE_URL = 'https://xxxxx.supabase.co'; // 替换为你的Project URL
const SUPABASE_ANON_KEY = 'your-supabase-anon-key-here'; // 替换为你的anon public密钥

// Gemini API配置
const GEMINI_API_KEY = 'your-gemini-api-key-here'; // 在 https://aistudio.google.com/app/apikey 获取
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
