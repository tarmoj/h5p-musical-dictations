import React, {useRef, useEffect, useState} from 'react'
import VexFlow, {Dot} from 'vexflow';

const VF = VexFlow.Flow;
const { Renderer } = VF;


const defaultNotationInfo = {
    options: "", // scale, width, space etc, if needed
    staves: [
        {
            clef:"treble",
            key:"D",
            time: "4/4",
            measures : [ {
                number : 1, // optional
                startBar: "", // optional can be: |  ||  |. etc (lilypond style)  :|.
                endBar: "|",
                // also possible to define new key or clef here
                // in the code -  if measure.hasOwnProperty.clef etc
                notes: [ { clef: "treble", //how to use staveClef of the paren here?
                    keys: ["d/4"], duration: "8", auto_stem: "true"
                },
                    { clef: "treble", //how to use staveClef of the paren here?
                        keys: ["c#/5"], duration: "8", auto_stem: "true"
                    },
                    { clef: "treble", //how to use staveClef of the paren here?
                        keys: ["a/4"], duration: "4", auto_stem: "true"
                    },
                    { clef: "treble", //how to use staveClef of the paren here?
                        keys: ["b/4"], duration: "2", auto_stem: "true"
                    } ]
            },
                {
                    number: 2, // optional
                    startBar: "", // optional can be: |  ||  |. etc (lilypond style)  :|.
                    endBar: "|.",
                    // also possible to define new key or clef here
                    // in the code -  if measure.hasOwnProperty.clef etc
                    notes: [
                        {
                            clef: "treble", //how to use staveClef of the paren here?
                            keys: ["a/4"], duration: "1", auto_stem: "true"
                        }
                    ]
                }
            ],


        }
    ],
};


export function NotationView({
                           notationInfo = defaultNotationInfo,
                           width = 900,
                           height = 400,
                           staffHeight = 100
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


    }, [notationInfo, width, height]); // allNotes maybe wrong here -  the handleClick should be updated...


    useEffect( () => { // this works!
            rendererRef.current.getContext().svg.onclick = (event) => handleClick(event);
            console.log("allNotes updated, update handleClick");
        }, [allNotes]
    );

    const scale = 1;
    const handleClick = (event) => {

        let x = event.layerX  / scale;
        let y = event.layerY / scale;
        console.log("Clicked: ", x,y, event);
        console.log("Target: ", event.target.getBoundingClientRect() );

        // target is not always the svg...
        //console.log("Renderer, Context:", rendererRef.current.getContext().svg.getBBox() );

        // y is different when scrolled!! try to get Y from stave
        const svgY = rendererRef.current.getContext().svg.getBoundingClientRect().y  + window.scrollY ;
        //console.log(svgY);
        const clickedStaff = (y>svgY + staffHeight+20 && defaultNotationInfo.staves.length > 1 ) ? 1 : 0; // not best condition, for tryout only...
        console.log("clickedStaff: ", clickedStaff);
        console.log("Length of allNotes: ", allNotes.length);

        const index =  findClosestNoteByX(x, clickedStaff);
        if (index >= 0) {
            const staveNote = allNotes[clickedStaff][index];
            console.log("staveNote: ", staveNote.style);
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
        console.log("Allnotes in function:", allNotes[staffIndex]);

        if (allNotes[staffIndex].length<=0) {
            console.log("No notes", allNotes[staffIndex]);
            return -1;
        }

        for (let note of allNotes[staffIndex] ) { // NB! maybe a function needed getAllNotes(staff)
            //console.log("Note x: ", note.getAbsoluteX(),note.getY());
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
        //TODO: we need some structure to hold the VexFlow Score. similar to System.
        let allNotes = [[], []]; // ready for two staves
        const vfStaves = [[], []]; //  NB! think of better name! this is vexflow staves actually. do we need to store them at all? -  later: define by stave count [ Array(notationIfo.staves.length ]
        const measureWidth = 200;

        let startY = 0;
        let startX = 10;
        const formatter = new VF.Formatter();


        // vertical alignment: https://github.com/0xfe/vexflow/wiki/The-VexFlow-FAQ

        for (let measureIndex = 0; measureIndex < notationInfo.staves[0].measures.length; measureIndex++) { // should we check if there is equal amount of measures?
            let width = measureWidth;
            let staffBeams = [];
            let ties = [];


            const voices = [];
            let necessaryWidth = 160 ; // for formatter.preCalculateMinTotalWidth

            // need to format all staves (vertically together)
            for (let staffIndex = 0; staffIndex < notationInfo.staves.length; staffIndex++) {
                const staff = notationInfo.staves[staffIndex];

                const notationMeasure = staff.measures[measureIndex];

                const newMeasure = new VF.Stave(startX, startY + staffIndex * staffHeight, width); // TODO: width by signs in the key signature via VF.Music?

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

                vfStaves[staffIndex].push(newMeasure);
                let staveNotes = [];

                for (let note of notationMeasure.notes) {
                    const staveNote = new VF.StaveNote(note);
                    // double dot not implemented yet
                    if (note.duration.substr(-1) === "d") { //if dotted, add modifier
                        console.log("Dotted note!")
                        Dot.buildAndAttach([staveNote], {all: true});
                    }
                    staveNotes.push(staveNote);
                    console.log("Added to bar: ", note.keys);
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

                necessaryWidth = notationMeasure.notes.length * 40 ; // just calculate the space by number of notes...

                if (measureIndex === 0) {
                    width = newMeasure.getNoteStartX() + necessaryWidth + 20; // 20 a bit of extra space
                } else {
                    width = necessaryWidth + 40;
                }
                ;
                //console.log("width: ", necessaryWidth, width, newMeasure.getNoteStartX());

                newMeasure.setWidth( width);
                newMeasure.setContext(context).draw();

            }


            //console.log("necessary w. befor formattter.format", necessaryWidth);
            formatter.format(voices, necessaryWidth);

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
            startX += width;

        }

        setAllNotes(allNotes); // does not seem to work . maybe it is even better
    }

    return <div ref={container} />
}
