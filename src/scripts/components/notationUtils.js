
export const defaultNotationInfo = {
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

// Deep clones an object
export const deepClone = (obj) => { // from util/util
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

const durationMap = new Map([
    ["4",1], ["2",2], ["1",4], ["8",0.5], ["16",0.25], ["32", 0.125],
    ["4d",1.5], ["2d",3], ["1d",6], ["8d",0.75], ["16d",0.375]
]);


export const parseLilypondDictation = (lyDictation) => { // returns returns notationInfo object. Input can be either string
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


const parseLilypondString = (lyString) => {
    const chunks = simplify(lyString).split(" ");
    let stave=deepClone(defaultNotationInfo.staves[0]);
    let notes = [] ; // each note has format {keys:[], duration: "", [optional-  chord: ""]}
    let lastDuration = "4";
    let measureIndex = 0;
    let barLine = "";
    let durationSum = 0;
    let barDuration = 4; // default is 4/4

    //TODO: automatic barlines - time signature -> barDurataion
    // use durationMap, let durations = 0; durations += durationMap.get[duration]

    for (let i = 0; i<chunks.length; i++) {
        chunks[i] = chunks[i].trim();
        if (chunks[i] === "\\key" && chunks.length >= i+1 ) { // must be like "\key a \major\minor
            console.log("key: ", chunks[i+1], chunks[i+2]);
            let vtKey = noteNames.get(chunks[i+1].toLowerCase());
            if (vtKey) {
                if (chunks[i+2]==="\\minor") {
                    vtKey += "m"
                }
                stave.key = vtKey;
            } else {
                console.log("Could not find notename for: ", chunks[i+1])
            }
            i += 2;
        } else if (chunks[i] === "\\time" && chunks.length >= i+1) { // must be like "\time 4/4
            stave.time = chunks[i + 1];
            const timeParts = stave.time.split("/");
            if (timeParts.length === 2) {
                const inQuarters = parseInt(timeParts[0]) *  4/parseInt(timeParts[1]);
                console.log("Bar duration: ", inQuarters);
                if (inQuarters) {
                    barDuration = inQuarters;
                };
            }
            i += 1;
        } else if (chunks[i] === "\\clef" && chunks.length >= i+1) {
            const clef = chunks[i + 1].trim().replace(/["]+/g, ''); // remove quoates \"
            stave.clef = clef;
            i += 1;
        } else if  (chunks[i] === "\\bar" && chunks.length >= i+1)  { // handle different barlines
            barLine = chunks[i + 1].trim().replace(/["]+/g, ''); // remove quoates \"
            // lilypond barlines: | |. ||  .|: :|.   :|.|:
            i += 1;
        } else if     (chunks[i] === "|") {
            barLine = "|";
        }  else if (chunks[i].startsWith("-") || chunks[i].startsWith("^") ) { // ^ -  text above note, - -under note
            // TODO: find a vexflow solution see Vex.Flow.TextNote - test it in TryOut
            if (notes.length > 0) {
                const text = chunks[i].substr(1).replace(/["]+/g, ''); // remove quotes, remove first char
                //notes[notes.length-1].text = text;
                //notes[notes.length-1].textPosition = chunks[i].charAt(0)==='^' ?  "top" : "bottom";
                console.log("Found text, position: ", text, notes[notes.length - 1].textPosition);
            }
        } else if  (chunks[i] === "~") { // can be also separate, not only by note ie bot e4 ~ e8 or e4~ e8
            console.log("separate tie, add tied to previous note. Not implemented yet." )
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
                if (chunks[i].search("'''")>=0) {
                    octave = "6";
                } else if (chunks[i].search("''")>=0) {
                    octave = "5";
                } else if (chunks[i].search("'")>=0) {
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

            durationSum += durationMap.get(lastDuration);
            console.log("durationSum: ", durationSum);

            if (durationSum >= barDuration) { // && next chunk is not barLine // - perhaps check it befor anythin else?
                //barLine = "|"; // fake barline, probably does not work -  also an extra barline might be comin
                console.log("Bar seems complete or over");
            }

            console.log("vfNote: ", vfNote, duration, lastDuration);
            // note object:  { clef: "treble", keys: ["f/4"], duration: "8", auto_stem: "true" }
            let note = {keys: [vfNote], duration: lastDuration, clef: stave.clef, auto_stem: "true"};
            if (vfNote==="r") {
                note.keys= (stave.clef==="bass") ? ["d/3"] : ["b/4"];
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
        if (barLine /*|| durationSum >= barDuration*/) {
            stave.measures[measureIndex].endBar = barLine; // how to detect that it is end, not start barline? - Drop support for repetition, no startBArlines
            console.log("barline", barLine);
            if (barLine !== "|.") {
                // should we check if duration of the measure is enough?
                measureIndex++;
                stave.measures.push({number: 1+measureIndex, notes:[], endBar: "|."});
                console.log("moved index to new bar", measureIndex, stave.measures);
            }
            barLine = "" ; // reset
            durationSum = 0;
            notes = [];
        }
    }

    return stave;
};


// TODO: rework key (include arrays) !
export const getLyNoteByMidiNoteInKey = (midiNote, key="C") => { // key as tonality like C major, given as 'A' for A major, 'Am' for minor
    const pitchClass = midiNote%12;
    const octave = Math.floor(midiNote/12) - 1;
    let lyNote = "";
    switch (pitchClass) {
        case 0: lyNote = "c"; break;
        case 1: lyNote =  [ "F", "Bb", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "des" : "cis" ; break;
        case 2: lyNote = "d"; break;
        case 3: lyNote =  [ "C", "F", "Bb", "Gm", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "es" : "dis" ; break;
        case 4: lyNote = "e"; break;
        case 5: lyNote = "f"; break;
        case 6: lyNote = [ "F", "Bb", "Eb", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "gis" : "fis";  break;
        case 7: lyNote = "g"; break;
        case 8: lyNote = [ "F", "Bb", "Gm", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "as" : "gis";  break;
        case 9: lyNote = "a"; break;
        case 10: lyNote = [ "G", "D", "F", "Dm", "Bb", "Gm", "Eb", "Cm", "Ab", "Fm", "Db", "Bbm", "Gb", "Ebm", "Cb", "Abm"].includes(key) ? "b" : "ais";  break;
        case 11: lyNote = "h"; break;
        default: lyNote = "";
    }
    if (!lyNote) {
        return "";
    }  else {
        switch (octave) {
            case 2: lyNote += `,`; break;
            case 4: lyNote += `'`; break;
            case 5: lyNote += `''`; break;
            case 6: lyNote += `'''`; break;
        }
        console.log("Detected lyNote: ", lyNote, pitchClass, octave, key);
        return lyNote;
    }

}