import re
import pysubs2 
import os
import chardet

def detect_file_encoding(file_path):
    try:
        with open(file_path, 'rb') as f:
            raw_data = f.read()
        result = chardet.detect(raw_data)
        return result['encoding'], result['confidence']
    except Exception as e:
        return None, 0

def extract_text_from_subtitle(file_path):
    if not os.path.exists(file_path):
        return []
    
    detected_encoding, confidence = detect_file_encoding(file_path)
    encodings_to_try = [detected_encoding, 'utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
    encodings_to_try = list(dict.fromkeys([enc for enc in encodings_to_try if enc]))
    
    dialogue_lines = []
    
    for encoding in encodings_to_try:
        try:
            if encoding == detected_encoding:
                subs = pysubs2.load(file_path)
            else:
                subs = pysubs2.load(file_path, encoding=encoding)
            
            for line in subs:
                text = line.text.strip()
                if text:
                    text = re.sub(r'^[A-Z]+:', '', text).strip()
                    text = re.sub(r'\([^)]*\)', '', text).strip()
                    text = re.sub(r'\s+', ' ', text).strip()
                    if text:
                        dialogue_lines.append(text)
            
            if dialogue_lines:
                break
                
        except:
            continue
    
    if not dialogue_lines:
        dialogue_lines = extract_text_fallback(file_path)
    
    return dialogue_lines

def extract_text_fallback(file_path):
    dialogue_lines = []
    encodings_to_try = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings_to_try:
        try:
            with open(file_path, 'r', encoding=encoding, errors='ignore') as file:
                content = file.read()
            
            blocks = content.split('\n\n')
            
            for block in blocks:
                lines = block.strip().split('\n')
                if len(lines) >= 3:
                    for line in lines[2:]:
                        text = line.strip()
                        if text:
                            text = re.sub(r'^[A-Z]+:', '', text).strip()
                            text = re.sub(r'\([^)]*\)', '', text).strip()
                            text = re.sub(r'<[^>]*>', '', text).strip()
                            text = re.sub(r'\s+', ' ', text).strip()
                            if text:
                                dialogue_lines.append(text)
            
            if dialogue_lines:
                break
        except:
            continue
    
    return dialogue_lines

def process(input_file):
    if not input_file or not os.path.exists(input_file):
        return None
    
    output_file = input_file.rsplit('.', 1)[0] + '_text.txt'
    
    try:
        dialogues = extract_text_from_subtitle(input_file)
        
        if not dialogues:
            return None
        
        with open(output_file, 'w', encoding='utf-8') as file:
            for dialogue in dialogues:
                file.write(dialogue + '\n')
        
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            return output_file
        else:
            return None
            
    except:
        return None