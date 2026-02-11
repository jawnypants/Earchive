// Web Worker that parses MIDI files off the main thread so large files
// don't block the UI. If the CDN script fails to load (e.g., offline),
// we record the error so the main thread can fall back gracefully.
let parserLoadError = null;
try {
    self.importScripts("../assets/vendor/tonejs/Midi.min.js");
} catch (error) {
    parserLoadError = error;
}

self.addEventListener("message", (event) => {
    const { id, buffer } = event.data || {};

    if (typeof id === "undefined" || !(buffer instanceof ArrayBuffer)) {
        self.postMessage({
            id,
            ok: false,
            error: "Malformed worker request."
        });
        return;
    }

    if (parserLoadError || typeof Midi === "undefined") {
        self.postMessage({
            id,
            ok: false,
            error: parserLoadError ? parserLoadError.message : "MIDI parser unavailable in worker."
        });
        return;
    }

    try {
        const midi = new Midi(buffer);``
        const tracks = midi.tracks.map((track, index) => {
            const instrument = track.instrument || {};
            const channel = Number.isFinite(track.channel)
                ? track.channel
                : (Number.isFinite(instrument.channel) ? instrument.channel : index);

            const sanitizedNotes = track.notes
                .filter(note => Number.isFinite(note.time) && Number.isFinite(note.duration))
                .map(note => ({
                    time: note.time,
                    duration: note.duration,
                    midi: note.midi,
                    velocity: Number.isFinite(note.velocity) ? note.velocity : 0.8
                }));

            return {
                index,
                name: track.name && track.name.trim() ? track.name.trim() : `Track ${index + 1}`,
                program: Number.isFinite(instrument.number) ? instrument.number : 0,
                instrumentName: instrument.name || "",
                channel,
                notes: sanitizedNotes
            };
        }).filter(track => track.notes.length > 0);

        const tempos = (midi.header && Array.isArray(midi.header.tempos))
            ? midi.header.tempos.map(tempo => ({
                bpm: tempo && Number.isFinite(tempo.bpm) ? tempo.bpm : null,
                time: tempo && Number.isFinite(tempo.time) ? tempo.time : null
            })).filter(item => item.bpm !== null && item.time !== null)
            : [];

        self.postMessage({
            id,
            ok: true,
            payload: {
                name: midi.name || "",
                duration: Number.isFinite(midi.duration) ? midi.duration : 0,
                tracks,
                tempos
            }
        });
    } catch (error) {
        self.postMessage({
            id,
            ok: false,
            error: error && error.message ? error.message : "Unable to parse MIDI file."
        });
    }
});
