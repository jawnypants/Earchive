diff --git a/js/utils.js b/js/utils.js
new file mode 100644
index 0000000000000000000000000000000000000000..0febd0d71ae19eb63d72511e18b54754760415e5
--- /dev/null
+++ b/js/utils.js
@@ -0,0 +1,117 @@
+(function (global) {
+    const MODE_INTERVALS = {
+        Ionian: [0, 2, 4, 5, 7, 9, 11],
+        Dorian: [0, 2, 3, 5, 7, 9, 10],
+        Phrygian: [0, 1, 3, 5, 7, 8, 10],
+        Lydian: [0, 2, 4, 6, 7, 9, 11],
+        Mixolydian: [0, 2, 4, 5, 7, 9, 10],
+        Aeolian: [0, 2, 3, 5, 7, 8, 10],
+        Locrian: [0, 1, 3, 5, 6, 8, 10]
+    };
+
+    function createDefaultTuning() {
+        const ratios = [];
+        for (let i = 0; i < 12; i++) {
+            ratios.push(Math.pow(2, i / 12));
+        }
+        return {
+            name: '12-Tone Equal Temperament',
+            steps: 12,
+            ratios,
+            baseMidi: 69,
+            baseFreq: 440
+        };
+    }
+
+    function applyModeToMidi(midiValue, mode, intervals = MODE_INTERVALS) {
+        const baseIntervals = intervals.Ionian;
+        const targetIntervals = intervals[mode] || baseIntervals;
+        const pitchClass = ((midiValue % 12) + 12) % 12;
+        let degree = 0;
+        for (let i = 0; i < baseIntervals.length; i++) {
+            if (pitchClass >= baseIntervals[i]) {
+                degree = i;
+            }
+        }
+        const octave = Math.floor((midiValue - pitchClass) / 12);
+        const interval = targetIntervals[Math.min(degree, targetIntervals.length - 1)];
+        return octave * 12 + interval;
+    }
+
+    function parseScala(text, filename) {
+        const lines = text.split(/\r?\n/).map(line => line.trim());
+        const filtered = lines.filter(line => line && !line.startsWith('!'));
+        if (filtered.length < 2) {
+            throw new Error('Invalid Scala file.');
+        }
+        const stepCount = Number.parseInt(filtered[0], 10);
+        if (!Number.isFinite(stepCount) || stepCount <= 0) {
+            throw new Error('Invalid pitch count in Scala file.');
+        }
+        const ratios = [];
+        for (let i = 1; i < filtered.length && ratios.length < stepCount; i++) {
+            const value = filtered[i].split('!')[0].trim();
+            if (!value) {
+                continue;
+            }
+            ratios.push(parseScalaValue(value));
+        }
+        if (ratios.length !== stepCount) {
+            throw new Error('Incomplete Scala definition.');
+        }
+        if (Math.abs(ratios[0] - 1) > 1e-6) {
+            ratios.unshift(1);
+        }
+        return {
+            name: filename,
+            steps: ratios.length,
+            ratios,
+            baseMidi: 69,
+            baseFreq: 440
+        };
+    }
+
+    function parseScalaValue(entry) {
+        if (entry.includes('/')) {
+            const [numStr, denStr] = entry.split('/');
+            const num = Number.parseFloat(numStr);
+            const den = Number.parseFloat(denStr);
+            if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
+                throw new Error('Invalid ratio in Scala file.');
+            }
+            return num / den;
+        }
+        const cents = Number.parseFloat(entry);
+        if (!Number.isFinite(cents)) {
+            throw new Error('Invalid cents value in Scala file.');
+        }
+        return Math.pow(2, cents / 1200);
+    }
+
+    function getTunedFrequency(midiValue, tuning) {
+        const diff = midiValue - tuning.baseMidi;
+        const steps = tuning.steps;
+        const octave = Math.floor(diff / steps);
+        let index = diff % steps;
+        if (index < 0) {
+            index += steps;
+        }
+        const ratio = tuning.ratios[index] ?? Math.pow(2, index / steps);
+        return tuning.baseFreq * Math.pow(2, octave) * ratio;
+    }
+
+    const api = {
+        MODE_INTERVALS,
+        createDefaultTuning,
+        applyModeToMidi,
+        parseScala,
+        parseScalaValue,
+        getTunedFrequency
+    };
+
+    if (typeof module !== 'undefined' && module.exports) {
+        module.exports = api;
+    }
+
+    global.MidiUtils = api;
+})(typeof window !== 'undefined' ? window : globalThis);
