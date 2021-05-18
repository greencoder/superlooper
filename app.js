class DrumMachine {

  constructor(tempo, kick, snare, ohat, chat, clap, snap, tom) {
    this.currentBeat = 0;
    this.setupInstruments();
    this.initializeSequencer(kick, snare, ohat, chat, clap, snap, tom);
    this.setupInterface();
    this.setTempo(tempo);
    this.isPlaying = false;

    // Schedules a callback for each beat
    Tone.Transport.scheduleRepeat(this.repeat.bind(this), '16n');
  }

  // Sets the appropriate tempo
  setTempo(bpm) {
    this.tempo = bpm;
    Tone.Transport.bpm.value = bpm;
  }

  // Create empty arrays with false values for the instrument sequences
  initializeSequencer(kick, snare, ohat, chat, clap, snap, tom) {
    this.sequencer = {}
    this.sequencer.kick = this.parseInstrumentParam(kick);
    this.sequencer.snare = this.parseInstrumentParam(snare);
    this.sequencer.ohat = this.parseInstrumentParam(ohat);
    this.sequencer.chat = this.parseInstrumentParam(chat);
    this.sequencer.clap = this.parseInstrumentParam(clap);
    this.sequencer.snap = this.parseInstrumentParam(snap);
    this.sequencer.tom = this.parseInstrumentParam(tom);
  }

  // Parses the querystring param into a sequence of 16 beats
  parseInstrumentParam(param) {
    let sequence = Array.apply(null, {length: 16}).map(() => false);

    if (param) {
      param.split('').slice(0,16).forEach((beat, index) => {
        sequence[index] = beat === '1';
      });
    }

    return sequence;
  }

  // Create a player for each instrument
  setupInstruments() {
    this.instruments = {
      kick: 'kick.wav',
      snare: 'snare.wav',
      chat: 'closed-hat.wav',
      ohat: 'open-hat.wav',
      clap: 'clap.wav',
      snap: 'snap.wav',
      tom: 'tom.wav'
    }

    this.players = new Tone.Players({
      urls: this.instruments,
      baseUrl: './sounds/'
    });

    this.players.toDestination();
  }

  setupInterface() {
    document.querySelectorAll('div.sequencer-button-grid button').forEach(button => {
      let instrument = button.dataset.instrument;
      let beatNumber = button.dataset.beat;
      let beatActive = this.sequencer[instrument][beatNumber-1];

      if (beatActive === true) {
        button.classList.add('active');
      }
      else {
        button.classList.remove('active');
      }
    });
  }

  // This is the callback that's called for each step of the sequencer
  repeat(time) {
    let step = this.currentBeat % 16;

    for (let instrument of Object.keys(this.instruments)) {
      let beatActive = this.sequencer[instrument][step];

      if (beatActive === true) {
        this.players.player(instrument).start(time).stop(time + 0.3);
      }
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
    this.setupInterface();
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
    let beatNumber = parseInt(beat) - 1;
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

function parseUrlSequence(key) {
  const urlParams = new URLSearchParams(window.location.search);
  let value = urlParams.get(key) || '0000';
  return hex2bin(value);
}

document.addEventListener('DOMContentLoaded', () => {

  // Read the configuration from the querystring (if present)
  const urlParams = new URLSearchParams(window.location.search);

  const tempo = urlParams.get('tempo') || 100;
  const kick = this.parseUrlSequence('kick');
  const snare = this.parseUrlSequence('snare');
  const ohat = this.parseUrlSequence('ohat');
  const chat = this.parseUrlSequence('chat');
  const snap = this.parseUrlSequence('snap');
  const clap = this.parseUrlSequence('clap');
  const tom = this.parseUrlSequence('tom');

  let drumMachine = new DrumMachine(tempo, kick, snare, ohat, chat, clap, snap, tom);
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
      let sequence = drumMachine.sequencer[instrument];
      updateQueryString(instrument, sequence);
      evt.target.classList.toggle('active');
    });
  });

  function updateQueryString(instrument, sequence) {
    let urlSequence = sequence.map(beat => Number(beat)).join('');
    let url = new URL(window.location);

    if (urlSequence === '0000000000000000') {
      url.searchParams.delete(instrument);
    }
    else {
      let hex = bin2hex(urlSequence);
      url.searchParams.set(instrument, hex);
    }

    window.history.pushState({}, '', url);
  }

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
    let shouldClear = confirm('Are you sure you want to clear the grid?');
    if (!shouldClear) return;

    let url = new URL(window.location);
    url.searchParams.delete('kick');
    url.searchParams.delete('snare');
    url.searchParams.delete('ohat');
    url.searchParams.delete('ohat');
    url.searchParams.delete('clap');
    url.searchParams.delete('snap');
    url.searchParams.delete('tom');
    window.history.pushState({}, '', url);
    drumMachine.onClearGrid();
  });

  // Spacebar should stop/start the playback
  document.addEventListener('keyup', event => {
    if (event.code === 'Space') {
      event.preventDefault();
      drumMachine.onStartStop();
      togglePlayPauseButton();
    }
  });

});

// Convert a binary string to hexidecimal
function bin2hex(b) {
  return b.match(/.{4}/g).reduce(function(acc, i) {
      return acc + parseInt(i, 2).toString(16);
  }, '')
}

// Convert a hexidecimal string to binary
function hex2bin(h) {
  return h.split('').reduce(function(acc, i) {
      return acc + ('000' + parseInt(i, 16).toString(2)).substr(-4, 4);
  }, '')
}