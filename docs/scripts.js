let corpusData = [];
let currentData = [];

// Загрузка при открытии
async function loadCorpus() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="loading">📥 Загрузка корпуса (8 298 контекстов)... Пожалуйста, подождите</div>';
    
    try {
        const response = await fetch('data/corpus.json');
        corpusData = await response.json();
        currentData = [...corpusData];
        
        // Обновляем статистику
        updateStats();
        
        // Заполняем фильтры
        populateFilters();
        
        // Показываем случайные примеры
        showRandomExamples(10);
        
        console.log(`✅ Загружено ${corpusData.length} контекстов`);
    } catch (error) {
        console.error('Ошибка:', error);
        resultsDiv.innerHTML = '<div class="loading">❌ Ошибка загрузки данных. Попробуйте обновить страницу.</div>';
    }
}

function updateStats() {
    const totalCount = document.getElementById('totalCount');
    const stats = document.getElementById('stats');
    if (totalCount) totalCount.textContent = corpusData.length;
    if (stats) stats.innerHTML = `📊 ${corpusData.length} контекстов | ${new Set(corpusData.map(d => d.derivative)).size} уникальных дериватов`;
}

function populateFilters() {
    // Годы
    const years = [...new Set(corpusData.map(d => d.year))].filter(y => y).sort();
    const yearSelect = document.getElementById('yearFilter');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    
    // Суффиксы
    const suffixes = [...new Set(corpusData.map(d => d.suffix))].filter(s => s);
    const suffixSelect = document.getElementById('suffixFilter');
    suffixes.forEach(suffix => {
        const option = document.createElement('option');
        option.value = suffix;
        option.textContent = suffix;
        suffixSelect.appendChild(option);
    });
}

function showRandomExamples(count) {
    // Берём случайные примеры
    const shuffled = [...corpusData].sort(() => 0.5 - Math.random());
    const randomExamples = shuffled.slice(0, Math.min(count, corpusData.length));
    
    const resultsHeader = document.getElementById('resultsHeader');
    resultsHeader.innerHTML = `🎲 Случайные примеры из корпуса (${count} из ${corpusData.length})`;
    
    displayResults(randomExamples, '');
}

function search() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const year = document.getElementById('yearFilter').value;
    const style = document.getElementById('styleFilter').value;
    const suffix = document.getElementById('suffixFilter').value;
    
    let results = [...corpusData];
    
    // Поиск по тексту, деривату, прилагательному
    if (query) {
        results = results.filter(item => {
            return item.text.toLowerCase().includes(query) ||
                   item.derivative.toLowerCase().includes(query) ||
                   item.adjective.toLowerCase().includes(query);
        });
    }
    
    // Фильтр по году
    if (year) {
        results = results.filter(item => item.year === year);
    }
    
    // Фильтр по стилю
    if (style) {
        results = results.filter(item => item.style === style);
    }
    
    // Фильтр по суффиксу
    if (suffix) {
        results = results.filter(item => item.suffix === suffix);
    }
    
    const resultsHeader = document.getElementById('resultsHeader');
    if (query) {
        resultsHeader.innerHTML = `🔍 Найдено ${results.length} результатов по запросу «${query}»`;
    } else if (year || style || suffix) {
        resultsHeader.innerHTML = `📌 Найдено ${results.length} результатов с применёнными фильтрами`;
    } else {
        resultsHeader.innerHTML = `📖 Всего ${results.length} контекстов (показываем до 100)`;
    }
    
    displayResults(results.slice(0, 100), query);
}

function displayResults(results, query) {
    const resultsDiv = document.getElementById('results');
    
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="loading">😕 Ничего не найдено. Попробуйте изменить запрос.</div>';
        return;
    }
    
    resultsDiv.innerHTML = results.map(item => {
        let text = item.text;
        // Подсветка
        if (query) {
            const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
            text = text.replace(regex, '<mark class="highlight">$1</mark>');
        }
        
        return `
            <div class="result-card">
                <div class="result-text">${text}</div>
                <div class="result-meta">
                    <span class="derivative">📝 ${item.derivative || '?'}</span>
                    <span class="suffix">🔤 -${item.suffix || '?'}</span>
                    <span class="year">📅 ${item.year || '?'}</span>
                    <span class="style">🎭 ${item.style || '?'}</span>
                    ${item.urls && item.urls[0] ? `<span>🔗 <a href="${item.urls[0]}" target="_blank">источник</a></span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('styleFilter').value = '';
    document.getElementById('suffixFilter').value = '';
    showRandomExamples(10);
}

// События
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search();
});

document.getElementById('yearFilter').addEventListener('change', search);
document.getElementById('styleFilter').addEventListener('change', search);
document.getElementById('suffixFilter').addEventListener('change', search);

// Запуск
loadCorpus();