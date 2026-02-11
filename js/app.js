const fileInput = document.getElementById("midi-input");
const statusMessage = document.getElementById("status");
const statusProgressBar = document.getElementById("status-progress-bar");
const songPanel = document.getElementById("song-panel");
const songDisplay = document.getElementById("song-display");
const songTitle = document.getElementById("song-title");
const controlsPanel = document.getElementById("controls-panel");
const instrumentPanel = document.getElementById("instrument-panel");
const instrumentGrid = document.getElementById("instrument-menus");
const enableAudioButton = document.getElementById("enable-audio");
const loadButton = document.getElementById("load-button");
const loadSampleButton = document.getElementById("load-sample");
const sampleMidiSelect = document.getElementById("sample-midi-select");
const sampleFolderSelect = document.getElementById("sample-folder-select");
const playButton = document.getElementById("play");
const pauseButton = document.getElementById("pause");
const stopButton = document.getElementById("stop");
const recordButton = document.getElementById("record");
const progressBar = document.getElementById("progress");
const progressTime = document.getElementById("progress-time");
const loopToggle = document.getElementById("loop-toggle");
const tempoSlider = document.getElementById("tempo-slider");
const tempoValue = document.getElementById("tempo-value");
const tempoResetButton = document.getElementById("tempo-reset");
const tuningSelect = document.getElementById("tuning-select");
const tuningStatus = document.getElementById("tuning-status");
const tuningFolderSelect = document.getElementById("tuning-folder-select");
const tuningResetButton = document.getElementById("tuning-reset");
const tuningSourceToggle = document.getElementById("tuning-source-toggle");
const modeSelect = document.getElementById("mode-select");
const modeStatus = document.getElementById("mode-status");
const transposeInput = document.getElementById("transpose-input");
const transposeStatus = document.getElementById("transpose-status");
const transposeDecrement = document.getElementById("transpose-decrement");
const transposeIncrement = document.getElementById("transpose-increment");
const sampleModal = document.getElementById("sample-modal");
const sampleChooseButton = document.getElementById("sample-choose");
const sampleCancelButton = document.getElementById("sample-cancel");
const PROGRESS_MIN_INTERVAL_MS = 80;
const recordCompressedCheckbox = document.getElementById("record-compressed");
const helpToggle = document.getElementById("help-toggle");
const helpBubbles = document.getElementById("help-bubbles");
const helpDismiss = document.getElementById("help-dismiss");
const HELP_SEEN_KEY = "ear_help_seen_v1";
const infoToggle = document.getElementById("info-toggle");
const infoBubbles = document.getElementById("info-bubbles");
const infoDismiss = document.getElementById("info-dismiss");
const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");
const contactName = document.getElementById("contact-name");
const contactEmail = document.getElementById("contact-email");
const contactMessage = document.getElementById("contact-message");
const contactLink = document.getElementById("contact-link");
const contactModal = document.getElementById("contact-modal");
const contactCancel = document.getElementById("contact-cancel");

if (songTitle) {
    songTitle.classList.add("is-hidden");
}

const {
    GM_INSTRUMENTS,
    clampProgram,
    getInstrumentName,
    formatDuration,
    summarizeMidi
} = window.MidiHelpers;
const DEBUG_PROGRAM_LOG = false;
const DEFAULT_CONFIG = {
    fluidsynthBaseUrl: "assets/fluidsynth/",
    soundfontBaseUrl: "assets/soundfonts/",
    midiBaseUrl: "assets/midi/",
    sampleMidiManifestUrl: "assets/midi/manifest.json",
    scalaLiteBaseUrl: "assets/ScalaLite/",
    scalaFullBaseUrl: "assets/Scala Archive/",
    scalaLiteManifestUrl: "assets/scala-lite-manifest.json",
    scalaFullManifestUrl: "assets/scala-manifest.json"
};

function isAbsoluteUrl(value) {
    return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function normalizeBaseUrl(value, fallback) {
    const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
    if (!raw) {
        return new URL("/", window.location.href).href;
    }
    const resolved = new URL(raw, window.location.href).href;
    return resolved.endsWith("/") ? resolved : `${resolved}/`;
}

function resolveConfigUrl(value, fallback) {
    const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
    if (!raw) {
        return new URL("/", window.location.href).href;
    }
    return new URL(raw, window.location.href).href;
}

function buildSoundfontSources(baseUrl) {
    const root = normalizeBaseUrl(baseUrl, DEFAULT_CONFIG.soundfontBaseUrl);
    const sources = [
        { file: "LiteGM_v1.03.sf2", label: "LiteGM_v1.03.sf2 (GM-lite)" },
        { file: "FluidR3MonoMed.sf2", label: "FluidR3MonoMed.sf2 (compact SF2 fallback)" },
        { file: "FluidR3_GM.sf2", label: "FluidR3_GM.sf2 (full SF2 fallback)" }
    ];
    return {
        mobile: sources.map(item => ({ url: new URL(item.file, root).href, label: item.label })),
        desktop: sources.map(item => ({ url: new URL(item.file, root).href, label: item.label }))
    };
}

function buildScalaSources(config) {
    const liteBase = normalizeBaseUrl(config.scalaLiteBaseUrl, DEFAULT_CONFIG.scalaLiteBaseUrl);
    const fullBase = normalizeBaseUrl(config.scalaFullBaseUrl, DEFAULT_CONFIG.scalaFullBaseUrl);
    return [
        {
            manifestUrl: resolveConfigUrl(config.scalaLiteManifestUrl, DEFAULT_CONFIG.scalaLiteManifestUrl),
            rootPrefix: liteBase,
            label: "lite"
        },
        {
            manifestUrl: resolveConfigUrl(config.scalaFullManifestUrl, DEFAULT_CONFIG.scalaFullManifestUrl),
            rootPrefix: fullBase,
            label: "full"
        }
    ];
}

function resolveAssetPath(entryPath, rootPrefix, defaultPrefix) {
    if (!entryPath || typeof entryPath !== "string") {
        return entryPath;
    }
    if (isAbsoluteUrl(entryPath)) {
        return entryPath;
    }
    const cleaned = entryPath.replace(/^\.\//, "");
    if (defaultPrefix && cleaned.startsWith(defaultPrefix)) {
        return `${rootPrefix}${cleaned.slice(defaultPrefix.length)}`;
    }
    if (rootPrefix) {
        return new URL(cleaned, rootPrefix).href;
    }
    return new URL(cleaned, window.location.href).href;
}

function resolveMidiAssetUrl(entryUrl) {
    if (!entryUrl || typeof entryUrl !== "string") {
        return entryUrl;
    }
    if (isAbsoluteUrl(entryUrl)) {
        return entryUrl;
    }
    const cleaned = entryUrl.replace(/^\.\//, "");
    if (cleaned.startsWith(DEFAULT_CONFIG.midiBaseUrl)) {
        return `${MIDI_BASE_URL}${cleaned.slice(DEFAULT_CONFIG.midiBaseUrl.length)}`;
    }
    return new URL(cleaned, MIDI_BASE_URL).href;
}

let APP_CONFIG = { ...DEFAULT_CONFIG };
let MIDI_BASE_URL = normalizeBaseUrl(DEFAULT_CONFIG.midiBaseUrl, DEFAULT_CONFIG.midiBaseUrl);
let FLUID_DIST_BASE = normalizeBaseUrl(DEFAULT_CONFIG.fluidsynthBaseUrl, DEFAULT_CONFIG.fluidsynthBaseUrl);
let FLUID_MODULE_URL = new URL("fluidsynth.js", FLUID_DIST_BASE).href;
let SOUNDFONT_SOURCES = buildSoundfontSources(DEFAULT_CONFIG.soundfontBaseUrl);
let SAMPLE_MANIFEST_URL = resolveConfigUrl(DEFAULT_CONFIG.sampleMidiManifestUrl, DEFAULT_CONFIG.sampleMidiManifestUrl);
let SCALA_SOURCES = buildScalaSources(DEFAULT_CONFIG);

async function loadAppConfig() {
    try {
        const response = await fetch("config.json", { cache: "no-cache" });
        if (!response.ok) {
            if (response.status === 404) {
                return { ...DEFAULT_CONFIG };
            }
            throw new Error(`Config fetch failed (${response.status})`);
        }
        const data = await response.json();
        return {
            ...DEFAULT_CONFIG,
            ...(data && typeof data === "object" ? data : {})
        };
    } catch (error) {
        console.warn("Unable to load config.json, using defaults.", error);
        return { ...DEFAULT_CONFIG };
    }
}

function applyAppConfig(config) {
    APP_CONFIG = {
        ...DEFAULT_CONFIG,
        ...(config && typeof config === "object" ? config : {})
    };
    FLUID_DIST_BASE = normalizeBaseUrl(APP_CONFIG.fluidsynthBaseUrl, DEFAULT_CONFIG.fluidsynthBaseUrl);
    FLUID_MODULE_URL = new URL("fluidsynth.js", FLUID_DIST_BASE).href;
    SOUNDFONT_SOURCES = buildSoundfontSources(APP_CONFIG.soundfontBaseUrl);
    SAMPLE_MANIFEST_URL = resolveConfigUrl(APP_CONFIG.sampleMidiManifestUrl, DEFAULT_CONFIG.sampleMidiManifestUrl);
    SCALA_SOURCES = buildScalaSources(APP_CONFIG);
    MIDI_BASE_URL = normalizeBaseUrl(APP_CONFIG.midiBaseUrl, DEFAULT_CONFIG.midiBaseUrl);
}

// Detect mobile device for soundfont selection
function isMobileDevice() {
    // Use UA detection only to avoid treating narrow desktop windows as mobile.
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent.toLowerCase()
    );
}

// Soundfont options are hydrated from config.json (defaults to local assets).
const SAMPLE_MIDIS = [];

let audioContext = null;
let progressFrame = null;
let lastProgressUpdateTime = 0;
let audioReady = false;
let playbackStartTime = 0;
let pauseOffset = 0;
let isPlaying = false;
const trackChannels = new Map();
let fluidRenderer;
let suppressProgressEvents = false;
let isUserScrubbing = false;
const DEFAULT_TEMPO_BPM = 120;
const TEMPO_RANGE = { min: 40, max: 240 };
let baseTempoBpm = DEFAULT_TEMPO_BPM;
let currentTempoBpm = DEFAULT_TEMPO_BPM;
let currentSongBaseDuration = 0;
let customTempoActive = false;
// Scala sources are hydrated from config.json (defaults to local assets).
const DEFAULT_TUNING_ID = "__equal__";
const BASE_TUNING_NOTE = 69;
const equalTemperamentTable = buildEqualTemperamentTable(12);
const DEFAULT_MODE = "Ionian";
const SCALA_PREF_KEY = "ear_scala_pref_v1";
const MODE_ADJUSTMENTS = {
    Ionian: {},
    Dorian: { 4: -1, 11: -1 },
    Phrygian: { 2: -1, 4: -1, 9: -1, 11: -1 },
    Lydian: { 5: 1 },
    Mixolydian: { 11: -1 },
    Aeolian: { 4: -1, 9: -1, 11: -1 },
    Locrian: { 2: -1, 4: -1, 7: -1, 9: -1, 11: -1 }
};
const TRANSPOSE_LIMITS = { min: -24, max: 24 };
let tuningManifest = [];
let tuningCache = new Map();
let activeTuning = {
    id: DEFAULT_TUNING_ID,
    name: "12-TET",
    table: equalTemperamentTable
};
let activeScalaSource = null;
let scalaPreference = null;
let currentMode = DEFAULT_MODE;
let currentTranspose = 0;
const pendingProgramUpdates = new Map();
let programFlushHandle = null;
let baseMidiBuffer = null;
let transformedMidiBuffer = null;
let channelAssignmentsSnapshot = [];
let tempoSnapshot = { baseBpm: DEFAULT_TEMPO_BPM, targetBpm: DEFAULT_TEMPO_BPM };
let lastProgramLogSignature = "";
let pendingArrangementRefresh = null;
let recorder = null;
let recordingHandle = null;
let recordingActive = false;
let previousLoopState = false;
const trackVisualState = new Map();
const METER_WINDOW_SECONDS = 0.35;
const METER_DECAY = 0.78;
const METER_ATTACK = 0.45;
const sampleMidiMap = new Map();
let openSampleModal = null;
let sampleManifestLoaded = false;

class PcmRecorder {
    constructor() {
        this.reset();
    }

    reset() {
        this.sampleRate = 44100;
        this.leftBuffers = [];
        this.rightBuffers = [];
        this.length = 0;
        this.isRecording = false;
        this.compressedRecorder = null;
        this.compressedChunks = [];
        this.compressedMime = "";
        this.compressedPromise = null;
        this._compressedResolve = null;
        this._compressedReject = null;
        this.desiredMime = "audio/wav";
        this.desiredExt = "wav";
        this.mediaRecorder = null;
    }

    start(sampleRate) {
        this.reset();
        if (Number.isFinite(sampleRate) && sampleRate > 0) {
            this.sampleRate = sampleRate;
        }
        this.isRecording = true;
    }

    addChunk(left, right) {
        if (!this.isRecording || !left || !right) {
            return;
        }
        // Clone to avoid retaining large buffers unnecessarily.
        this.leftBuffers.push(new Float32Array(left));
        this.rightBuffers.push(new Float32Array(right));
        this.length += left.length;
    }

    stop() {
        this.isRecording = false;
        if (!this.length) {
            return null;
        }
        const interleaved = new Float32Array(this.length * 2);
        let offset = 0;
        for (let i = 0; i < this.leftBuffers.length; i++) {
            const l = this.leftBuffers[i];
            const r = this.rightBuffers[i];
            for (let frame = 0; frame < l.length; frame++) {
                interleaved[offset++] = l[frame];
                interleaved[offset++] = r[frame] ?? l[frame];
            }
        }
        const wavBuffer = this.encodeWav(interleaved, this.sampleRate);
        this.reset();
        return new Blob([wavBuffer], { type: "audio/wav" });
    }

    encodeWav(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        /* RIFF identifier */
        this.writeString(view, 0, "RIFF");
        /* file length */
        view.setUint32(4, 36 + samples.length * 2, true);
        /* RIFF type */
        this.writeString(view, 8, "WAVE");
        /* format chunk identifier */
        this.writeString(view, 12, "fmt ");
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, 2, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * 4, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, 4, true);
        /* bits per sample */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        this.writeString(view, 36, "data");
        /* data chunk length */
        view.setUint32(40, samples.length * 2, true);
        this.floatTo16BitPCM(view, 44, samples);
        return buffer;
    }

    floatTo16BitPCM(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}

function applyAllProgramOverrides() {
    if (!fluidRenderer || !trackPrograms.size || !trackChannels.size) {
        return;
    }
    trackPrograms.forEach((program, trackIndex) => {
        const channel = trackChannels.get(trackIndex);
        if (Number.isFinite(channel)) {
            fluidRenderer.programChange(channel, clampProgram(program));
        }
    });
    logProgramAssignments("applyAllProgramOverrides");
}

function logProgramAssignments(reason) {
    if (!DEBUG_PROGRAM_LOG) {
        return;
    }
    const rows = [];
    trackChannels.forEach((channel, trackIndex) => {
        const program = fluidRenderer?.channelPrograms?.get(channel);
        rows.push({
            track: trackIndex + 1,
            channel: channel + 1,
            program: Number.isFinite(program) ? program : "n/a",
            instrument: getInstrumentName(program ?? 0)
        });
    });
    const signature = JSON.stringify(rows);
    if (signature === lastProgramLogSignature) {
        return;
    }
    lastProgramLogSignature = signature;
    console.table(rows, ["track", "channel", "program", "instrument"]);
    if (reason) {
        console.log(`[Programs] ${reason}`);
    }
}

// Expose for manual inspection in console.
window.__logPrograms = (label = "manual") => logProgramAssignments(label);

function resolveFluidPath(relative) {
    return new URL(relative, FLUID_DIST_BASE).href;
}

class FluidSynthRenderer {
    constructor() {
        this.modulePromise = null;
        this.module = null;
        this.audioContext = null;
        this.settingsPtr = null;
        this.synthPtr = null;
        this.playerPtr = null;
        this.audioNode = null;
        this.outputGain = null;
        this.recordDestination = null;
        this.workletModulePromise = null;
        this.blockSize = 4096;
        this.leftPtr = null;
        this.rightPtr = null;
        this.leftView = null;
        this.rightView = null;
        this.silenceLeft = null;
        this.silenceRight = null;
        this.sfLoaded = false;
        this.songDuration = 0;
        this.totalTicks = 0;
        this.isRendering = false;
        this.onPlaybackComplete = null;
        this.channelPrograms = new Map();
        this.loopEnabled = false;
        this.baseSongDuration = 0;
        this.baseBpm = DEFAULT_TEMPO_BPM;
        this.currentBpm = DEFAULT_TEMPO_BPM;
        this.currentTuningData = new Float64Array(128);
        this.currentTuningName = "12-TET";
        this.tuningPtr = null;
        this.tuningBuffer = null;
        this.tuningKeysPtr = null;
        this.tuningKeysBuffer = null;
        this.tuningBank = 1;
        this.tuningProg = 0;
        this.programRefreshHandle = null;
        this.progressCallback = null;
    }

    setProgressCallback(callback) {
        this.progressCallback = typeof callback === "function" ? callback : null;
    }

    reportProgress(fraction) {
        if (this.progressCallback) {
            this.progressCallback(fraction);
        }
    }

    async ensureInitialized(audioContext) {
        if (!audioContext) {
            return;
        }
        this.audioContext = audioContext;
        this.reportProgress(0.2);
        if (!this.modulePromise) {
            this.modulePromise = import(/* webpackIgnore: true */ FLUID_MODULE_URL)
                .then(mod => mod.default({
                    locateFile: (path) => resolveFluidPath(path)
                }));
        }
        if (!this.module) {
            this.module = await this.modulePromise;
            await this.module.ready;
            this.reportProgress(0.5);
            this.setupApi();
            this.initializeSynth();
            await this.loadSoundFont();
        }
        if (!this.audioNode) {
            await this.createProcessor();
        }
        this.reportProgress(1);
    }

    setupApi() {
        const m = this.module;
        this._new_fluid_settings = m.cwrap("new_fluid_settings", "number", []);
        this._delete_fluid_settings = m.cwrap("delete_fluid_settings", null, ["number"]);
        this._fluid_settings_setnum = m.cwrap("fluid_settings_setnum", "number", ["number", "string", "number"]);
        this._fluid_settings_setstr = m.cwrap("fluid_settings_setstr", "number", ["number", "string", "string"]);
        this._fluid_settings_setint = m.cwrap("fluid_settings_setint", "number", ["number", "string", "number"]);
        this._new_fluid_synth = m.cwrap("new_fluid_synth", "number", ["number"]);
        this._delete_fluid_synth = m.cwrap("delete_fluid_synth", null, ["number"]);
        this._fluid_synth_sfload = m.cwrap("fluid_synth_sfload", "number", ["number", "string", "number"]);
        this._fluid_synth_bank_select = m.cwrap("fluid_synth_bank_select", "number", ["number", "number", "number"]);
        this._fluid_synth_write_float = m.cwrap("fluid_synth_write_float", "number", ["number", "number", "number", "number", "number", "number", "number", "number"]);
        this._fluid_synth_program_change = m.cwrap("fluid_synth_program_change", "number", ["number", "number", "number"]);
        this._new_fluid_player = m.cwrap("new_fluid_player", "number", ["number"]);
        this._delete_fluid_player = m.cwrap("delete_fluid_player", null, ["number"]);
        this._fluid_player_add = m.cwrap("fluid_player_add", "number", ["number", "string"]);
        this._fluid_player_play = m.cwrap("fluid_player_play", "number", ["number"]);
        this._fluid_player_stop = m.cwrap("fluid_player_stop", "number", ["number"]);
        this._fluid_player_seek = m.cwrap("fluid_player_seek", "number", ["number", "number"]);
        this._fluid_player_get_status = m.cwrap("fluid_player_get_status", "number", ["number"]);
        this._fluid_player_get_current_tick = m.cwrap("fluid_player_get_current_tick", "number", ["number"]);
        this._fluid_player_get_total_ticks = m.cwrap("fluid_player_get_total_ticks", "number", ["number"]);
        this._fluid_player_join = m.cwrap("fluid_player_join", "number", ["number"]);
        this._fluid_player_set_bpm = m.cwrap("fluid_player_set_bpm", "number", ["number", "number"]);
        this._fluid_player_set_tempo = m.cwrap("fluid_player_set_tempo", "number", ["number", "number", "number"]);
        this._fluid_synth_tune_notes = m.cwrap("fluid_synth_tune_notes", "number", ["number", "number", "number", "number", "number", "number", "number"]);
        this._fluid_synth_activate_tuning = m.cwrap("fluid_synth_activate_tuning", "number", ["number", "number", "number", "number", "number"]);
        this._fluid_player_set_loop = m.cwrap("fluid_player_set_loop", "number", ["number", "number"]);
        this._fluid_synth_all_notes_off = m.cwrap("fluid_synth_all_notes_off", "number", ["number", "number"]);
    }

    initializeSynth() {
        if (this.settingsPtr) {
            return;
        }
        this.settingsPtr = this._new_fluid_settings();
        const sampleRate = this.audioContext.sampleRate;
        this._fluid_settings_setnum(this.settingsPtr, "synth.sample-rate", sampleRate);
        this._fluid_settings_setstr(this.settingsPtr, "player.timing-source", "sample");
        this._fluid_settings_setint(this.settingsPtr, "synth.polyphony", 256);
        this.synthPtr = this._new_fluid_synth(this.settingsPtr);
    }

    async loadSoundFont() {
        if (this.sfLoaded) {
            return;
        }
        this.reportProgress(0.55);
        this.useLegacyProcessor = false;
        const candidates = isMobileDevice() ? SOUNDFONT_SOURCES.mobile : SOUNDFONT_SOURCES.desktop;
        let lastError = null;
        for (const candidate of candidates) {
            const fontUrl = candidate.url;
            const fontLabel = candidate.label || fontUrl;
            try {
                console.log(`[Audio] Loading soundfont: ${fontLabel}`);
                const response = await fetch(fontUrl);
                if (!response.ok) {
                    throw new Error(`Status ${response.status}`);
                }
                const contentLength = Number(response.headers.get("content-length"));
                console.log(`[Audio] Soundfont size: ${contentLength} bytes`);
                let data;
                if (response.body && Number.isFinite(contentLength) && contentLength > 0) {
                    const reader = response.body.getReader();
                    const chunks = [];
                    let received = 0;
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        chunks.push(value);
                        received += value.length;
                        const fraction = Math.min(received / contentLength, 1);
                        this.reportProgress(0.6 + fraction * 0.35);
                    }
                    data = new Uint8Array(received);
                    let offset = 0;
                    for (const chunk of chunks) {
                        data.set(chunk, offset);
                        offset += chunk.length;
                    }
                } else {
                    const buffer = await response.arrayBuffer();
                    data = new Uint8Array(buffer);
                }
                const FS = this.module.FS;
                if (!FS.analyzePath("/soundfonts").exists) {
                    FS.mkdir("/soundfonts");
                }
                const sfFilename = fontUrl.split("/").pop() || "soundfont.sf2";
                const sfPath = `/soundfonts/${sfFilename}`;
                try {
                    FS.unlink(sfPath);
                } catch (error) {
                    // ignore
                }
                FS.writeFile(sfPath, data);
                const sfLoadResult = this._fluid_synth_sfload(this.synthPtr, sfPath, 1);
                if (sfLoadResult < 0) {
                    throw new Error("FluidSynth failed to load the GM soundfont.");
                }
                this.sfLoaded = true;
                console.log(`[Audio] Soundfont ready: ${fontLabel}`);
                return;
            } catch (error) {
                console.warn(`[Audio] Failed to load soundfont ${fontLabel}:`, error);
                lastError = error;
            }
        }
        throw new Error(lastError || "Unable to load any soundfont candidates.");
    }

    async loadMidi(arrayBuffer, durationSeconds, assignments = [], tempoOptions = {}) {
        await this.ensureInitialized(this.audioContext || getAudioContext());
        const FS = this.module.FS;
        if (!FS.analyzePath("/midi").exists) {
            FS.mkdir("/midi");
        }
        const midiPath = "/midi/current.mid";
        try {
            FS.unlink(midiPath);
        } catch (error) {
            // ignore
        }
        FS.writeFile(midiPath, new Uint8Array(arrayBuffer));
        if (this.playerPtr) {
            this._fluid_player_stop(this.playerPtr);
            this.waitForPlayerStop();
            this._delete_fluid_player(this.playerPtr);
        }
        this.playerPtr = this._new_fluid_player(this.synthPtr);
        this._fluid_player_set_loop(this.playerPtr, 0);
        const addResult = this._fluid_player_add(this.playerPtr, midiPath);
        if (addResult !== 0) {
            throw new Error("Fluidsynth could not load the MIDI data.");
        }
        this.totalTicks = 0;
        this.refreshTotalTicks();
        this.baseSongDuration = durationSeconds || 0;
        this.songDuration = this.baseSongDuration;
        if (tempoOptions && Number.isFinite(tempoOptions.baseBpm) && tempoOptions.baseBpm > 0) {
            this.baseBpm = tempoOptions.baseBpm;
        }
        this.isRendering = false;
        this.channelPrograms = new Map();
        assignments.forEach(({ channel, program }) => {
            this.channelPrograms.set(channel, program);
        });
        this.applyProgramSnapshot();
        const startBpm = tempoOptions && Number.isFinite(tempoOptions.targetBpm) && tempoOptions.targetBpm > 0
            ? tempoOptions.targetBpm
            : this.baseBpm;
        this._applyTempo(startBpm);
        this._applyStoredTuning(true);
    }

    async playFrom(offsetSeconds) {
        await this.ensureInitialized(this.audioContext || getAudioContext());
        if (!this.playerPtr) {
            throw new Error("No MIDI data loaded.");
        }
        this._fluid_player_stop(this.playerPtr);
        this.waitForPlayerStop();
        this._fluid_player_set_loop(this.playerPtr, 0);
        this.refreshTotalTicks();
        const tickPosition = this.secondsToTicks(offsetSeconds);
        this._fluid_player_seek(this.playerPtr, tickPosition);
        this._applyTempo(this.currentBpm || this.baseBpm || DEFAULT_TEMPO_BPM);
        this._applyStoredTuning();
        this.applyProgramSnapshot();
        this._fluid_player_play(this.playerPtr);
        this.playbackStartTick = tickPosition;
        this.isRendering = true;
        this.scheduleProgramRefresh();
        return true;
    }

    silence() {
        if (!this._fluid_synth_all_notes_off || !this.synthPtr) {
            return;
        }
        for (let channel = 0; channel < 16; channel++) {
            this._fluid_synth_all_notes_off(this.synthPtr, channel);
        }
    }

    pause() {
        if (!this.playerPtr) {
            return 0;
        }
        const currentTick = this._fluid_player_get_current_tick(this.playerPtr);
        const seconds = this.ticksToSeconds(currentTick);
        this._fluid_player_stop(this.playerPtr);
        this.waitForPlayerStop();
        this.silence();
        this.isRendering = false;
        return seconds;
    }

    resumePlayback() {
        if (!this.playerPtr) {
            return;
        }
        this._fluid_player_play(this.playerPtr);
        this.isRendering = true;
        this.scheduleProgramRefresh();
    }

    stop() {
        if (this.playerPtr) {
            this._fluid_player_stop(this.playerPtr);
            this._fluid_player_seek(this.playerPtr, 0);
            this.waitForPlayerStop();
            this._sendBpmToPlayer();
            this.silence();
        }
        this.isRendering = false;
        if (this.programRefreshHandle) {
            clearTimeout(this.programRefreshHandle);
            this.programRefreshHandle = null;
        }
    }

    async seek(seconds) {
        await this.ensureInitialized(this.audioContext || getAudioContext());
        if (!this.playerPtr) {
            return;
        }
        this._fluid_player_stop(this.playerPtr);
        this.waitForPlayerStop();
        this._fluid_player_set_loop(this.playerPtr, 0);
        this.refreshTotalTicks();
        const tickPosition = this.secondsToTicks(seconds);
        this._fluid_player_seek(this.playerPtr, tickPosition);
        this._sendBpmToPlayer();
        this._applyStoredTuning();
        this.applyProgramSnapshot();
        this.isRendering = false;
    }

    setLoopEnabled(flag) {
        this.loopEnabled = flag;
        if (this.playerPtr) {
            this._fluid_player_set_loop(this.playerPtr, 0);
        }
    }

    setTempoBpm(bpm, baseBpm, baseDuration) {
        if (Number.isFinite(baseBpm) && baseBpm > 0) {
            this.baseBpm = baseBpm;
        }
        if (Number.isFinite(baseDuration) && baseDuration > 0) {
            this.baseSongDuration = baseDuration;
        }
        this._applyTempo(bpm);
    }

    applyTuning(pitches, name) {
        if (!Array.isArray(pitches) || pitches.length !== 128) {
            return;
        }
        this.currentTuningData = new Float64Array(pitches);
        this.currentTuningName = name || "Custom Tuning";
        this._applyStoredTuning(true);
    }

    reapplyTuning() {
        this._applyStoredTuning(true);
    }

    resetTuning() {
        this.currentTuningData = buildEqualTemperamentTable(12);
        this.currentTuningName = "12-TET";
        this._applyStoredTuning(true);
    }

    _applyTempo(bpm) {
        const fallbackBpm = this.baseBpm > 0 ? this.baseBpm : DEFAULT_TEMPO_BPM;
        const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : fallbackBpm;
        this.currentBpm = safeBpm;
        if (this.baseSongDuration > 0 && this.baseBpm > 0) {
            const ratio = this.baseBpm / this.currentBpm;
            this.songDuration = this.baseSongDuration * ratio;
        } else {
            this.songDuration = this.baseSongDuration;
        }
        this._sendBpmToPlayer();
    }

    _sendBpmToPlayer() {
        if (!this.playerPtr) {
            return;
        }
        const bpm = this.currentBpm || this.baseBpm || DEFAULT_TEMPO_BPM;
        if (this._fluid_player_set_tempo) {
            this._fluid_player_set_tempo(this.playerPtr, FluidSynthRenderer.TEMPO_EXTERNAL, bpm);
        } else if (this._fluid_player_set_bpm) {
            this._fluid_player_set_bpm(this.playerPtr, bpm);
        }
    }

    _applyStoredTuning(forceApply = false) {
        if (!this.currentTuningData || !this._fluid_synth_tune_notes || !this.synthPtr) {
            return;
        }
        this.ensureTuningBuffer();
        this.tuningBuffer.set(this.currentTuningData);
        this._fluid_synth_tune_notes(this.synthPtr, this.tuningBank, this.tuningProg, 128, this.tuningKeysPtr, this.tuningPtr, forceApply ? 1 : 0);
        this._selectTuningOnAllChannels(forceApply);
    }

    ensureTuningBuffer() {
        if (!this.tuningPtr) {
            this.tuningPtr = this.module._malloc(128 * 8);
        }
        if (!this.tuningBuffer || this.tuningBuffer.buffer !== this.module.HEAPF64.buffer) {
            this.tuningBuffer = new Float64Array(this.module.HEAPF64.buffer, this.tuningPtr, 128);
        }
        if (!this.tuningKeysPtr) {
            this.tuningKeysPtr = this.module._malloc(128 * 4);
        }
        if (!this.tuningKeysBuffer || this.tuningKeysBuffer.buffer !== this.module.HEAP32.buffer) {
            this.tuningKeysBuffer = new Int32Array(this.module.HEAP32.buffer, this.tuningKeysPtr, 128);
            for (let i = 0; i < 128; i++) {
                this.tuningKeysBuffer[i] = i;
            }
        }
    }

    _selectTuningOnAllChannels(forceApply = false) {
        if (!this._fluid_synth_activate_tuning || !this.synthPtr) {
            return;
        }
        for (let channel = 0; channel < 16; channel++) {
            this._fluid_synth_activate_tuning(this.synthPtr, channel, this.tuningBank, this.tuningProg, forceApply ? 1 : 0);
        }
    }

    _selectTuningOnChannel(channel) {
        if (!this._fluid_synth_activate_tuning || !this.synthPtr) {
            return;
        }
        this._fluid_synth_activate_tuning(this.synthPtr, channel, this.tuningBank, this.tuningProg, 0);
    }

    programChange(channel, program) {
        if (!this.module || !this.synthPtr) {
            return;
        }
        if (!this._fluid_synth_program_change) {
            this._fluid_synth_program_change = this.module.cwrap("fluid_synth_program_change", "number", ["number", "number", "number"]);
        }
        if (this._fluid_synth_bank_select) {
            this._fluid_synth_bank_select(this.synthPtr, channel, 0);
        }
        this._fluid_synth_program_change(this.synthPtr, channel, program);
        this.channelPrograms.set(channel, program);
        this._selectTuningOnChannel(channel);
    }

    applyProgramSnapshot() {
        if (!this.channelPrograms || !this.channelPrograms.size) {
            return;
        }
        this.channelPrograms.forEach((program, channel) => {
            if (this._fluid_synth_bank_select) {
                this._fluid_synth_bank_select(this.synthPtr, channel, 0);
            }
            if (!this._fluid_synth_program_change) {
                this._fluid_synth_program_change = this.module.cwrap("fluid_synth_program_change", "number", ["number", "number", "number"]);
            }
            this._fluid_synth_program_change(this.synthPtr, channel, program);
            this._selectTuningOnChannel(channel);
        });
    }

    getCurrentSeconds() {
        if (!this.playerPtr) {
            return 0;
        }
        const tick = this._fluid_player_get_current_tick(this.playerPtr);
        return this.ticksToSeconds(tick);
    }

    handleWorkletRequest(frames) {
        if (!this.audioNode || this.useLegacyProcessor) {
            return;
        }
        const { left, right } = this.renderFrames(frames);
        this.audioNode.port.postMessage({
            type: "data",
            left,
            right
        }, [left.buffer, right.buffer]);
    }

    refreshTotalTicks() {
        if (!this.playerPtr || !this._fluid_player_get_total_ticks) {
            return;
        }
        const ticks = this._fluid_player_get_total_ticks(this.playerPtr);
        if (ticks > 0) {
            this.totalTicks = ticks;
        }
    }

    waitForPlayerStop() {
        if (!this.playerPtr || !this._fluid_player_join) {
            return;
        }
        try {
            this._fluid_player_join(this.playerPtr);
        } catch (error) {
            // Joining can fail if the player thread is already inactive; ignore.
        }
    }

    ensureHeapViews(length) {
        if (!this.leftPtr || length > this.blockSize) {
            if (this.leftPtr) {
                this.module._free(this.leftPtr);
                this.module._free(this.rightPtr);
            }
            this.blockSize = length;
            this.leftPtr = this.module._malloc(this.blockSize * 4);
            this.rightPtr = this.module._malloc(this.blockSize * 4);
            this.leftView = new Float32Array(this.module.HEAPF32.buffer, this.leftPtr, this.blockSize);
            this.rightView = new Float32Array(this.module.HEAPF32.buffer, this.rightPtr, this.blockSize);
        } else if (this.leftView?.buffer !== this.module.HEAPF32.buffer) {
            this.leftView = new Float32Array(this.module.HEAPF32.buffer, this.leftPtr, this.blockSize);
            this.rightView = new Float32Array(this.module.HEAPF32.buffer, this.rightPtr, this.blockSize);
        }
    }

    ensureSilenceBuffers(length) {
        if (!this.silenceLeft || this.silenceLeft.length < length) {
            this.silenceLeft = new Float32Array(length);
            this.silenceRight = new Float32Array(length);
        }
    }

    renderFrames(frameCount) {
        const frames = Math.max(this.blockSize, Number(frameCount) || 0);
        if (!this.isRendering || !this.playerPtr) {
            this.ensureSilenceBuffers(frames);
            return {
                left: this.silenceLeft.subarray(0, frames),
                right: this.silenceRight.subarray(0, frames)
            };
        }
        this.ensureHeapViews(frames);
        this._fluid_synth_write_float(this.synthPtr, frames,
            this.leftPtr, 0, 1,
            this.rightPtr, 0, 1);
        const leftCopy = new Float32Array(frames);
        leftCopy.set(this.leftView.subarray(0, frames));
        const rightCopy = new Float32Array(frames);
        rightCopy.set(this.rightView.subarray(0, frames));
        if (recorder?.isRecording) {
            recorder.addChunk(leftCopy, rightCopy);
        }
        const status = (this.isRendering && this.playerPtr)
            ? this._fluid_player_get_status(this.playerPtr)
            : null;
        if (this.isRendering && status === FluidSynthRenderer.PLAYER_DONE) {
            this.isRendering = false;
            if (typeof this.onPlaybackComplete === "function") {
                this.onPlaybackComplete();
            }
        }
        return { left: leftCopy, right: rightCopy };
    }

    scheduleProgramRefresh() {
        if (this.programRefreshHandle) {
            clearTimeout(this.programRefreshHandle);
        }
        this.programRefreshHandle = setTimeout(() => {
            this.programRefreshHandle = null;
            this.applyProgramSnapshot();
            // Reapply once more after the player has had time to settle post-seek.
            setTimeout(() => this.applyProgramSnapshot(), 30);
        }, 0);
    }

    async createProcessor() {
        if (!this.audioContext) {
            return;
        }
        if (this.audioContext.audioWorklet && this.audioContext.audioWorklet.addModule) {
            if (!this.workletModulePromise) {
                this.workletModulePromise = this.audioContext.audioWorklet.addModule("js/fluid-worklet.js");
            }
            try {
                await this.workletModulePromise;
            } catch (error) {
                throw new Error(`Failed to load audio worklet: ${error?.message || error}`);
            }
            this.audioNode = new AudioWorkletNode(this.audioContext, "fluidsynth-worklet", {
                processorOptions: { blockSize: this.blockSize }
            });
            this.outputGain = this.audioContext.createGain();
            this.audioNode.port.onmessage = (event) => {
                if (event.data?.type === "request") {
                    const frames = event.data.frames || this.blockSize;
                    this.handleWorkletRequest(frames);
                }
            };
            this.useLegacyProcessor = false;
            this.updateRouting();
            this.handleWorkletRequest(this.blockSize);
            return;
        }

        // Legacy fallback: ScriptProcessorNode
        this.useLegacyProcessor = true;
        // ScriptProcessor buffer size must be power of two between 256-16384; choose 1024 for low latency.
        this.blockSize = 1024;
        const processor = this.audioContext.createScriptProcessor(this.blockSize, 0, 2);
        processor.onaudioprocess = (event) => {
            const outL = event.outputBuffer.getChannelData(0);
            const outR = event.outputBuffer.getChannelData(1);
            const { left, right } = this.renderFrames(outL.length);
            outL.set(left);
            outR.set(right);
        };
        this.audioNode = processor;
        this.outputGain = this.audioContext.createGain();
        this.updateRouting();
    }

    attachRecorderDestination(node) {
        this.recordDestination = node;
        this.updateRouting();
    }

    updateRouting() {
        if (!this.audioNode) {
            return;
        }
        if (!this.outputGain) {
            this.outputGain = this.audioContext.createGain();
        }
        try {
            this.audioNode.disconnect();
        } catch (e) {
            // ignore
        }
        this.audioNode.connect(this.outputGain);
        this.outputGain.connect(this.audioContext.destination);
        if (this.recordDestination) {
            this.outputGain.connect(this.recordDestination);
        }
    }

    secondsToTicks(seconds) {
        this.refreshTotalTicks();
        if (!this.totalTicks || !this.songDuration) {
            return 0;
        }
        const ratio = Math.max(0, Math.min(1, seconds / this.songDuration));
        return Math.floor(ratio * this.totalTicks);
    }

    ticksToSeconds(ticks) {
        this.refreshTotalTicks();
        if (!this.totalTicks || !this.songDuration) {
            return 0;
        }
        return (ticks / this.totalTicks) * this.songDuration;
    }
}

FluidSynthRenderer.PLAYER_DONE = 3;
FluidSynthRenderer.TEMPO_EXTERNAL = 1;
fluidRenderer = new FluidSynthRenderer();
fluidRenderer.setProgressCallback(setStatusProgress);
    fluidRenderer.onPlaybackComplete = async () => {
        if (recordingActive) {
            await stopRecordingSession(true);
            stopPlayback(true);
            return;
        }
        if (loopToggle.checked && currentSong) {
            isPlaying = false;
            pauseOffset = 0;
            playbackStartTime = getAudioContext().currentTime;
            isUserScrubbing = false;
            stopProgressUpdates(true);
            applyTempoChange();
            fluidRenderer.reapplyTuning();
            applyAllProgramOverrides();
            const scheduled = await scheduleNotesFromOffset(0);
            if (scheduled) {
                applyAllProgramOverrides();
                if (typeof fluidRenderer.scheduleProgramRefresh === "function") {
                    fluidRenderer.scheduleProgramRefresh();
            }
            setTimeout(() => {
                applyAllProgramOverrides();
                if (typeof fluidRenderer.scheduleProgramRefresh === "function") {
                    fluidRenderer.scheduleProgramRefresh();
                }
            }, 50);
            isPlaying = true;
            startProgressUpdates();
            setStatus("Playing...", false);
            logProgramAssignments("loop restart");
        }
    } else {
        stopPlayback(true);
    }
};

let midiWorker = null;
let workerRequestId = 0;
const workerRequests = new Map();
let latestSelectionToken = 0;

if (typeof Worker !== "undefined") {
    try {
        midiWorker = new Worker("js/midi-worker.js");
    } catch (error) {
        console.warn("Falling back to main-thread MIDI parsing:", error);
        midiWorker = null;
    }
} else {
    console.warn("Web Workers are not supported in this browser. MIDI parsing will run on the main thread.");
}

let currentSong = null;
let playableTracks = [];
let trackPrograms = new Map();
let isPrepared = false;

if (midiWorker) {
    midiWorker.addEventListener("message", (event) => {
        const { id, ok, payload, error } = event.data || {};
        const callbacks = workerRequests.get(id);
        if (!callbacks) {
            return;
        }
        workerRequests.delete(id);
        if (ok) {
            callbacks.resolve(payload);
        } else {
            callbacks.reject(new Error(error || "Unable to parse MIDI file."));
        }
    });

    midiWorker.addEventListener("error", (event) => {
        workerRequests.forEach(({ reject }) => {
            reject(event.message ? new Error(event.message) : event);
        });
        workerRequests.clear();
        setStatus("Background MIDI parser failed. Falling back to in-page parsing.", true);
        try {
            midiWorker.terminate();
        } catch (error) {
            console.warn("Unable to terminate MIDI worker:", error);
        }
        midiWorker = null;
    });
}

fileInput.addEventListener("change", handleMidiSelection);
enableAudioButton.addEventListener("click", async () => {
    try {
        setLoadButtonEnabled(false);
        setSampleButtonEnabled(false);
        setStatusProgress(0.2);
        await ensureAudioReady();
        setStatus("Audio enabled. Load a MIDI file to begin.", false);
        enableAudioButton.disabled = true;
        setAudioEnabledState(true);
        setStatusProgress(1);
        playConfirmationClick();
        console.log("[Audio] Context resumed:", getAudioContext().state);
    } catch (error) {
        console.error(error);
        const reason = error && error.message ? ` (${error.message})` : "";
        setStatus(`Click blocked by browser. Try again.${reason}`, true);
        setStatusProgress(0);
        setLoadButtonEnabled(false);
        setSampleButtonEnabled(false);
    }
});
if (loadSampleButton && sampleMidiSelect) {
    loadSampleButton.addEventListener("click", () => {
        showSampleModal();
    });
    sampleMidiSelect.addEventListener("change", async (event) => {
        const chosenId = event.target.value;
        const sample = sampleMidiMap.get(chosenId);
        if (!sample) {
            return;
        }
        setStatus(`Ready to load ${sample.name}.`, false);
    });
}
if (sampleChooseButton && sampleMidiSelect) {
    sampleChooseButton.addEventListener("click", () => {
        const chosenId = sampleMidiSelect.value;
        const sample = sampleMidiMap.get(chosenId);
        if (!sample) {
            setStatus("Select a sample MIDI to load.", true);
            return;
        }
        hideSampleModal();
        loadSampleByRecord(sample);
    });
}
if (sampleCancelButton) {
    sampleCancelButton.addEventListener("click", () => {
        hideSampleModal();
        setStatus("Sample load canceled.", false);
    });
}
if (helpToggle) {
    helpToggle.addEventListener("click", () => {
        const isHidden = helpBubbles?.classList.contains("is-hidden");
        setHelpVisibility(Boolean(isHidden), false);
    });
}
if (helpDismiss) {
    helpDismiss.addEventListener("click", () => {
        setHelpVisibility(false, true);
    });
}
if (infoToggle) {
    infoToggle.addEventListener("click", () => {
        const isHidden = infoBubbles?.classList.contains("is-hidden");
        setInfoVisibility(Boolean(isHidden));
    });
}
if (infoDismiss) {
    infoDismiss.addEventListener("click", () => {
        setInfoVisibility(false);
    });
}
if (contactLink) {
    contactLink.addEventListener("click", (event) => {
        event.preventDefault();
        setInfoVisibility(false);
        showContactModal();
    });
}
if (contactCancel) {
    contactCancel.addEventListener("click", () => {
        hideContactModal();
    });
}
if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = contactForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
        }
        if (contactStatus) {
            contactStatus.textContent = "Sending...";
        }
        const formData = new FormData(contactForm);
        try {
            const response = await fetch(contactForm.action, {
                method: contactForm.method || "POST",
                body: formData,
                headers: { Accept: "application/json" }
            });
            if (response.ok) {
                if (contactStatus) {
                    contactStatus.textContent = "Thanks! Your message was sent.";
                }
                contactForm.reset();
            } else {
                if (contactStatus) {
                    contactStatus.textContent = "There was a problem sending your message. Please try again.";
                }
            }
        } catch (error) {
            console.error("Error submitting contact form", error);
            if (contactStatus) {
                contactStatus.textContent = "Network error. Please try again.";
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}

function showContactModal() {
    if (!contactModal) return;
    contactModal.classList.remove("is-hidden");
}

function hideContactModal() {
    if (!contactModal) return;
    contactModal.classList.add("is-hidden");
}
if (sampleModal) {
    sampleModal.addEventListener("click", (event) => {
        if (event.target === sampleModal || event.target.classList.contains("modal__backdrop")) {
            hideSampleModal();
        }
    });
}
playButton.addEventListener("click", () => play());
pauseButton.addEventListener("click", () => pausePlayback());
stopButton.addEventListener("click", () => stopPlayback(false));
loopToggle.addEventListener("change", () => {
    fluidRenderer.setLoopEnabled(loopToggle.checked);
});
if (recordButton) {
    recordButton.addEventListener("click", () => toggleRecording());
}

progressBar.addEventListener("input", (event) => {
    if (suppressProgressEvents || !currentSong) {
        return;
    }
    isUserScrubbing = true;
    const valueSeconds = Number.parseFloat(event.target.value);
    pauseOffset = Number.isFinite(valueSeconds) ? valueSeconds : 0;
    updateProgressUI(pauseOffset);
});

progressBar.addEventListener("change", async () => {
    if (!currentSong) {
        return;
    }
    if (isPlaying) {
        applyAllProgramOverrides();
        const success = await scheduleNotesFromOffset(pauseOffset);
        if (success) {
            pauseOffset = 0;
            startProgressUpdates();
            logProgramAssignments("post-scrub resume");
        }
    } else {
        await fluidRenderer.seek(pauseOffset);
        applyAllProgramOverrides();
        updateProgressUI(pauseOffset);
        logProgramAssignments("post-scrub paused");
    }
    isUserScrubbing = false;
});

progressBar.addEventListener("pointerdown", () => {
    if (!currentSong) {
        return;
    }
    isUserScrubbing = true;
});

progressBar.addEventListener("pointerup", () => {
    isUserScrubbing = false;
    if (!isPlaying) {
        updateProgressUI(pauseOffset);
    }
});

progressBar.addEventListener("pointercancel", () => {
    isUserScrubbing = false;
});

tempoSlider.addEventListener("input", () => {
    if (tempoSlider.disabled) {
        return;
    }
    const bpm = clampTempoValue(Number(tempoSlider.value));
    currentTempoBpm = bpm;
    customTempoActive = Math.abs(currentTempoBpm - baseTempoBpm) > 0.1;
    applyTempoChange();
});
updateTempoControlsState(false);

if (tempoResetButton) {
    tempoResetButton.addEventListener("click", () => {
        if (tempoResetButton.disabled) {
            return;
        }
        currentTempoBpm = baseTempoBpm;
        customTempoActive = false;
        applyTempoChange();
    });
}

if (tuningResetButton) {
    tuningResetButton.addEventListener("click", () => {
        if (tuningResetButton.disabled) {
            return;
        }
        if (tuningSelect) {
            tuningSelect.value = DEFAULT_TUNING_ID;
            handleTuningSelection(DEFAULT_TUNING_ID);
        }
    });
}

if (tuningSelect) {
    tuningSelect.addEventListener("change", () => {
        handleTuningSelection(tuningSelect.value);
    });
}
if (tuningFolderSelect) {
    tuningFolderSelect.addEventListener("change", () => {
        filterTuningsByFolder(tuningFolderSelect.value);
    });
}
if (modeSelect) {
    modeSelect.value = DEFAULT_MODE;
    modeSelect.addEventListener("change", () => {
        const requested = modeSelect.value || DEFAULT_MODE;
        if (requested === currentMode) {
            return;
        }
        currentMode = requested;
        updateModeStatus();
        applyActiveTuning();
        setStatus(`Mode applied: ${currentMode}`, false);
    });
}
if (transposeInput) {
    transposeInput.value = currentTranspose.toString();
    transposeInput.addEventListener("change", () => {
        const requested = Number.parseInt(transposeInput.value, 10);
        applyTransposeChange(Number.isFinite(requested) ? requested : currentTranspose);
    });
}
if (transposeDecrement) {
    transposeDecrement.addEventListener("click", () => {
        applyTransposeChange(currentTranspose - 1);
    });
}
if (transposeIncrement) {
    transposeIncrement.addEventListener("click", () => {
        applyTransposeChange(currentTranspose + 1);
    });
}
async function bootstrapApp() {
    const config = await loadAppConfig();
    applyAppConfig(config);
    updateModeStatus();
    updateTransposeStatus();
    setScaleControlsEnabled(false);
    initializeScalaPreference();
    loadScalaManifest();
    applyActiveTuning();
    loadSampleManifest();
}

bootstrapApp();

async function loadMidiFromBuffer(buffer, displayName = "MIDI file") {
    await ensureAudioReady().catch((error) => {
        console.warn("Audio context not ready yet:", error);
    });
    const selectionToken = ++latestSelectionToken;
    resetPlaybackState();
    setStatus(`Parsing ${displayName}...`, false);
    try {
        const parsedSong = await parseMidiBuffer(buffer);
        if (selectionToken !== latestSelectionToken) {
            return;
        }

        if (!parsedSong.tracks || !parsedSong.tracks.length) {
            throw new Error("This MIDI file does not contain any playable tracks.");
        }

        currentSong = parsedSong;
        currentSongBaseDuration = currentSong.duration || 0;
        currentSong.baseDuration = currentSongBaseDuration;
        const detectedTempo = detectDefaultTempo(parsedSong);
        baseTempoBpm = detectedTempo;
        currentTempoBpm = detectedTempo;
        playableTracks = parsedSong.tracks;
        console.log("[MIDI] Loaded. Duration:", currentSong.duration, "Tracks:", playableTracks.length);
        trackChannels.clear();
        trackPrograms.clear();
        const channelAssignments = [];
        playableTracks.forEach((track, idx) => {
            const slot = channelAssignments.length;
            track.slot = slot;
            let channel = idx % 16;
            if (idx >= 16) {
                console.warn("More than 16 tracks detected. Reusing channel", channel + 1);
            }
            track.channelNumber = channel;
            trackChannels.set(slot, channel);
            const initialProgram = clampProgram(track.program ?? 0);
            trackPrograms.set(slot, initialProgram);
            channelAssignments.push({ trackIndex: slot, channel, program: initialProgram });
        });
        baseMidiBuffer = (await sanitizeMidiForPlayback(buffer)).slice(0);
        const playableBuffer = await buildTransformedMidiBuffer(baseMidiBuffer);
        channelAssignmentsSnapshot = channelAssignments.map(item => ({ ...item }));
        tempoSnapshot = {
            baseBpm: baseTempoBpm,
            targetBpm: currentTempoBpm
        };
        await fluidRenderer.loadMidi(playableBuffer, currentSongBaseDuration, channelAssignmentsSnapshot, tempoSnapshot);
        fluidRenderer.setLoopEnabled(loopToggle.checked);
        applyActiveTuning();
        currentSong.duration = fluidRenderer.songDuration || currentSong.duration;
        updateTempoControlsState(true);
        isPrepared = true;
        pauseOffset = 0;
        logProgramAssignments("after load");

        currentSong.displayName = displayName;
        setSongTitle(displayName);
        songDisplay.value = summarizeMidi(parsedSong);
        songPanel.classList.remove("is-hidden");
        controlsPanel.classList.remove("is-hidden");
        instrumentPanel.classList.remove("is-hidden");
        renderInstrumentMenus();
        resetTransportUi();
        enableTransportButtons(true);
        setScaleControlsEnabled(true);
        updateModeStatus();
        updateTransposeStatus();
        setStatus("Loaded. Press Play to start.", false);
    } catch (error) {
        if (selectionToken !== latestSelectionToken) {
            return;
        }
        console.error(error);
        setStatus(error && error.message ? error.message : "Failed to load MIDI file.", true);
        handleLoadFailure();
    }
}

async function handleMidiSelection(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
        return;
    }

    setStatus(`Reading ${file.name}...`, false);
    try {
        const buffer = await file.arrayBuffer();
        await loadMidiFromBuffer(buffer, file.name);
    } catch (error) {
        console.error(error);
        setStatus(error && error.message ? error.message : "Failed to load MIDI file.", true);
        handleLoadFailure();
    }
}

function parseMidiBuffer(arrayBuffer) {
    if (midiWorker) {
        return parseMidiWithWorker(arrayBuffer).catch((error) => {
            console.warn("Worker parsing failed. Retrying on main thread.", error);
            try {
                midiWorker.terminate();
            } catch (terminateError) {
                console.warn("Unable to terminate failing MIDI worker:", terminateError);
            }
            midiWorker = null;
            return parseMidiOnMainThread(arrayBuffer);
        });
    }
    return parseMidiOnMainThread(arrayBuffer);
}

function parseMidiWithWorker(arrayBuffer) {
    return new Promise((resolve, reject) => {
        if (!midiWorker) {
            reject(new Error("Background MIDI parser is unavailable."));
            return;
        }
        const id = ++workerRequestId;
        workerRequests.set(id, { resolve, reject });
        try {
            // Send a copy of the buffer so the original remains available for fallback parsing.
            const workerBuffer = arrayBuffer.slice(0);
            midiWorker.postMessage({ id, buffer: workerBuffer }, [workerBuffer]);
        } catch (error) {
            workerRequests.delete(id);
            reject(error);
        }
    });
}

async function parseMidiOnMainThread(arrayBuffer) {
    if (typeof Midi === "undefined") {
        throw new Error("The @tonejs/midi script failed to load.");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    const midi = new Midi(arrayBuffer);
    return normalizeMidiData(midi);
}

function normalizeMidiData(midi) {
    let derivedDuration = 0;
    const tracks = midi.tracks.map((track, index) => {
        const instrument = track.instrument || {};
        const channel = Number.isFinite(track.channel)
            ? track.channel
            : (Number.isFinite(instrument.channel) ? instrument.channel : index);

        const notes = track.notes
            .filter(note => Number.isFinite(note.time) && Number.isFinite(note.duration))
            .map(note => ({
                time: note.time,
                duration: note.duration,
                midi: note.midi,
                velocity: Number.isFinite(note.velocity) ? note.velocity : 0.8
            }));

        if (notes.length) {
            const lastEvent = notes[notes.length - 1];
            derivedDuration = Math.max(derivedDuration, lastEvent.time + lastEvent.duration);
        }

        return {
            index,
            name: track.name && track.name.trim() ? track.name.trim() : `Track ${index + 1}`,
            program: clampProgram(instrument.number),
            instrumentName: instrument.name || "",
            channel,
            notes
        };
    }).filter(track => track.notes.length > 0);

    const tempos = Array.isArray(midi.header?.tempos)
        ? midi.header.tempos.map((tempo) => ({
            bpm: Number.isFinite(tempo.bpm) ? tempo.bpm : null,
            time: Number.isFinite(tempo.time) ? tempo.time : null
        })).filter(item => item.bpm !== null && item.time !== null)
        : [];

    const songDuration = Number.isFinite(midi.duration) && midi.duration > 0
        ? midi.duration
        : derivedDuration;

    return {
        name: midi.name || "",
        duration: songDuration,
        tracks,
        tempos
    };
}

function renderInstrumentMenus() {
    instrumentGrid.innerHTML = "";
    trackVisualState.clear();
    playableTracks.forEach(track => {
        const card = document.createElement("div");
        card.className = "instrument-card";

        const label = document.createElement("div");
        label.className = "instrument-card__label";
        const channel = track.channelNumber ?? track.channel ?? trackChannels.get(track.slot) ?? 0;
        const trackLabelNumber = Number.isFinite(track.index) ? (track.index + 1) : (track.slot + 1);
        label.textContent = `${track.name} (Track ${trackLabelNumber}, Ch ${channel + 1})`;

        const meter = document.createElement("div");
        meter.className = "instrument-meter";
        const meterFill = document.createElement("div");
        meterFill.className = "instrument-meter__fill";
        meter.appendChild(meterFill);

        const current = document.createElement("div");
        current.className = "instrument-card__name";
        current.textContent = getInstrumentName(trackPrograms.get(track.slot));

        const select = document.createElement("select");
        GM_INSTRUMENTS.forEach((instrumentName, programNumber) => {
            const option = document.createElement("option");
            option.value = programNumber;
            option.textContent = `${programNumber.toString().padStart(3, "0")} – ${instrumentName}`;
            select.appendChild(option);
        });
        select.value = trackPrograms.get(track.slot);
        select.addEventListener("change", () => {
            const program = clampProgram(Number(select.value));
            trackPrograms.set(track.slot, program);
            current.textContent = getInstrumentName(program);
            const channelNumber = trackChannels.get(track.slot);
            if (channelNumber !== undefined) {
                queueProgramChange(track.slot, channelNumber, program);
            }
            setStatus(`Instrument preference stored for ${track.name}`, false);
            if (pendingArrangementRefresh) {
                clearTimeout(pendingArrangementRefresh);
                pendingArrangementRefresh = null;
            }
            applyAllProgramOverrides();
        });

        trackVisualState.set(track.slot, {
            notes: Array.isArray(track.notes) ? track.notes : [],
            element: card,
            meterFill,
            level: 0
        });

        card.appendChild(label);
        card.appendChild(meter);
        card.appendChild(current);
        card.appendChild(select);
        instrumentGrid.appendChild(card);
    });
}

async function play() {
    if (!currentSong) {
        return;
    }
    isUserScrubbing = false;
    console.log("[Play] Clicked");
    try {
        await ensureAudioReady();
        console.log("[Play] Audio context state:", getAudioContext().state);
    } catch (error) {
        console.error("Unable to start audio context:", error);
        setStatus("Browser blocked audio playback. Click the page and try again.", true);
        return;
    }

    console.log("[Play] isPrepared:", isPrepared);
    if (!isPrepared) {
        setStatus("Load a MIDI file to begin.", true);
        return;
    }

    if (isPlaying) {
        return;
    }

    const offsetToUse = pauseOffset;
    applyAllProgramOverrides();
    const scheduled = await scheduleNotesFromOffset(offsetToUse);
    if (!scheduled) {
        console.warn("[Play] No schedulable notes");
        return;
    }
    isPlaying = true;
    pauseOffset = 0;
    startProgressUpdates();
    setStatus("Playing...", false);
}

function pausePlayback() {
    if (!isPlaying) {
        return;
    }
    fluidRenderer.pause();
    const ctx = audioContext;
    const duration = currentSong?.duration || 0;
    const elapsed = ctx ? Math.max(0, ctx.currentTime - playbackStartTime) : pauseOffset;
    pauseOffset = Math.min(duration, elapsed);
    playbackStartTime = ctx ? ctx.currentTime - pauseOffset : 0;
    stopProgressUpdates(false);
    isPlaying = false;
    setStatus("Paused", false);
}

function stopPlayback(autoTriggered) {
    if (!currentSong) {
        return;
    }
    isPlaying = false;
    pauseOffset = 0;
    playbackStartTime = 0;
    isUserScrubbing = false;
    fluidRenderer.stop();
    fluidRenderer.reapplyTuning();
    applyTempoChange();
    stopProgressUpdates(true);
    resetTransportUi();
    if (recordingActive) {
        stopRecordingSession(true);
    }
    console.log(autoTriggered ? "[Play] Auto stop" : "[Play] Stop requested");
    setStatus(autoTriggered ? "Playback complete" : "Stopped", false);
}

function resetPlaybackState() {
    fluidRenderer.stop();
    stopProgressUpdates(true);
    isPlaying = false;
    pauseOffset = 0;
    isPrepared = false;
    lastProgressUpdateTime = 0;
}

function enableTransportButtons(enabled) {
    playButton.disabled = !enabled;
    pauseButton.disabled = !enabled;
    stopButton.disabled = !enabled;
    if (recordButton) {
        recordButton.disabled = !enabled;
    }
}

function resetTransportUi() {
    updateProgressUI(0, { overrideScrubLock: true });
}

function startProgressUpdates() {
    cancelAnimationFrame(progressFrame);
    lastProgressUpdateTime = 0;
    const update = () => {
        if (!currentSong) {
            return;
        }
        const now = performance.now();
        if (now - lastProgressUpdateTime >= PROGRESS_MIN_INTERVAL_MS) {
            lastProgressUpdateTime = now;
            const duration = currentSong.duration || 0;
            const elapsed = isPlaying
                ? getElapsedPlaybackSeconds()
                : pauseOffset;
            updateProgressUI(Math.min(duration, elapsed));
        }
        if (isPlaying) {
            progressFrame = requestAnimationFrame(update);
        }
    };
    update();
}

function stopProgressUpdates(resetToStart) {
    cancelAnimationFrame(progressFrame);
    progressFrame = null;
    updateProgressUI(resetToStart ? 0 : pauseOffset, {
        overrideScrubLock: Boolean(resetToStart)
    });
}

function updateProgressUI(seconds, options = {}) {
    const { overrideScrubLock = false } = options;
    const duration = currentSong?.duration || 0;
    progressBar.min = "0";
    progressBar.max = duration.toString();
    progressBar.step = Math.max(0.01, duration / 2000 || 0.01).toString();
    if (overrideScrubLock) {
        isUserScrubbing = false;
    }
    if (!isUserScrubbing) {
        suppressProgressEvents = true;
        progressBar.value = Number.isFinite(seconds) ? seconds.toString() : "0";
        suppressProgressEvents = false;
    }
    progressTime.textContent = `${formatDuration(seconds)} / ${formatDuration(duration)}`;
    updateTrackActivityVisuals(seconds);
}

function getElapsedPlaybackSeconds() {
    if (!currentSong || !audioContext || !Number.isFinite(playbackStartTime)) {
        return 0;
    }
    const elapsed = Math.max(0, audioContext.currentTime - playbackStartTime);
    const duration = currentSong.duration || 0;
    return Math.min(duration, elapsed);
}

function setStatus(message, isError) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", Boolean(isError));
}

function setStatusProgress(fraction) {
    if (!statusProgressBar) {
        return;
    }
    const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
    statusProgressBar.style.width = `${(clamped * 100).toFixed(0)}%`;
}

function setLoadButtonEnabled(enabled) {
    if (!fileInput || !loadButton) {
        return;
    }
    fileInput.disabled = !enabled;
    loadButton.classList.toggle("is-disabled", !enabled);
    loadButton.setAttribute("aria-disabled", enabled ? "false" : "true");
}

setLoadButtonEnabled(false);
setStatus("Click Enable Audio to begin.", false);
setStatusProgress(0);

function setSampleButtonEnabled(enabled) {
    if (!loadSampleButton) {
        return;
    }
    const allow = enabled && sampleMidiMap.size > 0;
    loadSampleButton.classList.toggle("is-disabled", !allow);
    loadSampleButton.setAttribute("aria-disabled", allow ? "false" : "true");
    loadSampleButton.disabled = !allow;
    if (sampleMidiSelect) {
        sampleMidiSelect.disabled = !allow;
    }
}

setSampleButtonEnabled(false);

async function loadSampleManifest() {
    if (sampleManifestLoaded) return;
    try {
        const response = await fetch(SAMPLE_MANIFEST_URL, { cache: "no-cache" });
        if (!response.ok) {
            throw new Error(`Manifest fetch failed (${response.status})`);
        }
        const data = await response.json();
        const resolved = (Array.isArray(data) ? data : []).map(item => ({
            ...item,
            url: resolveMidiAssetUrl(item?.url)
        }));
        populateSampleFolderSelect(resolved);
        populateSampleMidiSelect(resolved);
        sampleManifestLoaded = true;
        setSampleButtonEnabled(audioReady);
        if (sampleFolderSelect) {
            sampleFolderSelect.addEventListener("change", () => {
                const selected = sampleFolderSelect.value;
                const filtered = resolved.filter(item => {
                    const itemFolder = item.folder === "." ? "" : (item.folder || "");
                    if (selected === "__all__") return true;
                    if (selected === "__root__") return !itemFolder;
                    return itemFolder === selected;
                });
                populateSampleMidiSelect(filtered);
            });
        }
    } catch (error) {
        console.warn("Unable to load MIDI manifest:", error);
        setStatus("Included MIDI list unavailable.", true);
    }
}

function populateSampleFolderSelect(manifest) {
    if (!sampleFolderSelect) return;
    const folderSet = new Set();
    manifest.forEach(item => {
        const folder = item.folder === "." ? "" : (item.folder || "");
        folderSet.add(folder);
    });
    const folders = Array.from(folderSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    sampleFolderSelect.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "__all__";
    allOption.textContent = "All folders";
    sampleFolderSelect.appendChild(allOption);
    folders.forEach(folder => {
        const opt = document.createElement("option");
        opt.value = folder || "__root__";
        opt.textContent = folder ? folder.replace(/\//g, " / ") : "Root";
        sampleFolderSelect.appendChild(opt);
    });
    sampleFolderSelect.value = "__all__";
}

function populateSampleMidiSelect(manifest = SAMPLE_MIDIS) {
    if (!sampleMidiSelect) return;
    sampleMidiSelect.innerHTML = "";
    sampleMidiMap.clear();
    let firstValue = "";
    manifest.forEach((item) => {
        if (!item?.url || !item?.name) return;
        sampleMidiMap.set(item.id || item.url, item);
        const option = document.createElement("option");
        option.value = item.id || item.url;
        option.textContent = item.name;
        sampleMidiSelect.appendChild(option);
        if (!firstValue) {
            firstValue = option.value;
        }
    });
    if (firstValue) {
        sampleMidiSelect.value = firstValue;
    }
}

function setHelpVisibility(show, markSeen) {
    if (!helpBubbles) return;
    helpBubbles.classList.toggle("is-hidden", !show);
    helpBubbles.classList.toggle("is-shown", show);
    if (markSeen) {
        try {
            localStorage.setItem(HELP_SEEN_KEY, "1");
        } catch (_) {
            // ignore
        }
    }
}

function setInfoVisibility(show) {
    if (!infoBubbles) return;
    infoBubbles.classList.toggle("is-hidden", !show);
    infoBubbles.classList.toggle("is-shown", show);
}

// Show tips on first visit.
try {
    const seen = localStorage.getItem(HELP_SEEN_KEY);
    if (!seen) {
        setTimeout(() => setHelpVisibility(true, true), 300);
    }
} catch (_) {
    // ignore
}

async function loadSampleByRecord(sample) {
    setStatus(`Loading ${sample.name}...`, false);
    try {
        const response = await fetch(sample.url);
        if (!response.ok) {
            throw new Error(`Unable to load ${sample.name}.`);
        }
        const buffer = await response.arrayBuffer();
        await loadMidiFromBuffer(buffer, sample.name);
    } catch (error) {
        console.error(error);
        setStatus(error?.message || "Failed to load sample MIDI.", true);
    }
}

function showSampleModal() {
    if (!sampleModal) return;
    sampleModal.classList.remove("is-hidden");
    if (sampleMidiSelect && !sampleMidiSelect.disabled) {
        sampleMidiSelect.focus();
    }
}

function hideSampleModal() {
    if (!sampleModal) return;
    sampleModal.classList.add("is-hidden");
}

function setAudioEnabledState(enabled) {
    if (!enableAudioButton) {
        return;
    }
    enableAudioButton.classList.toggle("is-on", Boolean(enabled));
    enableAudioButton.setAttribute("aria-pressed", enabled ? "true" : "false");
    if (enabled) {
        enableAudioButton.title = "Audio enabled";
    }
}

function queueProgramChange(trackIndex, channel, program) {
    if (!Number.isFinite(channel)) {
        return;
    }
    pendingProgramUpdates.set(trackIndex, { channel, program });
    const snapshotEntry = channelAssignmentsSnapshot.find(item => item.trackIndex === trackIndex);
    if (snapshotEntry) {
        snapshotEntry.program = program;
    }
    if (!programFlushHandle) {
        programFlushHandle = requestAnimationFrame(() => {
            programFlushHandle = null;
            pendingProgramUpdates.forEach(({ channel: queuedChannel, program: queuedProgram }) => {
                fluidRenderer.programChange(queuedChannel, queuedProgram);
            });
            pendingProgramUpdates.clear();
        });
    }
}

function handleLoadFailure() {
    currentSong = null;
    playableTracks = [];
    trackPrograms.clear();
    trackChannels.clear();
    trackVisualState.clear();
    pauseOffset = 0;
    isPlaying = false;
    isPrepared = false;
    baseTempoBpm = DEFAULT_TEMPO_BPM;
    currentTempoBpm = DEFAULT_TEMPO_BPM;
    currentSongBaseDuration = 0;
    updateTempoControlsState(false);
    stopProgressUpdates(true);
    fluidRenderer.stop();
    songPanel.classList.add("is-hidden");
    controlsPanel.classList.add("is-hidden");
    instrumentPanel.classList.add("is-hidden");
    enableTransportButtons(false);
    songDisplay.value = "";
    setSongTitle("");
    instrumentGrid.innerHTML = "";
    setTuningStatus("12-TET active", false);
    setScaleControlsEnabled(false);
}

function setSongTitle(titleText) {
    if (!songTitle) return;
    const text = titleText || "";
    songTitle.textContent = text;
    songTitle.classList.toggle("is-hidden", text.length === 0);
}

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function ensureAudioReady() {
    const ctx = getAudioContext();
    if (audioReady && ctx.state === "running") {
        return fluidRenderer.ensureInitialized(ctx).then(() => {
            setStatusProgress(1);
            setLoadButtonEnabled(true);
            setSampleButtonEnabled(true);
        });
    }
    setStatus("Preparing audio...", false);
    setStatusProgress(0.35);
    const resumePromises = [ctx.resume()];
    return Promise.all(resumePromises).then(() => {
        audioReady = true;
        setAudioEnabledState(true);
        return fluidRenderer.ensureInitialized(ctx);
    }).then(() => {
        setStatusProgress(1);
        setLoadButtonEnabled(true);
        setSampleButtonEnabled(true);
    });
}

function playConfirmationClick() {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.frequency.value = 880;
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.25);
}

async function scheduleNotesFromOffset(offsetSeconds) {
    try {
        await fluidRenderer.playFrom(offsetSeconds);
        const ctx = getAudioContext();
        playbackStartTime = ctx.currentTime - offsetSeconds;
        logProgramAssignments(`playFrom offset ${offsetSeconds.toFixed(2)}`);
        return true;
    } catch (error) {
        console.error(error);
        setStatus(error.message || "Unable to start playback.", true);
        return false;
    }
}

function applyActiveTuning() {
    if (!fluidRenderer) {
        return;
    }
    const baseTable = Array.isArray(activeTuning.table) ? activeTuning.table : equalTemperamentTable;
    const effectiveTable = buildEffectiveTuningTable(baseTable, currentMode, currentTranspose);
    fluidRenderer.applyTuning(effectiveTable, activeTuning.name || "Custom Tuning");
    const statusLabel = activeTuning.id === DEFAULT_TUNING_ID ? "12-TET" : (activeTuning.name || "Custom");
    setTuningStatus(`${statusLabel} (${currentMode}, ${currentTranspose >= 0 ? "+" : ""}${currentTranspose})`, false);
    if (tuningSelect && tuningSelect.value !== activeTuning.id) {
        tuningSelect.value = activeTuning.id;
    }
}

function applyTransposeChange(value) {
    const clamped = clampTransposeValue(value);
    if (clamped === currentTranspose) {
        transposeInput.value = currentTranspose.toString();
        return;
    }
    currentTranspose = clamped;
    if (transposeInput) {
        transposeInput.value = clamped.toString();
    }
    updateTransposeStatus();
    applyActiveTuning();
    setStatus(`Transpose applied: ${clamped >= 0 ? "+" : ""}${clamped}`, false);
}

function updateModeStatus() {
    if (modeStatus) {
        modeStatus.textContent = `Mode: ${currentMode}`;
    }
    if (modeSelect && modeSelect.value !== currentMode) {
        modeSelect.value = currentMode;
    }
}

function updateTransposeStatus() {
    if (transposeStatus) {
        const sign = currentTranspose >= 0 ? "+" : "";
        transposeStatus.textContent = `${sign}${currentTranspose} semitone${Math.abs(currentTranspose) === 1 ? "" : "s"}`;
    }
}

function setScaleControlsEnabled(enabled) {
    if (modeSelect) {
        modeSelect.disabled = !enabled;
    }
    if (transposeInput) {
        transposeInput.disabled = !enabled;
    }
    if (transposeDecrement) {
        transposeDecrement.disabled = !enabled;
    }
    if (transposeIncrement) {
        transposeIncrement.disabled = !enabled;
    }
}

function clampTransposeValue(value) {
    const min = TRANSPOSE_LIMITS.min;
    const max = TRANSPOSE_LIMITS.max;
    if (!Number.isFinite(value)) {
        return currentTranspose;
    }
    return Math.max(min, Math.min(max, Math.round(value)));
}

function clampMidiValue(value) {
    return Math.max(0, Math.min(127, Math.round(value)));
}

function applyModeToMidiValue(midiValue, modeName) {
    const adjustments = MODE_ADJUSTMENTS[modeName] || MODE_ADJUSTMENTS[DEFAULT_MODE];
    let pitchClass = ((midiValue % 12) + 12) % 12;
    let octave = Math.floor(midiValue / 12);
    const adjustment = adjustments[pitchClass] ?? 0;
    pitchClass += adjustment;
    while (pitchClass < 0) {
        pitchClass += 12;
        octave -= 1;
    }
    while (pitchClass >= 12) {
        pitchClass -= 12;
        octave += 1;
    }
    return octave * 12 + pitchClass;
}

function capturePlaybackState() {
    if (!currentSong) {
        return { wasPlaying: false, resumePoint: 0 };
    }
    const wasPlaying = isPlaying;
    const resumePoint = wasPlaying ? fluidRenderer.pause() : pauseOffset;
    if (!wasPlaying) {
        fluidRenderer.silence();
    }
    isPlaying = false;
    pauseOffset = resumePoint;
    stopProgressUpdates(false);
    updateProgressUI(resumePoint, { overrideScrubLock: true });
    return { wasPlaying, resumePoint };
}

async function rebuildTransformedPlayback(message) {
    if (!baseMidiBuffer || !channelAssignmentsSnapshot.length) {
        return;
    }
    const seekOffset = isPlaying ? getElapsedPlaybackSeconds() : pauseOffset;
    setScaleControlsEnabled(false);
    setStatus("Updating arrangement...", false);
    const state = capturePlaybackState();
    try {
        const playableBuffer = await buildTransformedMidiBuffer(baseMidiBuffer);
        transformedMidiBuffer = playableBuffer.slice(0);
        await fluidRenderer.loadMidi(playableBuffer, currentSongBaseDuration, channelAssignmentsSnapshot, tempoSnapshot);
        fluidRenderer.setLoopEnabled(loopToggle.checked);
        applyActiveTuning();
        applyAllProgramOverrides();
        isPrepared = true;

        if (state.wasPlaying) {
            // For active playback, restart the FluidSynth player directly at the same offset.
            await fluidRenderer.playFrom(seekOffset);
            const ctx = getAudioContext();
            playbackStartTime = ctx.currentTime - seekOffset;
            isPlaying = true;
            pauseOffset = 0;
            updateProgressUI(seekOffset, { overrideScrubLock: true });
            startProgressUpdates();
        } else {
            // When paused, just seek and keep transport paused.
            await fluidRenderer.seek(seekOffset);
            pauseOffset = seekOffset;
            updateProgressUI(seekOffset, { overrideScrubLock: true });
            logProgramAssignments("post-seek (paused)");
        }
        setStatus(message || "Arrangement updated.", false);
    } catch (error) {
        console.error("Failed to rebuild arrangement:", error);
        setStatus("Unable to update arrangement.", true);
    } finally {
        setScaleControlsEnabled(Boolean(currentSong));
    }
}

function scheduleArrangementRefresh(label) {
    if (pendingArrangementRefresh) {
        return;
    }
    pendingArrangementRefresh = setTimeout(() => {
        pendingArrangementRefresh = null;
        rebuildTransformedPlayback(label || "Arrangement updated");
    }, 50);
}

async function sanitizeMidiForPlayback(arrayBuffer) {
    if (typeof Midi === "undefined") {
        return arrayBuffer;
    }
    try {
        const midi = new Midi(arrayBuffer);
        midi.tracks = midi.tracks.filter(track => Array.isArray(track.notes) && track.notes.length > 0);
        midi.tracks.forEach(stripProgramAndBankEvents);
        const sanitized = midi.toArray();
        try {
            // Double-check no program changes remain after serialization.
            const verify = new Midi(sanitized);
            verify.tracks = verify.tracks.filter(track => Array.isArray(track.notes) && track.notes.length > 0);
            verify.tracks.forEach(stripProgramAndBankEvents);
            return verify.toArray();
        } catch {
            return sanitized;
        }
    } catch (error) {
        console.warn("Failed to sanitize MIDI buffer:", error);
        return arrayBuffer;
    }
}

async function buildTransformedMidiBuffer(arrayBuffer) {
    if (typeof Midi === "undefined") {
        return arrayBuffer.slice(0);
    }
    try {
        const midi = new Midi(arrayBuffer);
        midi.tracks.forEach((track, idx) => {
            stripProgramAndBankEvents(track);
            const assignment = channelAssignmentsSnapshot[idx];
            const slot = assignment?.trackIndex ?? idx;
            const assignedChannel = assignment?.channel ?? trackChannels.get(slot) ?? (slot % 16);
            track.channel = assignedChannel;
            if (track.instrument && typeof track.instrument === "object") {
                track.instrument.channel = assignedChannel;
                const programOverride = trackPrograms.get(slot);
                if (Number.isFinite(programOverride)) {
                    track.instrument.number = programOverride;
                }
            }
            const notes = Array.isArray(track.notes) ? track.notes : [];
            notes.forEach(note => {
                if (!Number.isFinite(note?.midi)) {
                    return;
                }
                const remapped = clampMidiValue(applyModeToMidiValue(note.midi + currentTranspose, currentMode));
                note.midi = remapped;
                note.channel = assignedChannel;
            });
            if (Array.isArray(track.events)) {
                track.events.forEach(event => {
                    if (!event || typeof event.type !== "string") {
                        return;
                    }
                    const type = event.type.toLowerCase();
                    event.channel = assignedChannel;
                    if (type === "noteon" || type === "noteoff") {
                        const original = Number.isFinite(event.noteNumber) ? event.noteNumber : event.midi;
                        if (Number.isFinite(original)) {
                            const remapped = clampMidiValue(applyModeToMidiValue(original + currentTranspose, currentMode));
                            event.noteNumber = remapped;
                            event.midi = remapped;
                        }
                    }
                });
            }
        });
        return midi.toArray();
    } catch (error) {
        console.warn("Failed to transform MIDI buffer:", error);
        return arrayBuffer.slice(0);
    }
}

function stripProgramAndBankEvents(track) {
    if (!track) {
        return;
    }
    if (track.instrument && typeof track.instrument === "object") {
        track.instrument.number = 0;
        track.instrument.name = track.instrument.name || "";
        track.instrument.family = track.instrument.family || "";
    }
    if (Number.isFinite(track.program)) {
        track.program = 0;
    }
    if (Array.isArray(track.events)) {
        track.events = track.events.filter(event => {
            if (!event || typeof event.type !== "string") {
                return true;
            }
            const type = event.type.toLowerCase();
            const subtype = (event.subtype || event.subType || "").toLowerCase();
            if (type === "programchange" || type === "program_change" || subtype === "programchange" || Number.isFinite(event.programNumber)) {
                return false;
            }
            const isController = type === "controller"
                || type === "controlchange"
                || type === "control_change"
                || subtype === "controller"
                || subtype === "controlchange"
                || subtype === "control_change";
            if (isController) {
                const controller = [event.controllerType, event.controllerNumber, event.controller]
                    .find(value => Number.isFinite(value));
                if (controller === 0 || controller === 32) {
                    return false;
                }
            }
            return true;
        });
    }
    if (track.controlChanges && typeof track.controlChanges === "object") {
        ["0", "32"].forEach(key => {
            if (track.controlChanges[key]) {
                track.controlChanges[key] = [];
            }
        });
    }
    if (Array.isArray(track.programChanges)) {
        track.programChanges = [];
    }
}

async function loadScalaManifest() {
    if (!tuningSelect) {
        return;
    }
    const sources = getScalaSources();
    let lastError = null;
    setTuningStatus("Loading tuning list…", false);
    tuningSelect.disabled = true;
    if (tuningResetButton) tuningResetButton.disabled = true;
    for (const source of sources) {
        try {
            console.log("[Scala] Loading manifest", source.manifestUrl);
            const response = await fetch(source.manifestUrl);
            if (!response.ok) {
                throw new Error("Unable to load tuning manifest.");
            }
            const data = await response.json();
            const defaultPrefix = source?.label === "lite"
                ? DEFAULT_CONFIG.scalaLiteBaseUrl
                : DEFAULT_CONFIG.scalaFullBaseUrl;
            tuningManifest = (Array.isArray(data) ? data : []).map(entry => {
                const pathStr = entry.path || "";
                const resolvedPath = resolveAssetPath(pathStr, source.rootPrefix, defaultPrefix);
                const parts = pathStr.split("/");
                parts.pop();
                let computedFolder = parts.join("/");
                if (defaultPrefix && computedFolder.startsWith(defaultPrefix)) {
                    computedFolder = computedFolder.slice(defaultPrefix.length);
                }
                const folder = entry.folder ?? computedFolder;
                return { ...entry, path: resolvedPath, folder };
            });
            activeScalaSource = source;
            populateTuningFolderSelect();
            populateTuningOptions();
            const sourceLabel = source?.label ? ` (${source.label} Scala)` : "";
            setTuningStatus(`Choose a tuning or keep 12-TET.${sourceLabel}`, false);
            console.log("[Scala] Active source", source);
            tuningSelect.disabled = false;
            if (tuningFolderSelect) tuningFolderSelect.disabled = false;
            // Keep reset button disabled until a non-default tuning is selected
            if (tuningResetButton) tuningResetButton.disabled = true;
            return;
        } catch (error) {
            console.warn("Failed to load tuning source", source?.label || source?.manifestUrl, error);
            lastError = error;
        }
    }
    console.error("Failed to load tuning manifest:", lastError);
    setTuningStatus("Unable to load tuning list.", true);
    tuningSelect.disabled = true;
    if (tuningResetButton) tuningResetButton.disabled = true;
}

function populateTuningFolderSelect() {
    if (!tuningFolderSelect) return;
    const folderSet = new Set();
    tuningManifest.forEach(entry => folderSet.add(entry.folder || ""));
    const folders = Array.from(folderSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    tuningFolderSelect.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "__all__";
    allOpt.textContent = "All folders";
    tuningFolderSelect.appendChild(allOpt);
    folders.forEach(folder => {
        const opt = document.createElement("option");
        opt.value = folder || "__root__";
        let display = folder ? folder.replace(/\//g, " / ") : "Root";
        const activePrefix = getScalaRootPrefix();
        if (folder && activePrefix && folder.startsWith(activePrefix)) {
            const trimmed = folder.slice(activePrefix.length);
            display = trimmed ? trimmed.replace(/\//g, " / ") : "Root";
        }
        opt.textContent = display;
        tuningFolderSelect.appendChild(opt);
    });
    tuningFolderSelect.value = "__all__";
}

function populateTuningOptions() {
    filterTuningsByFolder(tuningFolderSelect?.value || "__all__");
}

function filterTuningsByFolder(folderValue) {
    if (!tuningSelect) return;
    const existing = tuningSelect.querySelectorAll("option[value]:not([value='__equal__'])");
    existing.forEach(option => option.remove());
    const fragment = document.createDocumentFragment();
    const selectedValue = tuningSelect.value;
    let nextSelection = selectedValue;
    tuningManifest.forEach(entry => {
        if (!entry?.path) {
            return;
        }
        const entryFolder = entry.folder || "";
        if (folderValue && folderValue !== "__all__") {
            if (folderValue === "__root__" && entryFolder) return;
            if (folderValue !== "__root__" && entryFolder !== folderValue) return;
        }
        const option = document.createElement("option");
        option.value = entry.path;
        option.textContent = entry.name || entry.path.split("/").pop();
        fragment.appendChild(option);
        if (selectedValue === entry.path) {
            nextSelection = selectedValue;
        }
    });
    tuningSelect.appendChild(fragment);
    if (nextSelection && tuningSelect.querySelector(`option[value="${nextSelection}"]`)) {
        tuningSelect.value = nextSelection;
    } else {
        tuningSelect.value = "__equal__";
        handleTuningSelection("__equal__");
    }
}

async function handleTuningSelection(value) {
    if (!value || value === DEFAULT_TUNING_ID) {
        activeTuning = {
            id: DEFAULT_TUNING_ID,
            name: "12-TET",
            table: equalTemperamentTable
        };
        applyActiveTuning();
        if (tuningResetButton) {
            tuningResetButton.disabled = true;
        }
        return;
    }
    setTuningStatus("Loading tuning…", false);
    try {
        const tuning = await fetchScalaTuning(value);
        activeTuning = tuning;
        applyActiveTuning();
        if (tuningResetButton) {
            tuningResetButton.disabled = false;
        }
    } catch (error) {
        console.error("Failed to load tuning:", error);
        setTuningStatus(error && error.message ? error.message : "Failed to load tuning.", true);
        if (tuningSelect) {
            tuningSelect.value = activeTuning.id;
        }
        if (tuningResetButton && activeTuning.id === DEFAULT_TUNING_ID) {
            tuningResetButton.disabled = true;
        }
    }
}

async function fetchScalaTuning(path) {
    if (tuningCache.has(path)) {
        return tuningCache.get(path);
    }
    const response = await fetch(encodeURI(path));
    if (!response.ok) {
        throw new Error(`Unable to load ${path}`);
    }
    const text = await response.text();
    const parsed = parseScala(text);
    const table = buildTuningTable(parsed.cents);
    const tuning = {
        id: path,
        name: parsed.name || parsed.description || path.split("/").pop(),
        table
    };
    tuningCache.set(path, tuning);
    return tuning;
}

function getScalaRootPrefix() {
    return activeScalaSource?.rootPrefix || normalizeBaseUrl(DEFAULT_CONFIG.scalaFullBaseUrl, DEFAULT_CONFIG.scalaFullBaseUrl);
}

function initializeScalaPreference() {
    const stored = (() => {
        try {
            return localStorage.getItem(SCALA_PREF_KEY);
        } catch (_) {
            return null;
        }
    })();
    scalaPreference = stored === "full" ? "full" : "lite";
    updateScalaToggleUI();
    if (tuningSourceToggle) {
        tuningSourceToggle.addEventListener("click", () => {
            setScalaPreference(scalaPreference === "full" ? "lite" : "full");
            loadScalaManifest();
        });
    }
}

function setScalaPreference(pref) {
    scalaPreference = pref === "full" ? "full" : "lite";
    try {
        localStorage.setItem(SCALA_PREF_KEY, scalaPreference);
    } catch (_) {
        // ignore storage failures
    }
    updateScalaToggleUI();
}

function updateScalaToggleUI() {
    if (!tuningSourceToggle) return;
    const isFull = scalaPreference === "full";
    tuningSourceToggle.textContent = isFull ? "Switch to Lite Archive" : "Switch to Full Archive";
    tuningSourceToggle.setAttribute("aria-pressed", isFull ? "true" : "false");
}

function getScalaSources() {
    const base = Array.isArray(SCALA_SOURCES) ? [...SCALA_SOURCES] : [];
    if (!base.length) {
        return [];
    }
    const lite = base.find(src => src.label === "lite");
    const full = base.find(src => src.label === "full");
    const others = base.filter(src => src.label !== "lite" && src.label !== "full");
    const ordered = [];
    if (scalaPreference === "full") {
        if (full) ordered.push(full);
        ordered.push(...others);
        if (lite) ordered.push(lite);
    } else {
        if (lite) ordered.push(lite);
        ordered.push(...others);
        if (full) ordered.push(full);
    }
    return ordered;
}

function parseScala(content) {
    if (content && content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
    }
    const lines = content.split(/\r\n|\n|\r/);
    let description = "";
    let idx = 0;
    while (idx < lines.length) {
        const trimmed = lines[idx].trim();
        if (!trimmed) {
            idx++;
            continue;
        }
        if (trimmed.startsWith("!")) {
            if (!description && trimmed.length > 1) {
                description = trimmed.slice(1).trim();
            }
            idx++;
            continue;
        }
        break;
    }
    if (idx >= lines.length) {
        throw new Error("Invalid Scala file: missing pitch count.");
    }
    let countLine = "";
    while (idx < lines.length && !countLine) {
        countLine = stripScalaComment(lines[idx++]);
        if (countLine && countLine.charCodeAt(0) === 0xfeff) {
            countLine = countLine.slice(1);
        }
        if (countLine && countLine.length && Number.isFinite(Number.parseInt(countLine, 10))) {
            break;
        }
        if (countLine) {
            description = description || countLine;
            countLine = "";
        }
    }
    const countToken = countLine ? countLine.split(/\s+/)[0] : "";
    const count = Number.parseInt(countToken, 10);
    if (!Number.isFinite(count) || count <= 0) {
        throw new Error("Invalid Scala file: pitch count is not valid.");
    }
    const cents = [];
    while (idx < lines.length && cents.length < count) {
        const raw = stripScalaComment(lines[idx++]);
        if (!raw) {
            continue;
        }
        const token = raw.split(/[\s;]+/)[0];
        if (!token) {
            continue;
        }
        cents.push(parseScalaValue(token));
    }
    if (!cents.length) {
        throw new Error("Scala file does not contain pitch data.");
    }
    if (cents[0] !== 0) {
        cents.unshift(0);
    }
    if (cents.length < 2 || cents[cents.length - 1] <= 0) {
        cents.push(1200);
    }
    return { cents, description };
}

function stripScalaComment(line) {
    if (typeof line !== "string") {
        return "";
    }
    let trimmed = line;
    const bangIndex = trimmed.indexOf("!");
    if (bangIndex >= 0) {
        trimmed = trimmed.slice(0, bangIndex);
    }
    const semicolonIndex = trimmed.indexOf(";");
    if (semicolonIndex >= 0) {
        trimmed = trimmed.slice(0, semicolonIndex);
    }
    return trimmed.trim();
}

function parseScalaValue(token) {
    if (!token) {
        return 0;
    }
    if (token.includes("/")) {
        const [numStr, denStr] = token.split("/");
        const num = Number(numStr);
        const den = Number(denStr);
        if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
            return 0;
        }
        return 1200 * Math.log2(num / den);
    }
    const value = Number(token);
    if (Number.isFinite(value)) {
        return value;
    }
    return 0;
}

function buildTuningTable(scaleCents) {
    if (!Array.isArray(scaleCents) || scaleCents.length < 2) {
        return buildEqualTemperamentTable(12);
    }
    const period = scaleCents[scaleCents.length - 1] || 1200;
    const degrees = scaleCents.length - 1;
    const table = new Array(128);
    for (let note = 0; note < 128; note++) {
        const relative = note - BASE_TUNING_NOTE;
        const octave = Math.floor(relative / degrees);
        const degree = ((relative % degrees) + degrees) % degrees;
        table[note] = (BASE_TUNING_NOTE * 100) + octave * period + scaleCents[degree];
    }
    return table;
}

function buildEqualTemperamentTable(divisions = 12) {
    const table = new Array(128);
    for (let note = 0; note < 128; note++) {
        table[note] = note * 100;
    }
    return table;
}

function buildEffectiveTuningTable(baseTable, modeName, transposeSemitones) {
    const table = new Array(128);
    const adjustments = MODE_ADJUSTMENTS[modeName] || MODE_ADJUSTMENTS[DEFAULT_MODE];
    const shiftCents = (Number.isFinite(transposeSemitones) ? transposeSemitones : 0) * 100;
    for (let note = 0; note < 128; note++) {
        const baseCents = baseTable[note] ?? note * 100;
        const pitchClass = ((note % 12) + 12) % 12;
        const modeShift = (adjustments[pitchClass] ?? 0) * 100;
        table[note] = baseCents + shiftCents + modeShift;
    }
    return table;
}

function setTuningStatus(message, isError) {
    if (!tuningStatus) {
        return;
    }
    tuningStatus.textContent = message;
    tuningStatus.classList.toggle("error", Boolean(isError));
}

function logActiveTuningTable(table) {
    if (!Array.isArray(table) || table.length < 128) {
        return;
    }
    const notes = [60, 62, 64, 67, 69]; // sample pitches (C4, D4, E4, G4, A4)
    notes.forEach(note => {
        const cents = table[note];
        const freq = 440 * Math.pow(2, (cents - 6900) / 1200);
        console.log(`[Tuning] Note ${note}: ${cents.toFixed(2)} cents -> ${freq.toFixed(3)} Hz (default ${ (440 * Math.pow(2, (note - 69) / 12)).toFixed(3)} Hz)`);
    });
}

function detectDefaultTempo(midiData) {
    const tempos = Array.isArray(midiData?.tempos) ? midiData.tempos : [];
    const primary = tempos.find(item => Number.isFinite(item?.bpm) && item.bpm > 0);
    return clampTempoValue(primary?.bpm ?? DEFAULT_TEMPO_BPM);
}

function clampTempoValue(value) {
    const numeric = Number.isFinite(value) ? value : DEFAULT_TEMPO_BPM;
    return Math.min(TEMPO_RANGE.max, Math.max(TEMPO_RANGE.min, Math.round(numeric)));
}

function refreshTempoDisplay() {
    if (!tempoSlider || !tempoValue) {
        return;
    }
    const bpm = clampTempoValue(currentTempoBpm || baseTempoBpm || DEFAULT_TEMPO_BPM);
    tempoSlider.min = TEMPO_RANGE.min.toString();
    tempoSlider.max = TEMPO_RANGE.max.toString();
    tempoSlider.step = "1";
    tempoSlider.value = bpm.toString();
    tempoValue.textContent = `${bpm} BPM`;
    if (tempoResetButton) {
        tempoResetButton.disabled = !customTempoActive;
    }
}

function updateTempoControlsState(enabled) {
    if (!tempoSlider) {
        return;
    }
    tempoSlider.disabled = !enabled;
    if (tempoResetButton) {
        tempoResetButton.disabled = !enabled || !customTempoActive;
    }
    refreshTempoDisplay();
}

function applyTempoChange() {
    const bpm = clampTempoValue(currentTempoBpm);
    currentTempoBpm = bpm;
    customTempoActive = Math.abs(currentTempoBpm - baseTempoBpm) > 0.1;
    refreshTempoDisplay();
    if (!fluidRenderer) {
        return;
    }
    fluidRenderer.setTempoBpm(bpm, baseTempoBpm, currentSongBaseDuration);
    if (currentSong) {
        currentSong.duration = fluidRenderer.songDuration || currentSong.duration;
        pauseOffset = Math.min(pauseOffset, currentSong.duration || pauseOffset);
        if (!isPlaying) {
            updateProgressUI(pauseOffset);
        }
    }
}

function trackHasActiveNote(notes, nowSeconds, timeScale) {
    if (!Array.isArray(notes) || !notes.length) {
        return false;
    }
    const ratio = Number.isFinite(timeScale) && timeScale > 0 ? timeScale : 1;
    let lo = 0;
    let hi = notes.length - 1;
    let idx = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const start = notes[mid].time * ratio;
        if (start <= nowSeconds) {
            idx = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return idx >= 0;
}

function updateTrackActivityVisuals(nowSeconds) {
    if (!currentSong || !trackVisualState.size) {
        return;
    }
    const baseDuration = currentSongBaseDuration || currentSong.duration || 1;
    const ratio = (currentSong.duration && baseDuration) ? (currentSong.duration / baseDuration) : 1;
    const windowStart = nowSeconds - METER_WINDOW_SECONDS * 0.6;
    const windowEnd = nowSeconds + METER_WINDOW_SECONDS * 0.4;
    trackVisualState.forEach((state) => {
        if (!state?.element || !state?.meterFill) {
            return;
        }
        const notes = state.notes || [];
        const densityInfo = computeNoteDensity(notes, windowStart, windowEnd, ratio);
        const targetLevel = densityInfo.level;
        state.level = smoothLevel(state.level || 0, targetLevel);
        const clamped = Math.max(0, Math.min(1, state.level));
        const visualLevel = Math.min(1, clamped * 0.85 + (densityInfo.overdrive ? 0.15 : 0));
        state.element.classList.toggle("is-active", visualLevel > 0.08);
        state.meterFill.style.transform = `scaleX(${visualLevel.toFixed(3)})`;
        state.meterFill.style.opacity = visualLevel > 0.05 ? "1" : "0.12";
    });
}

function computeNoteDensity(notes, start, end, timeScale) {
    if (!Array.isArray(notes) || !notes.length) {
        return { level: 0, overdrive: false };
    }
    const ratio = Number.isFinite(timeScale) && timeScale > 0 ? timeScale : 1;
    const windowStart = Math.max(0, start);
    const windowEnd = Math.max(windowStart, end);
    let count = 0;
    let velocitySum = 0;
    let maxVel = 0;
    for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        const noteStart = n.time * ratio;
        const noteEnd = (n.time + n.duration) * ratio;
        if (noteEnd < windowStart) {
            continue;
        }
        if (noteStart > windowEnd) {
            break;
        }
        count++;
        const vel = Number.isFinite(n.velocity) ? n.velocity : 0.8;
        velocitySum += vel;
        if (vel > maxVel) {
            maxVel = vel;
        }
    }
    const windowLength = Math.max(0.001, windowEnd - windowStart);
    const density = count / (windowLength * 10); // heuristic scale
    const avgVel = count ? velocitySum / count : 0;
    // Normal max around 0.75, allow overdrive if density is very high.
    const base = Math.min(0.75, (avgVel * 0.6) + (maxVel * 0.4));
    const overdrive = count >= 15 && maxVel >= 1;
    const burst = Math.min(1, density * 0.12);
    const level = Math.min(1, base + burst + (overdrive ? 0.25 : 0));
    return { level, overdrive };
}

function smoothLevel(previous, target) {
    const up = Math.max(target, previous * METER_ATTACK + target * (1 - METER_ATTACK));
    return up * METER_DECAY + target * (1 - METER_DECAY);
}

async function toggleRecording() {
    if (!recordButton || !fluidRenderer) {
        return;
    }
    if (recordingActive) {
        await stopRecordingSession(false);
        return;
    }
    await startRecordingSession();
}

async function startRecordingSession() {
    if (!currentSong || !isPrepared) {
        setStatus("Load a song before recording.", true);
        return;
    }

    const wantsCompressed = recordCompressedCheckbox?.checked;
    const candidates = [
        "audio/mpeg",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg"
    ];
    let targetMime = "audio/wav";
    let targetExt = "wav";
    let preflightCompressedSupported = false;
    if (wantsCompressed && window.MediaRecorder) {
        const supported = candidates.find(type => MediaRecorder.isTypeSupported(type));
        if (supported) {
            preflightCompressedSupported = true;
            targetMime = supported;
            if (supported.startsWith("audio/mpeg")) {
                targetExt = "mp3";
            } else if (supported.includes("webm")) {
                targetExt = "webm";
            } else if (supported.includes("ogg")) {
                targetExt = "ogg";
            }
        } else {
            console.warn("[Record] No compressed mime supported from candidates; falling back to WAV.");
        }
    } else if (wantsCompressed && !window.MediaRecorder) {
        console.warn("[Record] MediaRecorder not available; saving WAV.");
    }

    let pickedHandle = null;
    if (typeof showSaveFilePicker === "function") {
        try {
            const acceptMime = (targetMime || "audio/wav").split(";")[0] || "audio/wav";
            pickedHandle = await showSaveFilePicker({
                suggestedName: `mixdown.${targetExt}`,
                types: [
                    {
                        description: preflightCompressedSupported ? "Compressed audio" : "WAV audio",
                        accept: preflightCompressedSupported
                            ? { [acceptMime]: [`.${targetExt}`] }
                            : { "audio/wav": [".wav"] }
                    }
                ]
            });
        } catch (error) {
            console.warn("Save picker unavailable, will download after capture:", error);
            pickedHandle = null;
            setStatus("Recording will download after capture.", false);
        }
    }

    try {
        await ensureAudioReady();
    } catch (error) {
        console.error("Unable to start recording:", error);
        setStatus("Audio context is not ready.", true);
        return;
    }

    // Reset playback to start and disable loop for the capture.
    previousLoopState = loopToggle.checked;
    loopToggle.checked = false;
    fluidRenderer.setLoopEnabled(false);
    stopPlayback(false);
    pauseOffset = 0;
    isUserScrubbing = false;

    recorder = recorder || new PcmRecorder();
    recorder.start(getAudioContext().sampleRate);
    recordingActive = true;
    recordingHandle = pickedHandle;

    const recordDestination = getAudioContext().createMediaStreamDestination();
    fluidRenderer.attachRecorderDestination(recordDestination);
    setRecorderMediaStream(recordDestination.stream);

    // Optional compressed capture via MediaRecorder (smaller file).
    recorder.compressedChunks = [];
    recorder.compressedMime = "";
    recorder.desiredMime = targetMime;
    recorder.desiredExt = targetExt;
    recorder.compressedRecorder = null;
    recorder.compressedPromise = null;
    if (wantsCompressed && window.MediaRecorder && preflightCompressedSupported) {
        console.log("[Record] Checking MediaRecorder support:", candidates);
        const supported = targetMime;
        if (supported) {
            recorder.compressedMime = supported;
            recorder.desiredMime = supported;
            try {
                recorder.compressedPromise = new Promise((resolve, reject) => {
                    recorder._compressedResolve = resolve;
                    recorder._compressedReject = reject;
                });
                recorder.compressedRecorder = new MediaRecorder(recordDestination.stream, { mimeType: supported });
                recorder.compressedRecorder.ondataavailable = (evt) => {
                    if (evt.data && evt.data.size) {
                        recorder.compressedChunks.push(evt.data);
                    }
                };
                recorder.compressedRecorder.onstop = () => {
                    if (recorder._compressedResolve) {
                        recorder._compressedResolve(recorder.compressedChunks.slice());
                    }
                };
                recorder.compressedRecorder.onerror = (err) => {
                    if (recorder._compressedReject) {
                        recorder._compressedReject(err);
                    }
                };
                recorder.compressedRecorder.start();
                console.log("[Record] Using compressed mime:", supported);
                setStatus(`Recording (compressed: ${supported})...`, false);
            } catch (error) {
                console.warn("Compressed recording unavailable:", error);
                recorder.compressedRecorder = null;
                recorder.compressedChunks = [];
                recorder.compressedMime = "";
                recorder.compressedPromise = null;
            }
        } else {
            console.warn("[Record] No compressed mime supported from candidates; falling back to WAV.");
            setStatus("Recording (compressed option not supported in this browser). Saving WAV.", false);
        }
    } else if (wantsCompressed && !window.MediaRecorder) {
        setStatus("Recording (browser lacks MediaRecorder). Saving WAV.", false);
    } else if (wantsCompressed && !preflightCompressedSupported) {
        setStatus("Recording (compressed option not supported in this browser). Saving WAV.", false);
    }
    disableControlsForRecording(true);
    recordButton.textContent = "Stop Recording";
    recordButton.classList.add("recording");
    recordButton.disabled = false;
    setStatus("Recording full song...", false);

    const scheduled = await scheduleNotesFromOffset(0);
    if (scheduled) {
        isPlaying = true;
        startProgressUpdates();
        applyAllProgramOverrides();
    } else {
        setStatus("Unable to start recording playback.", true);
        await stopRecordingSession(false);
    }
}

function setRecorderMediaStream(stream) {
    // MediaRecorder is optional; PCM capture is already handled.
    if (!stream) {
        return;
    }
    try {
        if (!recorder.mediaRecorder) {
            recorder.mediaRecorder = new MediaRecorder(stream);
            recorder.mediaRecorder.start();
        }
    } catch (error) {
        console.warn("MediaRecorder unavailable; proceeding with PCM capture only.", error);
    }
}

async function stopRecordingSession(autoTriggered) {
    if (!recordingActive || !recorder) {
        return;
    }
    recordingActive = false;
    if (recorder.mediaRecorder) {
        try {
            recorder.mediaRecorder.stop();
        } catch (error) {
            // ignore
        }
        recorder.mediaRecorder = null;
    }
    fluidRenderer.attachRecorderDestination(null);
    let compressedChunksCopy = [];
    const compressedMimeCopy = recorder.compressedMime;
    const desiredExtCopy = recorder.desiredExt;
    const desiredMimeCopy = recorder.desiredMime;
    let compressedFailed = false;
    if (recorder.compressedRecorder) {
        try {
            recorder.compressedRecorder.stop();
            if (recorder.compressedPromise) {
                compressedChunksCopy = await recorder.compressedPromise.catch((err) => {
                    console.warn("Compressed recorder error:", err);
                    compressedFailed = true;
                    return [];
                });
            }
        } catch (error) {
            console.warn("Unable to stop compressed recorder:", error);
            compressedFailed = true;
        }
    }
    const blob = recorder.stop();
    disableControlsForRecording(false);
    loopToggle.checked = previousLoopState;
    fluidRenderer.setLoopEnabled(loopToggle.checked);
    recordButton.textContent = "Ready to Record";
    recordButton.classList.remove("recording");
    let finalBlob = blob;
    let filename = "mixdown.wav";
    if (compressedChunksCopy && compressedChunksCopy.length && compressedMimeCopy) {
        try {
            finalBlob = new Blob(compressedChunksCopy, { type: compressedMimeCopy });
            if (compressedMimeCopy.startsWith("audio/mpeg")) {
                filename = `mixdown.${desiredExtCopy || "mp3"}`;
            } else if (compressedMimeCopy.includes("webm")) {
                filename = `mixdown.${desiredExtCopy || "webm"}`;
            } else if (compressedMimeCopy.includes("ogg")) {
                filename = `mixdown.${desiredExtCopy || "ogg"}`;
            }
        } catch (error) {
            console.warn("Falling back to WAV; unable to package compressed recording:", error);
            finalBlob = blob;
            filename = "mixdown.wav";
        }
    } else if (finalBlob && finalBlob.type) {
        if (finalBlob.type.startsWith("audio/mpeg")) {
            filename = "mixdown.mp3";
        } else if (finalBlob.type.includes("webm")) {
            filename = "mixdown.webm";
        } else if (finalBlob.type.includes("ogg")) {
            filename = "mixdown.ogg";
        }
    }
    if (!compressedChunksCopy.length && recordCompressedCheckbox?.checked && !compressedFailed) {
        setStatus("Compressed format not available; saved WAV instead.", true);
    }
    if (!finalBlob) {
        setStatus("No audio captured.", true);
        return;
    }
    const allowHandle = recordingHandle && recordingHandle.createWritable;
    try {
        if (allowHandle) {
            const writable = await recordingHandle.createWritable();
            await writable.write(finalBlob);
            await writable.close();
            setStatus("Recording saved.", false);
        } else {
            const url = URL.createObjectURL(finalBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                URL.revokeObjectURL(url);
                link.remove();
            }, 500);
            setStatus("Recording downloaded.", false);
        }
    } catch (error) {
        console.error("Failed to save recording:", error);
        setStatus("Unable to save recording.", true);
    }
}

function disableControlsForRecording(disabled) {
    if (disabled) {
        [playButton, pauseButton, stopButton, loopToggle, fileInput].forEach(el => {
            if (el) {
                el.dataset.wasDisabled = el.disabled ? "1" : "0";
                el.disabled = true;
            }
        });
        progressBar.disabled = true;
    } else {
        [playButton, pauseButton, stopButton, loopToggle, fileInput].forEach(el => {
            if (el) {
                el.disabled = el.dataset.wasDisabled === "1";
                delete el.dataset.wasDisabled;
            }
        });
        progressBar.disabled = false;
        updateTempoControlsState(isPrepared);
        setScaleControlsEnabled(isPrepared);
        enableTransportButtons(isPrepared);
    }
    if (recordButton) {
        recordButton.disabled = false;
    }
}
