import React, {useRef, useEffect, useState} from 'react'
import {Button, FormControl, Grid, InputLabel, MenuItem, Select, ToggleButton, ToggleButtonGroup} from "@mui/material";
import {Piano} from "react-piano";
import 'react-piano/dist/styles.css';
import classNames from 'classnames';
import {
    deepClone,
    getLyNoteByMidiNoteInKey, getVfNoteByMidiNoteInKey,
    notationInfoToLyString,
    parseLilypondDictation
} from "./notationUtils";


// TODO: how to do translation? est.json? https://react.i18next.com/ ?



export function NotationInput({lyStart, setNotationInfo, notationInfo, selectedNote,
                                setSelectedNote }) {

    const [keyboardStartingOctave, setKeyboardStartingOctave ] = useState(3);
    const [lyInput, setLyInput] = useState(lyStart);
    const [currentKey, setCurrentKey] = useState("C");
    const [currentDuration, setCurrentDuration] = useState("4");

    // notation functions (add, insert, delete

    useEffect( () => {
        setLyInput(notationInfoToLyString(notationInfo));
    } , [notationInfo]);

    useEffect( () => console.log("selectNote: ", selectedNote), [selectedNote] );

    const replaceNote =  (position, keys, duration) =>  { // position { measure: , note: staff: }

        const notation = deepClone(notationInfo);

        const measureIndex = position.measure || 0;
        const noteIndex =  position.note || 0;
        const staff = position.staff || 0;

        console.log("Add note to position ", measureIndex, noteIndex);
        notation.staves[staff].measures[measureIndex].notes[noteIndex] = {
            clef: "treble", keys: keys, duration: duration, auto_stem: "true"
        }; // + other fields later

        console.log("Notes: ", notation.staves[notation.currentStaff].measures[measureIndex].notes)
        // does this trigger re-render for react component?
        setNotationInfo(notation);
    }

    const insertNote =  (position, keys, duration) =>  { // position { measure: , note: staff: }

        const notation = deepClone(notationInfo);

        const measureIndex = position.measure || 0; // do we need those? for any case...
        const noteIndex =  position.note || 0;
        const staff = position.staff || 0;

        console.log("Insert note to position ", measureIndex, noteIndex);
        notation.staves[staff].measures[measureIndex].notes.splice(noteIndex, 0,  {
            clef: "treble", keys: keys, duration: duration, auto_stem: "true"
        } );
        console.log("Notes after insert: ", notation.staves[staff].measures[measureIndex].notes)


        // does this trigger re-render for react component?
        setNotationInfo(notation); // somehow this does not trigger re-render...
        // if (setSelectedNote) {
        //     setSelectedNote(position);
        // }

    }

    const addNote = (keys, duration) => { // add note to the end of the bar
        const staff = selectedNote.staff ; //TODO: get from currentPosition that should be global... (React Context or similar? )
        const measureIndex = selectedNote.measure >= 0 ? selectedNote.measure : 0; //notationInfo.staves[staff].measures.length>0 ? notationInfo.staves[staff].measures.length - 1 :0 ;

        const noteIndex = notationInfo.staves[staff].measures[measureIndex].notes.length; // index to the note after last one
        console.log("indexes: ", measureIndex, noteIndex, staff);
        replaceNote({note:noteIndex, measure: measureIndex, staff:staff}, keys, duration);
    }

    const deleteHandler  = () => {
        if (selectedNote.note>=0) { // TODO: if selectedNote is in between like 2.5?
            deleteNote(selectedNote)
        } else {
            deleteLastNote();
        }
    }

    const deleteNote =  (position) =>  { // position { measure: , note: staff: }

        const notation = deepClone(notationInfo);

        const measureIndex = position.measure || 0;
        const noteIndex = position.note || 0;
        const staff = position.staff || 0;

        console.log("Delete note from position ", measureIndex, noteIndex);

        notation.staves[staff].measures[measureIndex].notes.splice(noteIndex, 1);

        console.log("Notes: ", notation.staves[notation.currentStaff].measures[measureIndex].notes)
        // does this trigger re-render for react component?
        setNotationInfo(notation);
    }

    const deleteLastNote = () => { // removes last note in selected measurein measure

        const notation = deepClone(notationInfo);
        const measureIndex = selectedNote.measure || 0;
        const staff = selectedNote.staff || 0;

        notation.staves[staff].measures[measureIndex].notes.pop();
        setNotationInfo(notation);

        // const staff = 0 ; //TODO: get from currentPosition that should be global... (React Context or similar? )
        // const measureIndex = selectedNote.measure>=0 ? selectedNote.measure : ( notationInfo.staves[staff].measures.length>0 ? notationInfo.staves[staff].measures.length - 1 :0 );
        // const noteIndex = notationInfo.staves[staff].measures[measureIndex].notes.length - 1; // index to the note after last one
        // console.log("indexes: ", measureIndex, noteIndex, );
        // if (noteIndex>=0) {
        //     deleteNote({note:noteIndex, measure: measureIndex, staff:staff} );
        // } else {
        //     console.log("Nothing to delete"); // this deletes notes only in one bar...
        // }

    }

    const addBar = (staff=0) => {
        const newNotationInfo = deepClone(notationInfo);
        newNotationInfo.staves[staff].measures.push({  endBar: "|",  notes: [] }); // try pushing empty notes array
        setNotationInfo(newNotationInfo);
    }

    // addBar(), shiftNotes() vms -  et lisada vahele; arrow up/down -  change note


    // piano keyboard - perhaps make later a separate component ?  --------------------
    // for piano keyboard
    const firstNote = (keyboardStartingOctave+1)*12; // default - c3
    const lastNote = (keyboardStartingOctave+3)*12 + 4; // for now range is fixed to 2 octaves + maj. third
    // see https://github.com/kevinsqi/react-piano/blob/master/src/KeyboardShortcuts.js for redfining
    const octaveData = {
        maxOctave: 6,
        minOctave: 2
    }

    const handlePlayNote = midiNote => { // called when a MIDI keyboard key is pressed
        console.log ("We are in key: ",  currentKey);
        const key = currentKey ? currentKey : "C";

        const vfNote = getVfNoteByMidiNoteInKey(midiNote, key);
        console.log("vfnote: ", vfNote);
        //console.log("Notation at this point: ", notationInfo);
        if (selectedNote.note-parseInt(selectedNote.note) === 0.5) {
            const newPosition = deepClone(selectedNote);
            newPosition.note = selectedNote.note + 0.5; // to insert it into right place
            insertNote(newPosition, [vfNote], currentDuration.toString())
        } else if (selectedNote.note<0) { // signals that none selected, insert in the end
            addNote([vfNote], currentDuration.toString() );
        } else {
            replaceNote(selectedNote, [vfNote], currentDuration.toString() );
        }


        const lyNote = getLyNoteByMidiNoteInKey(midiNote, key); // suggests correct enharmonic note for black key depening on the tonality

        // if (vtNote && !chordPopupOpen) {
        //     dispatch(insertVtNote(vtNote));
        // }
        // insert to text in right position, check spaces, add if necessary
        //console.log("lyNote", lyNote);
        //setLyInput(lyInput + " " + lyNote + currentDuration) // later this would enter a vfnote to notationInfo in correct place....

    }


    const handleNotation = () => {
        console.log("commented out...");
        // const notation = parseLilypondDictation(lyInput);
        // if (notation && setNotationInfo) {
        //     setNotationInfo(notation);
        // } else {
        //     console.log("Notation error or setter not set");
        // }

        // const testLy = notationInfoToLyString(notation);
        // setLyInput(testLy);

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

    // UI ---------------------------------------------------------

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
                    <FormControl variant="standard">
                        <InputLabel id="clefLabel">Clef</InputLabel>
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
                    </FormControl>
                </Grid>

                <Grid item>
                    <FormControl variant="standard">
                        <InputLabel id="timeLabel">Time</InputLabel>
                        <Select
                            id="clefSelect"
                            // value={selectedClef}
                            defaultValue={"4/4"}
                            label="Muhv"
                            onChange={ (event) => console.log("clef: ", event.target.value)}
                        >
                            <MenuItem value={"3/4"}>3/4</MenuItem>
                            <MenuItem value={"4/4"}>4/4</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item>
                    <Button size={"small"} onClick={deleteHandler}>Del.</Button>
                </Grid>
                <Grid item>
                    <Button size={"small"} onClick={()=>addBar()}>Add bar</Button>
                </Grid>
            </Grid>
        )
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

    // TODO: separate togglegroup, that is not exclusive for ., tie and triplet
    const createDurationsRow = () => {
        const dot = ""; // need a condition here
        return (
            <Grid container item direction={"row"} spacing={1}>
                <Grid item>
                    <ToggleButtonGroup
                        value={currentDuration}
                        exclusive
                        onChange={ event =>  setCurrentDuration(event.target.value + dot)}
                        aria-label="duration selection"
                    >
                        <ToggleButton value="1" aria-label="whole note">
                            1
                        </ToggleButton>
                        <ToggleButton value="2" aria-label="half note">
                            2
                        </ToggleButton>
                        <ToggleButton value="4" aria-label="quarter note">
                            4
                        </ToggleButton>
                        <ToggleButton value="8" aria-label="eighth note">
                            8
                        </ToggleButton>
                        <ToggleButton value="16" aria-label="sixteenth note">
                            16
                        </ToggleButton>
                        <ToggleButton value="32" aria-label="thirtysecond note">
                            32
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Grid>
                <Grid item>


                </Grid>
            </Grid>
        );
    }





    // TODO: key input needed only in in two parts -  key, radio buttons major/minor
    return <div className={"h5p-musical-dictations-uiDiv"}>
        <Grid container direction={"column"} spacing={1}>
            <Grid container  direction={"column"} spacing={1}>
                <Grid item>Lilypond notation UI:</Grid>
                <Grid item>
                    <textarea rows="5" cols="50" value={lyInput} onChange={ event => setLyInput( event.target.value )}/>
                </Grid>
                <Grid item>
                    <Button onClick={ handleNotation }>Show</Button>
                </Grid>

            </Grid>

            {createHeaderRow()}
            {createDurationsRow()}
            {createPianoRow()}
        </Grid>
    </div>
}
