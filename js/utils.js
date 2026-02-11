(function (global) {
    const GM_INSTRUMENTS = [
        "Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano",
        "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet",
        "Celesta", "Glockenspiel", "Music Box", "Vibraphone",
        "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
        "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ",
        "Reed Organ", "Accordion", "Harmonica", "Tango Accordion",
        "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)",
        "Electric Guitar (muted)", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics",
        "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass",
        "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2",
        "Violin", "Viola", "Cello", "Contrabass",
        "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani",
        "String Ensemble 1", "String Ensemble 2", "SynthStrings 1", "SynthStrings 2",
        "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit",
        "Trumpet", "Trombone", "Tuba", "Muted Trumpet",
        "French Horn", "Brass Section", "SynthBrass 1", "SynthBrass 2",
        "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax",
        "Oboe", "English Horn", "Bassoon", "Clarinet",
        "Piccolo", "Flute", "Recorder", "Pan Flute",
        "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina",
        "Lead 1 (square)", "Lead 2 (sawtooth)", "Lead 3 (calliope)", "Lead 4 (chiff)",
        "Lead 5 (charang)", "Lead 6 (voice)", "Lead 7 (fifths)", "Lead 8 (bass + lead)",
        "Pad 1 (new age)", "Pad 2 (warm)", "Pad 3 (polysynth)", "Pad 4 (choir)",
        "Pad 5 (bowed)", "Pad 6 (metallic)", "Pad 7 (halo)", "Pad 8 (sweep)",
        "FX 1 (rain)", "FX 2 (soundtrack)", "FX 3 (crystal)", "FX 4 (atmosphere)",
        "FX 5 (brightness)", "FX 6 (goblins)", "FX 7 (echoes)", "FX 8 (sci-fi)",
        "Sitar", "Banjo", "Shamisen", "Koto",
        "Kalimba", "Bag pipe", "Fiddle", "Shanai",
        "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock",
        "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal",
        "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet",
        "Telephone Ring", "Helicopter", "Applause", "Gunshot"
    ];

    const FAMILY_CONFIGS = [
        { max: 7, oscillator: "triangle", attack: 0.005, decay: 0.25, sustain: 0.4, release: 0.8 },
        { max: 15, oscillator: "square", attack: 0.01, decay: 0.23, sustain: 0.5, release: 1.0 },
        { max: 23, oscillator: "sine", attack: 0.015, decay: 0.28, sustain: 0.8, release: 1.6 },
        { max: 31, oscillator: "sawtooth", attack: 0.012, decay: 0.25, sustain: 0.55, release: 1.2 },
        { max: 39, oscillator: "square", attack: 0.018, decay: 0.25, sustain: 0.5, release: 1.0 },
        { max: 47, oscillator: "triangle", attack: 0.03, decay: 0.35, sustain: 0.65, release: 1.5 },
        { max: 55, oscillator: "triangle", attack: 0.02, decay: 0.32, sustain: 0.6, release: 1.3 },
        { max: 63, oscillator: "sawtooth", attack: 0.015, decay: 0.23, sustain: 0.5, release: 1.0 },
        { max: 71, oscillator: "square", attack: 0.01, decay: 0.2, sustain: 0.55, release: 0.9 },
        { max: 79, oscillator: "sine", attack: 0.02, decay: 0.3, sustain: 0.7, release: 1.4 },
        { max: 87, oscillator: "square", attack: 0.012, decay: 0.23, sustain: 0.5, release: 1.0 },
        { max: 95, oscillator: "triangle", attack: 0.015, decay: 0.3, sustain: 0.6, release: 1.3 },
        { max: 103, oscillator: "sawtooth", attack: 0.018, decay: 0.25, sustain: 0.45, release: 1.1 },
        { max: 111, oscillator: "sine", attack: 0.015, decay: 0.25, sustain: 0.75, release: 1.2 },
        { max: 119, oscillator: "square", attack: 0.007, decay: 0.18, sustain: 0.4, release: 0.8 },
        { max: 127, oscillator: "sawtooth", attack: 0.009, decay: 0.2, sustain: 0.35, release: 0.9 }
    ];

    function clampProgram(programNumber) {
        if (!Number.isFinite(programNumber)) {
            return 0;
        }
        return Math.min(127, Math.max(0, Math.round(programNumber)));
    }

    function getInstrumentName(programNumber) {
        const index = clampProgram(programNumber);
        return GM_INSTRUMENTS[index] ?? GM_INSTRUMENTS[0];
    }

    function getSynthConfig(programNumber) {
        const index = clampProgram(programNumber);
        const family = FAMILY_CONFIGS.find(item => index <= item.max) ?? FAMILY_CONFIGS[FAMILY_CONFIGS.length - 1];
        return {
            oscillator: family.oscillator,
            envelope: {
                attack: family.attack,
                decay: family.decay,
                sustain: family.sustain,
                release: family.release
            },
            polyphony: 64,
            voice: "Synth"
        };
    }

    function formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) {
            return "0:00";
        }
        const wholeSeconds = Math.floor(seconds);
        const minutes = Math.floor(wholeSeconds / 60);
        const remainder = wholeSeconds % 60;
        return `${minutes}:${String(remainder).padStart(2, "0")}`;
    }

    function summarizeMidi(midiData) {
        if (!midiData) {
            return "No MIDI data.";
        }

        const rawName = typeof midiData.name === "string" ? midiData.name.trim() : "";
        const title = rawName || "Untitled piece";
        const durationSeconds = Number.isFinite(midiData.duration)
            ? midiData.duration
            : Number.isFinite(midiData?.header?.duration) ? midiData.header.duration : 0;

        const tempos = Array.isArray(midiData.tempos) && midiData.tempos.length
            ? midiData.tempos
            : (midiData?.header?.tempos || []);

        const bpm = tempos.length && Number.isFinite(tempos[0].bpm)
            ? `${Math.round(tempos[0].bpm)} BPM`
            : "tempo not specified";

        const tracks = Array.isArray(midiData.tracks) ? midiData.tracks : [];
        const trackLines = tracks.length
            ? tracks.map((track, index) => {
                const displayName = typeof track.name === "string" && track.name.trim()
                    ? track.name.trim()
                    : `Track ${index + 1}`;
                const noteCount = Array.isArray(track.notes) ? track.notes.length
                    : Array.isArray(track?.events) ? track.events.length : 0;
                const instrumentNumber = Number.isFinite(track.program)
                    ? track.program
                    : Number.isFinite(track?.instrument?.number) ? track.instrument.number : 0;
                const instrument = getInstrumentName(instrumentNumber);
                const plural = noteCount === 1 ? "" : "s";
                return `${index + 1}. ${displayName} — ${instrument} (${noteCount} note${plural})`;
            }).join("\n")
            : "No tracks found.";

        return `Title: ${title}\nLength: ${formatDuration(durationSeconds)}\nTempo: ${bpm}\n\nTracks:\n${trackLines}`;
    }

    const api = {
        GM_INSTRUMENTS,
        clampProgram,
        getInstrumentName,
        getSynthConfig,
        formatDuration,
        summarizeMidi
    };

    global.MidiHelpers = api;
})(typeof window !== "undefined" ? window : globalThis);
