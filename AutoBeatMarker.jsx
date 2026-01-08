// AUTO BEAT MARKER PRO - Enhanced for Brazilian Phonk
// macOS/Windows compatible After Effects script

(function (thisObj) {
    var SCRIPT_NAME = "AUTO BEAT MARKER PRO";
    var MAX_KEYFRAMES = 12000;
    var PRESET_FILENAME = "autoBeatPresets.json";

    // Utilities
    function safeAlert(msg) { try { alert(msg); } catch (e) {} }
    function setStatus(s) { try { status.text = String(s); } catch (e) {} }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    // Preset file handling
    function getPresetFile() {
        try {
            var f = new File($.fileName);
            return new File(f.path + "/" + PRESET_FILENAME);
        } catch (e) { return null; }
    }

    function loadPresets() {
        try {
            var pf = getPresetFile();
            if (!pf || !pf.exists) return {};
            pf.open("r");
            var content = pf.read();
            pf.close();
            return JSON.parse(content);
        } catch (e) { return {}; }
    }

    function savePresets(obj) {
        try {
            var pf = getPresetFile();
            if (!pf || !pf.open("w")) return false;
            pf.encoding = "UTF-8";
            pf.write(JSON.stringify(obj, null, 2));
            pf.close();
            return true;
        } catch (e) { return false; }
    }

    // UI Setup
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 4;
    win.margins = [6, 6, 6, 6];

    if (!(thisObj instanceof Panel)) win.preferredSize = [480, 520];

    // Header
    var header = win.add("group"); 
    header.orientation = "column";
    var title = header.add("statictext", undefined, SCRIPT_NAME);
    title.graphics.font = ScriptUI.newFont("Arial", "BOLD", 12);
    var sub = header.add("statictext", undefined, "by antikvn");
    sub.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 9);

    // Preset controls
    var presetGroup = win.add("group"); 
    presetGroup.orientation = "row";
    var presetDD = presetGroup.add("dropdownlist", undefined, []);
    presetDD.preferredSize.width = 100;
    var loadPresetBtn = presetGroup.add("button", undefined, "Load");
    var savePresetBtn = presetGroup.add("button", undefined, "Save");
    var deletePresetBtn = presetGroup.add("button", undefined, "Del");

    // Audio selection
    var audioLabel = win.add("statictext", undefined, "Audio Layer:");
    var audioDropdown = win.add("dropdownlist", undefined, []);
    audioDropdown.alignment = ["fill", "top"];

    var convertBtn = win.add("button", undefined, "Convert Audio");
    convertBtn.alignment = ["fill", "top"];

    // Parameters
    var group1 = win.add("group"); 
    group1.orientation = "row";
    
    var sensGroup = group1.add("group"); 
    sensGroup.orientation = "column";
    sensGroup.add("statictext", undefined, "Sensitivity");
    var sensDD = sensGroup.add("dropdownlist", undefined, ["Low", "Med", "Hi"]);
    sensDD.selection = 1;

    var smoothGroup = group1.add("group"); 
    smoothGroup.orientation = "column";
    smoothGroup.add("statictext", undefined, "Smoothing");
    var smoothDD = smoothGroup.add("dropdownlist", undefined, ["None", "Light", "Med", "Strong"]);
    smoothDD.selection = 2;

    var gapGroup = group1.add("group"); 
    gapGroup.orientation = "column";
    gapGroup.add("statictext", undefined, "Min Gap");
    var gapDD = gapGroup.add("dropdownlist", undefined, ["V.Fast", "Fast", "Normal", "Slow", "V.Slow"]);
    gapDD.selection = 2;

    // BPM controls
    var bpmGroup = win.add("panel", undefined, "BPM Snap");
    bpmGroup.orientation = "column";
    var snapCheckbox = bpmGroup.add("checkbox", undefined, "Enable BPM Snapping");
    var autoBpmBtn = bpmGroup.add("button", undefined, "Auto-Detect BPM");
    
    var manualBpmGroup = bpmGroup.add("group");
    manualBpmGroup.add("statictext", undefined, "Manual BPM:");
    var manualBpmInput = manualBpmGroup.add("edittext", undefined, "120");
    manualBpmInput.characters = 5;
    
    var snapStrengthGroup = bpmGroup.add("group");
    snapStrengthGroup.add("statictext", undefined, "Snap Strength:");
    var snapStrengthDD = snapStrengthGroup.add("dropdownlist", undefined, ["Weak", "Medium", "Strong"]);
    snapStrengthDD.selection = 1;

    // Marker options
    var markerPanel = win.add("panel", undefined, "Marker Options");
    markerPanel.orientation = "column";
    var tierStrong = markerPanel.add("checkbox", undefined, "Strong Beats");
    tierStrong.value = true;
    var tierWeak = markerPanel.add("checkbox", undefined, "Weak Beats");
    tierWeak.value = true;
    var tierSub = markerPanel.add("checkbox", undefined, "Sub-Beats");

    var colorGroup = markerPanel.add("group");
    colorGroup.add("statictext", undefined, "Color:");
    var colorDD = colorGroup.add("dropdownlist", undefined, [
        "Red","Yellow","Aqua","Pink","Lavender","Peach","Sea Foam","Blue",
        "Green","Purple","Magenta","Sky","Tan","Forest","Cyan","Sand"
    ]);
    colorDD.selection = 0;

    // Progress bar
    var progressBar = win.add("progressbar", undefined, 0, 100);
    progressBar.alignment = ["fill", "top"];

    // Action buttons
    var btnGroup = win.add("group");
    var generateBtn = btnGroup.add("button", undefined, "Generate Markers");
    var removeBtn = btnGroup.add("button", undefined, "Remove Markers");

    var status = win.add("statictext", undefined, "", {multiline: true});
    status.alignment = ["fill", "top"];

    // State
    var comp = null;
    var lastUpdateTime = 0;

    function uiUpdateGuard(force) {
        var now = new Date().getTime();
        if (force || (now - lastUpdateTime) > 300) {
            try { win.update(); } catch (e) {}
            lastUpdateTime = now;
        }
    }

    function showProgress(perc, msg, skipUpdate) {
        progressBar.value = clamp(perc, 0, 100);
        setStatus(msg || "");
        if (!skipUpdate) uiUpdateGuard(true);
        else uiUpdateGuard(false);
    }

    // Audio layer discovery
    function refreshAudioLayers() {
        try { audioDropdown.removeAll(); } catch (e) {}
        
        var items = [];
        if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
            comp = app.project.activeItem;
            for (var i = 1; i <= comp.numLayers; i++) {
                try {
                    var layer = comp.layer(i);
                    if (layer.effect("Both Channels") || layer.effect("Left Channel") || 
                        layer.effect("Right Channel") || layer.name.indexOf("Audio Amplitude") !== -1) {
                        items.push(layer.name);
                    }
                } catch (e) {}
            }
        }

        if (items.length === 0) {
            audioDropdown.add("item", "No audio layers found");
        } else {
            for (var j = 0; j < items.length; j++) {
                audioDropdown.add("item", items[j]);
            }
        }
        audioDropdown.selection = 0;
    }

    function getAmplitudeSlider(layer) {
        if (!layer) return null;
        if (layer.effect("Both Channels")) return layer.effect("Both Channels")("Slider");
        if (layer.effect("Left Channel")) return layer.effect("Left Channel")("Slider");
        if (layer.effect("Right Channel")) return layer.effect("Right Channel")("Slider");
        return null;
    }

    // Signal processing
    function buildKernel(index) {
        var kernels = [
            [1],
            [0.25, 0.5, 0.25],
            [0.1, 0.2, 0.4, 0.2, 0.1],
            [0.05, 0.1, 0.15, 0.2, 0.2, 0.15, 0.1, 0.05]
        ];
        return kernels[clamp(index, 0, kernels.length - 1)];
    }

    function applySmoothing(values, kernel) {
        var n = values.length;
        if (n === 0) return [];
        
        var klen = kernel.length;
        var half = Math.floor(klen / 2);
        var out = new Array(n);
        
        var ksum = 0;
        for (var i = 0; i < klen; i++) ksum += kernel[i];
        var knorm = new Array(klen);
        for (var i = 0; i < klen; i++) knorm[i] = kernel[i] / ksum;

        for (var i = 0; i < n; i++) {
            var s = 0, w = 0;
            var start = Math.max(0, i - half);
            var end = Math.min(n - 1, i + (klen - half - 1));
            
            for (var j = start; j <= end; j++) {
                var kidx = j - i + half;
                var kk = knorm[kidx] || 0;
                s += values[j] * kk;
                w += kk;
            }
            out[i] = (w > 0) ? (s / w) : values[i];
        }
        return out;
    }

    function detectPeaks(times, values, threshold, minTimeDist, sensitivity) {
        var peaks = [];
        var n = values.length;
        if (n < 3) return peaks;
        
        var lastTime = -1e9;
        var strengthThreshold = (sensitivity === 2) ? 1.0 : (sensitivity === 1) ? 1.1 : 1.2;

        for (var i = 2; i < n - 2; i++) {
            var v = values[i];
            if (v <= threshold) continue;
            if (v <= values[i-1] || v < values[i+1]) continue;
            
            var t = times[i];
            if ((t - lastTime) < minTimeDist) continue;
            
            var strength = v / threshold;
            if (strength >= strengthThreshold) {
                peaks.push({ time: t, strength: strength });
                lastTime = t;
            }
        }
        return peaks;
    }

    function estimateBPM(times) {
        if (times.length < 2) return null;
        
        var diffs = [];
        for (var i = 1; i < times.length; i++) {
            diffs.push(times[i] - times[i-1]);
        }
        
        var sum = 0;
        for (var i = 0; i < diffs.length; i++) sum += diffs[i];
        var avg = sum / diffs.length;
        
        if (avg <= 0) return null;
        var bpm = clamp(60.0 / avg, 20, 400);

        // Brazilian Phonk optimization (120-160 BPM range)
        if (bpm < 120 || bpm > 160) {
            var candidates = [bpm, bpm * 2, bpm / 2];
            var target = 140;
            var best = bpm;
            var bestDist = Math.abs(bpm - target);
            
            for (var i = 1; i < candidates.length; i++) {
                var c = clamp(candidates[i], 20, 400);
                var dist = Math.abs(c - target);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = c;
                }
            }
            bpm = best;
        }
        return bpm;
    }

    function snapToGrid(time, bpm, strengthIndex) {
        if (!bpm || bpm <= 0) return time;
        
        var beatDuration = 60.0 / bpm;
        var grid = time / beatDuration;
        var snapped = Math.round(grid);
        var offset = (snapped - grid) * beatDuration;
        
        var multiplier = (strengthIndex === 0) ? 0.5 : (strengthIndex === 1) ? 0.8 : 1.0;
        return time + offset * multiplier;
    }

    // Marker operations
    function createMarkers(peaks, bpm, doSnap) {
        if (!comp) {
            safeAlert("No active composition");
            return;
        }

        app.beginUndoGroup("Auto Beat Marker Pro");
        
        try {
            var markerProp = comp.markerProperty;
            var colorIndex = colorDD.selection ? colorDD.selection.index : 0;
            var snapStrength = snapStrengthDD.selection ? snapStrengthDD.selection.index : 1;

            for (var i = 0; i < peaks.length; i++) {
                var p = peaks[i];
                var t = doSnap && bpm ? snapToGrid(p.time, bpm, snapStrength) : p.time;
                
                var label = "Beat";
                if (tierStrong.value && p.strength >= 1.5) label = "Strong Beat";
                else if (tierWeak.value && p.strength >= 1.2) label = "Weak Beat";
                else if (tierSub.value) label = "Sub-Beat";

                var m = new MarkerValue(label);
                m.comment = "Strength: " + p.strength.toFixed(2);
                m.label = colorIndex;
                
                try { markerProp.setValueAtTime(t, m); } catch (e) {}
            }
        } finally {
            app.endUndoGroup();
        }
    }

    function removeAutoMarkers() {
        if (!comp) {
            safeAlert("No active composition");
            return;
        }

        app.beginUndoGroup("Remove Auto Beat Markers");
        
        try {
            var mp = comp.markerProperty;
            var toRemove = [];
            
            for (var i = 1; i <= mp.numKeys; i++) {
                try {
                    var mv = mp.keyValue(i);
                    if (mv.comment && mv.comment.indexOf("Strength:") !== -1) {
                        toRemove.push(i);
                    }
                } catch (e) {}
            }
            
            for (var j = toRemove.length - 1; j >= 0; j--) {
                try { mp.removeKey(toRemove[j]); } catch (e) {}
            }
            
            setStatus("Removed " + toRemove.length + " markers");
        } finally {
            app.endUndoGroup();
        }
    }

    // Main generation function
    function generateBeatMarkers() {
        refreshAudioLayers();
        
        if (!comp) {
            safeAlert("No active composition!");
            return;
        }
        
        if (!audioDropdown.selection) {
            safeAlert("Select an audio layer");
            return;
        }

        var selectedLayerName = audioDropdown.selection.text;
        var layer = null;
        
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (l.name === selectedLayerName) {
                layer = l;
                break;
            }
        }

        if (!layer) {
            safeAlert("Layer not found");
            return;
        }

        var slider = getAmplitudeSlider(layer);
        if (!slider || slider.numKeys < 2) {
            safeAlert("No amplitude keyframes found. Convert audio first.");
            return;
        }

        var numKeys = slider.numKeys;
        if (numKeys > MAX_KEYFRAMES) {
            if (!confirm("Warning: " + numKeys + " keyframes. This may be slow. Continue?")) {
                return;
            }
        }

        showProgress(5, "Reading keyframes...");
        
        var times = new Array(numKeys);
        var values = new Array(numKeys);
        
        for (var k = 0; k < numKeys; k++) {
            times[k] = slider.keyTime(k + 1);
            try { 
                values[k] = parseFloat(slider.keyValue(k + 1)); 
            } catch (e) { 
                values[k] = 0; 
            }
        }

        showProgress(10, "Smoothing...");
        var kernel = buildKernel(smoothDD.selection ? smoothDD.selection.index : 2);
        var smoothed = applySmoothing(values, kernel);

        showProgress(20, "Calculating threshold...");
        var sortedValues = smoothed.slice(0).sort(function(a, b) { return a - b; });
        var sensIndex = sensDD.selection ? sensDD.selection.index : 1;
        var percentile = (sensIndex === 0) ? 0.60 : (sensIndex === 1) ? 0.75 : 0.90;
        var threshIdx = Math.floor(sortedValues.length * percentile);
        var threshold = sortedValues[threshIdx] || 1e-6;

        var minGaps = [2, 4, 6, 8, 12];
        var minFrames = minGaps[gapDD.selection ? gapDD.selection.index : 2];
        var minTime = minFrames * comp.frameDuration;

        showProgress(40, "Detecting peaks...");
        var peaks = detectPeaks(times, smoothed, threshold, minTime, sensIndex);

        if (peaks.length === 0) {
            safeAlert("No peaks found. Try adjusting settings.");
            showProgress(0, "");
            return;
        }

        showProgress(60, "Estimating BPM...");
        var bpm = null;
        var doSnap = snapCheckbox.value;
        var manualBpm = parseFloat(manualBpmInput.text);
        
        if (doSnap && manualBpm > 0) {
            bpm = clamp(manualBpm, 20, 400);
        } else {
            var peakTimes = [];
            for (var i = 0; i < peaks.length; i++) {
                peakTimes.push(peaks[i].time);
            }
            bpm = estimateBPM(peakTimes);
        }

        showProgress(80, "Creating markers...");
        createMarkers(peaks, bpm, doSnap);

        var msg = "Created " + peaks.length + " markers";
        if (bpm) msg += "\nBPM: " + bpm.toFixed(2);
        
        showProgress(100, msg);
        safeAlert(msg);
        showProgress(0, "");
    }

    // Convert audio helper
    function convertAudioToKeyframes() {
        if (!comp) {
            safeAlert("No active composition!");
            return;
        }
        
        var layer = comp.selectedLayers[0];
        if (!layer) {
            safeAlert("Select an audio layer first");
            return;
        }

        app.beginUndoGroup("Convert Audio to Keyframes");
        try {
            app.executeCommand(app.findMenuCommandId("Convert Audio to Keyframes"));
            refreshAudioLayers();
            safeAlert("Audio converted successfully");
        } catch (e) {
            safeAlert("Failed to convert: " + e.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // Preset management
    var presets = loadPresets();
    
    function refreshPresetList() {
        try {
            presetDD.removeAll();
            presetDD.add("item", "-- Select Preset --");
            for (var n in presets) {
                if (presets.hasOwnProperty(n)) {
                    presetDD.add("item", n);
                }
            }
            presetDD.selection = 0;
        } catch (e) {}
    }
    refreshPresetList();

    loadPresetBtn.onClick = function() {
        if (presetDD.selection && presets[presetDD.selection.text]) {
            var p = presets[presetDD.selection.text];
            sensDD.selection = sensDD.items[clamp(p.sens, 0, 2)];
            smoothDD.selection = smoothDD.items[clamp(p.smooth, 0, 3)];
            gapDD.selection = gapDD.items[clamp(p.gap, 0, 4)];
            snapCheckbox.value = p.snap;
            manualBpmInput.text = p.manualBpm || "120";
            snapStrengthDD.selection = snapStrengthDD.items[clamp(p.strength, 0, 2)];
            tierStrong.value = p.strong;
            tierWeak.value = p.weak;
            tierSub.value = p.sub;
            colorDD.selection = colorDD.items[clamp(p.color, 0, 15)];
            setStatus("Loaded preset: " + presetDD.selection.text);
        }
    };

    savePresetBtn.onClick = function() {
        var name = prompt("Enter preset name:", "My Preset");
        if (!name) return;
        
        presets[name] = {
            sens: sensDD.selection.index,
            smooth: smoothDD.selection.index,
            gap: gapDD.selection.index,
            snap: snapCheckbox.value,
            manualBpm: manualBpmInput.text,
            strength: snapStrengthDD.selection.index,
            strong: tierStrong.value,
            weak: tierWeak.value,
            sub: tierSub.value,
            color: colorDD.selection.index
        };
        
        if (savePresets(presets)) {
            refreshPresetList();
            setStatus("Saved preset: " + name);
        }
    };

    deletePresetBtn.onClick = function() {
        if (presetDD.selection && presets[presetDD.selection.text]) {
            if (confirm("Delete preset '" + presetDD.selection.text + "'?")) {
                delete presets[presetDD.selection.text];
                savePresets(presets);
                refreshPresetList();
                setStatus("Deleted preset");
            }
        }
    };

    autoBpmBtn.onClick = function() {
        refreshAudioLayers();
        if (!audioDropdown.selection) {
            safeAlert("Select audio layer first");
            return;
        }
        
        var layer = null;
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).name === audioDropdown.selection.text) {
                layer = comp.layer(i);
                break;
            }
        }
        
        if (!layer) return;
        
        var slider = getAmplitudeSlider(layer);
        if (!slider || slider.numKeys < 2) {
            safeAlert("No amplitude keyframes");
            return;
        }
        
        var times = [];
        for (var k = 1; k <= slider.numKeys; k++) {
            times.push(slider.keyTime(k));
        }
        
        var bpm = estimateBPM(times);
        if (bpm) {
            manualBpmInput.text = bpm.toFixed(2);
            setStatus("Detected BPM: " + bpm.toFixed(2));
        } else {
            safeAlert("Could not detect BPM");
        }
    };

    // Button handlers
    convertBtn.onClick = convertAudioToKeyframes;
    generateBtn.onClick = generateBeatMarkers;
    removeBtn.onClick = removeAutoMarkers;

    // Window setup
    win.onShow = function() { refreshAudioLayers(); };
    win.onResizing = win.onResize = function() { this.layout.resize(); };

    if (win instanceof Window) {
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
    }

})(this);
