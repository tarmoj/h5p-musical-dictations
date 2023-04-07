import React, {useRef, useEffect, useState} from 'react'
import {
    Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    FormControl,
    Grid, IconButton,
    InputLabel,
    MenuItem,
    Select,
    ToggleButton,
    ToggleButtonGroup
} from "@mui/material";
import {Piano} from "react-piano";
import 'react-piano/dist/styles.css';
import classNames from 'classnames';
import {
    addMeasure,
    deepClone,
    getLyNoteByMidiNoteInKey, getVfNoteByMidiNoteInKey,
    notationInfoToLyString,
    noteNames,
    parseLilypondDictation
} from "./notationUtils";
import {NotationView} from "./NotationView";
import Image from "mui-image";
import Tie from '../../images/tie.png';
import WholeNote from "../../images/whole.png" ; // require() does not work with Preview, do separate imports
import HalfNote from "../../images/half.png"
import QuarterNote from "../../images/quarter.png"
import EightNote from "../../images/eighth.png"
import SixteenthNote from "../../images/sixteenth.png"
import Dot from "../../images/dot.png"
import Rest from "../../images/rest.png"
import AddBar from "../../images/add-bar.png"

import BackspaceIcon from '@mui/icons-material/Backspace';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';



// TODO: how to do translation? est.json? https://react.i18next.com/ ?


export function NotationInput({lyStart, setNotationInfo, notationInfo, selectedNote,
                                setSelectedNote }) {

    const [keyboardStartingOctave, setKeyboardStartingOctave ] = useState(3);
    const [lyInput, setLyInput] = useState(lyStart);
    const [currentKey, setCurrentKey] = useState("C");
    const [currentDuration, setCurrentDuration] = useState("4");
    const [dotted, setDotted] = useState(false); // empty string or "d" ; in future could be also "dd"
    const [lyFocus, setLyFocus] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // notation functions (add, insert, delete

    useEffect( () => {
        setLyInput(notationInfoToLyString(notationInfo));
    } , [notationInfo]);

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    });

    const onKeyDown = (e) => {
        const noteNameKeys = ["c", "d", "e", "f", "g", "a", "b", "h"];
        console.log("key pressed: ", e.key, e.ctrlKey, e.ctrl);
        if (!lyFocus) { // ignore keys when focus in lilypond input
            e.preventDefault(); // cancel default. Not sure if it good though
            e.stopPropagation();
            if (noteNameKeys.includes(e.key.toLowerCase())) {

                const noteName = (e.key.toLowerCase()==="h") ? "B": (e.key.toLowerCase()==="b" ) ? "Bb" : e.key.toUpperCase() ;
                console.log("Note from key", noteName);
                let octave = (e.key.toLowerCase() === e.key ) ? "4" : "5"; // uppercase letters give 2nd octave; what about small?
                if (e.ctrlKey) { // Ctrl + noteName -  small octava
                    octave = "3";
                }
                inputHandler(noteName+"/" + octave, currentDuration);
            } else if (e.key === "ArrowLeft") {
                if (e.ctrlKey) {
                    console.log("Control left");
                    nextMeasure(-1);
                } else {
                    //console.log("Just arrow left")
                    nextNote(-1);
                }
            } else if (e.key === "ArrowRight") {
                if (e.ctrlKey) {
                    nextMeasure(1);
                } else {
                    //console.log("Just arrow right")
                    nextNote(1);
                }
            } else if (e.key === "ArrowUp") {
                noteStep(1);
                // perhaps ctrl + up/down -  change octava?
                e.preventDefault();
                e.stopPropagation();
            } else if (e.key === "ArrowDown") {
                noteStep(-1);
                e.preventDefault();
                e.stopPropagation();
            }
            else if (e.key === "1") {
                durationChange("1" +  (dotted ? "d" : "" ));
            } else if (e.key === "2") {
                durationChange("2" +  (dotted ? "d" : "" ));
            } else if (e.key === "4") {
                durationChange("4" +  (dotted ? "d" : "" ));
            } else if (e.key === "8") {
                durationChange("8" +  (dotted ? "d" : "" ));
            } else if (e.key === "6") {
                durationChange("16" +  (dotted ? "d" : "" ));
            } else if (e.key === ".") {
                dotChange();
            } else if (e.key === "r") {
                restHandler();
            } else if (e.key === "t") { // tie
                tieChange();
            } else if (e.key === "Backspace" || e.key === "Delete") {
                deleteHandler();
            }
        }
    }

    //useEffect( () => console.log("selectedNote: ", selectedNote), [selectedNote] );

    const nextMeasure = (advance=1) => { // moves to next or previous measure
        let newPosition = deepClone(selectedNote);
        if (advance>0) {
            if (selectedNote.measure < notationInfo.staves[0].measures.length-1 ) {
                newPosition.measure++;
                if (notationInfo.staves[0].measures[newPosition.measure].notes.length>0) {
                    newPosition.note=0;
                } else {
                    newPosition.note = -1;
                }
            } else {
                console.log("Last bar");
            }
        } else {
            if (selectedNote.measure > 0 ) {
                newPosition.measure--;
                newPosition.note = -1;
            }
        }
        setSelectedNote(newPosition);
    }

    const nextNote = (advance=1) => { // moves to next or previous measure
        let newPosition = deepClone(selectedNote);
        if (advance>0) {
            if (selectedNote.note < notationInfo.staves[0].measures[selectedNote.measure].notes.length-1 ) {
                newPosition.note++;
            } else {
                newPosition.note = -1;
            }
        } else {
            if (selectedNote.note > 0 ) {
                    newPosition.note--;
            } else if (selectedNote.note<0 && notationInfo.staves[0].measures[selectedNote.measure].notes.length>0) { // at the end of the bar
                newPosition.note=notationInfo.staves[0].measures[selectedNote.measure].notes.length-1;
            }
        }
        setSelectedNote(newPosition);
    }

    const replaceNote =  (position, keys, duration) =>  { // position { measure: , note: staff: }

        const notation = deepClone(notationInfo);

        const measureIndex = position.measure || 0;
        const noteIndex =  position.note || 0;
        const staff = position.staff || 0;

        console.log("Add note to position ", measureIndex, noteIndex);
        notation.staves[staff].measures[measureIndex].notes[noteIndex] = {
            clef: "treble", keys: keys, duration: duration, auto_stem: "true"
        }; // + other fields later

        //console.log("Notes: ", notation.staves[staff].measures[measureIndex].notes)
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
        setNotationInfo(notation);
        // if (setSelectedNote) {
        //     setSelectedNote(position);
        // }

    }

    const addNote = (keys, duration) => { // add note to the end of the bar
        const staff = selectedNote.staff ;
        const measureIndex = selectedNote.measure >= 0 ? selectedNote.measure : 0; //notationInfo.staves[staff].measures.length>0 ? notationInfo.staves[staff].measures.length - 1 :0 ;

        const noteIndex = notationInfo.staves[staff].measures[measureIndex].notes.length; // index to the note after last one
        console.log("indexes: ", measureIndex, noteIndex, staff);
        replaceNote({note:noteIndex, measure: measureIndex, staff:staff}, keys, duration);
    }

    const deleteHandler  = () => {
        if (selectedNote.note>=0 && selectedNote.note-parseInt(selectedNote.note)===0 ) {
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

        console.log("Notes: ", notation.staves[staff].measures[measureIndex].notes)
        // does this trigger re-render for react component?
        setNotationInfo(notation);
    }

    const deleteLastNote = () => { // removes last note in selected measurein measure

        const notation = deepClone(notationInfo);
        const measureIndex = selectedNote.measure || 0;
        const staff = selectedNote.staff || 0;

        notation.staves[staff].measures[measureIndex].notes.pop();
        setNotationInfo(notation);

    }

    const addBar = () => {
        const newNotationInfo = deepClone(notationInfo);
        addMeasure(newNotationInfo, 1);
        setNotationInfo(newNotationInfo);
    }

    // TODO - mõtle siin ,kuidas asendada viimane noot, kui selle mingi operatsioon. Viimase noodi valimine tehtud, aga vaja anda ka positsioon
    const getCurrentNote = () => { // returns the selected note or one before if at the end of the bar
        let note = null;
        if (selectedNote.note>=0 ) {
            note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes[selectedNote.note];
        } else {
          if (notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.length>0) {
              console.log("getCurrentNote: at end, return the previous one")
              note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.at(-1); // retrun the last note
          }
        }
        return note;
    }


    const noteChange = (vfNote) => {
        inputHandler(vfNote, currentDuration );
    }

    const noteStep = (step) => { // step>=0 for up in noteNames, <0 -  down
        const note = getCurrentNote();
        if (!note) {
            console.log("No note to change");
            return;
        }
        let position = deepClone(selectedNote); //necessary for being able to  change the last note
        if (position.note<0) {
            position.note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.length -1 ;
        }
        let [noteName, octave] = note.keys[0].split("/")
        const vfNoteNames = Array.from(noteNames.values());
        let index = vfNoteNames.indexOf(noteName);

        if (index<0) {
            console.log("note not found in noteStep: ", noteName);
            return;
        }

        index += step;

        if (index >= vfNoteNames.length ) {
            index = 0;
            octave = (parseInt(octave)+1).toString();
        }

        if (index <0 ) {
            index = vfNoteNames.length-1;
            octave = (parseInt(octave)-1).toString();
        }

        replaceNote(position, [ vfNoteNames[index]+ "/"+octave ], note.duration);

    }

    const restHandler = () => {
        inputHandler("b/4", currentDuration +  "r");
    }

    const invertDot = (duration) => {
        let newDuration = "";

        if (duration.includes("d")) {
            newDuration = duration.replace("d",""); // for several dots need reg.exp
        } else { // add dot
            if (duration.endsWith("r")) {
                newDuration = duration.slice(0, -1) + "dr";
            } else {
                newDuration = duration + "d";
            }
        }
        return newDuration;
    }

    const dotChange = () => {

        //let note = null;
        if (selectedNote.note>=0) {
            if (selectedNote.note - parseInt(selectedNote.note)===0.5) {
                console.log("Selection between notes, no dot");
                return;
            }
            const note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes[selectedNote.note];
            const duration = invertDot(note.duration);
            //console.log("Change dot: ", duration);
            replaceNote(selectedNote, note.keys, duration);
        } else if (notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.length>0) {
            const note =   notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.at(-1);
            const duration = invertDot(note.duration);
            const position = deepClone(selectedNote);
            position.note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.length-1;
            //console.log("Dealing with  last note dot ", selectedNote.note, duration, note,position);
            replaceNote(position, note.keys, duration);
        } else {
            console.log("No note to add dot to");
        }
    }

    const tieChange = () => { // adds or removes tie to the note



        const notation = deepClone(notationInfo);
        console.log("Set/unset tie");
        // TODO: position:

        const note = selectedNote.note>=0 ? notation.staves[selectedNote.staff].measures[selectedNote.measure].notes[selectedNote.note] :
            notation.staves[selectedNote.staff].measures[selectedNote.measure].notes.at(-1);

        // what if the note is the last one in th bar?


        if (!note) {
            console.log("No note");
            return;
        }

        if ( !note.hasOwnProperty("tied") ) {
            note.tied = true; // set
        } else {
            note.tied = !note.tied; // or flip
        }
        //console.log("Tie situation for note: ", note);

        setNotationInfo(notation);
    }

    const durationChange = (newDuration) => {
        console.log("setting new duration to: ", newDuration);
        if (selectedNote.note>=0) { // Need to update notation
            const note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes[selectedNote.note]
            const vfNote = note.keys[0]; // NB! chords not supported!
            const duration = note.duration.endsWith("r") ? newDuration + "r" : newDuration ; // keep it rest if it was before so

            console.log("Change duration of note: ", vfNote);
            inputHandler(vfNote, duration);
        }
        setCurrentDuration(newDuration)
    }

    const inputHandler = ( vfNote, duration="") => {
        const keys = [vfNote]; // maybe send keys as array immediately -  more easy for durationChange
        if (selectedNote.note-parseInt(selectedNote.note) === 0.5) {
            const newPosition = deepClone(selectedNote);
            newPosition.note = selectedNote.note + 0.5; // to insert it into right place
            insertNote(newPosition, keys, duration);
            //console.log("Set selectedNote to: ", newPosition);
            setSelectedNote(newPosition);
        } else if (selectedNote.note<0) { // signals that none selected, insert in the end
            addNote(keys, duration );
        } else {
            replaceNote(selectedNote, keys, duration );
        }
    }



    // piano keyboard - perhaps make later a separate component ?  --------------------
    // for piano keyboard
    const firstNote = (keyboardStartingOctave+1)*12+5; // default - f3
    const lastNote = (keyboardStartingOctave+3)*12 + 4; // for now range is fixed to 2 octaves + maj. third
    // see https://github.com/kevinsqi/react-piano/blob/master/src/KeyboardShortcuts.js for redfining
    const octaveData = {
        maxOctave: 6,
        minOctave: 2
    }

    const handlePlayNote = midiNote => { // called when a MIDI keyboard key is pressed
        const key = notationInfo.staves[0].key; //currentKey ? currentKey : "C";
        console.log ("We are in key: ",  key);


        const vfNote = getVfNoteByMidiNoteInKey(midiNote, key);
        //console.log("vfnote: ", vfNote);
        //console.log("Notation at this point: ", notationInfo);
        if (vfNote) {
            noteChange(vfNote);
        }

        // if (selectedNote.note-parseInt(selectedNote.note) === 0.5) {
        //     const newPosition = deepClone(selectedNote);
        //     newPosition.note = selectedNote.note + 0.5; // to insert it into right place
        //     insertNote(newPosition, [vfNote], currentDuration.toString())
        // } else if (selectedNote.note<0) { // signals that none selected, insert in the end
        //     addNote([vfNote], currentDuration.toString() );
        // } else {
        //     replaceNote(selectedNote, [vfNote], currentDuration.toString() );
        // }


        //const lyNote = getLyNoteByMidiNoteInKey(midiNote, key); // suggests correct enharmonic note for black key depening on the tonality

        // if (vtNote && !chordPopupOpen) {
        //     dispatch(insertVtNote(vtNote));
        // }
        // insert to text in right position, check spaces, add if necessary
        //console.log("lyNote", lyNote);
        //setLyInput(lyInput + " " + lyNote + currentDuration) // later this would enter a vfnote to notationInfo in correct place....

    }


    const handleLyNotation = () => {
        //console.log("commented out...");
        const notation = parseLilypondDictation(lyInput);
        if (notation && setNotationInfo) {
            setNotationInfo(notation);
        } else {
            console.log("Notation error or setter not set");
        }

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
                    <p style={{color:"black", fontSize:"0.6em", textAlign:"left", marginLeft:"3px" }}>C{(midiNumber/12-1)}</p>
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

            </Grid>
        )
    }

    const createNavigationRow = () => {
        return (
            <Grid item container spacing={1}>
                <Grid item>
                    <Button size={"small"} onClick={()=>nextNote(-1)}>Prev. note</Button>
                </Grid>
                <Grid item>
                    <Button size={"small"} onClick={()=>nextNote(1)}>Next note</Button>
                </Grid>
                <Grid item>
                    <Button size={"small"} onClick={()=>nextMeasure(-1)}>Prev. bar</Button>
                </Grid>
                <Grid item>
                    <Button size={"small"} onClick={()=>nextMeasure(1)}>Next bar</Button>
                </Grid>
                <Grid item>
                    <Button size={"small"} onClick={()=>addBar()}>Add bar</Button>
                </Grid>

            </Grid>
        )
    }

    const createExtraButtonsRow = () => {
        return (
            <Grid item container spacing={1}>
                <Grid item>
                    <Button size={"small"} onClick={restHandler}>Rest</Button>
                </Grid>
                <Grid item>
                    <Button size={"small"} onClick={deleteHandler}>Delete</Button>
                </Grid>
                <Grid item>
                    <Button size={"small"} onClick={()=>noteStep(1)}>Note up</Button>
                </Grid>
                <Grid item>
                    <Button size={"small"} onClick={()=>noteStep(-1)}>Note down</Button>
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
            <Grid item container direction={"row"} alignItems={"center"}>
                <Grid item><IconButton onClick={()=>changeStartingOctave(-1)}> <NavigateBeforeIcon /> </IconButton></Grid>
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
                <Grid item><IconButton onClick={()=>changeStartingOctave(1)}><NavigateNextIcon /></IconButton></Grid>
            </Grid>
        )
    }

    const createButtonsRow = () => {
        return (
            <Grid container item direction={"row"} spacing={1} alignItems={"center"}>
                <Grid item>
                    <ToggleButtonGroup
                        value={currentDuration}
                        exclusive
                        onChange={ event => {console.log("event",event.target, event.currentTarget); durationChange(event.currentTarget.value +  (dotted ? "d" : "" ) ) }}
                        aria-label="duration selection"
                    >
                        <ToggleButton value="1" aria-label="whole note">
                            <img src={WholeNote} />
                            <label style={{color:"darkgrey", fontSize:"0.5em", textAlign:"left", marginLeft:"3px", marginTop:"3px" }} >1</label>
                        </ToggleButton>
                        <ToggleButton value="2" aria-label="half note">
                            <img src={HalfNote} />
                        </ToggleButton>
                        <ToggleButton value="4" aria-label="quarter note">
                            <img src={QuarterNote} />
                        </ToggleButton>
                        <ToggleButton value="8" aria-label="eighth note">
                            <img src={EightNote} />
                        </ToggleButton>
                        <ToggleButton value="16" aria-label="sixteenth note">
                            <img src={SixteenthNote} />
                        </ToggleButton>
                        {/*<ToggleButton value="32" aria-label="thirtysecond note">*/}
                        {/*    32*/}
                        {/*</ToggleButton>*/}
                    </ToggleButtonGroup>
                </Grid>
                {/*ToggleButtons is used down here to give similar look, they are simple buttons by function*/}
                <Grid item>
                    <ToggleButton sx={{height:51}} value={"."} aria-label={"add or remove dot"}  onClick={() => dotChange()}>
                       <img src={Dot} width={5} />
                    </ToggleButton>
                </Grid>
                <Grid item>
                    <ToggleButton  value={"rest"} aria-label={"rest"}  onClick={() => restHandler()}><img src={Rest} /></ToggleButton>
                </Grid>
                <Grid item>
                    <ToggleButton sx={{height:51}} value={"tie"} aria-label={"add or remove tie"}  onClick={()=>tieChange()}>
                        <img src={Tie}/>
                    </ToggleButton>
                </Grid>
                <Grid item>
                    <ToggleButton sx={{height:51}} value={"addBar"} aria-label={"add bar"} onClick={()=>addBar()}><img src={AddBar} /></ToggleButton>
                </Grid>
                <Grid item>
                    <ToggleButton sx={{height:51}} value={"delete"} aria-label={"delete"} onClick={()=>deleteHandler()}> <BackspaceIcon /> </ToggleButton>
                </Grid>

                <Grid item>
                    {createShortcutsDialog()}
                </Grid>
            </Grid>
        );
    }



    const createShortcutsDialog = () => {
        //TODO: translation
        return  (
            <Grid item container alignItems={"flex-start"}>
                <IconButton  onClick={() => setDialogOpen(true)} >
                    <HelpOutlineIcon />
                </IconButton>
                <Dialog onClose={()=>setDialogOpen(false)} open={dialogOpen}>
                    <DialogTitle>{"Keyboard shortcuts"}</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                           You can use the following sohrtcuts to enter or change the music:<br />
                            <i>NB! Click somewhere on the screen first to activate the shortcuts!</i><br />
                            <br />
                            Note names: keys c, d, e, f, g, a, b, h. Uppercase (C, D, etc) stands for 2nd octave, ctrl + note name for the small octave.<br />
                            Durations: 1 - whole note, 2 - halfnote, 4 -  quarter, 8 -  eighths, 6 -  sixteenths<br />
                            Rest: r<br />
                            Dot (add or remove): .<br />
                            Tie (add or remove): t<br />
                            Raise or lower note (enharmonics included): arrow up or down <br />
                            Navigation:  left or right moves to the next note, ctrl+left/right to the next/previous bar.<br />
                                <br />
                            Click between the notes to insert notes in the middle of the bar.<br />
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={()=>setDialogOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Grid>
        );
    }





    // TODO: key input needed only in in two parts -  key, radio buttons major/minor
    return <div className={"h5p-musical-dictations-uiDiv"}>
        <Grid container direction={"column"} spacing={1}>
            <Grid container  direction={"column"} spacing={1}>
                <Grid item>Lilypond notation (absolute pitches, german nomenclature):</Grid>
                <Grid item>
                    <textarea rows="3" cols="50" value={lyInput}
                              onChange={ event => setLyInput( event.target.value )}
                              onFocus={()=>setLyFocus(true)}
                              onBlur={()=>setLyFocus(false)}

                    />
                </Grid>
                <Grid item>
                    <Button onClick={ handleLyNotation }>Engrave</Button>
                </Grid>
            </Grid>

            <NotationView id="userNotation" div={"score"} notationInfo={notationInfo} selectedNote={selectedNote} setSelectedNote={setSelectedNote} />

            {/*{createHeaderRow()}*/}
            {/*{createNavigationRow()}*/}
            {/*{createShortcutsDialog()}*/}
            {/*{createExtraButtonsRow()}*/}
            {createButtonsRow()}
            {createPianoRow()}

        </Grid>
    </div>
}
