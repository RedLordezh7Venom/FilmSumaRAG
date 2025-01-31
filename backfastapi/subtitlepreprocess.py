import re

def extract_text_from_srt(file_path):
    """Extract dialogue text from an SRT file."""
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()

    # Split the content into subtitle blocks
    subtitle_blocks = re.split(r'\n\n+', content.strip())
    
    dialogue_lines = []
    
    for block in subtitle_blocks:
        lines = block.split('\n')
        
        # Skip empty blocks
        if not lines:
            continue
            
        # Skip the subtitle number (first line)
        # Skip the timestamp line (second line if it contains -->)
        text_lines = []
        for line in lines:
            # Skip empty lines
            if not line.strip():
                continue
            # Skip subtitle numbers (just digits)
            if line.strip().isdigit():
                continue
            # Skip timestamp lines
            if '-->' in line:
                continue
            # Add dialogue text
            text_lines.append(line.strip())
        
        if text_lines:
            # Join multiple lines of dialogue
            dialogue = ' '.join(text_lines)
            # Remove speaker labels (e.g., "JANE:", "ERIK:")
            dialogue = re.sub(r'^[A-Z]+:', '', dialogue).strip()
            # Remove parenthetical sound effects
            dialogue = re.sub(r'\([^)]*\)', '', dialogue).strip()
            # Clean up any extra whitespace
            dialogue = re.sub(r'\s+', ' ', dialogue).strip()
            
            if dialogue:  # Only add non-empty dialogues
                dialogue_lines.append(dialogue)
    
    return dialogue_lines

def main(input_file):
    output_file = input_file.rsplit('.', 1)[0] + '_text.txt'
    
    try:
        # Extract the dialogue
        dialogues = extract_text_from_srt(input_file)
        
        # Write to output file
        with open(output_file, 'w', encoding='utf-8') as file:
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

if __name__ == "__main__":
    input_file = input("Enter the path to your SRT file: ")
    main(input_file)