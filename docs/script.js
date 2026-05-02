// Глобальные переменные
let corpusData = [];
let currentResults = [];

// Словари для автодополнения
let adjectivesList = [];
let derivativesList = [];

// DOM элементы
let adjInput, derivInput, adjList, derivList;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    adjInput = document.getElementById('adjSearch');
    derivInput = document.getElementById('derivSearch');
    adjList = document.getElementById('adjList');
    derivList = document.getElementById('derivList');
    
    loadCorpus();
    
    // ТОЛЬКО автодополнение, НЕ поиск при вводе
    adjInput.addEventListener('input', () => showAutocomplete('adj'));
    derivInput.addEventListener('input', () => showAutocomplete('deriv'));
    
    // Закрытие списков при клике вне
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            adjList.classList.remove('show');
            derivList.classList.remove('show');
        }
    });
    
    // Фильтры — поиск при изменении фильтра
    document.getElementById('suffixFilter').addEventListener('change', performSearch);
    document.getElementById('yearFilter').addEventListener('change', performSearch);
    document.getElementById('styleFilter').addEventListener('change', performSearch);
    
    // Enter для поиска
    adjInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
    derivInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
});

// Загрузка корпуса
async function loadCorpus() {
    try {
        const response = await fetch('data/corpus.json');
        corpusData = await response.json();
        console.log(`✅ Загружено ${corpusData.length} контекстов`);
        
        buildDictionaries();
        populateFilters();
        updateStats();
        showRandomExamples();
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('results').innerHTML = '<div class="loading">❌ Ошибка загрузки корпуса</div>';
    }
}

// Построение словарей
function buildDictionaries() {
    const adjMap = new Map();
    const derivMap = new Map();
    
    corpusData.forEach(item => {
        if (item.adjective) {
            adjMap.set(item.adjective, (adjMap.get(item.adjective) || 0) + 1);
        }
        if (item.derivative) {
            derivMap.set(item.derivative, (derivMap.get(item.derivative) || 0) + 1);
        }
    });
    
    adjectivesList = Array.from(adjMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    
    derivativesList = Array.from(derivMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

// Автодополнение (только показывает варианты, НЕ ищет)
function showAutocomplete(type) {
    const input = type === 'adj' ? adjInput : derivInput;
    const list = type === 'adj' ? adjList : derivList;
    const dataList = type === 'adj' ? adjectivesList : derivativesList;
    
    const query = input.value.toLowerCase().trim();
    
    if (!query) {
        list.classList.remove('show');
        return;
    }
    
    const filtered = dataList.filter(item => 
        item.name.toLowerCase().includes(query)
    ).slice(0, 15);
    
    if (filtered.length === 0) {
        list.classList.remove('show');
        return;
    }
    
    list.innerHTML = filtered.map(item => `
        <div class="autocomplete-item" onclick="selectAutocomplete('${type}', '${item.name}')">
            ${item.name}
            <span class="count">${item.count}</span>
        </div>
    `).join('');
    
    list.classList.add('show');
}

// Выбор из автодополнения (заполняет поле, НЕ ищет автоматически)
function selectAutocomplete(type, value) {
    if (type === 'adj') {
        adjInput.value = value;
        derivInput.value = '';
    } else {
        derivInput.value = value;
        adjInput.value = '';
    }
    
    document.getElementById(`${type}List`).classList.remove('show');
}

// Основной поиск (только по кнопке или Enter)
function performSearch() {
    const adjQuery = adjInput.value.trim().toLowerCase();
    const derivQuery = derivInput.value.trim().toLowerCase();
    const suffix = document.getElementById('suffixFilter').value;
    const year = document.getElementById('yearFilter').value;
    const style = document.getElementById('styleFilter').value;
    
    if (!adjQuery && !derivQuery) {
        showRandomExamples();
        return;
    }
    
    let results = [...corpusData];
    
    if (adjQuery) {
        results = results.filter(item => 
            item.adjective && item.adjective.toLowerCase() === adjQuery
        );
    }
    
    if (derivQuery) {
        results = results.filter(item => 
            item.derivative && item.derivative.toLowerCase() === derivQuery
        );
    }
    
    if (suffix) {
        results = results.filter(item => item.suffix === suffix);
    }
    if (year) {
        results = results.filter(item => item.year === year);
    }
    if (style) {
        results = results.filter(item => item.style === style);
    }
    
    currentResults = results;
    
    const header = document.getElementById('resultsHeader');
    let queryText = [];
    if (adjQuery) queryText.push(`прилагательному «${adjQuery}»`);
    if (derivQuery) queryText.push(`деривату «${derivQuery}»`);
    header.innerHTML = `🔍 Найдено ${results.length} контекстов по ${queryText.join(' и ')}`;
    
    displayResults(results);
}

// Отображение результатов (с правильными полями)
function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="loading">😕 Ничего не найдено</div>';
        return;
    }
    
    const allDerivatives = new Set(corpusData.map(item => item.derivative).filter(d => d));
    
    resultsDiv.innerHTML = results.slice(0, 100).map(item => {
        // Используем full_text для определения, обрезан ли текст
        const originalText = item.full_text || item.text || '';
        const isTruncated = originalText.length > 250;
        
        // Показываем обрезанную версию (text)
        let displayText = item.text || '';
        
        // Подсвечиваем дериваты в отображаемом тексте
        let highlightedText = displayText;
        const sortedDerivatives = Array.from(allDerivatives).sort((a, b) => b.length - a.length);
        
        for (const deriv of sortedDerivatives) {
            if (deriv && deriv.length > 2) {
                const regex = new RegExp(`(${escapeRegex(deriv)})`, 'gi');
                highlightedText = highlightedText.replace(regex, '<mark class="highlight-derivative">$1</mark>');
            }
        }
        
        return `
            <div class="result-card">
                <div class="result-text">
                    ${highlightedText}
                    ${isTruncated ? `<button class="expand-btn" onclick="showFullTextById(${item.id})">📖 Развернуть</button>` : ''}
                </div>
                <div class="result-meta">
                    <span class="derivative">🏠 ${item.derivative || '?'}</span>
                    <span class="adjective">🧱 ← ${item.adjective || '?'}</span>
                    <span class="suffix suffix-badge">🔨 -${item.suffix || '?'}</span>
                    <span class="year">📅 ${item.year || '?'}</span>
                    <span class="style">🎭 ${item.style || '?'}</span>
                    ${item.urls && item.urls[0] ? `<span>🔗 <a href="${item.urls[0]}" target="_blank">источник</a></span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}


// Показ полного текста по ID (исправленная версия)
function showFullTextById(id) {
    const item = corpusData.find(d => d.id === id);
    if (item) {
        // Используем full_text, а не text!
        const fullText = item.full_text || item.text;
        
        const fullItem = {
            ...item,
            full_text: fullText,
            first_url: item.urls && item.urls[0]
        };
        showFullText(fullItem);
    }
}

// Открытие модального окна с полным текстом (исправленная версия)
function showFullText(item) {
    const modal = document.getElementById('fulltextModal');
    const body = document.getElementById('fulltextBody');
    const meta = document.getElementById('fulltextMeta');
    
    // Берём ПОЛНЫЙ текст
    let fullText = item.full_text || item.text || '';
    
    // Собираем все дериваты для подсветки
    const allDerivatives = new Set(corpusData.map(d => d.derivative).filter(d => d));
    let highlightedText = fullText;
    
    const sortedDerivatives = Array.from(allDerivatives).sort((a, b) => b.length - a.length);
    for (const deriv of sortedDerivatives) {
        if (deriv && deriv.length > 2) {
            const regex = new RegExp(`(${escapeRegex(deriv)})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark class="highlight-derivative">$1</mark>');
        }
    }
    
    // Показываем ВЕСЬ текст без обрезания
    body.innerHTML = `<div class="full-text" style="white-space: pre-wrap; word-wrap: break-word;">${highlightedText}</div>`;
    
    meta.innerHTML = `
        <span>🏠 ${item.derivative || '?'}</span>
        <span>🧱 ← ${item.adjective || '?'}</span>
        <span>🔨 -${item.suffix || '?'}</span>
        <span>📅 ${item.year || '?'}</span>
        <span>🎭 ${item.style || '?'}</span>
        ${item.first_url ? `<span>🔗 <a href="${item.first_url}" target="_blank">Источник</a></span>` : ''}
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('fulltextModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Закрытие по Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Случайные примеры
function showRandomExamples() {
    if (!corpusData.length) return;
    
    const shuffled = [...corpusData].sort(() => 0.5 - Math.random());
    const randomExamples = shuffled.slice(0, 12);
    
    document.getElementById('resultsHeader').innerHTML = '🎲 Случайные примеры из корпуса';
    displayResults(randomExamples);
}

// Очистка всех фильтров
function clearAll() {
    adjInput.value = '';
    derivInput.value = '';
    document.getElementById('suffixFilter').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('styleFilter').value = '';
    showRandomExamples();
}

// Заполнение фильтров
function populateFilters() {
    const suffixes = new Set();
    const years = new Set();
    
    corpusData.forEach(item => {
        if (item.suffix) suffixes.add(item.suffix);
        if (item.year) years.add(item.year);
    });
    
    const suffixSelect = document.getElementById('suffixFilter');
    Array.from(suffixes).sort().forEach(suffix => {
        const option = document.createElement('option');
        option.value = suffix;
        option.textContent = suffix;
        suffixSelect.appendChild(option);
    });
    
    const yearSelect = document.getElementById('yearFilter');
    Array.from(years).sort().forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

// Обновление статистики
function updateStats() {
    const uniqueDerivatives = new Set(corpusData.map(d => d.derivative).filter(d => d));
    document.getElementById('stats').innerHTML = `📊 ${corpusData.length} контекстов | ${uniqueDerivatives.size} дериватов`;
    document.getElementById('totalCount').textContent = corpusData.length;
}

// Экранирование для регулярных выражений
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Закрытие модального окна по клику на фон (если есть окно)
window.onclick = function(event) {
    const modal = document.getElementById('fulltextModal');
    if (event.target === modal) {
        closeModal();
    }
}