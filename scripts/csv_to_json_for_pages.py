#!/usr/bin/env python3
"""
Конвертация CSV в JSON для GitHub Pages
Оптимизировано для браузера: сокращает тексты для предпросмотра
"""

import pandas as pd
import json
import re
from pathlib import Path

CSV_PATH = Path("data/dataset_adj_person.csv")
OUTPUT_JSON = Path("docs/data/corpus.json")

def clean_text(text, max_length=300):
    """Очищает текст и обрезает до разумной длины"""
    if pd.isna(text):
        return ""
    text = str(text)
    # Убираем лишние пробелы
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    # Обрезаем для быстрой загрузки
    if len(text) > max_length:
        text = text[:max_length] + '...'
    return text

def split_urls(urls_str):
    """Разделяет URL-строку на список"""
    if pd.isna(urls_str) or not urls_str:
        return []
    return re.split(r'\s+', str(urls_str).strip())

def main():
    print("📖 Чтение CSV...")
    
    # Пробуем разные кодировки
    df = None
    for encoding in ['utf-8-sig', 'utf-8', 'cp1251', 'latin1']:
        try:
            df = pd.read_csv(CSV_PATH, encoding=encoding, sep=None, engine='python')
            print(f"✅ Прочитано с кодировкой {encoding}")
            break
        except Exception as e:
            print(f"❌ {encoding}: {str(e)[:50]}")
            continue
    
    if df is None:
        print("💥 Не удалось прочитать файл")
        return
    
    print(f"📊 Загружено {len(df)} контекстов")
    print(f"📋 Колонки: {list(df.columns)}")
    
    # Нормализуем имена колонок
    column_mapping = {}
    for col in df.columns:
        col_lower = col.lower().strip()
        if 'прилагательн' in col_lower or 'adj' in col_lower:
            column_mapping[col] = 'adjective'
        elif 'дериват' in col_lower or 'deriv' in col_lower:
            column_mapping[col] = 'derivative'
        elif 'суффикс' in col_lower or 'suffix' in col_lower:
            column_mapping[col] = 'suffix'
        elif 'текст' in col_lower or 'text' in col_lower or 'context' in col_lower:
            column_mapping[col] = 'text'
        elif 'стиль' in col_lower or 'style' in col_lower:
            column_mapping[col] = 'style'
        elif 'год' in col_lower or 'year' in col_lower:
            column_mapping[col] = 'year'
        elif 'url' in col_lower:
            column_mapping[col] = 'urls'
        elif 'домен' in col_lower or 'domain' in col_lower:
            column_mapping[col] = 'domains'
    
    df.rename(columns=column_mapping, inplace=True)
    print(f"📝 После переименования: {list(df.columns)}")
    
    # Создаём JSON для браузера
    corpus_for_browser = []
    
    for idx, row in df.iterrows():
        # Берём текст с обрезанием
        text = clean_text(row.get('text', ''), max_length=250)
        
        entry = {
            'id': idx,
            'adjective': str(row.get('adjective', '')),
            'derivative': str(row.get('derivative', '')),
            'suffix': str(row.get('suffix', '')),
            'text': text,
            'full_text': str(row.get('text', '')),  # Полный текст для детального просмотра
            'style': str(row.get('style', '')),
            'year': str(row.get('year', '')),
            'urls': split_urls(row.get('urls', '')),
            'domains': split_urls(row.get('domains', ''))
        }
        
        corpus_for_browser.append(entry)
    
    # Сохраняем JSON
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(corpus_for_browser, f, ensure_ascii=False, indent=None, separators=(',', ':'))
    
    # Размер файла
    file_size = OUTPUT_JSON.stat().st_size / (1024 * 1024)
    
    print(f"\n✅ Готово!")
    print(f"📁 Файл: {OUTPUT_JSON}")
    print(f"📏 Размер: {file_size:.2f} MB")
    print(f"📊 Записей: {len(corpus_for_browser)}")
    
    # Выводим пример
    if corpus_for_browser:
        print(f"\n📝 Пример:")
        print(json.dumps(corpus_for_browser[0], ensure_ascii=False, indent=2)[:500])

if __name__ == "__main__":
    main()