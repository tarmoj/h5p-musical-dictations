import React, {useRef, useEffect, useState} from 'react'
import {Button, FormControl, Grid, InputLabel, MenuItem, Select} from "@mui/material";
import {Piano} from "react-piano";
import 'react-piano/dist/styles.css';
import classNames from 'classnames';
import {defaultNotationInfo, getLyNoteByMidiNoteInKey, parseLilypondDictation} from "./notationUtils";


// TODO: how to do translation? est.json? https://react.i18next.com/ ?




export function NotationUI( {setNotationInfo}) {

    const [keyboardStartingOctave, setKeyboardStartingOctave ] = useState(3);
    const [lyInput, setLyInput] = useState("");
    const [localNotationInfo, setLocalNotationInfo] = useState(defaultNotationInfo);
    const [currentKey, setCurrentKey] = useState("C");

    const handleKeySelect = (event) => {
        const key = event.target.value;
        console.log("selected key: ", key);
        // put it to lilypond string -> notationInfo
        setCurrentKey(key); // inf form C, D etc -  think!
    }

    const createHeaderRow = () => { // time tempo etc
        return (
            <Grid item container spacing={1}>

                <Grid item>
                    <FormControl variant="standard">
                        <InputLabel id="keyLabel">Key</InputLabel>
                        <Select
                            id="keySelect"
                            labelId="keyLabel"
                            // value={selectedKey}
                            defaultValue={"c \\major"}
                            onChange={handleKeySelect}
                        >
                            <MenuItem value={"c \\major"}>C</MenuItem>
                            <MenuItem value={"d \\major"}>D</MenuItem>
                            <MenuItem value={"e \\major"}>E</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item>
                    Clef:
                    <Select
                        id="clefSelect"
                        // value={selectedClef}
                        defaultValue={"treble"}
                        label="Clef"
                        onChange={ (event) => console.log("clef: ", event.target.value)}
                    >
                        <MenuItem value={"treble"}>treble</MenuItem>
                        <MenuItem value={"bass"}>bass</MenuItem>
                    </Select>
                </Grid>

                <Grid item>
                    Time:
                    <Select
                        id="clefSelect"
                        // value={selectedClef}
                        defaultValue={"4/4"}
                        label="Clef"
                        onChange={ (event) => console.log("clef: ", event.target.value)}
                    >
                        <MenuItem value={"3/4"}>3/4</MenuItem>
                        <MenuItem value={"4/4"}>4/4</MenuItem>
                    </Select>
                </Grid>
            </Grid>
        )

    }

    // piano keyboard - perhaps make later a separate component ?  --------------------
    // for piano keyboard
    const firstNote = (keyboardStartingOctave+1)*12; // default - c3
    const lastNote = (keyboardStartingOctave+3)*12 + 4; // for now range is fixed to 2 octaves + maj. third
    // see https://github.com/kevinsqi/react-piano/blob/master/src/KeyboardShortcuts.js for redfining
    const octaveData = {
        maxOctave: 6,
        minOctave: 1
    }

    const handlePlayNote = midiNote => {
        console.log ("We are in key: ",  currentKey);
        const key = currentKey ? currentKey : "C";
        const lyNote = getLyNoteByMidiNoteInKey(midiNote, key); // suggests correct enharmonic note for black key depening on the tonality
        // if (vtNote && !chordPopupOpen) {
        //     dispatch(insertVtNote(vtNote));
        // }
        // insert to text in right position, check spaces, add if necessary
        console.log("lyNote", lyNote);
        setLyInput(lyInput + " " + lyNote)

    }

    // extended from: https://github.com/kevinsqi/react-piano/blob/a8fac9f1ab0aab8fd21658714f1ad9f14568feee/src/ControlledPiano.js#L29
    const renderNoteLabel =  ({ keyboardShortcut, midiNumber, isActive, isAccidental }) => {
        const isC = midiNumber%12===0

        return keyboardShortcut || isC ? (
            <div
                className={classNames('ReactPiano__NoteLabel', {
                    'ReactPiano__NoteLabel--active': isActive,
                    'ReactPiano__NoteLabel--accidental': isAccidental,
                    'ReactPiano__NoteLabel--natural': !isAccidental,
                })}
            >
                {keyboardShortcut}
                { midiNumber%12===0 &&
                    <p style={{color:"black", fontSize:"0.5em", textAlign:"left", marginLeft:"3px" }}>C{(midiNumber/12-1)}</p>
                } {/*C3, C4 etc on C keys*/}
            </div>
        ) : null;
    }

    const changeStartingOctave = (change=0) => {
        const startingOctave = keyboardStartingOctave;
        if (change>0 && keyboardStartingOctave < octaveData.maxOctave-2 ) {
            setKeyboardStartingOctave(startingOctave+1);
        } else if (change<0 && keyboardStartingOctave > octaveData.minOctave) {
            setKeyboardStartingOctave(startingOctave-1);
        }
    }

    const createPianoRow = () => {
        return (
            <Grid item container direction={"row"}>
                <Grid item><Button onClick={()=>changeStartingOctave(-1)}>{"<"}</Button></Grid>
                <Grid item>
                    <div >  {/*make it scrollable like notation, if does not fit  oli: className={"vtDiv center"} */}
                        <Piano
                            /*className = {"center"}*/
                            noteRange={{ first: firstNote, last: lastNote }}
                            playNote={handlePlayNote}
                            stopNote={(midiNumber) => {}}
                            width={420}  // how is it on mobile screen
                            keyboardShortcuts={[]/*keyboardShortcuts*/}
                            renderNoteLabel={renderNoteLabel}
                        />
                    </div>
                </Grid>
                <Grid item><Button onClick={()=>changeStartingOctave(1)}>{">"}</Button></Grid>
            </Grid>
        )
    }

    const handleLyChange = (event) => {
        const text = event.target.value;
        setLyInput( text );
        //console.log("handle Lychange", text, event.target);
        // const notation = parseLilypondDictation( text );
        // console.log("Generated notation: ", notation);
        // if (notation && setNotationInfo) {
        //     setNotationInfo(notation);
        // }
    }

    // TODO: key input needed only in in two parts -  key, radio buttons major/minor
    return <div className={"h5p-musical-dictations-uiDiv"}>
        <Grid container direction={"column"} spacing={1}>
            <Grid item>
                Lilypond notation:
                <textarea rows="10" cols="50" value={lyInput} onChange={handleLyChange}/>
            </Grid>
            {createHeaderRow()}
            {createPianoRow()}
        </Grid>
    </div>
}
