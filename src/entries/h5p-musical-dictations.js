import "../styles/h5p-musical-dictations.css";
import MusicalDictations from "../scripts/h5p-musical-dictations";

// Load library
H5P = H5P || {};
H5P.MusicalDictations = MusicalDictations;

H5P.MusicalDictations = class extends H5P.ContentType(true) {
    constructor(params, contentId, extras) {
        super();
        this.musicalDictations = new MusicalDictations(params, contentId, extras);

        console.log("Message from entry");
        /**
         * Attach library to DOM.
         * @param wrapper Content's container.
         */
        this.attach = ($wrapper) => {
            this.musicalDictations.attach($wrapper);
        };

    }

};
