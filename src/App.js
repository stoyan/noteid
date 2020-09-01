import React, { Component } from 'react';
import Teoria from 'teoria';
import Vex from 'vexflow';
import './App.css';

const settings = {
  color: false,
  bass: true,
  treble: true,
};

if (window.location.hash.substring(1)) {
  const hash = window.location.hash.substring(1).split(',').map(decodeURIComponent);
  Object.keys(settings).forEach(s => {
    settings[s] = hash.includes(s);
  });
}

const NOTES = 'cdefgab'.split('');
function getRange(startNote, startOctave, endNote, endOctave) {
  const res = [];
  // first octave
  NOTES.slice(NOTES.indexOf(startNote)).forEach(n => res.push(n + startOctave));
  // all others
  for (let octave = startOctave + 1; octave <= endOctave; octave++) {
    for (let idx = 0; idx < NOTES.length; idx++) {
      res.push(NOTES[idx] + octave);   
    }
  }
  return res.slice(0, 1 + res.indexOf(endNote + endOctave));
}

const allTheNotes = {
  bass:   getRange('a', 1, 'g', 4),
  treble: getRange('f', 3, 'e', 6),
};

const colors = {
  c: 'red',
  d: 'orange',
  e: 'chocolate',
  f: 'green',
  g: 'blue',
  a: 'purple',
  b: 'deeppink',
};

const iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

let note;

function getCount() {
  return null;
}

function getQuestion(i) {
  const vf = new Vex.Flow.Factory({
    renderer: {elementId: '_vex', width: 150, height: 220}
  });
  const score = vf.EasyScore();
  const system = vf.System();
  
  try {
    let clef;
    if (settings.treble && settings.bass) {
       clef = Math.random() > 0.4 ? 'treble' : 'bass'; // wee bit more treble
    } else if (settings.treble) {
      clef = 'treble';
    } else {
      clef = 'bass';
    }
     
    const rando = Math.floor(Math.random() * allTheNotes[clef].length);
    note = Teoria.note(allTheNotes[clef][rando]);
    const scorenotes = score.notes(note + '/w', {clef});
    if (settings.color) {
      scorenotes[0].setStyle({fillStyle: colors[allTheNotes[clef][rando][0]]});  
    }
    system.addStave({
      voices: [
        score.voice(scorenotes),
      ]
    }).addClef(clef);
    vf.draw();
  } catch(_){
    return getQuestion();
  }

  return vf.context.svg;
}

function getAnswer(i) {
  return (
    <h2 style={{paddingTop: '20px'}}>
      {pretty(note)}
    </h2>
  );
}

function getAudio() {
  return new Audio('samples/' + getFileNote(note) + '.mp3');
}

function getNormalNote(note) {
  if (note.accidentalValue() === 0) { // no sharp, nor flats
    return note.toString().toUpperCase();
  }
  if (note.accidentalValue() === 1) { // sharp
    return note.toString().replace('#', '-').toUpperCase();
  }
  return null;
}

function getFileNote(note) {
  const res = getNormalNote(note) || getNormalNote(note.enharmonics()[0]) || getNormalNote(note.enharmonics()[1]);
  return res.replace('E-', 'F').replace('B-', 'C');
}

function pretty(note) {
  return note.name().toUpperCase() + 
    note.accidental()
      .replace('#', '♯')
      .replace(/b/g, '♭')
      .replace('x', '𝄪');
}
// the actual quiz is done, boring stuff follows...

class App extends Component {
  constructor() {
    super();
    this.state = {
      question: getQuestion(1),
      answer: getAnswer(1),
      total: getCount(),
      i: 1,
      audio: getAudio(1),
      pause: false,
      settings: false,
    };
    window.addEventListener('keydown', (e) => {
      // space bar
      if (e.keyCode === 32 || e.charCode === 32) {
        e.preventDefault();
        this.play();
      }
      // p and P
      if (e.keyCode === 112 || e.charCode === 112 || e.keyCode === 80 || e.charCode === 80) {
        e.preventDefault();
        this.play();
      }
      // right arrow
      if (e.keyCode === 39 || e.charCode === 39) {
        e.preventDefault();
        this.nextQuestion();
      }
      // n and N
      if (e.keyCode === 110 || e.charCode === 110 || e.keyCode === 78 || e.charCode === 78) {
        e.preventDefault();
        this.nextQuestion();
      }
    });
  }
  
  nextQuestion() {
    this.pause();
    this.setState({
      question: getQuestion(this.state.i + 1),
      answer: getAnswer(this.state.i + 1),
      i: this.state.i + 1,
      audio: getAudio(this.state.i + 1),
    });
  }
  
  pause() {
    const au = this.state.audio;
    au.pause();
    au.currentTime = 0;
    this.setState({pause: true});
  }
  
  play() {
    this.pause();
    this.setState({pause: false});
    this.state.audio.play();
  }
  
  toggleSettings() {
    if (this.state.settings) {
      this.nextQuestion();
    }
    this.setState({settings: !this.state.settings});
  }
  
  render() {
    return (
      <div>
        <div className="settings">
          <div className="settingsLink" onClick={this.toggleSettings.bind(this)}>⚙ Customize</div>
          {this.state.settings 
          ? <div>
              <Settings init={settings} /> 
              <button className="settingsButton" onClick={e => {
                this.toggleSettings();
                this.nextQuestion();
              }}>done</button>
            </div>
          : null
          }
        </div>
        {
          this.state.total 
            ? <Count i={this.state.i} total={this.state.total} />
            : null
        }
        <Flashcard
          id={this.state.i}
          question={this.state.question}
          answer={this.state.answer}
        />
        <button 
          className="playButton" 
          onClick={this.play.bind(this)}>
          {iOS ? 'play' : '▶'}
        </button>
        {' '}
        {
          (this.state.total && this.state.i >= this.state.total)
            ? null
            : <button 
                className="nextButton" 
                onClick={this.nextQuestion.bind(this)}>
                next...
              </button>
        }
      </div>
    );
  }
}

class Flashcard extends Component {

  constructor(props) {
    super();
    this.state = {
      reveal: false,
      id: props.id,
    };
    window.addEventListener('keydown', (e) => {
      // arrows
      if (e.keyCode === 38 || e.charCode === 38 || e.keyCode === 40 || e.charCode === 40) {
        this.flip();
      }
      // f and F
      if (e.keyCode === 102 || e.charCode === 102 || e.keyCode === 70 || e.charCode === 70) {
        this.flip();
      }
    });
  }

  static getDerivedStateFromProps(props, state) {
    if (props.id !== state.id) {
      return {
        reveal: false,
        id: props.id,
      };
    }
    return null;
  }

  flip() {
    this.setState({
      reveal: !this.state.reveal,
    });
  }

  render() {
    const className = "card flip-container" + (this.state.reveal ? ' flip' : '');
    return (
      <div><center>
        <div className={className} onClick={this.flip.bind(this)}>
          <div className="flipper">
            <div className="front" style={{display: this.state.reveal ? 'none' : ''}}>
              <div dangerouslySetInnerHTML={{__html: this.props.question.outerHTML}} />
            </div>
            <div className="back" style={{display: this.state.reveal ? '' : 'none'}}>
              {this.props.answer}
            </div>
          </div>
        </div>
        <button className="answerButton" onClick={this.flip.bind(this)}>flip</button>
      </center></div>
    );
  }
}

const Count = ({i, total}) =>
  <div>
    Question {i} / {total}
  </div>;

function updateSettings(e) {
  settings[e.target.getAttribute('id').replace('setting-', '')] = e.target.checked;
  if (!settings.treble && !settings.bass) {
    alert('Pick at least one clef');
    settings[e.target.getAttribute('id').replace('setting-', '')] = true;
    e.target.checked = true;
  }
  window.location.hash = Object.keys(settings).filter(s => settings[s] === true).join(',');
}

const Settings = ({init}) =>
  <div>
    <input type="checkbox" id="setting-color" defaultChecked={init['color']} onChange={updateSettings}/>
    <label htmlFor="setting-color">Use colors: C is red, D orange, etc.</label>
    <br/>
    <input type="checkbox" id="setting-bass" defaultChecked={init['bass']} onChange={updateSettings}/>
    <label htmlFor="setting-bass">Bass clef</label>
    <br/>
    <input type="checkbox" id="setting-treble" defaultChecked={init['treble']} onChange={updateSettings}/>
    <label htmlFor="setting-treble">Treble clef</label>
  </div>;


export default App;
