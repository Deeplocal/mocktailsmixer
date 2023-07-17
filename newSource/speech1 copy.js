const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');

function startRecording() {
    console.log("listening...");
    chunks = [];
    recording = recorder.record({
        sampleRateHertz: 16000,
        threshold: 0, 
        recorder: 'sox',
        silence: '5.0',
    })

    const recordingStream = recording.stream();
    recordingStream.on('error', () => {});

    // Tune this to ensure we only send the last few seconds of audio to google..
    const maxChunks = 10;
    recordingStream.on('data', (chunk) => {
        chunks.push(chunk);
        // keep the number of chunks below a reasonable limit...
        if (chunks.length > maxChunks) {
            chunks = chunks.slice(-maxChunks);
        }
    });
    recordingStream.on('end', async () => {
        // Create a buffer from our recording, it should only be a few seconds long.
        const audioBuffer = Buffer.concat(chunks);
        console.log("Chunk count:", chunks.length);
        await recognizeSpeech(audioBuffer);
        startRecording();
    });
}

async function recognizeSpeech(audioBuffer) {
    console.log(`recognizeSpeech: Converting audio buffer to text (${audioBuffer.length} bytes)...`)
    const client = new speech.SpeechClient();
    const request = {
        config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US'},
        audio: { content: audioBuffer.toString("base64") }
    };
    // Convert our audio to text.
    const response = await client.recognize(request)    
    findfunction(response[0].results[0].alternatives[0].transcript);
}

startRecording();
