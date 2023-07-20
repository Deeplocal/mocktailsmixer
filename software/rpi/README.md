# Mocktails Mixer Software

> Software that lives on the raspberry pi computer

<!-- [TODO AREN & EMMANUEL] -->

### Goals of this project
- Stay within the RPI directory

- Connect a microphone stream to the Google Speech-to-Text external API

- Scan input text and be able to pick apart a work (drink type) from the transcription

- Configure bottle number, pour-time and light triggering for each drink 

- Have the detected word trigger one of 3 messages to be sent over serial. 

- Hand-off to integration for Arduino code
### Todos (in steps)

1. gcloud permissions or key management with a service account

1. Speech to Text over node-record-lpcm-16 library. 

1. Start and Stop recording on command 

1. Start and Stop Recording on external button press

1. Separate one 'keyword' from 'transcript', and check if it is one of the 3 flavors

1. If one of the words in the transcript is a flavor name, send a message over serial to the Arduino mini to make one of the three drinks.
    - [serialport]('https://serialport.io/docs/guide-installation#raspberry-pi-linux')

