import React, {useEffect, useRef, useState} from 'react';
import {NotationView} from "./NotationView"
import {NotationInput} from "./NotationInput";
import {defaultNotationInfo, parseLilypondDictation, deepClone, addMeasure} from "./notationUtils";
import {Button} from "@mui/material";


// temporary -  for testing:

const correctLyDictation = `
    \\clef "treble" \\key c \\major \\time 2/4  
    c'4 c'8 d'8 | 
    e'4 e'8 f'8 | 
    g'8 a'8 g'8 f'8 | 
    g'4 g'4 \\bar "|."             
        `;

const lyStart = ` \\clef "treble" \\key c \\major \\time 2/4  
    c'4 `;

const translations =   {
    "explanation": "Listen to the musical excerpt, write down the notation",
    "euSupportText": "The project is supported by European Social Fund",
    "correct": "Correct",
    "wrong": "Wrong",
    "check": "Check",
    "showHide": "Show/hide",
    "key": "Key", // Notation input
    "clef": "Clef",
    "treble": "treble",
    "bass": "bass",
    "time": "Time",
    "textInput": "Text input",
    "lilypondNotationLabel" : "Lilypond notation (absolute pitches, german nomenclature)",
    "engrave": "Engrave",
    "keyboardShortcuts" : "Keyboard shortcuts", // shortcuts' dialog
    "youCanUseFollowingShortcuts" : "You can use the following sohrtcuts to enter or change the music:",
    "clickSomewhereOnTheScreen" : "Click somewhere on the screen first to activate the shortcuts!",
    "noteNameInfo" :"Note names: keys c, d, e, f, g, a, b, h. Uppercase (C, D, etc) stands for 2nd octave, ctrl + note name for the small octave.",
    "durationInfo":    "Durations: 1 - whole note, 2 - halfnote, 4 -  quarter, 8 -  eighths, 6 -  sixteenths",
    "rest": "Rest",
    "dotInfo" : "Dot (add or remove)",
    "tieInfo": " Tie (add or remove)",
    "raiseLowerInfo": "Raise or lower note (enharmonics included): arrow up or down",
    "navigationInfo": "Navigation:  left or right moves to the next note, ctrl+left/right to the next/previous bar.",
    "clickBetweenNotes": "Click between the notes to insert notes in the middle of the bar.",
    "engraveInfo": "show notation (engrave): Ctrl + Enter",

    "emptyLilypondString": "Empty Lilypond string!", // notationUtils
    "isNotRecognizedNote" : " is not a recognized note or keyword.",
    "durationNotKnown" : "Duration not known! ",
    "disclaimerText": "NB! This is not an official H5P.org content type. With any problems please turn to the author tarmo.johannes@muba.edu.ee",
};


export default function Main( {correctDictation=correctLyDictation,
                                  showFromDictation=lyStart,
                                  resizeFunction= () => console.log("empty resize"),
                                  t = translations} ) {
    console.log("translation strings in Main", t);

    const [responseNotationInfo, setResponseNotationInfo] =useState(defaultNotationInfo); // lyStart - temporary
    const [correctNotationInfo, setCorrectNotationInfo] = useState(parseLilypondDictation(correctDictation));  // could have used a constant but that gets reevaluated each render tine
    const [showCorrectNotation, setShowCorrectNotation] = useState(false);
    const [feedBack, setFeedBack] = useState("");
    const [ selectedNote, setSelectedNote] = useState({ measure: responseNotationInfo.staves[0].measures.length-1, note:-1, staff:0 } );


    useEffect( ()=>createResponseDictationStart(), [] ); // set the proper lyStart for response NotationInput

    const createResponseDictationStart = () => {
        let seedNotation =showFromDictation ?  parseLilypondDictation(showFromDictation) : defaultNotationInfo;
        const bars = correctNotationInfo.staves[0].measures.length;
        addMeasure( seedNotation, bars - seedNotation.staves[0].measures.length);

        //console.log("seeNotation created: ", seedNotation);
        setResponseNotationInfo(seedNotation);

    }

    const checkResponse = () => {

        //const lyInput = lyRef.current.value; // get it in some other way from NotationInput? // not needed any more...
        const responseNotation = deepClone(responseNotationInfo);//parseLilypondDictation(lyInput); // for any case, if user has not pressed "show"
        let correct = true;

        const staveIndex = 0; // support for one voiced, ie 1 stave dications only (for now)
        for (let i=0; i<correctNotationInfo.staves[staveIndex].measures.length; i++ ) {
            for (let j=0; j<correctNotationInfo.staves[staveIndex].measures[i].notes.length; j++) {
                const correctNote = correctNotationInfo.staves[staveIndex].measures[i].notes[j];
                const responseNote =  (responseNotation.staves[staveIndex].measures[i] && responseNotation.staves[staveIndex].measures[i].notes[j]) ?
                    responseNotation.staves[staveIndex].measures[i].notes[j] : null; // check if exists
                //console.log("Checking notes: ", i, j, correctNote.keys, responseNote.keys ? responseNote.keys : null);
                let mistake = false;
                if (responseNote) {
                    if (correctNote.keys.toString() === responseNote.keys.toString() && correctNote.duration === responseNote.duration) {
                        console.log("Correct!");
                    } else {
                        console.log("wrong!");
                        mistake = true;
                    }
                } else {
                    console.log("Wrong!");
                    mistake = true;
                }

                if (mistake && responseNote) {
                    correct = false;
                    if (responseNote) {
                        responseNote.color = "red"; // mark as wrong note
                    }
                }
            }

            if ( responseNotation.staves[staveIndex].measures[i] && responseNotation.staves[staveIndex].measures[i].notes.length < correctNotationInfo.staves[staveIndex].measures[i].notes.length) {
                correct = false;
                console.log("Too few notes");
            }

            if ( responseNotation.staves[staveIndex].measures[i] && responseNotation.staves[staveIndex].measures[i].notes.length > correctNotationInfo.staves[staveIndex].measures[i].notes.length) {
                correct = false;
                console.log("i in this point", i, responseNotation.staves[staveIndex].measures[i].notes.length);
                for (let k = correctNotationInfo.staves[staveIndex].measures[i].notes.length; k<responseNotation.staves[staveIndex].measures[i].notes.length; k++) {
                    responseNotation.staves[staveIndex].measures[i].notes[k].color = "red";
                    console.log("Marking wrong extra note", k);
                }
            }
        }
        setResponseNotationInfo(responseNotation);
        setShowCorrectNotation(true);
        resizeFunction();
        setFeedBack( correct ? t.correct : t.wrong);
    }



    return (
        <div>
            <NotationInput lyStart={responseNotationInfo}
                           setNotationInfo={setResponseNotationInfo}
                           notationInfo = {responseNotationInfo}
                           selectedNote={selectedNote} setSelectedNote={setSelectedNote}
                           t = {t}
            />

            <Button variant={"text"}  onClick={ () => checkResponse() }>{t.check}</Button>
            <span><b>{feedBack}</b></span>
            <Button variant={"text"}
                onClick={ () => {
                setShowCorrectNotation(!showCorrectNotation);
                resizeFunction();
            } }>{t.showHide}</Button>

            { showCorrectNotation &&
            <div>
                <NotationView id="correctNotation" div={"score2"} notationInfo={correctNotationInfo}  />
                <textarea rows="10" cols="50" readOnly={true} value={correctDictation}/>
            </div>
            }
        </div>
    );
}

