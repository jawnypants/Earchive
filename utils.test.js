diff --git a/tests/utils.test.js b/tests/utils.test.js
new file mode 100644
index 0000000000000000000000000000000000000000..c7245c8f97228efa9b1418e326a8ccbf4a5ee30a
--- /dev/null
+++ b/tests/utils.test.js
@@ -0,0 +1,60 @@
+const test = require('node:test');
+const assert = require('node:assert/strict');
+
+const {
+    MODE_INTERVALS,
+    createDefaultTuning,
+    applyModeToMidi,
+    parseScala,
+    parseScalaValue,
+    getTunedFrequency
+} = require('../js/utils.js');
+
+test('createDefaultTuning returns equal temperament ratios', () => {
+    const tuning = createDefaultTuning();
+    assert.equal(tuning.steps, 12);
+    assert.equal(tuning.ratios.length, 12);
+    assert.equal(tuning.ratios[0], 1);
+    assert.ok(Math.abs(tuning.ratios[7] - Math.pow(2, 7 / 12)) < 1e-12);
+});
+
+test('applyModeToMidi remaps degrees for alternate modes', () => {
+    const middleC = 60; // C4
+    assert.equal(applyModeToMidi(middleC, 'Ionian', MODE_INTERVALS), middleC);
+
+    const eNatural = 64; // E4
+    const dorianE = applyModeToMidi(eNatural, 'Dorian', MODE_INTERVALS);
+    assert.equal(dorianE, 63); // Flattened third in Dorian
+});
+
+test('parseScalaValue supports ratios and cents', () => {
+    assert.equal(parseScalaValue('3/2'), 1.5);
+    const ratio = parseScalaValue('700.0');
+    assert.ok(Math.abs(ratio - Math.pow(2, 700 / 1200)) < 1e-10);
+});
+
+test('parseScala builds tuning metadata from file contents', () => {
+    const scl = `! Example scale\n12\n100.0\n200.0\n300.0\n400.0\n500.0\n600.0\n700.0\n800.0\n900.0\n1000.0\n1100.0\n1200.0`;
+    const tuning = parseScala(scl, 'example.scl');
+    assert.equal(tuning.name, 'example.scl');
+    assert.equal(tuning.baseMidi, 69);
+    assert.equal(tuning.baseFreq, 440);
+    assert.equal(tuning.steps, 13);
+    assert.equal(tuning.ratios[0], 1);
+});
+
+test('getTunedFrequency respects tuning ratios and octave wrapping', () => {
+    const tuning = createDefaultTuning();
+    assert.ok(Math.abs(getTunedFrequency(69, tuning) - 440) < 1e-9);
+    assert.ok(Math.abs(getTunedFrequency(81, tuning) - 880) < 1e-9);
+
+    const pentatonic = {
+        name: 'Pentatonic',
+        steps: 5,
+        ratios: [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3],
+        baseMidi: 60,
+        baseFreq: 261.625565
+    };
+    const freq = getTunedFrequency(65, pentatonic);
+    assert.ok(Math.abs(freq - pentatonic.baseFreq * 2) < 1e-6);
+});
