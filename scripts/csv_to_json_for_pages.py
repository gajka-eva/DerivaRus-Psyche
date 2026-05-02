import pandas as pd
import json
import re
from pathlib import Path

CSV_PATH = Path("data/dataset_adj_person.csv")
OUTPUT_JSON = Path("docs/data/corpus.json")

def clean_text(text, max_length=None):
    """Очистка текста без обрезания"""
    if pd.isna(text):
        return ""
    text = str(text)
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    return text

def truncate_text(text, max_length=250):
    """Обрезание только для предпросмотра"""
    if len(text) <= max_length:
        return text
    return text[:max_length] + '...'

def split_urls(urls_str):
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
        except:
            continue
    
    if df is None:
        print("❌ Не удалось прочитать CSV")
        return
    
    print(f"📊 Загружено {len(df)} строк")
    
    # Создаём JSON
    corpus = []
    for idx, row in df.iterrows():
        # Полный, необрезанный текст
        full_text = clean_text(row.get('текст', ''))
        
        # Обрезанный текст для предпросмотра
        preview_text = truncate_text(full_text, 250)
        
        entry = {
            'id': idx,
            'adjective': str(row.get('прилагательное', '')),
            'derivative': str(row.get('дериват', '')),
            'suffix': str(row.get('суффикс', '')),
            'text': preview_text,           # Обрезанный для списка
            'full_text': full_text,         # Полный для модального окна
            'style': str(row.get('функциональный стиль', '')),
            'year': str(row.get('год', '')),
            'urls': split_urls(row.get('URL', '')),
            'domains': split_urls(row.get('домен', ''))
        }
        corpus.append(entry)
    
    # Сохраняем
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(corpus, f, ensure_ascii=False, separators=(',', ':'))
    
    print(f"✅ Сохранено {len(corpus)} записей в {OUTPUT_JSON}")
    print(f"📏 Размер: {OUTPUT_JSON.stat().st_size / 1024 / 1024:.2f} MB")
    
    # Проверяем, что full_text сохранился
    if corpus:
        sample = corpus[0]
        print(f"\n📝 Пример:")
        print(f"   text (предпросмотр): {sample['text'][:100]}...")
        print(f"   full_text (полный): {len(sample['full_text'])} символов")

if __name__ == "__main__":
    main()