// ==================== 配置 ====================
const API_BASE = 'https://zfgy.top/api';
const CATEGORIES = ['随笔', '读书', '日常', '技术', '思考'];
const DATE_BADGE_COLORS = ['sun', 'coral', 'royal', 'mint', 'violet'];

// ==================== 状态管理 ====================
const state = {
    articles: [],
    loading: false,
    error: null,
    category: null,
    view: 'list',        // 'list' | 'detail' | 'about'
    currentArticle: null,
    page: 1,
    pageSize: 6,         // 每页文章数
    hasMore: false,
};

// ==================== 工具函数 ====================
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const h = String(d.getHours()).padStart(2, '0'), m = String(d.getMinutes()).padStart(2, '0');
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h}:${m}`;
}

function pickColor(index) {
    return DATE_BADGE_COLORS[index % DATE_BADGE_COLORS.length];
}

// ==================== 几何装饰块生成 ====================
function generateDecos(coverColor, isFeatured) {
    const shapes = [
        // 方块
        () => {
            const size = isFeatured ? 80 : 50;
            const x = Math.random() * 60 + 10;
            const y = Math.random() * 50 + 5;
            const rot = (Math.random() - 0.5) * 30;
            return `<div class="absolute border border-black rounded-lg opacity-70 bg-${coverColor}"
            style="top:${y}%;left:${x}%;width:${size}px;height:${size}px;transform:rotate(${rot}deg)"></div>`;
        },
        // 圆形
        () => {
            const size = isFeatured ? 60 : 40;
            const x = Math.random() * 70 + 10;
            const y = Math.random() * 60 + 5;
            return `<div class="absolute border border-black rounded-full opacity-50 bg-${coverColor}"
            style="top:${y}%;left:${x}%;width:${size}px;height:${size}px"></div>`;
        },
        // 长条
        () => {
            const w = isFeatured ? 120 : 70;
            const h = isFeatured ? 25 : 15;
            const x = Math.random() * 50 + 5;
            const y = Math.random() * 60 + 10;
            const rot = (Math.random() - 0.5) * 15;
            return `<div class="absolute border border-black rounded-lg opacity-80 bg-sun"
            style="top:${y}%;left:${x}%;width:${w}px;height:${h}px;transform:rotate(${rot}deg)"></div>`;
        },
    ];
    // 大卡片 3-4 个装饰块，小卡片 1-2 个
    const count = isFeatured ? 3 : 2;
    return Array.from({ length: count }, () => shapes[Math.floor(Math.random() * shapes.length)]()).join('');
}

// ==================== 骨架屏 ====================
function renderSkeleton() {
    const grid = document.getElementById('articles-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const isLarge = i === 0;
        const div = document.createElement('article');
        div.className = `${isLarge ? 'md:col-span-2' : ''} border-2 border-black rounded-lg bg-white overflow-hidden`;
        div.innerHTML = `
          <div class="animate-pulse">
            <div class="${isLarge ? 'h-48 sm:h-56 md:h-64' : 'h-36'} bg-gray-100 border-b-2 border-gray-200"></div>
            <div class="p-5 space-y-3">
              <div class="h-3 bg-gray-100 rounded w-1/4"></div>
              <div class="h-5 bg-gray-100 rounded w-3/4"></div>
              <div class="h-3 bg-gray-100 rounded w-full"></div>
              <div class="h-3 bg-gray-100 rounded w-2/3"></div>
            </div>
          </div>`;
        grid.appendChild(div);
    }
}

// ==================== 错误态 ====================
function renderError(message) {
    const grid = document.getElementById('articles-grid');
    grid.innerHTML = `
        <div class="md:col-span-3 py-20 text-center">
          <div class="text-5xl mb-4 select-none">:(</div>
          <p class="text-gray-600 mb-4">${escapeHtml(message)}</p>
          <button onclick="fetchArticles()" class="btn-pop px-6 py-2 border-2 border-black rounded-lg font-bold bg-royal text-white cursor-pointer">
            重新加载
          </button>
        </div>`;
}

// ==================== 空数据态 ====================
function renderEmpty() {
    const grid = document.getElementById('articles-grid');
    grid.innerHTML = `
        <div class="md:col-span-3 py-20 text-center">
          <div class="text-5xl mb-4 select-none">(..)</div>
          <p class="text-gray-500">还没有文章，去看看别的分类吧</p>
        </div>`;
}

// ==================== 文章卡片渲染 ====================
function renderArticleCard(article, index, isFeatured) {
    const coverHeight = isFeatured ? 'h-48 sm:h-56 md:h-64' : 'h-36';
    const bgOpacity = isFeatured ? '30' : '35';
    const badgeColor = pickColor(index);

    const articleEl = document.createElement('article');
    articleEl.className = `card-pop ${isFeatured ? 'md:col-span-2' : ''} border-2 border-black rounded-lg bg-white overflow-hidden flex flex-col cursor-pointer`;
    articleEl.innerHTML = `
        <div class="relative ${coverHeight} bg-${article.cover_color}/${bgOpacity} overflow-visible border-b-2 border-black">
          ${generateDecos(article.cover_color, isFeatured)}
          <span class="absolute -bottom-0 ${isFeatured ? 'right-6' : 'left-4'} translate-y-1/2 inline-block px-${isFeatured ? '4' : '3'} py-${isFeatured ? '1.5' : '1'} bg-${badgeColor} border-2 border-black rounded font-bold text-${isFeatured ? 'sm' : 'xs'} ${badgeColor === 'sun' || badgeColor === 'mint' ? 'text-ink' : 'text-white'} z-10 shadow-hard-sm">
            ${formatDate(article.published_at || article.created_at)}
          </span>
        </div>
        <div class="p-${isFeatured ? '5 md:p-7 pt-7' : '4 md:p-5 pt-6'} flex flex-col flex-1 gap-${isFeatured ? '3' : '2'}">
          <div class="flex items-center gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span class="px-2 py-0.5 bg-${article.cover_color} ${article.cover_color === 'sun' || article.cover_color === 'mint' ? 'text-ink' : 'text-white'} rounded font-bold border border-black">${escapeHtml(article.category)}</span>
            <span>·</span>
            <span>${article.read_time} min read</span>
          </div>
          <h3 class="text-${isFeatured ? 'xl md:text-2xl' : 'lg'} font-bold leading-snug">
            ${escapeHtml(article.title)}
          </h3>
          <p class="text-sm md:text-base text-gray-600 leading-relaxed line-clamp-${isFeatured ? '3' : '2'}">
            ${escapeHtml(article.summary || '')}
          </p>
          <a href="#" data-slug="${article.slug}" class="js-detail-link mt-auto inline-flex items-center gap-1 text-sm font-bold text-royal hover:gap-2 transition-all">
            阅读全文 <span>→</span>
          </a>
        </div>`;
    return articleEl;
}

// ==================== 文章列表渲染 ====================
function renderArticleList(articles) {
    const grid = document.getElementById('articles-grid');
    grid.innerHTML = '';

    if (articles.length === 0) {
        renderEmpty();
        return;
    }

    articles.forEach((article, index) => {
        const isFeatured = article.is_featured && index === 0;
        const card = renderArticleCard(article, index, isFeatured);
        grid.appendChild(card);
    });

    bindDetailLinks();
}

// ==================== 文章详情渲染 ====================
function renderDetailSkeleton() {
    const section = document.getElementById('articles');
    // 隐藏标题，显示返回按钮
    const grid = document.getElementById('articles-grid');
    grid.innerHTML = `
        <div class="md:col-span-3 animate-pulse space-y-4">
          <div class="h-4 bg-gray-100 rounded w-1/6"></div>
          <div class="h-8 bg-gray-100 rounded w-3/4"></div>
          <div class="space-y-2 mt-6">
            <div class="h-3 bg-gray-100 rounded w-full"></div>
            <div class="h-3 bg-gray-100 rounded w-full"></div>
            <div class="h-3 bg-gray-100 rounded w-3/4"></div>
          </div>
        </div>`;
}

function renderDetail(article) {
    const section = document.getElementById('articles');
    const grid = document.getElementById('articles-grid');

    // 保存列表视图的原始标题
    if (!section.dataset.originalTitle) {
        section.dataset.originalTitle = document.getElementById('articles-title').innerHTML;
    }

    // 更新标题栏为返回按钮
    document.getElementById('articles-title').innerHTML = `
        <span class="block w-2 h-8 md:h-10 bg-royal rounded-sm border border-black"></span>
        <a href="#" id="btn-back-list" class="text-2xl md:text-3xl font-black tracking-tight text-ink hover:text-royal transition-colors">← 返回列表</a>`;

    grid.innerHTML = `
        <div class="md:col-span-3">
          <article class="border-2 border-black rounded-lg bg-white overflow-hidden">
            <div class="p-6 md:p-10">
              <div class="flex flex-wrap items-center gap-3 mb-4 text-xs font-semibold">
                <span class="px-2 py-0.5 bg-${article.cover_color} ${article.cover_color === 'sun' || article.cover_color === 'mint' ? 'text-ink' : 'text-white'} rounded font-bold border border-black">${escapeHtml(article.category)}</span>
                <span class="text-gray-500">${formatDateTime(article.created_at)}</span>
                <span class="text-gray-400">·</span>
                <span class="text-gray-500">${article.read_time} min read</span>
              </div>
              <h2 class="text-2xl md:text-3xl font-black leading-snug mb-6">${escapeHtml(article.title)}</h2>
              <div class="border-t-2 border-gray-100 pt-6">
                <div class="prose prose-lg max-w-none markdown-body">${marked.parse(article.content)}</div>
              </div>
            </div>
          </article>
        </div>`;

    // 绑定返回按钮
    document.getElementById('btn-back-list').addEventListener('click', e => {
        e.preventDefault();
        goBackToList();
    });

    // 滚动到文章区域顶部
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderDetailError(message) {
    const grid = document.getElementById('articles-grid');
    grid.innerHTML = `
        <div class="md:col-span-3 py-20 text-center">
          <p class="text-gray-600 mb-4">${escapeHtml(message)}</p>
          <a href="#" id="btn-back-error" class="btn-pop inline-block px-6 py-2 border-2 border-black rounded-lg font-bold bg-royal text-white cursor-pointer">← 返回列表</a>
        </div>`;
    document.getElementById('btn-back-error').addEventListener('click', e => {
        e.preventDefault();
        goBackToList();
    });
}

function goBackToList() {
    if (state.view === 'time') hideTimeView();
    state.view = 'list';
    state.currentArticle = null;
    window.location.hash = '';

    const section = document.getElementById('articles');
    if (section.dataset.originalTitle) {
        document.getElementById('articles-title').innerHTML = section.dataset.originalTitle;
        delete section.dataset.originalTitle;
    }

    fetchArticles(state.category);
}

// ==================== 关于我页面 ====================
function showAbout() {
    if (state.view === 'time') hideTimeView();
    state.view = 'about';
    window.location.hash = '#/about';

    const section = document.getElementById('articles');
    if (!section.dataset.originalTitle) {
        section.dataset.originalTitle = document.getElementById('articles-title').innerHTML;
    }

    document.getElementById('articles-title').innerHTML = `
        <span class="block w-2 h-8 md:h-10 bg-coral rounded-sm border border-black"></span>
        <span class="text-2xl md:text-3xl font-black tracking-tight">关于我</span>`;

    const grid = document.getElementById('articles-grid');
    grid.innerHTML = `
        <div class="md:col-span-3">
          <article class="border-2 border-black rounded-lg bg-white overflow-hidden">
            <div class="p-6 md:p-10 markdown-body">
              <p>你好，我是 <strong>追风观影</strong>。</p>
              <p>一个普通的大学生，对世界保持好奇。</p>
              <h3>这个博客</h3>
              <p>用来记录日常的零碎想法、读书笔记、和一些技术折腾的记录。没有宏大的目标，只是想给时间留下一点痕迹。</p>
              <p>如果你碰巧翻到了这里，谢谢你愿意花时间阅读一个陌生人的文字。</p>
              <h3>联系我</h3>
              <p>📧 <a href=\"mailto:zfgy_ma@foxmail.com\" class=\"text-royal font-bold hover:underline\">zfgy_ma@foxmail.com</a></p>
              <p>💻 <a href=\"https://github.com/zfgy-ma\" target=\"_blank\" class=\"text-royal font-bold hover:underline\">GitHub</a></p>
            </div>
          </article>
        </div>`;
    document.getElementById('btn-load-more').classList.add('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== API 调用 ====================
async function fetchArticles(category = null, append = false) {
    state.loading = true;
    state.error = null;
    state.category = category;

    if (!append) {
        state.page = 1;
        state.articles = [];
        renderSkeleton();
    }

    try {
        let url = `${API_BASE}/articles?page=${state.page}&page_size=${state.pageSize}`;
        if (category) {
            url += `&category=${encodeURIComponent(category)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`服务器返回 ${res.status}`);

        const data = await res.json();
        if (append) {
            state.articles = [...state.articles, ...data.items];
        } else {
            state.articles = data.items;
        }
        state.hasMore = data.items.length >= state.pageSize;
        state.loading = false;

        if (append) {
            appendCards(data.items);
        } else {
            renderArticleList(state.articles);
        }

        // 控制"加载更多"按钮
        const btn = document.getElementById('btn-load-more');
        if (btn) btn.classList.toggle('hidden', !state.hasMore);

        // 高亮当前分类导航
        document.querySelectorAll('.js-nav-filter').forEach(link => {
            const match = link.dataset.category === (category || '');
            link.classList.toggle('text-royal', match);
        });
    } catch (err) {
        state.loading = false;
        state.error = err.message;
        if (!append) renderError(`加载失败：${err.message}`);
    }
}

function appendCards(items) {
    const grid = document.getElementById('articles-grid');
    const startIndex = state.articles.length - items.length;
    items.forEach((article, i) => {
        const isFeatured = article.is_featured && startIndex + i === 0;
        const card = renderArticleCard(article, startIndex + i, isFeatured);
        grid.appendChild(card);
    });
    bindDetailLinks();
}

function bindDetailLinks() {
    document.querySelectorAll('.js-detail-link').forEach(link => {
        if (link.dataset.bound) return;
        link.dataset.bound = '1';
        link.addEventListener('click', e => {
            e.preventDefault();
            showArticleDetail(link.dataset.slug);
        });
    });
}

async function fetchArticleDetail(slug) {
    const res = await fetch(`${API_BASE}/articles/${slug}`);
    if (!res.ok) {
        if (res.status === 404) throw new Error('文章不存在');
        throw new Error(`服务器返回 ${res.status}`);
    }
    return await res.json();
}

async function showArticleDetail(slug) {
    state.view = 'detail';
    state.currentArticle = slug;
    window.location.hash = `#/article/${slug}`;
    renderDetailSkeleton();

    try {
        const article = await fetchArticleDetail(slug);
        renderDetail(article);
        // 代码语法高亮
        if (typeof hljs !== 'undefined') hljs.highlightAll();
    } catch (err) {
        renderDetailError(err.message);
    }
}

// ==================== 事件绑定 ====================
// ==================== 导航选中态 + 滚动定位 ====================
var currentNavColor = 'royal';
var mobileMenuBtn;

function setActiveNav(link) {
  // 清除所有 nav-active
  document.querySelectorAll('.js-nav-filter, #desktop-time-link, #mobile-time-link').forEach(function(el) {
    el.classList.remove('nav-active');
    // 移除颜色类
    ['text-royal','text-coral','text-violet','text-sun','text-mint'].forEach(function(cls) {
      el.classList.remove(cls);
    });
  });
  if (!link) return;
  link.classList.add('nav-active');
  var color = link.dataset && link.dataset.color;
  if (color && ['royal','coral','violet','sun','mint'].indexOf(color) !== -1) {
    link.classList.add('text-' + color);
    currentNavColor = color;
  }
}

function scrollToArticles() {
  var el = document.getElementById('articles');
  if (!el) return;
  var header = document.querySelector('header');
  var headerH = header ? header.offsetHeight : 0;
  var top = el.getBoundingClientRect().top + window.pageYOffset;
  var target = top - headerH - 20; // 留 20px 间距
  window.scrollTo({ top: target, behavior: 'smooth' });
}

function setupEvents() {
    // === 导航分类筛选（桌面 + 移动端） ===
    document.querySelectorAll('.js-nav-filter').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var category = link.dataset.category || null;
            if (state.view === 'time') hideTimeView();
            if (state.view !== 'list') goBackToList();
            setActiveNav(link);
            fetchArticles(category);
            // 关闭移动端菜单
            document.getElementById('mobile-nav').classList.add('hidden');
            if (mobileMenuBtn) mobileMenuBtn.textContent = '☰';
            scrollToArticles();
        });
    });

    // === 移动端菜单开关 ===
    mobileMenuBtn = document.getElementById('btn-mobile-menu');
    mobileMenuBtn.addEventListener('click', () => {
        const nav = document.getElementById('mobile-nav');
        nav.classList.toggle('hidden');
        mobileMenuBtn.textContent = nav.classList.contains('hidden') ? '☰' : '✕';
    });

    // === 加载更多 ===
    document.getElementById('btn-load-more').addEventListener('click', e => {
        e.preventDefault();
        state.page++;
        fetchArticles(state.category, true);
    });

    // === 关于我（Hero 按钮 + 移动端链接）===
    document.getElementById('btn-about').addEventListener('click', e => {
        e.preventDefault();
        showAbout();
    });

    // === 随便看看：非列表视图时先返回列表 ===
    document.getElementById('btn-browse').addEventListener('click', e => {
        if (state.view !== 'list') {
            e.preventDefault();
            goBackToList();
        }
    });
    const mobileAbout = document.getElementById('mobile-about-link');
    if (mobileAbout) {
        mobileAbout.addEventListener('click', e => {
            e.preventDefault();
            setActiveNav(null); // 关于不属于导航菜单，清除选中态
            document.getElementById('mobile-nav').classList.add('hidden');
            if (mobileMenuBtn) mobileMenuBtn.textContent = '☰';
            showAbout();
        });
    }

    // === 标题区点击（关于页返回） ===
    document.getElementById('articles-title').addEventListener('click', e => {
        if (e.target.id === 'btn-back-list') return;
        if (state.view !== 'list') {
            e.preventDefault();
            goBackToList();
        }
    });
}

// ==================== 主题切换 ====================
const themeBtn = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.classList.toggle('dark', savedTheme === 'dark');
if (themeBtn) themeBtn.setAttribute('value', savedTheme);

themeBtn.addEventListener('change', e => {
    const theme = e.detail;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    // 同步移动端图标
    const mobileIcon = document.getElementById('theme-icon-mobile');
    if (mobileIcon) mobileIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    // 若时间页可见则重绘图表以适配暗色模式
    if (state.view === 'time') refreshTimeCharts();
});

// 移动端主题切换按钮
const mobileThemeBtn = document.getElementById('btn-theme-mobile');
const mobileThemeIcon = document.getElementById('theme-icon-mobile');
if (mobileThemeBtn && mobileThemeIcon) {
    // 初始化图标（与 localStorage 同步）
    mobileThemeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    mobileThemeBtn.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        mobileThemeIcon.textContent = isDark ? '☀️' : '🌙';
        // 同步桌面端按钮
        if (themeBtn) themeBtn.setAttribute('value', isDark ? 'dark' : 'light');
        // 若时间页可见则重绘图表
        if (state.view === 'time') refreshTimeCharts();
    });
}

// ==================== 时间统计 ====================
// 双状态缓存：软件/网页数据各自独立，切换时无需重复请求
function _makeSourceState() {
    return {
        daily: {}, dates: [], dailyApps: {},
        totalDays: 0, totalHours: 0, avgDailyHours: 0, maxDailyHours: 0, maxDailyDate: null,
        dateDetailCache: {},
        weekStartIdx: 0, chartType: 'bar', barMode: 'week', periodOffset: 0,
        localMode: false, localFileName: null,
    };
}
const timeState = {
    source: 'software',  // 'software' | 'web'
    software: _makeSourceState(),
    web: _makeSourceState(),
    // 以下为渲染时设置的瞬态属性，不属于任何数据源
    _barRects: null,
    _heatStart: null, _heatEnd: null, _heatCells: null,
};
/** Tooltip 展开状态 */
let tooltipExpanded = false;
let tooltipActiveDate = null;
/** 获取当前活跃数据源的状态 */
function ts() { return timeState[timeState.source]; }

/** 切换数据源 Tab */
async function switchSource(source) {
    if (timeState.source === source) return;
    timeState.source = source;
    updateSourceTabButtons();
    updateLocalCsvStatus();
    await fetchTimeData();
    updateSummaryCards();
    refreshTimeCharts();
}

/** 更新 Tab 按钮激活样式 */
function updateSourceTabButtons() {
    const btnS = document.getElementById('btn-source-software');
    const btnW = document.getElementById('btn-source-web');
    if (timeState.source === 'software') {
        btnS.className = 'px-5 py-2 text-sm font-bold transition-colors rounded-l-lg bg-royal text-white';
        btnW.className = 'px-5 py-2 text-sm font-bold transition-colors rounded-r-lg bg-white text-ink hover:bg-gray-100';
    } else {
        btnW.className = 'px-5 py-2 text-sm font-bold transition-colors rounded-r-lg bg-violet text-white';
        btnS.className = 'px-5 py-2 text-sm font-bold transition-colors rounded-l-lg bg-white text-ink hover:bg-gray-100';
    }
}

function parseDate(str) {
    // 统一解析 YYYY-MM-DD 格式
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatDateCN(str) {
    // str 为 YYYY-MM-DD，转为"X月X日"
    const [, m, d] = str.split('-');
    return `${parseInt(m)}月${parseInt(d)}日`;
}

// ==================== 本地 CSV 解析 ====================
// 解析规则严格镜像 backend/routers/time_stats.py 的 _parse_csv，
// 保证本地解析结果与后端 /api/time-stats 在同一份 CSV 上完全一致。

// 通用 CSV → 行字典 解析器（支持双引号转义、剥离 BOM）
function parseCsvText(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = parseCsvLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i] || !lines[i].trim()) continue;
        const cells = parseCsvLine(lines[i]);
        const row = {};
        headers.forEach((h, j) => { row[h] = cells[j] !== undefined ? cells[j] : ''; });
        rows.push(row);
    }
    return { headers, rows };
}

// 解析单行 CSV，支持 "..." 包裹字段（""转义为单个引号）
function parseCsvLine(line) {
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
            } else {
                cur += ch;
            }
        } else {
            if (ch === ',') { cells.push(cur); cur = ''; }
            else if (ch === '"') { inQuotes = true; }
            else { cur += ch; }
        }
    }
    cells.push(cur);
    return cells;
}

// 应用业务规则：过滤无效数据、解析日期/时长、累加每日总秒数与每应用秒数
function buildTimeStatsFromRows(rows) {
    const dailySeconds = {};
    const dailyApps = {};
    let skippedDates = 0;
    let skippedDurations = 0;
    for (const row of rows) {
        const category = (row['分类'] || '').trim();
        if (category === '无效数据') continue;

        const rawDate = (row['日期'] || '').trim();
        if (!rawDate) continue;

        const datePart = rawDate.split(' ')[0];
        const m = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) { skippedDates++; continue; }
        const formattedDate = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;

        const rawDuration = (row['时长'] || '').trim();
        let seconds = parseInt(rawDuration, 10);
        if (isNaN(seconds)) {
            const f = parseFloat(rawDuration);
            if (isNaN(f)) { skippedDurations++; seconds = 0; }
            else { seconds = Math.round(f); }
        }
        dailySeconds[formattedDate] = (dailySeconds[formattedDate] || 0) + seconds;

        const appName = (row['应用'] || '').trim();
        const appDesc = (row['描述'] || '').trim();
        if (appName) {
            if (!dailyApps[formattedDate]) dailyApps[formattedDate] = {};
            if (!dailyApps[formattedDate][appName]) {
                dailyApps[formattedDate][appName] = { seconds: 0, desc: appDesc };
            }
            dailyApps[formattedDate][appName].seconds += seconds;
        }
    }

    // 转为每日小时数（保留 2 位小数）
    const daily = {};
    for (const [d, s] of Object.entries(dailySeconds)) {
        daily[d] = Math.round((s / 3600) * 100) / 100;
    }
    return { daily, dailyApps, skippedDates, skippedDurations };
}

// 解析网页 CSV 行数据，按域名+日期聚合（镜像后端 _parse_web_csv 逻辑）
function buildWebStatsFromRows(rows) {
    const raw = {};            // {(date, domain, title): seconds}
    const bestTitle = {};      // {(date, domain): {title, seconds}}
    let skippedUrls = 0, skippedDates = 0;

    for (const row of rows) {
        // 时长
        const rawDuration = (row['时长'] || '').trim();
        let seconds = parseInt(rawDuration, 10);
        if (isNaN(seconds)) {
            const f = parseFloat(rawDuration);
            if (isNaN(f)) continue;
            seconds = Math.round(f);
        }
        if (seconds <= 0) continue;

        // 日期
        const rawTime = (row['时间'] || '').trim();
        if (!rawTime) continue;
        const datePart = rawTime.split(' ')[0];
        const m = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) { skippedDates++; continue; }
        const formattedDate = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;

        // 域名
        const rawUrl = (row['网址'] || '').trim();
        if (!rawUrl) continue;
        let domain;
        try {
            const u = new URL(rawUrl);
            if (!u.hostname) continue;
            if (u.protocol === 'chrome-extension:') continue;
            domain = u.hostname;
        } catch (e) { skippedUrls++; continue; }

        // 标题
        const title = (row['标题'] || '').trim();
        if (!title) continue;

        const key = `${formattedDate}|${domain}|${title}`;
        raw[key] = (raw[key] || 0) + seconds;

        const bestKey = `${formattedDate}|${domain}`;
        if (!bestTitle[bestKey] || raw[key] > bestTitle[bestKey].seconds) {
            bestTitle[bestKey] = { title, seconds: raw[key] };
        }
    }

    // 按 (日期, 域名) 聚合
    const dailySeconds = {};
    const dailyApps = {};
    for (const [key, seconds] of Object.entries(raw)) {
        const [date, domain, title] = key.split('|');
        dailySeconds[date] = (dailySeconds[date] || 0) + seconds;
        if (!dailyApps[date]) dailyApps[date] = {};
        if (!dailyApps[date][domain]) {
            const best = bestTitle[`${date}|${domain}`] || { title };
            dailyApps[date][domain] = { seconds: 0, desc: best.title };
        }
        dailyApps[date][domain].seconds += seconds;
    }

    const daily = {};
    for (const [d, s] of Object.entries(dailySeconds)) {
        daily[d] = Math.round((s / 3600) * 100) / 100;
    }
    return { daily, dailyApps, skippedDates, skippedUrls };
}

// 输出与 GET /api/time-stats 完全一致的字段结构
function buildSummary(daily, dailyApps) {
    const dates = Object.keys(daily).sort();
    const totalDays = dates.length;
    const totalHours = dates.reduce((s, d) => s + daily[d], 0);
    let maxDate = null, maxHours = 0;
    for (const d of dates) {
        if (daily[d] > maxHours) { maxHours = daily[d]; maxDate = d; }
    }
    return {
        daily,
        dates,
        total_days: totalDays,
        total_hours: Math.round(totalHours * 100) / 100,
        avg_daily_hours: totalDays ? Math.round((totalHours / totalDays) * 100) / 100 : 0,
        max_daily_hours: maxHours,
        max_daily_date: maxDate,
        dailyApps,  // 额外字段，供 buildLocalDateDetail 使用
    };
}

// 输出与 GET /api/time-stats/date/{d} 完全一致的字段结构
// 模拟 Python round(x,1) 的银行家舍入，确保前后端百分数一致
function pyRound1(x) {
    const scaled = x * 10;
    const floor = Math.floor(scaled);
    const frac = scaled - floor;
    if (frac > 0.5) return (floor + 1) / 10;
    if (frac < 0.5) return floor / 10;
    return (floor % 2 === 0 ? floor : floor + 1) / 10;
}
function buildLocalDateDetail(date) {
    const apps = ts().dailyApps[date];
    if (!apps) return null;
    const totalSeconds = Object.values(apps).reduce((s, x) => s + x.seconds, 0);
    if (totalSeconds === 0) return null;
    const list = [];
    for (const [name, info] of Object.entries(apps)) {
        const pct = pyRound1(info.seconds / totalSeconds * 100);
        if (pct < 1) continue;  // 与后端一致：占比 <1% 过滤
        list.push({
            name,
            desc: info.desc,
            seconds: info.seconds,
            hours: Math.round((info.seconds / 3600) * 100) / 100,
            percent: pct,
        });
    }
    list.sort((a, b) => b.seconds - a.seconds);
    return {
        date,
        total_hours: Math.round((totalSeconds / 3600) * 100) / 100,
        total_seconds: totalSeconds,
        apps: list,
    };
}

// 按月聚合版本——严格镜像后端 get_month_detail
function buildLocalMonthDetail(month) {
    const monthApps = {};
    for (const [dateKey, appsData] of Object.entries(ts().dailyApps)) {
        if (!dateKey.startsWith(month)) continue;
        for (const [name, info] of Object.entries(appsData)) {
            if (!monthApps[name]) {
                monthApps[name] = { seconds: 0, desc: info.desc };
            }
            monthApps[name].seconds += info.seconds;
        }
    }
    if (Object.keys(monthApps).length === 0) return null;
    const totalSeconds = Object.values(monthApps).reduce((s, x) => s + x.seconds, 0);
    if (totalSeconds === 0) return null;
    const list = [];
    for (const [name, info] of Object.entries(monthApps)) {
        const pct = pyRound1(info.seconds / totalSeconds * 100);
        if (pct < 1) continue;
        list.push({
            name,
            desc: info.desc,
            seconds: info.seconds,
            hours: Math.round((info.seconds / 3600) * 100) / 100,
            percent: pct,
        });
    }
    list.sort((a, b) => b.seconds - a.seconds);
    return {
        date: month,
        total_hours: Math.round((totalSeconds / 3600) * 100) / 100,
        total_seconds: totalSeconds,
        apps: list,
    };
}

// 上传交互：选择文件 → 解析 → 替换 timeState → 触发重渲染
function showLocalCsvError(msg) {
    const el = document.getElementById('local-csv-error');
    el.textContent = msg;
    el.classList.remove('hidden');
}
function clearLocalCsvError() {
    const el = document.getElementById('local-csv-error');
    el.textContent = '';
    el.classList.add('hidden');
}
function updateLocalCsvStatus() {
    const el = document.getElementById('local-csv-status');
    const typeLabel = timeState.source === 'web' ? '网页' : '软件';
    if (ts().localMode) {
        el.innerHTML = `当前数据源：<span class="font-bold text-mint">本地 · ${escapeHtml(ts().localFileName)}</span>（${ts().totalDays} 天，刷新页面恢复后端）`;
    } else {
        el.innerHTML = `当前数据源：<span class="font-bold text-ink">后端（${typeLabel}）</span>`;
    }
}
async function handleLocalCsvFile(file) {
    clearLocalCsvError();
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showLocalCsvError('仅支持 .csv 格式文件');
        return;
    }
    let text;
    try {
        text = await file.text();
    } catch (err) {
        showLocalCsvError('文件读取失败：' + err.message);
        return;
    }
    let parsed;
    try {
        parsed = parseCsvText(text);
    } catch (err) {
        showLocalCsvError('CSV 解析失败：' + err.message);
        return;
    }
    if (!parsed.headers || parsed.headers.length === 0) {
        showLocalCsvError('CSV 缺少表头');
        return;
    }
    // 智能识别：列名优先（网页数据有"标题"+"网址"，软件数据有"应用"+"分类"），文件名兜底
    const hasWebCols = parsed.headers.includes('标题') && parsed.headers.includes('网址');
    const hasSoftwareCols = parsed.headers.includes('应用') && parsed.headers.includes('分类');
    let csvType;
    if (hasWebCols && !hasSoftwareCols) {
        csvType = 'web';
    } else if (hasSoftwareCols && !hasWebCols) {
        csvType = 'software';
    } else if (hasWebCols && hasSoftwareCols) {
        csvType = 'software'; // 两者都有时按软件数据处理
    } else {
        // 列名无法判断，看文件名
        const fname = file.name;
        if (fname.includes('网页统计')) csvType = 'web';
        else if (fname.includes('数据')) csvType = 'software';
        else {
            showLocalCsvError('无法识别 CSV 类型（缺少"标题/网址"或"应用/分类"列），请确认文件格式');
            return;
        }
    }

    let daily, dailyApps;
    if (csvType === 'web') {
        const result = buildWebStatsFromRows(parsed.rows);
        daily = result.daily; dailyApps = result.dailyApps;
    } else {
        const result = buildTimeStatsFromRows(parsed.rows);
        daily = result.daily; dailyApps = result.dailyApps;
    }
    if (Object.keys(daily).length === 0) {
        showLocalCsvError('CSV 解析后无有效数据，请检查日期格式（应为 M/D/YYYY）');
        return;
    }
    // 自动切换到对应数据源 Tab
    timeState.source = csvType;
    updateSourceTabButtons();
    // 写入 timeState，切换到本地模式
    const summary = buildSummary(daily, dailyApps);
    ts().daily = summary.daily;
    ts().dates = summary.dates;
    ts().totalDays = summary.total_days;
    ts().totalHours = summary.total_hours;
    ts().avgDailyHours = summary.avg_daily_hours;
    ts().maxDailyHours = summary.max_daily_hours;
    ts().maxDailyDate = summary.max_daily_date;
    ts().dailyApps = summary.dailyApps;
    ts().localMode = true;
    ts().localFileName = file.name;
    ts().dateDetailCache = {};                                     // 后端缓存作废
    for (const k of Object.keys(_pendingFetches)) { delete _pendingFetches[k]; }  // 清除进行中的后端请求
    ts().weekStartIdx = Math.max(0, summary.dates.length - 7);     // 与首次 fetch 时定位逻辑一致
    ts().periodOffset = 0;

    updateLocalCsvStatus();
    updateSummaryCards();
    refreshTimeCharts();
}

// 上传 UI 绑定（DOM 已就绪）
document.getElementById('btn-load-local-csv').addEventListener('click', () => {
    document.getElementById('local-csv-input').click();
});
document.getElementById('local-csv-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleLocalCsvFile(file);
    e.target.value = '';   // 允许重复选择同一文件
});

// 数据源 Tab 切换
document.getElementById('btn-source-software').addEventListener('click', () => switchSource('software'));
document.getElementById('btn-source-web').addEventListener('click', () => switchSource('web'));

async function fetchTimeData() {
    const s = ts();
    if (s.localMode) return;        // 本地 CSV 已加载，不再覆盖
    if (s.dates.length > 0) return; // 已缓存
    const prefix = timeState.source === 'web' ? '/web' : '';
    try {
        const res = await fetch(`${API_BASE.replace('/api', '')}/api/time-stats${prefix}`);
        if (!res.ok) throw new Error('加载失败');
        const data = await res.json();
        s.daily = data.daily;
        s.dates = data.dates;
        s.totalDays = data.total_days;
        s.totalHours = data.total_hours;
        s.avgDailyHours = data.avg_daily_hours;
        s.maxDailyHours = data.max_daily_hours;
        s.maxDailyDate = data.max_daily_date;
        s.weekStartIdx = Math.max(0, data.dates.length - 7);
    } catch (err) {
        console.error('时间数据加载失败:', err);
    }
}

function showTimeView() {
    if (state.view === 'time') return;
    state.view = 'time';
    window.location.hash = '#/time';

    // 隐藏 Hero 和文章区
    const hero = document.querySelector('header + section');
    const divider = hero ? hero.nextElementSibling : null;
    if (hero) hero.style.display = 'none';
    if (divider && divider.tagName === 'DIV') divider.style.display = 'none';
    document.getElementById('articles').style.display = 'none';
    document.querySelector('footer').style.display = 'none';

    // 显示时间页
    document.getElementById('time-section').classList.remove('hidden');

    fetchTimeData().then(() => {
        updateSummaryCards();
        refreshTimeCharts();
    });
}

function hideTimeView() {
    // 仅恢复 DOM 可见性，不触发路由变更（由调用方决定下一步视图）
    state.view = 'list';
    const hero = document.querySelector('header + section');
    const divider = hero ? hero.nextElementSibling : null;
    if (hero) hero.style.display = '';
    if (divider && divider.tagName === 'DIV') divider.style.display = '';
    document.getElementById('articles').style.display = '';
    document.querySelector('footer').style.display = '';
    document.getElementById('time-section').classList.add('hidden');
}

function updateSummaryCards() {
    const fmt = (n) => n.toLocaleString();
    const hms = (hours) => {
        if (hours >= 1) {
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return m > 0 ? `${h}小时${m}分` : `${h}小时`;
        }
        const m = Math.round(hours * 60);
        return `${m}分钟`;
    };
    const cards = [
        { label: '统计天数', value: `${ts().totalDays} 天`, color: 'royal' },
        { label: '总时长', value: hms(ts().totalHours), color: 'coral' },
        { label: '日均时长', value: hms(ts().avgDailyHours), color: 'sun' },
        { label: '最高单日', value: ts().maxDailyHours ? hms(ts().maxDailyHours) : '—', color: 'mint' },
    ];
    document.getElementById('time-summary').innerHTML = cards.map(c => `
        <div class="border-2 border-black rounded-lg bg-white p-4">
          <p class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">${c.label}</p>
          <p class="text-lg md:text-xl font-black text-${c.color}">${c.value}</p>
        </div>
      `).join('');
}

// ---------- 条形图 ----------
function drawBarChart(dates, values) {
    if (dates.length === 0) return;
    const canvas = document.getElementById('bar-canvas');
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth - 32;
    // 响应式高度：大屏 350px，小屏按视口高度 40% 自适应
    const CHART_H = Math.min(350, Math.max(200, window.innerHeight * 0.4));
    const isMobile = window.innerWidth < 768;
    // HiDPI 清晰渲染：canvas 像素按 dpr 放大，绘图坐标保持 CSS 像素
    canvas.width = W * dpr;
    canvas.height = CHART_H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = CHART_H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const isDark = document.documentElement.classList.contains('dark');

    const padL = 60, padR = 20, padT = 20, padB = 50;
    const chartW = W - padL - padR;
    const chartH = CHART_H - padT - padB;
    const barCount = dates.length;
    const barGap = isMobile ? 6 : 12;
    const barW = Math.min(50, (chartW - barGap * (barCount + 1)) / barCount);
    const stepX = (chartW - barGap * (barCount + 1)) / barCount + barGap;

    const maxVal = Math.max(...values, 1);
    const yMax = Math.ceil(maxVal) || 1; // 按小时向上取整
    const yTicks = 5;

    // 背景
    ctx.fillStyle = isDark ? '#1e1e1e' : '#fff';
    ctx.fillRect(0, 0, W, CHART_H);

    // 网格线 + Y轴标签
    ctx.strokeStyle = isDark ? '#333' : '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.fillStyle = isDark ? '#a0a0a0' : '#4B5563';
    ctx.font = isMobile ? '9px "Noto Sans SC", sans-serif' : '11px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= yTicks; i++) {
        const y = padT + (chartH / yTicks) * i;
        const val = yMax - (yMax / yTicks) * i;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
        ctx.fillText(Math.round(val), padL - 8, y + 4);
    }

    // 柱体
    for (let i = 0; i < barCount; i++) {
        const x = padL + stepX * i + barGap;
        const barH = (values[i] / yMax) * chartH;
        const y = padT + chartH - barH;

        if (values[i] === 0) continue; // 零值不画柱、不写标签

        // 柱体渐变
        const grad = ctx.createLinearGradient(x, y, x, padT + chartH);
        grad.addColorStop(0, isDark ? '#60a5fa' : '#2563EB');
        grad.addColorStop(1, isDark ? '#1e3a5f' : '#93bbfd');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, barH);

        // 顶部数值标签（移动端缩短 + 小字号避免重叠）
        ctx.fillStyle = isDark ? '#e0e0e0' : '#111827';
        ctx.font = isMobile ? 'bold 8px "Noto Sans SC", sans-serif' : 'bold 10px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        const v = values[i];
        let barLabel;
        if (v >= 1) {
            if (isMobile) {
                barLabel = v.toFixed(1) + 'h';
            } else {
                const h = Math.floor(v);
                const m = Math.round((v - h) * 60);
                barLabel = m > 0 ? `${h}h${m}m` : `${h}h`;
            }
        } else {
            barLabel = Math.round(v * 60) + 'm';
        }
        ctx.fillText(barLabel, x + barW / 2, y - 6);
    }

    // X轴日期标签（移动端缩小字号）
    ctx.fillStyle = isDark ? '#a0a0a0' : '#4B5563';
    ctx.font = isMobile ? '8px "Noto Sans SC", sans-serif' : '11px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < barCount; i++) {
        const x = padL + stepX * i + barGap + barW / 2;
        const parts = dates[i].split('-');
        const label = parts.length === 2
            ? `${parseInt(parts[1])}月`
            : `${parseInt(parts[1])}/${parseInt(parts[2])}`;
        ctx.fillText(label, x, padT + chartH + 16);
    }

    // 坐标轴
    ctx.strokeStyle = isDark ? '#555' : '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + chartH);
    ctx.lineTo(W - padR, padT + chartH);
    ctx.stroke();

    // 存储柱体矩形供 hover 检测
    timeState._barRects = [];
    for (let i = 0; i < barCount; i++) {
        const bx = padL + stepX * i + barGap;
        const bh = (values[i] / yMax) * chartH;
        const by = padT + chartH - bh;
        timeState._barRects.push({ x: bx, y: by, w: barW, h: bh, date: dates[i] });
    }
}

// ---------- 统一 Rich Tooltip ----------
// 基于应用名生成稳定颜色
function hashColor(name) {
    const colors = ['#2563EB', '#FF6B6B', '#FFD93D', '#4ADE80', '#A78BFA', '#F97316', '#06B6D4', '#EC4899', '#8B5CF6', '#10B981'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    return colors[Math.abs(hash) % colors.length];
}

// 请求去重：防止同一日期并发fetch
const _pendingFetches = {};

// 所有方向约束 tooltip 不超出视口（包含移动端底部固定优化）
function clampTooltipPos(tt, x, y, offX, offY) {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        // 移动端：移除悬浮属性，作为普通块级元素插入到当前图表容器下方
        tt.classList.remove('fixed', 'shadow-hard-sm', 'z-50', 'min-w-[200px]');
        tt.classList.add('mt-4', 'relative', 'w-full');
        tt.style.left = 'auto';
        tt.style.top = 'auto';

        const activeContainer = ts().chartType === 'bar'
            ? document.getElementById('bar-chart-container')
            : document.getElementById('heatmap-container');

        // 动态插入到当前激活容器之后，实现"固定在 div 下面"的效果
        if (activeContainer && (tt.parentNode !== activeContainer.parentNode || tt.previousElementSibling !== activeContainer)) {
            activeContainer.parentNode.insertBefore(tt, activeContainer.nextSibling);
        }
        return;
    }

    // 桌面端：恢复原本的悬浮气泡样式
    tt.classList.add('fixed', 'shadow-hard-sm', 'z-50', 'min-w-[200px]');
    tt.classList.remove('mt-4', 'relative', 'w-full');

    // 确保把 Tooltip 放回原本的父容器中
    const section = document.getElementById('time-section');
    if (tt.parentNode !== section) {
        section.appendChild(tt);
    }

    // 桌面端原本的位置计算逻辑
    offX = offX || 12;
    offY = offY || -28;
    const gap = 8;
    const prefLeft = x + offX;
    const prefRight = prefLeft + tt.offsetWidth;
    if (prefRight < window.innerWidth - gap) {
        tt.style.left = prefLeft + 'px';
    } else {
        tt.style.left = Math.max(gap, x - tt.offsetWidth - gap) + 'px';
    }
    const prefTop = y + offY;
    if (prefTop > gap) {
        tt.style.top = prefTop + 'px';
    } else {
        tt.style.top = Math.max(gap, y + gap) + 'px';
    }
    var finalL = parseInt(tt.style.left) || 0;
    var finalR = finalL + tt.offsetWidth;
    if (finalR > window.innerWidth - gap) tt.style.left = (window.innerWidth - tt.offsetWidth - gap) + 'px';
    if (parseInt(tt.style.left) < gap) tt.style.left = gap + 'px';
}

async function showTooltip(x, y, dateStr, evt) {
    const tt = document.getElementById('time-tooltip');
    const ttDate = document.getElementById('tt-date');
    const ttApps = document.getElementById('tt-apps');

    // 跨元素移动时重置展开状态
    if (dateStr !== tooltipActiveDate) {
        tooltipExpanded = false;
        tooltipActiveDate = dateStr;
    }

    // 查缓存
    let detail = ts().dateDetailCache[dateStr];
    if (!detail) {
        const isMonth = dateStr.length === 7; // YYYY-MM → 月, YYYY-MM-DD → 日
        if (ts().localMode) {
            detail = isMonth ? buildLocalMonthDetail(dateStr) : buildLocalDateDetail(dateStr);
            if (detail) ts().dateDetailCache[dateStr] = detail;
        } else {
            // 请求去重
            if (!_pendingFetches[dateStr]) {
                const prefix = timeState.source === 'web' ? '/web' : '';
                _pendingFetches[dateStr] = fetch(`${API_BASE.replace('/api', '')}/api/time-stats${prefix}/${isMonth ? 'month' : 'date'}/${dateStr}`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null);
            }
            detail = await _pendingFetches[dateStr];
            delete _pendingFetches[dateStr];
            if (detail) ts().dateDetailCache[dateStr] = detail;
        }
    }

    if (!detail) {
        const isMonth = dateStr.length === 7;
        const emptyLabel = isMonth ? '无当月数据' : '无当日数据';
        ttDate.textContent = `${dateStr} · ${emptyLabel}`;
        ttApps.innerHTML = '';
        tt.classList.remove('hidden');
        clampTooltipPos(tt, x, y, 12, -12);
        return;
    }

    if (!detail.apps || detail.apps.length === 0) {
        ttDate.textContent = `${dateStr} · ${detail.total_hours}小时`;
        ttApps.innerHTML = '<span class="text-xs text-gray-400">无应用明细</span>';
        tt.classList.remove('hidden');
        clampTooltipPos(tt, x, y, 12, -12);
        return;
    }

    // 渲染
    ttDate.textContent = `${dateStr}  ·  ${detail.total_hours}小时`;
    ttApps.innerHTML = detail.apps.map(a => {
        const color = hashColor(a.name);
        const h = Math.floor(a.hours);
        const m = Math.round((a.hours - h) * 60);
        const timeStr = h > 0 ? `${h}h${m}m` : `${m}m`;
        return `<div class="flex items-center gap-2">
          <span class="block w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-black/20" style="background:${color}"></span>
          <span class="flex-1 ${tooltipExpanded ? '' : 'truncate'}" title="${a.name}${a.desc ? ' - ' + a.desc : ''}">${a.desc || a.name}</span>
          <span class="text-gray-400 flex-shrink-0">${timeStr}</span>
          <span class="font-bold flex-shrink-0 w-10 text-right">${a.percent}%</span>
        </div>`;
    }).join('');

    tt.classList.remove('hidden');
    clampTooltipPos(tt, x, y, 12, -28);
}

function hideTooltip() {
    document.getElementById('time-tooltip').classList.add('hidden');
}

// ---------- 热力图 ----------
// 颜色方案参考 ECharts 日历热力图: #9BE9A8(低) → #40C463(中) → #216E39(高)
function getHeatColor(value, maxVal, isDark) {
    if (value === 0 || value == null) return isDark ? '#2a2a2a' : '#EBEDF0';
    const ratio = value / maxVal;
    if (isDark) {
        if (ratio < 0.33) return '#1e4a2e';
        if (ratio < 0.66) return '#216E39';
        return '#40C463';
    }
    if (ratio < 0.33) return '#9BE9A8';
    if (ratio < 0.66) return '#40C463';
    return '#216E39';
}

function renderHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    const container = document.getElementById('heatmap-container');
    const isDark = document.documentElement.classList.contains('dark');

    // 固定格子大小，根据容器宽度计算列数
    const ROWS = 14, CELL = 20, GAP = 4;
    const containerW = container.clientWidth - 48;
    const cols = Math.max(1, Math.floor((containerW + GAP) / (CELL + GAP)));
    const totalCells = ROWS * cols;
    grid.style.gridTemplateColumns = `repeat(${cols}, ${CELL}px)`;

    // 日期范围按格数自适应：periodOffset=0 显示最新数据
    const lastDataDate = parseDate(ts().dates[ts().dates.length - 1]);
    const endDate = new Date(lastDataDate);
    endDate.setDate(endDate.getDate() + ts().periodOffset * totalCells);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - totalCells + 1);

    // 遍历范围内每天，计算最大值
    let maxVal = 1;
    const values = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const v = ts().daily[key] || 0;
        values.push({ date: new Date(d), key, value: v });
        if (v > maxVal) maxVal = v;
    }

    // 列优先填充（grid-auto-flow:column 自动处理）
    const cells = [];
    for (const item of values) {
        const color = getHeatColor(item.value, maxVal, isDark);
        const dateStr = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}-${String(item.date.getDate()).padStart(2, '0')}`;
        cells.push(`<div class="heatmap-cell" style="background:${color}" data-date="${dateStr}"></div>`);
    }

    // 填充空白格——逐格递增日期，与有数据格统一走 tooltip
    if (values.length > 0) {
        const fillDate = new Date(values[values.length - 1].date);
        for (let i = values.length; i < totalCells; i++) {
            fillDate.setDate(fillDate.getDate() + 1);
            const key = `${fillDate.getFullYear()}-${String(fillDate.getMonth() + 1).padStart(2, '0')}-${String(fillDate.getDate()).padStart(2, '0')}`;
            cells.push(`<div class="heatmap-cell empty" data-date="${key}"></div>`);
        }
    }

    grid.innerHTML = cells.join('');

    // 绑定 hover 事件（所有格，含空数据格）
    grid.querySelectorAll('.heatmap-cell').forEach(cell => {
        const dateKey = cell.dataset.date;
        cell.addEventListener('mouseenter', e => {
            showTooltip(e.clientX, e.clientY, dateKey);
        });
        cell.addEventListener('mousemove', e => {
            const isMobile = window.innerWidth < 768;
            if (isMobile) return; // 移动端不跟随鼠标移动

            const tt = document.getElementById('time-tooltip');
            if (!tt.classList.contains('hidden')) {
                tt.style.left = (e.clientX + 12) + 'px';
                tt.style.top = (e.clientY - 28) + 'px';
            }
        });
        cell.addEventListener('mouseleave', () => hideTooltip());
        cell.addEventListener('click', e => {
            if (!ts().dateDetailCache[dateKey]) return;
            tooltipExpanded = !tooltipExpanded;
            showTooltip(e.clientX, e.clientY, dateKey);
        });
        // 移动端触摸支持
        cell.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            if (touch) showTooltip(touch.clientX, touch.clientY, dateKey);
        }, { passive: false });
    });

    // 更新图例颜色
    document.querySelectorAll('.heatmap-legend').forEach((el, i) => {
        const ratios = [0.15, 0.5, 0.85];
        el.style.background = getHeatColor(Math.floor(maxVal * ratios[i]), maxVal, isDark);
    });

    // 暴露日期范围供 refreshTimeCharts 使用
    timeState._heatStart = startDate;
    timeState._heatEnd = endDate;
    timeState._heatCells = totalCells;
}

function getMonthAggregation() {
    const months = {};
    for (const [dateStr, hours] of Object.entries(ts().daily)) {
        const key = dateStr.slice(0, 7); // "YYYY-MM-DD" → "YYYY-MM"
        months[key] = (months[key] || 0) + hours;
    }
    const keys = Object.keys(months).sort();
    return { labels: keys, values: keys.map(k => Math.round(months[k] * 10) / 10) };
}

function refreshTimeCharts() {
    if (ts().dates.length === 0) return;
    const barCtrls = document.getElementById('bar-controls');

    if (ts().chartType === 'bar') {
        document.getElementById('bar-chart-container').classList.remove('hidden');
        document.getElementById('heatmap-container').classList.add('hidden');
        barCtrls.classList.remove('hidden');

        if (ts().barMode === 'month') {
            const { labels, values } = getMonthAggregation();
            const isMobile = window.innerWidth < 768;
            const maxMonths = isMobile ? 6 : 12;
            const windowSize = Math.min(maxMonths, labels.length);
            const startIdx = Math.max(0, Math.min(labels.length - windowSize, ts().weekStartIdx));
            const sliceLabels = labels.slice(startIdx, startIdx + windowSize);
            const sliceValues = values.slice(startIdx, startIdx + windowSize);
            drawBarChart(sliceLabels, sliceValues);
            document.getElementById('time-range-label').textContent =
                sliceLabels.length > 0 ? `${sliceLabels[0]} — ${sliceLabels[sliceLabels.length - 1]}` : '';
        } else {
            // 按周：以 weekStartIdx 对应日期为锚点，生成连续 7 个自然日
            const startIdx = Math.max(0, Math.min(ts().dates.length - 1, ts().weekStartIdx));
            const startDate = parseDate(ts().dates[startIdx]);
            const dates = [];
            const values = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                dates.push(key);
                values.push(ts().daily[key] || 0);
            }
            drawBarChart(dates, values);
            const label = `${formatDateCN(dates[0])} — ${formatDateCN(dates[6])}`;
            document.getElementById('time-range-label').textContent = label;
        }
    } else {
        document.getElementById('bar-chart-container').classList.add('hidden');
        document.getElementById('heatmap-container').classList.remove('hidden');
        barCtrls.classList.add('hidden');
        renderHeatmap();
        const s = timeState._heatStart, e = timeState._heatEnd;
        const fmt = (d) => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
        document.getElementById('time-range-label').textContent = s ? `${fmt(s)} — ${fmt(e)}` : '';
    }
    updateNavButtons();
}

function navigate(dir) {
    if (ts().chartType === 'heatmap') {
        // 按整页格数翻页，使用日历跨度而非有数据的天数，确保可追溯到最早日期
        const firstDate = parseDate(ts().dates[0]);
        const lastDate = parseDate(ts().dates[ts().dates.length - 1]);
        const calendarSpan = Math.round((lastDate - firstDate) / (24 * 60 * 60 * 1000)) + 1;
        const cellsPerPage = timeState._heatCells || 140;
        const maxPages = Math.ceil(calendarSpan / cellsPerPage);
        ts().periodOffset = Math.max(-(maxPages - 1), Math.min(0, ts().periodOffset + dir));
    } else if (ts().barMode === 'month') {
        const { labels } = getMonthAggregation();
        const isMobile = window.innerWidth < 768;
        const maxMonths = isMobile ? 6 : 12;
        const windowSize = Math.min(maxMonths, labels.length);
        ts().weekStartIdx = Math.max(0, Math.min(labels.length - windowSize, ts().weekStartIdx + dir * windowSize));
    } else {
        // 按周导航：从锚定日期偏移 ±7 自然日，再反向查找在 dates 中的最近索引
        const curIdx = Math.max(0, Math.min(ts().dates.length - 1, ts().weekStartIdx));
        const curDate = parseDate(ts().dates[curIdx]);
        const newDate = new Date(curDate);
        newDate.setDate(newDate.getDate() + dir * 7);
        const newKey = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
        let newIdx = 0;
        for (let i = 0; i < ts().dates.length; i++) {
            if (ts().dates[i] >= newKey) { newIdx = i; break; }
        }
        ts().weekStartIdx = Math.max(0, Math.min(ts().dates.length - 7, newIdx));
    }
    refreshTimeCharts();
}

function setChartType(type) {
    ts().chartType = type;
    document.getElementById('btn-chart-bar').className = type === 'bar'
        ? 'px-4 py-1.5 text-sm font-bold transition-colors bg-royal text-white'
        : 'px-4 py-1.5 text-sm font-bold transition-colors bg-white text-ink hover:bg-gray-100';
    document.getElementById('btn-chart-heatmap').className = type === 'heatmap'
        ? 'px-4 py-1.5 text-sm font-bold transition-colors bg-royal text-white'
        : 'px-4 py-1.5 text-sm font-bold transition-colors bg-white text-ink hover:bg-gray-100';
    refreshTimeCharts();
}

function setBarMode(mode) {
    ts().barMode = mode;
    // 从最新数据开始显示
    if (mode === 'week') {
        ts().weekStartIdx = Math.max(0, ts().dates.length - 7);
    } else {
        const { labels } = getMonthAggregation();
        const isMobile = window.innerWidth < 768;
        const maxMonths = isMobile ? 6 : 12;
        ts().weekStartIdx = Math.max(0, labels.length - Math.min(maxMonths, labels.length));
    }
    document.getElementById('btn-bar-week').className = mode === 'week'
        ? 'px-3 py-1 text-xs font-bold border-2 border-black rounded bg-royal text-white transition-colors'
        : 'px-3 py-1 text-xs font-bold border-2 border-black rounded bg-white text-ink hover:bg-gray-100 transition-colors';
    document.getElementById('btn-bar-month').className = mode === 'month'
        ? 'px-3 py-1 text-xs font-bold border-2 border-black rounded bg-royal text-white transition-colors'
        : 'px-3 py-1 text-xs font-bold border-2 border-black rounded bg-white text-ink hover:bg-gray-100 transition-colors';
    refreshTimeCharts();
}

function updateNavButtons() {
    const prevBtn = document.getElementById('btn-nav-prev');
    const nextBtn = document.getElementById('btn-nav-next');
    if (ts().chartType === 'heatmap') {
        const firstDate = parseDate(ts().dates[0]);
        const lastDate = parseDate(ts().dates[ts().dates.length - 1]);
        const calendarSpan = Math.round((lastDate - firstDate) / (24 * 60 * 60 * 1000)) + 1;
        const cellsPerPage = timeState._heatCells || 140;
        const maxPages = Math.ceil(calendarSpan / cellsPerPage);
        prevBtn.style.visibility = ts().periodOffset <= -(maxPages - 1) ? 'hidden' : '';
        nextBtn.style.visibility = ts().periodOffset >= 0 ? 'hidden' : '';
        return;
    }
    if (ts().barMode === 'month') {
        const { labels } = getMonthAggregation();
        const isMobile = window.innerWidth < 768;
        const maxMonths = isMobile ? 6 : 12;
        const ws = Math.min(maxMonths, labels.length);
        prevBtn.style.visibility = ts().weekStartIdx <= 0 ? 'hidden' : '';
        nextBtn.style.visibility = ts().weekStartIdx >= labels.length - ws ? 'hidden' : '';
        return;
    }
    // 按周模式
    prevBtn.style.visibility = ts().weekStartIdx <= 0 ? 'hidden' : '';
    nextBtn.style.visibility = ts().weekStartIdx >= ts().dates.length - 7 ? 'hidden' : '';
}

function setupTimeEvents() {
    document.getElementById('btn-nav-prev').addEventListener('click', () => navigate(-1));
    document.getElementById('btn-nav-next').addEventListener('click', () => navigate(1));
    document.getElementById('btn-chart-bar').addEventListener('click', () => setChartType('bar'));
    document.getElementById('btn-chart-heatmap').addEventListener('click', () => setChartType('heatmap'));
    document.getElementById('btn-bar-week').addEventListener('click', () => setBarMode('week'));
    document.getElementById('btn-bar-month').addEventListener('click', () => setBarMode('month'));

    // 导航中的 "时间" 链接
    document.getElementById('desktop-time-link').addEventListener('click', e => {
        e.preventDefault();
        setActiveNav(document.getElementById('desktop-time-link'));
        showTimeView();
    });
    document.getElementById('mobile-time-link').addEventListener('click', e => {
        e.preventDefault();
        setActiveNav(document.getElementById('mobile-time-link'));
        document.getElementById('mobile-nav').classList.add('hidden');
        if (mobileMenuBtn) mobileMenuBtn.textContent = '☰';
        showTimeView();
    });

    // Canvas 条形图 hover 检测
    const canvas = document.getElementById('bar-canvas');
    canvas.addEventListener('mousemove', e => {
        if (ts().chartType !== 'bar' || !timeState._barRects) { hideTooltip(); return; }
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hit = timeState._barRects.find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
        if (hit) showTooltip(e.clientX, e.clientY, hit.date);
        else hideTooltip();
    });
    canvas.addEventListener('mouseleave', () => hideTooltip());
    canvas.addEventListener('click', e => {
        if (ts().chartType !== 'bar' || !timeState._barRects) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hit = timeState._barRects.find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
        if (hit) {
            tooltipExpanded = !tooltipExpanded;
            showTooltip(e.clientX, e.clientY, hit.date);
        }
    });
    // 移动端触摸支持：点击条形图显示 tooltip
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        if (ts().chartType !== 'bar' || !timeState._barRects) return;
        const touch = e.touches[0];
        if (!touch) return;
        const rect = canvas.getBoundingClientRect();
        const mx = touch.clientX - rect.left;
        const my = touch.clientY - rect.top;
        const hit = timeState._barRects.find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
        if (hit) showTooltip(touch.clientX, touch.clientY, hit.date);
    }, { passive: false });

    // 窗口 resize 时重绘条形图
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (state.view === 'time') refreshTimeCharts();
        }, 200);
    });
}

// ==================== 启动 ====================
async function init() {
    setupEvents();
    setupTimeEvents();

    // Hash 路由：直接打开文章详情 / 关于页 / 时间统计
    const hash = window.location.hash;
    if (hash.startsWith('#/article/')) {
        const slug = hash.slice('#/article/'.length);
        await fetchArticles();
        showArticleDetail(slug);
    } else if (hash === '#/about') {
        await fetchArticles();
        showAbout();
    } else if (hash === '#/time') {
        await fetchTimeData();
        showTimeView();
    } else {
        await fetchArticles();
    }
}

// 监听浏览器前进/后退
window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (!hash || hash === '#/') {
        if (state.view === 'time') { hideTimeView(); goBackToList(); }
        else if (state.view !== 'list') goBackToList();
        setActiveNav(document.querySelector('.js-nav-filter[data-category=""]'));
    } else if (hash.startsWith('#/article/')) {
        if (state.view === 'time') hideTimeView();
        const slug = hash.slice('#/article/'.length);
        if (state.currentArticle !== slug) showArticleDetail(slug);
        setActiveNav(null);
    } else if (hash === '#/about') {
        if (state.view === 'time') hideTimeView();
        if (state.view !== 'about') showAbout();
        setActiveNav(null);
    } else if (hash === '#/time') {
        fetchTimeData().then(() => showTimeView());
        setActiveNav(document.getElementById('desktop-time-link') || document.getElementById('mobile-time-link'));
    }
});

document.addEventListener('DOMContentLoaded', init);

