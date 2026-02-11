class FluidsynthWorkletProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.blockSize = options?.processorOptions?.blockSize || 1024;
        this.queue = [];
        this.pendingRequests = 0;
        this.port.onmessage = (event) => {
            const { type, left, right } = event.data || {};
            if (type === "data" && left && right) {
                this.queue.push({ left, right });
                this.pendingRequests = Math.max(0, this.pendingRequests - 1);
                this.fillQueue();
            }
        };
        this.fillQueue();
    }

    fillQueue(minBlocks = 2) {
        while ((this.queue.length + this.pendingRequests) < minBlocks) {
            this.requestData();
        }
    }

    requestData() {
        this.port.postMessage({ type: "request", frames: this.blockSize });
        this.pendingRequests += 1;
    }

    process(inputs, outputs) {
        const output = outputs[0];
        if (!output || output.length === 0) {
            return true;
        }
        const left = output[0];
        const right = output[1] ?? output[0];
        const frameCount = left.length;

        if (this.queue.length === 0) {
            left.fill(0);
            right.fill(0);
            this.fillQueue();
        } else {
            const block = this.queue.shift();
            const leftSource = block.left;
            const rightSource = block.right ?? block.left;

            if (leftSource.length < frameCount) {
                left.set(leftSource);
                left.fill(0, leftSource.length);
                right.set(rightSource.subarray(0, leftSource.length));
                right.fill(0, leftSource.length);
            } else {
                left.set(leftSource.subarray(0, frameCount));
                right.set(rightSource.subarray(0, frameCount));
                if (leftSource.length > frameCount) {
                    const remainderLeft = leftSource.subarray(frameCount);
                    const remainderRight = rightSource.subarray(frameCount);
                    this.queue.unshift({ left: remainderLeft, right: remainderRight });
                }
            }

            this.fillQueue();
        }

        return true;
    }
}

registerProcessor("fluidsynth-worklet", FluidsynthWorkletProcessor);
