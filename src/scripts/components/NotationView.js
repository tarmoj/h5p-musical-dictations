import React, {useRef, useEffect, useState} from 'react'
import VexFlow from 'vexflow';
import {defaultNotationInfo} from './notationUtils';


const VF = VexFlow.Flow;
const { Renderer } = VF;


export function NotationView({
                                 notationInfo = defaultNotationInfo,
                                 width = 500, // this will be expanded when notation will grow longer
                                 height = 140,
                                 staffHeight = 100,
                                 selectedNote, setSelectedNote
                             }) {
    const container = useRef()
    const rendererRef = useRef()

    const [allNotes, setAllNotes] = useState([[],[]]);



    useEffect(() => { // this is actually redraw function...
        console.log("Effect / redraw?");
        if (rendererRef.current == null) {
            rendererRef.current = new Renderer(
                container.current,
                Renderer.Backends.SVG
            ) ;
            // try adding on click listener
            rendererRef.current.getContext().svg.onclick = (event) => handleClick(event);
        }
        const renderer = rendererRef.current;
        renderer.resize(width, height) // this has no effect with factory, it seems...
        const context = renderer.getContext();
        context.clear();
        context.setFont('Arial', 10, '').setBackgroundFillStyle('#eeeedd');

        draw(notationInfo, context); // should we also pass renderer? or context?

        // try: does not work...
        //    window.dispatchEvent(new Event('resize')); // for any case


    }, [notationInfo, width, height]); // allNotes maybe wrong here -  the handleClick should be updated...


    useEffect( () => { // this works!
            rendererRef.current.getContext().svg.onclick = (event) => handleClick(event);
            console.log("allNotes updated, update handleClick");
        }, [allNotes]
    );

    const scale = 1;
    const handleClick = (event) => {  // maybe - require click on notehead??
        // console.log("Click on: ", event.target.parentElement.className);
        // if (event.target.parentElement.className === "vf-notehead") {
        //     console.log("This is notehead");
        // }
        // just tryout not certain if valid:
        console.log("Target: ", event.target, event.target.getBoundingClientRect().x );
        const offsetX = rendererRef.current.getContext().svg.getBoundingClientRect().x  + window.scrollX ;;//event.target.getBoundingClientRect().x;
        const offsetY = 0; //event.target.getBoundingClientRect().y;
        console.log("OffsetX: ", offsetX);

        let x = (event.layerX - offsetX)  / scale;
        let y = event.layerY / scale;
        console.log("Clicked: ", x,y, event);


        // target is not always the svg...
        console.log("Renderer, Context:", rendererRef.current.getContext().svg.getBBox() );

        // y is different when scrolled!! try to get Y from stave
        const svgY = rendererRef.current.getContext().svg.getBoundingClientRect().y  + window.scrollY ;
        //console.log(svgY);
        const clickedStaff = (y>svgY + staffHeight+20 && defaultNotationInfo.staves.length > 1 ) ? 1 : 0; // not best condition, for tryout only...
        console.log("clickedStaff: ", clickedStaff);

        const index =  findClosestNoteByX(x, clickedStaff);
        if (index >= 0) {
            // set global/context currentPosition
            // etiher find measureindex or better organize the stavenotes by measures. or add them to notationInfo; that is stupid, since there is so much doubleing
            if (setSelectedNote) {
                const position = {note: index, measure: 0, staff: clickedStaff};
                setSelectedNote(position);
            } else {
                console.log("SetSelected not set");
            }

            const staveNote = allNotes[clickedStaff][index];
            //console.log("staveNote: ", staveNote.style);
            let color = "black";
            if (! staveNote.style) { // if not defined, default is black, make it red
                color = "red"
            } else {
                color = staveNote.style.fillStyle === "red" ? "black" : "red";   // otherwise switch
            }

            const style = {fillStyle: color, strokeStyle: color};
            staveNote.setStyle(style);
            staveNote.setStemStyle(style);
            staveNote.setFlagStyle(style);
            staveNote.setContext(rendererRef.current.getContext()).draw();
        }


    };

    const findClosestNoteByX = (x, staffIndex=0) => {
        let indexOfClosest = -1, minDistance = 999999, i = 0;
        //console.log("Allnotes in function:", allNotes[staffIndex]);

        if (allNotes[staffIndex].length<=0) {
            console.log("No notes", allNotes[staffIndex]);
            return -1;
        }

        for (let note of allNotes[staffIndex] ) { // NB! maybe a function needed getAllNotes(staff)
            console.log("Note x: ", note.getAbsoluteX());
            let distance = Math.abs(x - note.getAbsoluteX());
            if (distance < minDistance) {
                indexOfClosest = i;
                minDistance = distance;
            }
            i++;
        }
        console.log("Closest: ", indexOfClosest);
        return indexOfClosest;
    };

    const draw = (notationInfo, context) => {
        let allNotes = [[], []]; // ready for two staves
        const vfStaves = [[], []]; //  NB! think of better name! this is vexflow staves actually. do we need to store them at all? -  later: define by stave count [ Array(notationIfo.staves.length ]
        const defaultWidth = 200;
        //How can I pre-calculate the width of a voice?
        //
        // You can call Formatter.getMinTotalWidth() to return the minimum amount of horizontal space required to render a voice.

        let startY = 0;
        let startX = 10;
        const formatter = new VF.Formatter();


        // vertical alignment: https://github.com/0xfe/vexflow/wiki/The-VexFlow-FAQ

        for (let measureIndex = 0; measureIndex < notationInfo.staves[0].measures.length; measureIndex++) { // should we check if there is equal amount of measures?
            let measureWidth = defaultWidth;
            let staffBeams = [];
            let ties = [];

            // if (measureIndex === 0) { // OR: hasOwnProperty("clef" etc
            //   measureWidth += clefAndKeySpace;
            // }

            const voices = [];
            let necessaryWidth = 160 ; // for formatter.preCalculateMinTotalWidth

            // need to format all staves (vertically together)
            for (let staffIndex = 0; staffIndex < notationInfo.staves.length; staffIndex++) {
                const staff = notationInfo.staves[staffIndex];

                const notationMeasure = staff.measures[measureIndex];

                const newMeasure = new VF.Stave(startX, startY + staffIndex * staffHeight, measureWidth);

                if (measureIndex === 0) { // OR: hasOwnProperty("clef" etc
                    newMeasure.addClef(staff.clef).addKeySignature(staff.key).addTimeSignature(staff.time);
                }


                let type = VF.Barline.type.SINGLE;
                if (staff.measures[measureIndex].endBar) {
                    switch (staff.measures[measureIndex].endBar)  {
                        case "||" : type = VF.Barline.type.DOUBLE; break;
                        case "|." : type = VF.Barline.type.END; break;
                        case ".|:" : type = VF.Barline.type.REPEAT_BEGIN; break;// this mus be actually startBarType -  fix later
                        case ":|." : type = VF.Barline.type.REPEAT_END; break;
                        case ":|.|:" : type = VF.Barline.type.REPEAT_BOTH; break;
                        default: type = VF.Barline.type.SINGLE;
                    }
                }

                if (measureIndex === staff.measures.length - 1 ) { // last bar // notationMeasure.hasOwnProperty("endBar") vms
                    type = VF.Barline.type.END;
                }
                newMeasure.setEndBarType(type);
                //newMeasure.setContext(context).draw(); // maybe must be drewn after creating notes to know
                //
                // the width


                vfStaves[staffIndex].push(newMeasure); // or proably push is better // do we need it at all, actually?
                let staveNotes = [];

                for (let note of notationMeasure.notes) {
                    const staveNote = new VF.StaveNote(note);
                    if (note.hasOwnProperty("color")) {
                        staveNote.setStyle({fillStyle: note.color, strokeStyle: note.color});
                    }
                    // double dot not implemented yet
                    if (note.duration.substr(-1) === "d") { //if dotted, add modifier
                        console.log("Dotted note!")
                        VF.Dot.buildAndAttach([staveNote], {all: true});
                    }
                    staveNotes.push(staveNote);
                    //console.log("Added to bar: ", note.keys);
                }

                // now when stavenotes are created, look for ties
                for (let i=0; i<notationMeasure.notes.length-1; i++) {
                    const note = notationMeasure.notes[i];
                    if (note.hasOwnProperty("tied"))  {
                        console.log("Found tie by index: ", i, note.tied);
                        ties.push( new VF.StaveTie( {
                            first_note: staveNotes[i],
                            last_note: staveNotes[i+1],
                            first_indices: [0],
                            last_indices: [0],
                        }  ) );

                    }
                }

                const voice = new VF.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(staveNotes).setStave(newMeasure);
                VF.Accidental.applyAccidentals([voice], staff.key);
                const beams = VF.Beam.applyAndGetBeams(voice);
                staffBeams = staffBeams.concat(beams);
                allNotes[staffIndex].push(...staveNotes); //push as values (similar to concat)
                formatter.joinVoices([voice]);
                voices[staffIndex] = voice;
                // kind of works but needs more work - clefAndKeySpace -  find out by the key (how many accidentals, use minimum bar width (measureWidth)
                // find out width that is used also for formatter.format.
                // NB! Test with two-staff notation!

                // setting width not correct


                // does not work, since there is more and more notes in the voice and necessaryWidth gets bigger, something wrong here..

                //necessaryWidth = formatter.preCalculateMinTotalWidth([voice]) * 1.5;
                necessaryWidth = notationMeasure.notes.length * 40 ; // just calculate the space by number of notes...
                if (measureIndex === 0) {
                    measureWidth = newMeasure.getNoteStartX() + necessaryWidth + 20; // 20 a bit of extra space
                } else {
                    measureWidth = necessaryWidth + 40;
                }
                //if (measureIndex === 0) measureWidth += clefAndKeySpace;
                console.log("measureWidth: ", necessaryWidth, measureWidth, newMeasure.getNoteStartX());
                // if (testWidth>100) {
                //   measureWidth += testWidth;
                // }
                //
                newMeasure.setWidth( measureWidth);
                newMeasure.setContext(context).draw();

            }

            //formatter.format(voices); // was

            console.log("necessary w. befor formattter.format", necessaryWidth);
            formatter.format(voices, necessaryWidth);
            // let testWidth = formatter.getMinTotalWidth();
            // console.log("minTotalWidth: ", testWidth);

            voices.forEach((v) => v.setContext(context).draw());
            staffBeams.forEach((beam) => beam.setContext(context).draw());

            // and other drawings -  ties, tuplets, slurs etc

            ties.forEach((t) => {
                t.setContext(context).draw();
            });


            // staveconnector
            if (notationInfo.staves.length>1) {
                if (notationInfo.staves.length>1) { // add Connector
                    const connector = new VF.StaveConnector(vfStaves[0][0], vfStaves[notationInfo.staves.length-1][0]);
                    connector.setType(VF.StaveConnector.type.BOLD_DOUBLE_LEFT);
                    connector.setContext(context).draw();
                }
            }
            startX += measureWidth;
            if (startX>width) {
                console.log("the width grew too big!", startX);
                rendererRef.current.resize(startX+40, height);
            }
        }


        setAllNotes(allNotes); // does not seem to work . maybe it is even better
    }

    return <div className={"h5p-musical-dictations-notationDiv"}> <div ref={container} /> </div>
}
