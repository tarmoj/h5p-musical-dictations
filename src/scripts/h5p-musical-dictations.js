import React from "react";
import * as ReactDOM from "react-dom";
import Main from "./components/Main";

const $ = H5P.jQuery;

export default class MusicalDictations extends H5P.ContentType(true) {
    /**
     * @constructor
     *
     * @param {object} params Parameters passed by the editor.
     * @param {number} contentId Content's id.
     * @param {object} [extras] Saved state, metadata, etc.
     */
    constructor(params, contentId, extras = {}) {
        super();
        console.log("params: ", params);

        // Create render root
        this.root = document.createElement("div");

        // params come in as encoded html, need to decode
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

        this.showFromDiction = decodeHtml(params.show);

        this.audioFile = params.audioFile;
        this.id = contentId;

        //temporary, later think about translation (H5P or independent):
        this.l10n = {"euSupportText" : "The project is supported by EU social Fund"};

        console.log("correctLy, audio:", this.correctLyDictation, this.audioFile);

        const resize = () => { console.log("resize function called", this); this.trigger("resize"); } // to be forwarded to React components

        /**
         * Attach library to wrapper.
         *
         * @param {jQuery} $wrapper Content's container.
         */
        this.attach = function ($wrapper) {
            $wrapper.addClass('h5p-musical-dictations');

            $wrapper.append($('<div>'), {id:'explanation'}).html('Listen to the musical excerpt, write down the notation. <br />');

            //audio
            const audioFile = this.audioFile;
            const relativeAudioFilePath = audioFile[0].path;
            const absolutePath = H5P.getPath(relativeAudioFilePath, this.id);
            console.log("Create audio for: ", absolutePath);
            $wrapper.append( $('<audio>', {
                id: "audioPlayer",
                class: "shadow",
                src: absolutePath,
                controls: true
            }) );

            $wrapper.append(this.root);  // for Rect components

            const euLogoPath = H5P.getLibraryPath(this.libraryInfo.versionedNameNoSpaces) + "/eu.jpg";
            console.log("logo path:", euLogoPath);

            const $euDiv = $('<div>', {id:"euDiv"}).html("<br /><p><small>" + this.l10n.euSupportText +  "</small></p>");
            $euDiv.append(
                $('<img>', {
                    id: "euLogo",
                    alt: this.l10n.euSupportText,
                    width: "200px",
                    align: "left",
                    src: euLogoPath,
                    load: () => this.trigger("resize")
                })
            );

            $wrapper.append($euDiv);

            // this.root is the container for React content
            ReactDOM.render(
                <div>
                    <Main correctDictation={this.correctLyDictation} showFromDictation={ this.showFromDiction} resizeFunction={resize}/>
                </div>,
                this.root
            );

        };
    }
}
