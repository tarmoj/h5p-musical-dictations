import React, {useEffect, useRef, useState} from 'react';
import {NotationView} from "./vexflow-react-components/NotationView"
import {NotationInput} from "./vexflow-react-components/NotationInput";
import {defaultNotationInfo, parseLilypondDictation, deepClone, addMeasure} from "./vexflow-react-components/notationUtils";
//import {Button} from "@mui/material";


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
    "explanation": "Kuulake ja noteerige",
    "euSupportText": "Projekti toetab Euroopa Sotsiaalfond",
    "correct": "Õige",
    "wrong": "Vale",
    "check": "Kontrolli",
    "showHide": "Näita/peida",
    "key": "Helistik", // Notation input
    "clef": "Võti",
    "treble": "viiulivõti",
    "bass": "bassivõti",
    "time": "Taktimõõt",
    "textInput": "Tekstiline sisestus",
    "lilypondNotationLabel" : "Lilypondi notatsioon (absoluutsed kõrgused, saksa süsteemi noodinimed (g, as, b, h))",
    "engrave": "Kuva",
    "keyboardShortcuts" : "Klahvikombinatsioonid", // shortcuts' dialog
    "youCanUseFollowingShortcuts" : "Võite kasutada järgmisi klahvikombinatsioone, et sisestada või muuta noote:",
    "clickSomewhereOnTheScreen" : "Et klahvikombinatsioonid aktiveerida, klõpsake esmalt ükskõik kuhu aknas!",
    "noteNameInfo" :"Noodid: klahvid c, d, e, f, g, a, b, h. Suurtähed (C, D, jne) annavad 2. oktavi, ctrl + noodinimi väikse oktavi.",
    "durationInfo":    "Vältused: 1 - täisnoot, 2 - poolnoot, 4 -  veerandnoot, 8 -  kaheksandik, 6 -  kuueteistkümnendik",
    "rest": "Paus",
    "dotInfo" : "Punkt (lisa või eemalda)",
    "tieInfo": "Pide (lisa või eemalda)",
    "raiseLowerInfo": "Noot üles/alla (enharmoonilised vasted k.a.): nool üles või alla",
    "navigationInfo": "Liikumine:  nool paremale/vasakule liigub järgmise/eelmise noodi peale, ctrl+nool järmisesse/eelmisesse takti.",
    "clickBetweenNotes": "Klõpsa nootide vahele, et lisada noote takti keskel.",
    "engraveInfo": "Näita notatsiooni (lilypond aknas): Ctrl + Enter",

    "emptyLilypondString": "Lilypondi teks on tühi!", // notationUtils
    "isNotRecognizedNote" : " pole teadaolev täht või vältus.",
    "durationNotKnown" : "Võõras vältus! ",
    "disclaimerText": "NB! See ei ole ametlik H5P.org sisutüüp. Kõigi probleemide korral pöörduge autori poole: tarmo.johannes@muba.edu.ee",
};


export default function Main( {correctDictation=correctLyDictation,
                                  showFromDictation=lyStart,
                                  resizeFunction= () => console.log("empty resize"),
                                  t=translations,
                                  iconsPath = "./"  } ) {

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
                           resizeFunction={resizeFunction}
                           iconsPath={iconsPath}
            />
            {/*Those were MUI BUttons before: */}
            {/h5p-question-check-answer - gives *check mark for the "Kontrolli" button, requires FontAwesome*/}
            <button className={"h5p-joubelui-button "}   onClick={ () => checkResponse() }>{t.check}</button>
            <button className={"h5p-joubelui-button"}
                onClick={ () => {
                setShowCorrectNotation(!showCorrectNotation);
                resizeFunction();
            } }>{t.showHide}</button>
            <div className={"h5p-musical-dictations"}><b>{feedBack}</b></div>

            { showCorrectNotation &&
            <div>
                <NotationView id="correctNotation" div={"score2"} notationInfo={correctNotationInfo}  />
                <textarea rows="10" cols="50" readOnly={true} value={correctDictation}/>
            </div>
            }
        </div>
    );
}

