import React from "react";
import * as ReactDOM from "react-dom";
import Main from "./components/Main";

export default class MusicalDictations {
    /**
     * @constructor
     *
     * @param {object} params Parameters passed by the editor.
     * @param {number} contentId Content's id.
     * @param {object} [extras] Saved state, metadata, etc.
     */
    constructor(params, contentId, extras = {}) {
        console.log("params: ", params);

        // Create render root
        this.root = document.createElement("div");

        // one problem is, that params come in as encoded html
        const  decodeHtml = (text) => {
            return text
                .replace(/&amp;/g, '&')
                .replace(/&lt;/ , '<')
                .replace(/&gt;/, '>')
                .replace(/&quot;/g,'"')
                .replace(/&#039;/g,"'");
        }


        this.correctLyDictation = decodeHtml(params.lyNotation) || `
          \\clef "treble" \\key c \\major \\time 2/4  
    c'4 c'8 d'8 | 
    e'4 e'8 f'8 | 
    g'8 a'8 g'8 f'8 | 
    g'4 g'4 \\bar "|."     
                   
        `;

        console.log("correctLy:", this.correctLyDictation);

        /**
         * Attach library to wrapper.
         *
         * @param {jQuery} $wrapper Content's container.
         */
        this.attach = function ($wrapper) {
            $wrapper.addClass('h5p-musical-dictations');
            $wrapper.append('<button onclick="console.log(window);  window.dispatchEvent(new Event(\'resize\'))">Resize</button');

            $wrapper.append(this.root);

            // We render an initial state of the content type here. It will be updated
            // later when the data from the server has arrived.
            // this.root is the container for React content
            ReactDOM.render(
                <div>
                    <h1>React dictation test 05</h1>
                    <Main correctDictation={this.correctLyDictation}/>
                </div>,
                this.root,
                () => {
                    console.log("Loaded");
                    window.dispatchEvent(new Event('resize')); // does not work
                }
            );

        };
    }
}
