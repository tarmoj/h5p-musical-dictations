import "../styles/h5p-hello-world.css";
import MusicalDictations from "../scripts/h5p-musical-dictations";

// Load library
H5P = H5P || {};
H5P.MusicalDictations = MusicalDictations;

H5P.MusicalDictations = class extends H5P.ContentType(true) {
    constructor(params, contentId, extras) {
        super();
        this.musicalDictations = new MusicalDictations(params, contentId, extras);


        /**
         * Attach library to DOM.
         * @param wrapper Content's container.
         */
        this.attach = ($wrapper) => {
            this.musicalDictations.attach($wrapper);
        };

    }

};
