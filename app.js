class DrumMachine {

  constructor(playTick) {
    this.reverbLevel = 1;
    this.currentBeat = 0;
    this.setupInstruments();
    this.initializeSequencer();
    this.setTempo(100);
    this.isPlaying = false;
    this.playTick = playTick;

    // Schedule a callback for each beat
    Tone.Transport.scheduleRepeat(this.repeat.bind(this), '16n');
  }

  // Sets the appropriate tempo
  setTempo(bpm) {
    this.tempo = bpm;
    Tone.Transport.bpm.value = bpm;
  }

  // Create empty arrays with false values for the instrument sequences
  initializeSequencer() {
    this.sequencer = {
      kick: Array.apply(null, {length: 16}).map(() => false),
      snare: Array.apply(null, {length: 16}).map(() => false),
      hihat: Array.apply(null, {length: 16}).map(() => false),
      clap: Array.apply(null, {length: 16}).map(() => false),
      shaker: Array.apply(null, {length: 16}).map(() => false),
      fing: Array.apply(null, {length: 16}).map(() => false),
      rim: Array.apply(null, {length: 16}).map(() => false),
      tom: Array.apply(null, {length: 16}).map(() => false),
      tick: Array.apply(null, {length: 16}).map(() => false)
    }
  }

  // Create a player for each instrument
  setupInstruments() {
    this.instruments = {
      kick: 'kick.wav',
      snare: 'snare.wav',
      hihat: 'closed-hat.wav',
      clap: 'clap.wav',
      shaker: 'shaker-bis2.mp3',
      fing: 'fingerWide-bis2.mp3',
      rim: 'rim1-bis2.mp3',
      tom: 'tomDry3-bis2.mp3',
      tick: 'tick.wav'
    }

    this.players = new Tone.Players({
      urls: this.instruments,
      baseUrl: './sounds/'
    });

    this.players.toDestination();
    this.synth = new Tone.Synth().toDestination();

    // Chain reverb to some of the channels
    // const reverb = new Tone.Reverb(this.reverbLevel);
    // this.players.player('kick').chain(reverb, Tone.Destination);
    // this.players.player('snare').chain(reverb, Tone.Destination);
    // this.players.player('hihat').chain(reverb, Tone.Destination);
  }

  // This is the callback that's called for each step of the sequencer
  repeat(time) {
    let step = this.currentBeat % 16;

    for (let instrument of Object.keys(this.instruments)) {
      if (this.sequencer[instrument][step + 1] === true) {
        this.players.player(instrument).start(time).stop(time + 0.1);
      }
    }

    if (this.playTick) {
      this.synth.triggerAttackRelease('C3', '8n', time);
    }

    this.updateColumnHighlights(step);
    this.currentBeat++;
  }

  // The column number for the current beat should be highlighted
  updateColumnHighlights(step) {
    this.resetColumnHighlights();
    document.querySelector('div.footer#col' + (step + 1)).classList.toggle('active');
  }

  // Makes sure none of the column numbers are highlighted
  resetColumnHighlights() {
    document.querySelectorAll('div.footer').forEach(span => span.classList.remove('active'));
  }

  // Handle the user clicking the clear button
  onClearGrid() {
    this.currentBeat = 0;
    Tone.Transport.stop();
    this.resetColumnHighlights();
    this.isPlaying = false;
    this.initializeSequencer();
  }

  // Handle the user clicking the rewind button
  onRewind() {
    this.currentBeat = 0;
    this.resetColumnHighlights();
    Tone.Transport.stop();
    this.isPlaying = false;
  }

  // Handle the user clicking the start/stop button
  onStartStop() {
    Tone.Transport.toggle();
    this.isPlaying = !this.isPlaying;
  }

  // If a beat is selected, it deselects it (and vice-versa)
  toggleBeat(instrument, beat) {
    let beatNumber = parseInt(beat);
    let beatActive = this.sequencer[instrument][beatNumber];

    // Sample the beat unless we are playing
    if (!this.isPlaying) {
      this.players.player(instrument).start();
    }

    if (!beatActive) {
      this.sequencer[instrument][beatNumber] = true;
    }
    else {
      this.sequencer[instrument][beatNumber] = false;
    }
  }

  // Plays the sound once
  playSound(instrument) {
    this.players.player(instrument).start();
  }
}

// All the UI stuff happens down here

document.addEventListener('DOMContentLoaded', () => {

  const urlParams = new URLSearchParams(window.location.search);
  const playTick = urlParams.get('tick');

  let drumMachine = new DrumMachine(playTick);
  window.drumMachine = drumMachine;

  // Bind the BPM slider to the current tempo and update the tempo label
  document.querySelector('input.bpm').value = drumMachine.tempo;
  document.querySelector('label.bpm').innerHTML = drumMachine.tempo + ' BPM';

  // Any mousedown is user input and can start the audio context
  document.documentElement.addEventListener('mousedown', () => {
    if (Tone.context.state !== 'running') Tone.context.resume();
  });

  // Handle the click event on each beat's button, turning it on or off
  document.querySelectorAll('div.sequencer-button-grid button').forEach(button => {
    button.addEventListener('click', (evt) => {
      let instrument = evt.target.dataset.instrument;
      let beat = evt.target.dataset.beat;
      drumMachine.toggleBeat(instrument, beat);
      evt.target.classList.toggle('active');
    });
  });

  // Change the image on the play/pause button
  function togglePlayPauseButton() {
    let image = document.querySelector('button#start-stop').querySelector('img');
    image.src = drumMachine.isPlaying ? 'images/pause.svg' : 'images/play.svg';
  }

  // Start or stop the sequencer
  document.querySelector('button#start-stop').addEventListener('click', () => {
    drumMachine.onStartStop();
    togglePlayPauseButton();
  });

  // Rewind the sequencer
  document.querySelector('button#rewind').addEventListener('click', () => {
    drumMachine.onRewind();
    togglePlayPauseButton();
  });

  // Listen for changes to the BPM slider
  document.querySelector('input.bpm').addEventListener('input', evt => {
    document.querySelector('label.bpm').innerHTML = evt.target.value + ' BPM';
    drumMachine.setTempo(evt.target.value);
  });

  // Play the sound sample if they click the row label
  document.querySelectorAll('div.col00').forEach(element => {
    element.addEventListener('click', evt => {
      let instrument = evt.target.dataset.instrument;
      if (instrument) {
        drumMachine.playSound(instrument);
      }
    });
  });

  // Clear button
  document.querySelector('button#clear').addEventListener('click', () => {
    drumMachine.onClearGrid();
    document.querySelectorAll('div.sequencer-button-grid button').forEach(button => {
      button.classList.remove('active')
    });
  });

});
