import re
import pysubs2 

def extract_text_from_subtitle(file_path):
    """Extract dialogue text from any supported subtitle file using pysubs2."""
    try:
        subs = pysubs2.load(file_path)
        dialogue_lines = []
        for line in subs:
            # pysubs2 automatically strips formatting tags
            text = line.text.strip()
            if text:
                # Remove speaker labels (e.g., "JANE:", "ERIK:")
                text = re.sub(r'^[A-Z]+:', '', text).strip()
                # Remove parenthetical sound effects
                text = re.sub(r'\([^)]*\)', '', text).strip()
                # Clean up any extra whitespace
                text = re.sub(r'\s+', ' ', text).strip()
                if text:
                    dialogue_lines.append(text)
        return dialogue_lines
    except pysubs2.exceptions.Pysubs2Error as e:
        print(f"Error loading subtitle file with pysubs2: {e}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return []

def process(input_file):
    output_file = input_file.rsplit('.', 1)[0] + '_text.txt'
    
    try:
        # Extract the dialogue using the new general function
        dialogues = extract_text_from_subtitle(input_file)
        
        if not dialogues:
            print(f"No dialogue extracted from {input_file}. Check file format or content.")
            return
            
        # Write to output file
        # Encoding is handled by pysubs2 during load, so we can use utf-8 for writing
        with open(output_file, 'w', encoding='utf-8') as file:
            for dialogue in dialogues:
                file.write(dialogue + '\n')
        
        print(f"\nExtraction complete! Text has been saved to: {output_file}")
        print(f"Extracted {len(dialogues)} lines of dialogue.")
        
        # Preview first few lines
        print("\nFirst few lines of extracted text:")
        for dialogue in dialogues[:5]:
            print(f"- {dialogue}")
        return output_file
            
    except FileNotFoundError:
        print("Error: The specified file was not found.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        
        # Write to output file
        with open(output_file, 'w') as file:
            for dialogue in dialogues:
                file.write(dialogue + '\n')
        
        print(f"\nExtraction complete! Text has been saved to: {output_file}")
        print(f"Extracted {len(dialogues)} lines of dialogue.")
        
        # Preview first few lines
        print("\nFirst few lines of extracted text:")
        for dialogue in dialogues[:5]:
            print(f"- {dialogue}")
            
    except FileNotFoundError:
        print("Error: The specified file was not found.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
