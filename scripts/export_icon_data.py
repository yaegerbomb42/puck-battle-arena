
import os
import re
import json

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACKER_FILE = os.path.join(PROJECT_ROOT, 'remaining_icons_prompts.txt')
OUTPUT_FILE = os.path.join(PROJECT_ROOT, 'src', 'utils', 'icons.json')

# Matches: "123. [x] **Icon Name**"
ENTRY_PATTERN = re.compile(r'^(\d+)\.\s+\[([ x])\]\s+\*\*(.+?)\*\*')

TIERS = {
    1: "Common",
    2: "Uncommon",
    3: "Rare",
    4: "Epic",
    5: "Ultra Epic",
    6: "Legendary",
    7: "Mythic",
    8: "Celestial",
    9: "Cosmic",
    10: "Divine"
}

def main():
    if not os.path.exists(TRACKER_FILE):
        print("Tracker file not found.")
        return

    with open(TRACKER_FILE, 'r') as f:
        lines = f.readlines()
        
    icons = {}
    current_tier = 1
    
    for i, line in enumerate(lines):
        if "Tier" in line and "Items" in line:
            if "Tier 1:" in line: current_tier = 1
            elif "Tier 2:" in line: current_tier = 2
            elif "Tier 3:" in line: current_tier = 3
            elif "Tier 4:" in line: current_tier = 4
            elif "Tier 5:" in line: current_tier = 5
            elif "Tier 6:" in line: current_tier = 6
            elif "Tier 7:" in line: current_tier = 7
            elif "Tier 8:" in line: current_tier = 8
            elif "Tier 9:" in line: current_tier = 9
            elif "Tier 10:" in line: current_tier = 10
            
        match = ENTRY_PATTERN.search(line)
        if match:
            icon_id = int(match.group(1))
            name = match.group(3)
            
            # Try to grab description from the next line
            description = ""
            if i + 1 < len(lines):
                desc_line = lines[i+1].strip()
                if not desc_line.startswith("Game asset icon") and desc_line:
                    description = desc_line
                elif desc_line.startswith("Game asset icon"):
                     # If it's the raw prompt, maybe just use a generic one or extract the end?
                     # Using "Collectible Game Icon" as fallback if it's just the prompt
                     description = "Collectible Game Icon"

            folder_name = f"Tier_{current_tier}_{TIERS[current_tier]}"
            image_path = f"/icons/{folder_name}/icon_{icon_id}.png"
            
            icons[icon_id] = {
                "id": icon_id,
                "name": name,
                "tier": current_tier,
                "description": description,
                "imageUrl": image_path
            }

    # Convert to list or map? Map is easier for ID lookup.
    # Sort by ID
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(icons, f, indent=2)
        
    print(f"Exported {len(icons)} icons to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
