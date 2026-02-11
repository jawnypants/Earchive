diff --git a/js/app.js b/js/app.js
index c46bbfaf102c935d5ae82a44a81eeb3bdbf4d77a..290351c3a439464ba1c77872e9b05755316a9bf7 100644
--- a/js/app.js
+++ b/js/app.js
@@ -1,339 +1,571 @@
-async function setup() {
-    const patchExportURL = "export/patch.export.json";
-
-    // Create AudioContext
-    const WAContext = window.AudioContext || window.webkitAudioContext;
-    const context = new WAContext();
-
-    // Create gain node and connect it to audio output
-    const outputNode = context.createGain();
-    outputNode.connect(context.destination);
-    
-    // Fetch the exported patcher
-    let response, patcher;
+const midiInput = document.getElementById('midi-file');
+const fileInfoEl = document.getElementById('file-info');
+const playBtn = document.getElementById('play');
+const pauseBtn = document.getElementById('pause');
+const restartBtn = document.getElementById('restart');
+const progressEl = document.getElementById('progress');
+const progressTimeEl = document.getElementById('progress-time');
+const modeSelect = document.getElementById('mode-select');
+const channelListEl = document.getElementById('channel-list');
+const downloadBtn = document.getElementById('download');
+const tuningLabel = document.getElementById('tuning-label');
+const scalaInput = document.getElementById('scala-file');
+const resetTuningBtn = document.getElementById('reset-tuning');
+
+const {
+    MODE_INTERVALS,
+    createDefaultTuning,
+    applyModeToMidi,
+    parseScala,
+    getTunedFrequency
+} = window.MidiUtils;
+
+const masterGain = new Tone.Gain(0.8).toDestination();
+
+let currentMidi = null;
+let currentFileName = 'output';
+let eventsByChannel = new Map();
+let channelPrograms = new Map();
+let channelSynths = new Map();
+let activeParts = [];
+let endEventId = null;
+let progressFrame = null;
+let currentMode = 'Ionian';
+let isRendering = false;
+
+const DEFAULT_TUNING = createDefaultTuning();
+let currentTuning = { ...DEFAULT_TUNING };
+
+const GM_INSTRUMENTS = [
+    'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano', 'Honky-tonk Piano',
+    'Electric Piano 1', 'Electric Piano 2', 'Harpsichord', 'Clavinet',
+    'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone',
+    'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
+    'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ',
+    'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
+    'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)', 'Electric Guitar (jazz)', 'Electric Guitar (clean)',
+    'Electric Guitar (muted)', 'Overdriven Guitar', 'Distortion Guitar', 'Guitar Harmonics',
+    'Acoustic Bass', 'Electric Bass (finger)', 'Electric Bass (pick)', 'Fretless Bass',
+    'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
+    'Violin', 'Viola', 'Cello', 'Contrabass',
+    'Tremolo Strings', 'Pizzicato Strings', 'Orchestral Harp', 'Timpani',
+    'String Ensemble 1', 'String Ensemble 2', 'SynthStrings 1', 'SynthStrings 2',
+    'Choir Aahs', 'Voice Oohs', 'Synth Voice', 'Orchestra Hit',
+    'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet',
+    'French Horn', 'Brass Section', 'SynthBrass 1', 'SynthBrass 2',
+    'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax',
+    'Oboe', 'English Horn', 'Bassoon', 'Clarinet',
+    'Piccolo', 'Flute', 'Recorder', 'Pan Flute',
+    'Blown Bottle', 'Shakuhachi', 'Whistle', 'Ocarina',
+    'Lead 1 (square)', 'Lead 2 (sawtooth)', 'Lead 3 (calliope)', 'Lead 4 (chiff)',
+    'Lead 5 (charang)', 'Lead 6 (voice)', 'Lead 7 (fifths)', 'Lead 8 (bass + lead)',
+    'Pad 1 (new age)', 'Pad 2 (warm)', 'Pad 3 (polysynth)', 'Pad 4 (choir)',
+    'Pad 5 (bowed)', 'Pad 6 (metallic)', 'Pad 7 (halo)', 'Pad 8 (sweep)',
+    'FX 1 (rain)', 'FX 2 (soundtrack)', 'FX 3 (crystal)', 'FX 4 (atmosphere)',
+    'FX 5 (brightness)', 'FX 6 (goblins)', 'FX 7 (echoes)', 'FX 8 (sci-fi)',
+    'Sitar', 'Banjo', 'Shamisen', 'Koto',
+    'Kalimba', 'Bag pipe', 'Fiddle', 'Shanai',
+    'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock',
+    'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
+    'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet',
+    'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot'
+];
+
+const FAMILY_CONFIGS = [
+    { max: 7, oscillator: 'triangle', attack: 0.005, decay: 0.25, sustain: 0.6, release: 1.2 },
+    { max: 15, oscillator: 'square', attack: 0.003, decay: 0.22, sustain: 0.5, release: 1.0 },
+    { max: 23, oscillator: 'sine', attack: 0.01, decay: 0.3, sustain: 0.8, release: 1.5 },
+    { max: 31, oscillator: 'sawtooth', attack: 0.008, decay: 0.2, sustain: 0.4, release: 0.9 },
+    { max: 39, oscillator: 'square', attack: 0.01, decay: 0.18, sustain: 0.5, release: 0.8 },
+    { max: 47, oscillator: 'triangle', attack: 0.04, decay: 0.4, sustain: 0.7, release: 1.6 },
+    { max: 55, oscillator: 'triangle', attack: 0.02, decay: 0.35, sustain: 0.65, release: 1.4 },
+    { max: 63, oscillator: 'sawtooth', attack: 0.015, decay: 0.25, sustain: 0.55, release: 1.3 },
+    { max: 71, oscillator: 'square', attack: 0.01, decay: 0.2, sustain: 0.6, release: 1.0 },
+    { max: 79, oscillator: 'sine', attack: 0.02, decay: 0.3, sustain: 0.7, release: 1.5 },
+    { max: 87, oscillator: 'square', attack: 0.01, decay: 0.25, sustain: 0.5, release: 1.1 },
+    { max: 95, oscillator: 'triangle', attack: 0.015, decay: 0.35, sustain: 0.65, release: 1.7 },
+    { max: 103, oscillator: 'sawtooth', attack: 0.02, decay: 0.28, sustain: 0.45, release: 1.2 },
+    { max: 111, oscillator: 'sine', attack: 0.015, decay: 0.25, sustain: 0.75, release: 1.4 },
+    { max: 119, oscillator: 'square', attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.7 },
+    { max: 127, oscillator: 'sawtooth', attack: 0.008, decay: 0.18, sustain: 0.35, release: 0.9 }
+];
+
+midiInput.addEventListener('change', handleMidiUpload);
+playBtn.addEventListener('click', () => play());
+pauseBtn.addEventListener('click', pausePlayback);
+restartBtn.addEventListener('click', restartPlayback);
+downloadBtn.addEventListener('click', renderToWav);
+modeSelect.addEventListener('change', (event) => {
+    currentMode = event.target.value;
+});
+scalaInput.addEventListener('change', handleScalaUpload);
+resetTuningBtn.addEventListener('click', () => {
+    currentTuning = { ...DEFAULT_TUNING };
+    updateTuningLabel();
+});
+
+async function handleMidiUpload(event) {
+    const file = event.target.files[0];
+    if (!file) {
+        return;
+    }
+
     try {
-        response = await fetch(patchExportURL);
-        patcher = await response.json();
-    
-        if (!window.RNBO) {
-            // Load RNBO script dynamically
-            // Note that you can skip this by knowing the RNBO version of your patch
-            // beforehand and just include it using a <script> tag
-            await loadRNBOScript(patcher.desc.meta.rnboversion);
+        const arrayBuffer = await file.arrayBuffer();
+        const midi = new Midi(arrayBuffer);
+        if (!midi.duration || midi.tracks.every(track => track.notes.length === 0)) {
+            throw new Error('The selected MIDI file does not contain note data.');
         }
 
-    } catch (err) {
-        const errorContext = {
-            error: err
-        };
-        if (response && (response.status >= 300 || response.status < 200)) {
-            errorContext.header = `Couldn't load patcher export bundle`,
-            errorContext.description = `Check app.js to see what file it's trying to load. Currently it's` +
-            ` trying to load "${patchExportURL}". If that doesn't` + 
-            ` match the name of the file you exported from RNBO, modify` + 
-            ` patchExportURL in app.js.`;
-        }
-        if (typeof guardrails === "function") {
-            guardrails(errorContext);
-        } else {
-            throw err;
-        }
+        stopPlayback();
+
+        currentMidi = midi;
+        currentFileName = file.name.replace(/\.[^/.]+$/, '') || 'output';
+        eventsByChannel = computeEventsByChannel(midi);
+        channelPrograms = detectChannelPrograms(midi);
+
+        renderChannelControls();
+        updateTransportMeta();
+        updateButtons();
+        downloadBtn.disabled = false;
+        fileInfoEl.textContent = `Loaded: ${file.name}`;
+    } catch (error) {
+        console.error(error);
+        fileInfoEl.textContent = 'Failed to load MIDI file';
+        currentMidi = null;
+        eventsByChannel.clear();
+        channelPrograms.clear();
+        renderChannelControls();
+        updateButtons();
+    }
+}
+
+function computeEventsByChannel(midi) {
+    const map = new Map();
+    midi.tracks.forEach(track => {
+        track.notes.forEach(note => {
+            const channel = typeof note.channel === 'number' ? note.channel : (typeof track.channel === 'number' ? track.channel : 0);
+            if (!map.has(channel)) {
+                map.set(channel, []);
+            }
+            map.get(channel).push({
+                time: note.time,
+                duration: note.duration,
+                midi: note.midi,
+                velocity: note.velocity,
+                channel
+            });
+        });
+    });
+    map.forEach(events => events.sort((a, b) => a.time - b.time));
+    return map;
+}
+
+function detectChannelPrograms(midi) {
+    const map = new Map();
+    midi.tracks.forEach(track => {
+        const program = typeof track.instrument?.number === 'number' ? track.instrument.number : 0;
+        track.notes.forEach(note => {
+            const channel = typeof note.channel === 'number' ? note.channel : (typeof track.channel === 'number' ? track.channel : 0);
+            if (!map.has(channel)) {
+                map.set(channel, program);
+            }
+        });
+    });
+    return map;
+}
+
+function renderChannelControls() {
+    channelListEl.innerHTML = '';
+    if (!currentMidi || eventsByChannel.size === 0) {
+        const placeholder = document.createElement('p');
+        placeholder.className = 'placeholder';
+        placeholder.textContent = 'Load a MIDI file to configure its instruments.';
+        channelListEl.appendChild(placeholder);
         return;
     }
-    
-    // (Optional) Fetch the dependencies
-    let dependencies = [];
-    try {
-        const dependenciesResponse = await fetch("export/dependencies.json");
-        dependencies = await dependenciesResponse.json();
 
-        // Prepend "export" to any file dependenciies
-        dependencies = dependencies.map(d => d.file ? Object.assign({}, d, { file: "export/" + d.file }) : d);
-    } catch (e) {}
+    Array.from(eventsByChannel.keys()).sort((a, b) => a - b).forEach(channel => {
+        const row = document.createElement('div');
+        row.className = 'channel-row';
+
+        const label = document.createElement('span');
+        label.textContent = `Channel ${channel + 1}`;
+        row.appendChild(label);
+
+        const select = document.createElement('select');
+        GM_INSTRUMENTS.forEach((name, index) => {
+            const option = document.createElement('option');
+            option.value = String(index);
+            option.textContent = `${index.toString().padStart(3, '0')} · ${name}`;
+            if ((channelPrograms.get(channel) ?? 0) === index) {
+                option.selected = true;
+            }
+            select.appendChild(option);
+        });
 
-    // Create the device
-    let device;
-    try {
-        device = await RNBO.createDevice({ context, patcher });
-    } catch (err) {
-        if (typeof guardrails === "function") {
-            guardrails({ error: err });
-        } else {
-            throw err;
+        select.addEventListener('change', () => {
+            const selected = Number.parseInt(select.value, 10);
+            channelPrograms.set(channel, selected);
+            replaceSynthForChannel(channel, selected);
+        });
+
+        row.appendChild(select);
+        channelListEl.appendChild(row);
+    });
+}
+
+function replaceSynthForChannel(channel, program) {
+    const existing = channelSynths.get(channel);
+    if (existing) {
+        existing.disconnect();
+        existing.dispose();
+        channelSynths.delete(channel);
+        if (Tone.Transport.state === 'started') {
+            const synth = buildSynth(program, masterGain);
+            channelSynths.set(channel, synth);
         }
-        return;
     }
+}
 
-    // (Optional) Load the samples
-    if (dependencies.length)
-        await device.loadDataBufferDependencies(dependencies);
+async function play() {
+    if (!currentMidi) {
+        return;
+    }
+    await Tone.start();
 
-    // Connect the device to the web audio graph
-    device.node.connect(outputNode);
+    if (Tone.Transport.state === 'paused') {
+        Tone.Transport.start();
+        startProgressLoop();
+        updateButtons();
+        return;
+    }
 
-    // (Optional) Extract the name and rnbo version of the patcher from the description
-    document.getElementById("patcher-title").innerText = (patcher.desc.meta.filename || "Unnamed Patcher") + " (v" + patcher.desc.meta.rnboversion + ")";
+    if (Tone.Transport.state === 'started') {
+        return;
+    }
 
-    // (Optional) Automatically create sliders for the device parameters
-    makeSliders(device);
+    preparePlayback();
+    Tone.Transport.start('+0.05');
+    startProgressLoop();
+    updateButtons();
+}
 
-    // (Optional) Create a form to send messages to RNBO inputs
-    makeInportForm(device);
+function pausePlayback() {
+    if (Tone.Transport.state !== 'started') {
+        return;
+    }
+    Tone.Transport.pause();
+    updateButtons();
+}
 
-    // (Optional) Attach listeners to outports so you can log messages from the RNBO patcher
-    attachOutports(device);
+async function restartPlayback() {
+    if (!currentMidi) {
+        return;
+    }
+    stopPlayback(false);
+    await play();
+}
 
-    // (Optional) Load presets, if any
-    loadPresets(device, patcher);
+function stopPlayback(resetProgress = true) {
+    cancelProgressLoop();
+    if (Tone.Transport.state !== 'stopped') {
+        Tone.Transport.stop();
+    }
+    Tone.Transport.cancel();
+    if (endEventId !== null) {
+        Tone.Transport.clear(endEventId);
+        endEventId = null;
+    }
+    disposeParts();
+    disposeSynths();
+    if (resetProgress) {
+        updateProgressDisplay(0);
+    }
+    updateButtons();
+}
 
-    // (Optional) Connect MIDI inputs
-    makeMIDIKeyboard(device);
+function preparePlayback() {
+    disposeParts();
+    disposeSynths();
+    Tone.Transport.cancel();
+
+    channelSynths = new Map();
+    eventsByChannel.forEach((events, channel) => {
+        const program = channelPrograms.get(channel) ?? 0;
+        const synth = buildSynth(program, masterGain);
+        channelSynths.set(channel, synth);
+        const part = new Tone.Part((time, value) => {
+            const tunedMidi = applyModeToMidi(value.midi, currentMode, MODE_INTERVALS);
+            const frequency = getTunedFrequency(tunedMidi, currentTuning);
+            synth.triggerAttackRelease(frequency, value.duration, time, value.velocity);
+        }, events);
+        part.start(0);
+        activeParts.push(part);
+    });
 
-    document.body.onclick = () => {
-        context.resume();
+    if (currentMidi) {
+        endEventId = Tone.Transport.scheduleOnce(() => {
+            finalizePlayback();
+        }, currentMidi.duration + 0.1);
     }
+}
 
-    // Skip if you're not using guardrails.js
-    if (typeof guardrails === "function")
-        guardrails();
+function finalizePlayback() {
+    cancelProgressLoop();
+    Tone.Transport.stop();
+    if (endEventId !== null) {
+        Tone.Transport.clear(endEventId);
+        endEventId = null;
+    }
+    disposeParts();
+    disposeSynths();
+    updateProgressDisplay(currentMidi ? currentMidi.duration : 0);
+    updateButtons();
 }
 
-function loadRNBOScript(version) {
-    return new Promise((resolve, reject) => {
-        if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
-            throw new Error("Patcher exported with a Debug Version!\nPlease specify the correct RNBO version to use in the code.");
+function disposeParts() {
+    activeParts.forEach(part => {
+        try {
+            part.stop();
+        } catch (error) {
+            console.warn(error);
         }
-        const el = document.createElement("script");
-        el.src = "https://c74-public.nyc3.digitaloceanspaces.com/rnbo/" + encodeURIComponent(version) + "/rnbo.min.js";
-        el.onload = resolve;
-        el.onerror = function(err) {
-            console.log(err);
-            reject(new Error("Failed to load rnbo.js v" + version));
-        };
-        document.body.append(el);
+        part.dispose();
     });
+    activeParts = [];
 }
 
-function makeSliders(device) {
-    let pdiv = document.getElementById("rnbo-parameter-sliders");
-    let noParamLabel = document.getElementById("no-param-label");
-    if (noParamLabel && device.numParameters > 0) pdiv.removeChild(noParamLabel);
-
-    // This will allow us to ignore parameter update events while dragging the slider.
-    let isDraggingSlider = false;
-    let uiElements = {};
-
-    device.parameters.forEach(param => {
-        // Subpatchers also have params. If we want to expose top-level
-        // params only, the best way to determine if a parameter is top level
-        // or not is to exclude parameters with a '/' in them.
-        // You can uncomment the following line if you don't want to include subpatcher params
-        
-        //if (param.id.includes("/")) return;
-
-        // Create a label, an input slider and a value display
-        let label = document.createElement("label");
-        let slider = document.createElement("input");
-        let text = document.createElement("input");
-        let sliderContainer = document.createElement("div");
-        sliderContainer.appendChild(label);
-        sliderContainer.appendChild(slider);
-        sliderContainer.appendChild(text);
-
-        // Add a name for the label
-        label.setAttribute("name", param.name);
-        label.setAttribute("for", param.name);
-        label.setAttribute("class", "param-label");
-        label.textContent = `${param.name}: `;
-
-        // Make each slider reflect its parameter
-        slider.setAttribute("type", "range");
-        slider.setAttribute("class", "param-slider");
-        slider.setAttribute("id", param.id);
-        slider.setAttribute("name", param.name);
-        slider.setAttribute("min", param.min);
-        slider.setAttribute("max", param.max);
-        if (param.steps > 1) {
-            slider.setAttribute("step", (param.max - param.min) / (param.steps - 1));
-        } else {
-            slider.setAttribute("step", (param.max - param.min) / 1000.0);
+function disposeSynths() {
+    channelSynths.forEach(synth => {
+        synth.disconnect();
+        synth.dispose();
+    });
+    channelSynths.clear();
+}
+
+function startProgressLoop() {
+    cancelProgressLoop();
+    const loop = () => {
+        if (!currentMidi) {
+            return;
+        }
+        const currentSeconds = Tone.Transport.seconds;
+        updateProgressDisplay(currentSeconds);
+        if (Tone.Transport.state === 'started') {
+            progressFrame = requestAnimationFrame(loop);
         }
-        slider.setAttribute("value", param.value);
+    };
+    progressFrame = requestAnimationFrame(loop);
+}
 
-        // Make a settable text input display for the value
-        text.setAttribute("value", param.value.toFixed(1));
-        text.setAttribute("type", "text");
+function cancelProgressLoop() {
+    if (progressFrame !== null) {
+        cancelAnimationFrame(progressFrame);
+        progressFrame = null;
+    }
+}
 
-        // Make each slider control its parameter
-        slider.addEventListener("pointerdown", () => {
-            isDraggingSlider = true;
-        });
-        slider.addEventListener("pointerup", () => {
-            isDraggingSlider = false;
-            slider.value = param.value;
-            text.value = param.value.toFixed(1);
-        });
-        slider.addEventListener("input", () => {
-            let value = Number.parseFloat(slider.value);
-            param.value = value;
-        });
+function updateProgressDisplay(currentSeconds) {
+    if (!currentMidi || !Number.isFinite(currentMidi.duration) || currentMidi.duration <= 0) {
+        progressEl.value = 0;
+        progressTimeEl.textContent = '0:00 / 0:00';
+        return;
+    }
+    const clamped = Math.max(0, Math.min(currentSeconds, currentMidi.duration));
+    progressEl.value = clamped / currentMidi.duration;
+    progressTimeEl.textContent = `${formatTime(clamped)} / ${formatTime(currentMidi.duration)}`;
+}
 
-        // Make the text box input control the parameter value as well
-        text.addEventListener("keydown", (ev) => {
-            if (ev.key === "Enter") {
-                let newValue = Number.parseFloat(text.value);
-                if (isNaN(newValue)) {
-                    text.value = param.value;
-                } else {
-                    newValue = Math.min(newValue, param.max);
-                    newValue = Math.max(newValue, param.min);
-                    text.value = newValue;
-                    param.value = newValue;
-                }
-            }
-        });
+function updateTransportMeta() {
+    if (currentMidi) {
+        updateProgressDisplay(0);
+    } else {
+        updateProgressDisplay(0);
+    }
+}
 
-        // Store the slider and text by name so we can access them later
-        uiElements[param.id] = { slider, text };
+function updateButtons() {
+    const hasMidi = Boolean(currentMidi);
+    const isPlaying = Tone.Transport.state === 'started';
+    playBtn.disabled = !hasMidi || isPlaying;
+    pauseBtn.disabled = !isPlaying;
+    restartBtn.disabled = !hasMidi;
+    if (!isRendering) {
+        downloadBtn.disabled = !hasMidi;
+    }
+}
 
-        // Add the slider element
-        pdiv.appendChild(sliderContainer);
-    });
+function formatTime(seconds) {
+    const total = Math.max(0, seconds);
+    const minutes = Math.floor(total / 60);
+    const secs = Math.floor(total % 60);
+    return `${minutes}:${secs.toString().padStart(2, '0')}`;
+}
 
-    // Listen to parameter changes from the device
-    device.parameterChangeEvent.subscribe(param => {
-        if (!isDraggingSlider)
-            uiElements[param.id].slider.value = param.value;
-        uiElements[param.id].text.value = param.value.toFixed(1);
+function buildSynth(program, destination) {
+    const config = FAMILY_CONFIGS.find(entry => program <= entry.max) || FAMILY_CONFIGS[FAMILY_CONFIGS.length - 1];
+    const synth = new Tone.PolySynth(Tone.Synth, {
+        oscillator: { type: config.oscillator },
+        envelope: {
+            attack: config.attack,
+            decay: config.decay,
+            sustain: config.sustain,
+            release: config.release
+        }
     });
+    synth.connect(destination);
+    return synth;
 }
 
-function makeInportForm(device) {
-    const idiv = document.getElementById("rnbo-inports");
-    const inportSelect = document.getElementById("inport-select");
-    const inportText = document.getElementById("inport-text");
-    const inportForm = document.getElementById("inport-form");
-    let inportTag = null;
-    
-    // Device messages correspond to inlets/outlets or inports/outports
-    // You can filter for one or the other using the "type" of the message
-    const messages = device.messages;
-    const inports = messages.filter(message => message.type === RNBO.MessagePortType.Inport);
-
-    if (inports.length === 0) {
-        idiv.removeChild(document.getElementById("inport-form"));
+async function renderToWav() {
+    if (!currentMidi || isRendering) {
         return;
-    } else {
-        idiv.removeChild(document.getElementById("no-inports-label"));
-        inports.forEach(inport => {
-            const option = document.createElement("option");
-            option.innerText = inport.tag;
-            inportSelect.appendChild(option);
-        });
-        inportSelect.onchange = () => inportTag = inportSelect.value;
-        inportTag = inportSelect.value;
-
-        inportForm.onsubmit = (ev) => {
-            // Do this or else the page will reload
-            ev.preventDefault();
-
-            // Turn the text into a list of numbers (RNBO messages must be numbers, not text)
-            const values = inportText.value.split(/\s+/).map(s => parseFloat(s));
-            
-            // Send the message event to the RNBO device
-            let messageEvent = new RNBO.MessageEvent(RNBO.TimeNow, inportTag, values);
-            device.scheduleEvent(messageEvent);
-        }
     }
-}
 
-function attachOutports(device) {
-    const outports = device.outports;
-    if (outports.length < 1) {
-        document.getElementById("rnbo-console").removeChild(document.getElementById("rnbo-console-div"));
-        return;
+    isRendering = true;
+    updateButtons();
+    downloadBtn.textContent = 'Rendering…';
+
+    try {
+        const duration = currentMidi.duration + 1;
+        const programSnapshot = new Map(channelPrograms);
+        const modeSnapshot = currentMode;
+        const tuningSnapshot = {
+            ...currentTuning,
+            ratios: Array.isArray(currentTuning?.ratios) ? [...currentTuning.ratios] : currentTuning.ratios
+        };
+        const buffer = await Tone.Offline(({ transport }) => {
+            const offlineSynths = new Map();
+            const offlineParts = [];
+
+            eventsByChannel.forEach((events, channel) => {
+                const program = programSnapshot.get(channel) ?? 0;
+                const synth = buildSynth(program, Tone.Destination);
+                offlineSynths.set(channel, synth);
+                const part = new Tone.Part((time, value) => {
+                    const tunedMidi = applyModeToMidi(value.midi, modeSnapshot, MODE_INTERVALS);
+                    const frequency = getTunedFrequency(tunedMidi, tuningSnapshot);
+                    synth.triggerAttackRelease(frequency, value.duration, time, value.velocity);
+                }, events).start(0);
+                offlineParts.push(part);
+            });
+
+            transport.start(0);
+            transport.scheduleOnce(() => {
+                offlineParts.forEach(part => part.dispose());
+                offlineSynths.forEach(synth => synth.dispose());
+            }, duration + 0.25);
+        }, duration);
+
+        const wavBlob = audioBufferToWav(buffer);
+        const downloadName = `${currentFileName || 'output'}-earchive.wav`;
+        triggerDownload(wavBlob, downloadName);
+    } catch (error) {
+        console.error(error);
+        alert('Rendering failed. Please try again.');
+    } finally {
+        isRendering = false;
+        downloadBtn.textContent = 'Download WAV';
+        updateButtons();
     }
+}
 
-    document.getElementById("rnbo-console").removeChild(document.getElementById("no-outports-label"));
-    device.messageEvent.subscribe((ev) => {
+function audioBufferToWav(buffer) {
+    const numChannels = buffer.numberOfChannels;
+    const sampleRate = buffer.sampleRate;
+    const format = 1; // PCM
+    const bitDepth = 16;
 
-        // Ignore message events that don't belong to an outport
-        if (outports.findIndex(elt => elt.tag === ev.tag) < 0) return;
+    const channelData = [];
+    let totalLength = buffer.length * numChannels * (bitDepth / 8);
+    for (let i = 0; i < numChannels; i++) {
+        channelData.push(buffer.getChannelData(i));
+    }
 
-        // Message events have a tag as well as a payload
-        console.log(`${ev.tag}: ${ev.payload}`);
+    const bufferLength = 44 + totalLength;
+    const arrayBuffer = new ArrayBuffer(bufferLength);
+    const view = new DataView(arrayBuffer);
+
+    writeString(view, 0, 'RIFF');
+    view.setUint32(4, 36 + totalLength, true);
+    writeString(view, 8, 'WAVE');
+    writeString(view, 12, 'fmt ');
+    view.setUint32(16, 16, true);
+    view.setUint16(20, format, true);
+    view.setUint16(22, numChannels, true);
+    view.setUint32(24, sampleRate, true);
+    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
+    view.setUint16(32, numChannels * (bitDepth / 8), true);
+    view.setUint16(34, bitDepth, true);
+    writeString(view, 36, 'data');
+    view.setUint32(40, totalLength, true);
+
+    let offset = 44;
+    const interleaved = interleave(channelData);
+    for (let i = 0; i < interleaved.length; i++, offset += 2) {
+        const sample = Math.max(-1, Math.min(1, interleaved[i]));
+        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
+    }
 
-        document.getElementById("rnbo-console-readout").innerText = `${ev.tag}: ${ev.payload}`;
-    });
+    return new Blob([arrayBuffer], { type: 'audio/wav' });
 }
 
-function loadPresets(device, patcher) {
-    let presets = patcher.presets || [];
-    if (presets.length < 1) {
-        document.getElementById("rnbo-presets").removeChild(document.getElementById("preset-select"));
-        return;
+function interleave(channelData) {
+    if (channelData.length === 1) {
+        return channelData[0];
+    }
+    const length = channelData[0].length;
+    const interleaved = new Float32Array(length * channelData.length);
+    let index = 0;
+    for (let i = 0; i < length; i++) {
+        for (let channel = 0; channel < channelData.length; channel++) {
+            interleaved[index++] = channelData[channel][i];
+        }
     }
+    return interleaved;
+}
 
-    document.getElementById("rnbo-presets").removeChild(document.getElementById("no-presets-label"));
-    let presetSelect = document.getElementById("preset-select");
-    presets.forEach((preset, index) => {
-        const option = document.createElement("option");
-        option.innerText = preset.name;
-        option.value = index;
-        presetSelect.appendChild(option);
-    });
-    presetSelect.onchange = () => device.setPreset(presets[presetSelect.value].preset);
+function writeString(view, offset, string) {
+    for (let i = 0; i < string.length; i++) {
+        view.setUint8(offset + i, string.charCodeAt(i));
+    }
 }
 
-function makeMIDIKeyboard(device) {
-    let mdiv = document.getElementById("rnbo-clickable-keyboard");
-    if (device.numMIDIInputPorts === 0) return;
-
-    mdiv.removeChild(document.getElementById("no-midi-label"));
-
-    const midiNotes = [49, 52, 56, 63];
-    midiNotes.forEach(note => {
-        const key = document.createElement("div");
-        const label = document.createElement("p");
-        label.textContent = note;
-        key.appendChild(label);
-        key.addEventListener("pointerdown", () => {
-            let midiChannel = 0;
-
-            // Format a MIDI message paylaod, this constructs a MIDI on event
-            let noteOnMessage = [
-                144 + midiChannel, // Code for a note on: 10010000 & midi channel (0-15)
-                note, // MIDI Note
-                100 // MIDI Velocity
-            ];
-        
-            let noteOffMessage = [
-                128 + midiChannel, // Code for a note off: 10000000 & midi channel (0-15)
-                note, // MIDI Note
-                0 // MIDI Velocity
-            ];
-        
-            // Including rnbo.min.js (or the unminified rnbo.js) will add the RNBO object
-            // to the global namespace. This includes the TimeNow constant as well as
-            // the MIDIEvent constructor.
-            let midiPort = 0;
-            let noteDurationMs = 250;
-        
-            // When scheduling an event to occur in the future, use the current audio context time
-            // multiplied by 1000 (converting seconds to milliseconds) for now.
-            let noteOnEvent = new RNBO.MIDIEvent(device.context.currentTime * 1000, midiPort, noteOnMessage);
-            let noteOffEvent = new RNBO.MIDIEvent(device.context.currentTime * 1000 + noteDurationMs, midiPort, noteOffMessage);
-        
-            device.scheduleEvent(noteOnEvent);
-            device.scheduleEvent(noteOffEvent);
-
-            key.classList.add("clicked");
-        });
+function triggerDownload(blob, filename) {
+    const url = URL.createObjectURL(blob);
+    const anchor = document.createElement('a');
+    anchor.href = url;
+    anchor.download = filename;
+    document.body.appendChild(anchor);
+    anchor.click();
+    document.body.removeChild(anchor);
+    URL.revokeObjectURL(url);
+}
+
+async function handleScalaUpload(event) {
+    const file = event.target.files[0];
+    if (!file) {
+        return;
+    }
 
-        key.addEventListener("pointerup", () => key.classList.remove("clicked"));
+    try {
+        const text = await file.text();
+        const tuning = parseScala(text, file.name);
+        currentTuning = tuning;
+        updateTuningLabel();
+    } catch (error) {
+        console.error(error);
+        alert('Unable to load the Scala file. Please verify its format.');
+    } finally {
+        scalaInput.value = '';
+    }
+}
 
-        mdiv.appendChild(key);
-    });
+function updateTuningLabel() {
+    const label = currentTuning.name ? `${currentTuning.name} (${currentTuning.steps} steps)` : 'Custom tuning';
+    tuningLabel.textContent = label;
 }
 
-setup();
+updateTuningLabel();
+updateButtons();
