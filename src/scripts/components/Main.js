import React, {useEffect, useRef, useState} from "react";
import {NotationView} from "./NotationView";

/**
 * Main component for displaying the UI and notation
 */
export default function Main( props ) {
  const [value, setValue] = useState(0);

  const takeRandom = () => {setValue( Math.floor(Math.random()*100)  )}

    const defaultNotationInfo = {
        options: "", // scale, width, space etc, if needed
        staves: [
            {
                clef:"treble",
                key:"F",
                time: "4/4",
                measures : [ {
                    number : 1, // optional
                    //startBar: "", // optional can be: |  ||  |. etc (lilypond style)  :|.
                    endBar: "|",
                    // also possible to define new key or clef here
                    // in the code -  if measure.hasOwnProperty.clef etc
                    notes: [
                        { clef: "treble", keys: ["f/4"], duration: "1", auto_stem: "true" /*optional: tied: true|false, text:"something", position:""*/ }, // cannot be empty, vf requires that the measure is filled... or perhaps there is a way to override it
                    ]
                },
                    // // second measure etc
                ],


            },
            // second  stave

        ],

    };

    const [notationInfo, setNotationInfo] = useState(defaultNotationInfo);

    const lyRef = useRef();

    // lilypond operations. in digiSolf, these are in util/notes ----------------------


    // Deep clones an object
    const deepClone = (obj) => { // from util/util
        return JSON.parse(JSON.stringify(obj));
    };

    const simplify = (string) => {
        if (typeof(string)==="string") {
            return string.trim().replace(/\s\s+/g, ' ');
        } else {
            return string;
        }
    }

    //NB! change @ tp b for vexflow
    const noteNames = new Map([
        ["ceses","Cbb"], ["ces","Cb"], ["c","C"], ["cis","C#"], ["cisis","C##"],
        ["deses","Dbb"], ["des", "Db"], ["d", "D"], ["dis","D#"], ["disis","D##"],
        ["eses","Ebb"], ["es","Eb"], ["e","E"], ["eis","E#"], ["eisis","E##"],
        ["feses","Fbb"], ["fes","Fb"], ["f","F"], ["fis","F#"], ["fisis","F##"],
        ["geses","Gbb"], ["ges","Gb"], ["g","G"], ["gis","G#"], ["gisis","G##"],
        ["ases","Abb"], ["as","Ab"], ["a","A"], ["ais","A#"], ["aisis","A##"],
        ["heses","Bbb"], ["b","Bb"], ["h","B"], ["his","B#"], ["hisis","B##"]
    ]);


    const parseLilypondDictation = (lyDictation) => { // returns returns notationInfo object. Input can be either string
// for one-voiced dications or object { stave1:"", stave2, "" }. More than 2 staves not supported, currently one voice per stave.
        let notationInfo = deepClone(defaultNotationInfo);
        if (typeof(lyDictation)==="string") {
            notationInfo.staves[0] = parseLilypondString(lyDictation);
        } else if ( typeof(lyDictation)==="object" ) {
            if (lyDictation.hasOwnProperty("stave1")) {
                const stave1 = parseLilypondString(lyDictation.stave1);
                notationInfo.staves[0] = stave1;
            }
            if (lyDictation.hasOwnProperty("stave1")) {
                const stave2 = parseLilypondString(lyDictation.stave2);
                notationInfo.staves[1] = stave2;
            }
            //etc if more voices needed
        } else {
            console.log("Unknown lyDictation: ", lyDictation);
        }

        return notationInfo;

    };

    // TODO: figure out how to parse by measure. Break into subfunction?

    const parseLilypondString = (lyString) => {
        const chunks = simplify(lyString).split(" ");
        let stave=deepClone(defaultNotationInfo.staves[0]);
        let notes = [] ; // each note has format {keys:[], duration: "", [optional-  chord: ""]}
        let useTie = false;
        let lastDuration = "4";
        let measureIndex = 0;
        let barLine = "";

        for (let i = 0; i<chunks.length; i++) {
            chunks[i] = chunks[i].trim();
            if (chunks[i] === "\\key" && chunks.length >= i+1 ) { // must be like "\key a \major\minor
                console.log("key: ", chunks[i+1], chunks[i+2]);
                let vtKey = noteNames.get(chunks[i+1].toLowerCase());
                if (vtKey) {
                    if (chunks[i+2]=="\\minor") {
                        vtKey += "m"
                    }
                    stave.key = vtKey;
                } else {
                    console.log("Could not find notename for: ", chunks[i+1])
                }
                i += 2;
            } else if (chunks[i] === "\\time" && chunks.length >= i+1) { // must be like "\time 4/4
                stave.time = chunks[i + 1];
                i += 1;
            } else if (chunks[i] === "\\clef" && chunks.length >= i+1) {
                const clef = chunks[i + 1].trim().replace(/[\"]+/g, ''); // remove quoates \"
                stave.clef = clef;
                i += 1;
            } else if  (chunks[i] === "\\bar" && chunks.length >= i+1)  { // handle different barlines
                barLine = chunks[i + 1].trim().replace(/[\"]+/g, ''); // remove quoates \"
                // lilypond barlines: | |. ||  .|: :|.   :|.|:
                i += 1;
            } else if     (chunks[i] === "|") {
                barLine = "|";
            }  else if (chunks[i].startsWith("-") || chunks[i].startsWith("^") ) { // ^ -  text above note, - -under note
                // TODO: find a vexflow solution see Vex.Flow.TextNote - test it in TryOut
                if (notes.length > 0) {
                    const text = chunks[i].substr(1).replace(/[\"]+/g, ''); // remove quotes, remove first char
                    //notes[notes.length-1].text = text;
                    //notes[notes.length-1].textPosition = chunks[i].charAt(0)==='^' ?  "top" : "bottom";
                    console.log("Found text, position: ", text, notes[notes.length - 1].textPosition);
                }
            } else if  (chunks[i] === "~") { // can be also separate, not only by note ie bot e4 ~ e8 or e4~ e8
                console.log("seprate tie, add tied to previous note." )
            } else  { // might be a note or error
                let vfNote="";
                const index = chunks[i].search(/[~,'\\\d\s]/); // in lylypond one of those may follow th note: , ' digit \ whitespace or nothing
                let noteName;
                if (index>=0) {
                    noteName = chunks[i].slice(0, index);
                } else {
                    noteName = chunks[i].toLowerCase();
                }

                if (noteName === "r") { // rest
                    vfNote = "r"; // to signal it is a rest
                } else {
                    if (! noteNames.has(noteName)) { // ERROR
                        alert(noteName +  " is not a recognized note or keyword.");
                        break;
                    }
                    console.log("noteName is: ", noteName);
                    vfNote = noteNames.get(noteName);

                    //for now octave by absolute notation ' - 1st oct, '' -2nd, none - small, , - great etc.
                    let octave;
                    // use better regexp and test for '' ,, etc
                    if (chunks[i].search("\'\'\'")>=0) {
                        octave = "6";
                    } else if (chunks[i].search("\'\'")>=0) {
                        octave = "5";
                    } else if (chunks[i].search("\'")>=0) {
                        octave = "4";
                    } else if (chunks[i].search(",")>=0) {
                        octave ="2";
                    } else if (chunks[i].search(",,")>=0) {
                        octave ="1";
                    } else { // no ending
                        octave = "3";
                    }

                    vfNote += "/" + octave;
                }

                // duration
                const re = /\d{1,2}(\.{0,1})+/; // was re = /\d+/; - but this skips the dot
                const result = re.exec(chunks[i]); // re.exec returns an array or string
                let duration = result ? result[0] : null;

                if (duration) {
                    // double dot not implemented yet
                    duration = duration.replace(/\./g, "d"); // d instead of dot for VexFlow
                    lastDuration = duration;
                }

                console.log("vfNote: ", vfNote, duration, lastDuration);
                // note object:  { clef: "treble", keys: ["f/4"], duration: "8", auto_stem: "true" }
                let note = {keys: [vfNote], duration: lastDuration, clef: stave.clef, auto_stem: "true"};
                if (vfNote==="r") {
                    // TODO: rest position by bass clef
                    note.keys= ["b/4"];
                    note.duration= lastDuration+"r";
                }
                if (chunks[i].includes("~")) {
                    console.log("Found tie", chunks[i]);
                    note.tied = true;
                }
                notes.push(note);


            }
            stave.measures[measureIndex].notes = notes;
            // deal with barline

            // drop support for starting barlines, not needed in dictations
            if (barLine) {
                stave.measures[measureIndex].endBar = barLine; // how to detect that it is end, not start barline? - Drop support for repetition, no startBArlines
                console.log("barline", barLine);
                if (barLine !== "|.") {
                    // should we check if duration of the measure is enough?
                    measureIndex++;
                    stave.measures.push({number: 1+measureIndex, notes:[], endBar: "|."});
                    console.log("moved index to new bar", measureIndex, stave.measures);
                }
                barLine = "" ; // reset
                notes = [];
            }

        }

        return stave;
    };

    const doParse = () => {
        const lyInput = lyRef.current.value;
        console.log("lyInput", lyRef.current.value);
        const result = parseLilypondString(lyInput);
        console.log("notation object:", result);
        const newNotation = deepClone(defaultNotationInfo);
        newNotation.staves[0] = result;
        setNotationInfo(newNotation);
    }

  return (
      <div style={{marginLeft:10}}>
          <h1>VexFlow test</h1>
          <p>
              Lilypond input:
              <textarea rows="10" cols="50"ref={lyRef}
                        defaultValue = {`\\clef treble \\time 4/4 \\key d \\major d'8 e' fis' g' a'4 a'`}
              />
              <button onClick={doParse}>Show</button>
          </p>
          <div id={"score"} ></div>
          <NotationView div={"score"} notationInfo={notationInfo} />
      </div>
  );
}

