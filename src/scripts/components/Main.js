import React, {useEffect, useRef, useState} from 'react';
import {NotationView} from "./NotationView"
import {defaultNotationInfo, parseLilypondDictation} from "./notationUtils";



export default function Main( {correctDictation} ) {



    const [responseNotationInfo, setResponseNotationInfo] = useState(defaultNotationInfo);
    const [correctNotationInfo, setCorrectNotationInfo] = useState(parseLilypondDictation(correctDictation));  // could have used a constant but that gets reevaluated each render tine
    const [showCorrectNotation, setShowCorrectNotation] = useState(false);
    const [feedBack, setFeedBack] = useState("");

    useEffect( () => { console.log('showCorrectNotation changed');
         setTimeout( () => window.dispatchEvent(new Event('resize')), 500 ); // does not work.. maybe because it hase not rendered yet...
    }, [showCorrectNotation] );

    const lyRef = useRef();

    const init = () => {
        // clear everything needed
    }

    const doParse = () => {
        const lyInput = lyRef.current.value;
        console.log("lyInput", lyRef.current.value);
        const result = parseLilypondDictation(lyInput);
        //console.log("notation object:", result);
        setResponseNotationInfo(result);
    }

    const checkResponse = () => {

        const lyInput = lyRef.current.value;
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
        setFeedBack( correct ? "Correct!" : "Wrong");
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
            <div id={"score1"} ></div>
            <NotationView id="userNotation" div={"score"} notationInfo={responseNotationInfo} />
            <button onClick={ () => checkResponse() }>Check</button>
            <button onClick={ () => {
                setShowCorrectNotation(!showCorrectNotation);
                window.dispatchEvent(new Event('resize'));
            } }>Show/hide correct</button>
            <div>{feedBack}</div>
            { showCorrectNotation &&
            <div>
                <textarea rows="10" cols="50" readOnly={true} value={correctDictation}/>
                <NotationView id="correctNotation" div={"score2"} notationInfo={correctNotationInfo} />
            </div>
            }
        </div>
    );
}

