import React, {useEffect, useRef, useState} from 'react';
import {NotationView} from "./NotationView"
import {NotationInput} from "./NotationInput";
import {defaultNotationInfo, parseLilypondDictation, deepClone} from "./notationUtils";



export default function Main( {correctDictation, showFromDictation = "", resizeFunction= () => console.log("empty resize")} ) {



    const [responseNotationInfo, setResponseNotationInfo] = useState(defaultNotationInfo);//useState( showFromDictation ? parseLilypondDictation(showFromDictation) : defaultNotationInfo);
    const [correctNotationInfo, setCorrectNotationInfo] = useState(parseLilypondDictation(correctDictation));  // could have used a constant but that gets reevaluated each render tine
    const [showCorrectNotation, setShowCorrectNotation] = useState(false);
    const [feedBack, setFeedBack] = useState("");
    const [ selectedNote, setSelectedNote] = useState({ measure: responseNotationInfo.staves[0].measures.length-1, note:-1, staff:0 } );

    const lyRef = useRef();

    useEffect( () => {console.log("selectedNote not in Main: ", selectedNote); setSelectedNote(selectedNote)}, [selectedNote] ); // gets called but this does not forward value to NotationInput somehow...

    const checkResponse = () => {

        const lyInput = lyRef.current.value; // get it in some other way from NotationInput? // not needed any more...
        const responseNotation = parseLilypondDictation(lyInput); // for any case, if user has not pressed "show"
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
        setFeedBack( correct ? "Correct!" : "Wrong");
    }



    return (
        <div>
            <div>Enter the dictation in Lilypond notation  (absolute pitches, german nomenclature)</div>
            <div id={"score1"} ></div>
            <NotationView id="userNotation" div={"score"} notationInfo={responseNotationInfo} globalSelectedNote={selectedNote} Note={selectedNote} setSelectedNote={setSelectedNote} />
            <NotationInput lyStart={showFromDictation ? showFromDictation :  `\\clef treble \\time 4/4 \\key d \\major d'8 e' fis' g' a'4 a`}
                           setNotationInfo={setResponseNotationInfo}
                           notationInfo = {responseNotationInfo}
                           selectedNote={selectedNote} setSelectedNote={setSelectedNote}
            />
            <button onClick={ () => {
                    console.log("set selected note test position");
                    setSelectedNote({note:1, measure:1, staff: 6});

                   //insertNote("[g/4]", "2");
                }
            }>Test</button>
            <button onClick={ () => checkResponse() }>Check</button>
            <button onClick={ () => {
                setShowCorrectNotation(!showCorrectNotation);
                resizeFunction();
            } }>Show/hide correct</button>
            <div>{feedBack}</div>
            { showCorrectNotation &&
            <div>
                <textarea rows="10" cols="50" readOnly={true} value={correctDictation}/>
                <NotationView id="correctNotation" div={"score2"} notationInfo={correctNotationInfo}  />
            </div>
            }
        </div>
    );
}

