# Usage Guide

## Workflow

### 1. Prepare Audio
- Select your audio layer in the composition
- Click "Convert Audio"
- This creates an amplitude visualization layer

### 2. Select Layer
- Choose the amplitude layer from the dropdown

### 3. Configure Detection

**Sensitivity**: How strict the peak detection is
- Low: Only obvious peaks
- Medium: Balanced
- High: Catches subtle beats too

**Smoothing**: Reduces audio noise
- None: Raw data
- Light: Gentle smoothing
- Medium: Balanced
- Strong: Heavy smoothing

**Gap**: Minimum space between beats
- VFst / Fst / Norm / Slow / VSlo

### 4. Marker Settings
- Check which marker types to create: Strong, Weak, Sub-beats
- Choose a color for organization

### 5. BPM (Optional)
- Enable "BPM Snap" to align to grid
- Click "Auto-Detect" or enter manually
- Adjust snap strength: Weak / Med / Strong

### 6. Generate
- Click "Generate" button
- Wait for completion message

## Presets

**Save**: Click "Sv" → enter name → all settings saved
**Load**: Select preset → click "Ld"
**Delete**: Select preset → click "Del"

Presets stored in: `autoBeatPresets.json`
