
import os
import re
import shutil
import difflib

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_ROOT, 'assets')
ICONS_DIR = os.path.join(PROJECT_ROOT, 'public', 'icons')
TRACKER_FILE = os.path.join(PROJECT_ROOT, 'remaining_icons_prompts.txt')

# Tier mapping based on folder structure
TIER_FOLDERS = {
    1: "Tier_1_Common",
    2: "Tier_2_Uncommon",
    3: "Tier_3_Rare",
    4: "Tier_4_Epic",
    5: "Tier_5_Ultra Epic",
    6: "Tier_6_Legendary",
    7: "Tier_7_Mythic",
    8: "Tier_8_Celestial",
    9: "Tier_9_Cosmic",
    10: "Tier_10_Divine"
}

# Regex to parse the tracker
# Matches: "123. [ ] **Icon Name**" or "123. [x] **Icon Name**"
ENTRY_PATTERN = re.compile(r'^(\d+)\.\s+\[([ x])\]\s+\*\*(.+?)\*\*')

def normalize_name(name):
    return name.lower().strip().replace('_', ' ').replace('-', ' ')

def get_best_match(name, candidates):
    # candidates is a dict of normalized_name -> data
    matches = difflib.get_close_matches(name, candidates.keys(), n=1, cutoff=0.85)
    return matches[0] if matches else None

def main():
    print(f"Starting ingestion from {ASSETS_DIR}...")
    
    # 1. Parse Tracker
    with open(TRACKER_FILE, 'r') as f:
        lines = f.readlines()
    
    tracker_data = {} # id -> {line_idx, name, is_complete, tier}
    empty_slots = [] # list of ids
    
    current_tier = 1
    
    for idx, line in enumerate(lines):
        if "Tier" in line and "Items" in line:
            # Simple tier detection
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
            is_complete = match.group(2) == 'x'
            name = match.group(3)
            
            tracker_data[icon_id] = {
                'line_idx': idx,
                'name': name,
                'is_complete': is_complete,
                'tier': current_tier,
                'raw_line': line
            }
            if not is_complete:
                empty_slots.append(icon_id)

    print(f"Found {len(tracker_data)} tracked icons. {len(empty_slots)} empty slots.")
    
    # Map normalized names to IDs for matching
    name_to_id = {normalize_name(data['name']): icon_id for icon_id, data in tracker_data.items()}

    # 2. Scan Assets
    if not os.path.exists(ASSETS_DIR):
        print("Assets directory not found.")
        return

    asset_files = [f for f in os.listdir(ASSETS_DIR) if f.lower().endswith('.png')]
    print(f"Found {len(asset_files)} asset files.")
    
    matches_made = 0
    new_assignments = 0
    
    # Prepare update buffer
    updated_lines = lines[:]
    
    # Ensure tier directories exist
    for folder in TIER_FOLDERS.values():
        os.makedirs(os.path.join(ICONS_DIR, folder), exist_ok=True)

    # Process Assets
    for asset_file in asset_files:
        asset_name_norm = normalize_name(os.path.splitext(asset_file)[0])
        src_path = os.path.join(ASSETS_DIR, asset_file)
        
        # A. Try Matching
        matched_name = get_best_match(asset_name_norm, name_to_id)
        
        target_id = None
        is_new_assignment = False
        
        if matched_name:
            target_id = name_to_id[matched_name]
            # print(f"Matched '{asset_file}' to ID {target_id} ({tracker_data[target_id]['name']})")
            matches_made += 1
        else:
            # B. Assign to Empty Slot
            if empty_slots:
                target_id = empty_slots.pop(0)
                is_new_assignment = True
                new_assignments += 1
                # print(f"Assigning '{asset_file}' to empty slot {target_id}")
            else:
                print(f"WARNING: No matches and no empty slots for '{asset_file}'. Skipping.")
                continue
        
        # Perform Move and Update
        data = tracker_data[target_id]
        tier_folder = TIER_FOLDERS.get(data['tier'], "Tier_1_Common")
        dest_filename = f"icon_{target_id}.png"
        dest_path = os.path.join(ICONS_DIR, tier_folder, dest_filename)
        
        # Copy file (using copy2 to preserve metadata, usually safer than move for testing)
        shutil.copy2(src_path, dest_path)
        
        # Update Tracker Line
        line_idx = data['line_idx']
        original_line = updated_lines[line_idx]
        
        # Update [ ] to [x]
        new_line = original_line.replace("[ ]", "[x]")
        
        # If it's a new assignment, update the name too
        if is_new_assignment:
            # Replace **Old Name** with **New Asset Name (Capitalized)**
            # We construct a Title Case name from the filename
            new_title = os.path.splitext(asset_file)[0].replace('_', ' ').title()
            new_line = re.sub(r'\*\*(.+?)\*\*', f'**{new_title}**', new_line)
            
            # Update description line (line_idx + 1) to indicate it was auto-ingested
            desc_idx = line_idx + 1
            if desc_idx < len(updated_lines):
                updated_lines[desc_idx] = "Auto-ingested asset. Clean, circular game icon.\n"

        updated_lines[line_idx] = new_line
        
    # 3. Save Tracker
    with open(TRACKER_FILE, 'w') as f:
        f.writelines(updated_lines)
        
    # Update Total Count in header
    total_complete = sum(1 for line in updated_lines if "[x]" in line)
    updated_lines[2] = f"**Total Status**: {total_complete}/150 Complete\n"
    
    with open(TRACKER_FILE, 'w') as f:
        f.writelines(updated_lines)

    print(f"\n--- Ingestion Complete ---")
    print(f"Matches found: {matches_made}")
    print(f"New assignments: {new_assignments}")
    print(f"Total processed: {matches_made + new_assignments}")
    print(f"Remaining empty slots: {len(empty_slots)}")

if __name__ == "__main__":
    main()
