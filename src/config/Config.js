'use strict';
var ConfigBase;
ConfigBase = require('../lib/omr-base/config/Config');

class Config extends ConfigBase {

    /**
     * Get File Resource Configuration
     * @return {Object|Boolean}         File Resource Object
     */
    static get FileResource() {
        //TODO: Config for Database Resource
        return {
            TYPE: Config.resource.FILE_RESOURCE || 0,
            PATH: {
                BASE: Config.resource.FILE_BASEPATH || "/fileOrganizer"
            },
            DIRECTORY: {
                SCANNED: Config.resource.FILE_SCAN || "/scanned",
                ORIGINAL: Config.resource.FILE_ORIGINALDIR || "/original",
                EQUALIZED: Config.resource.FILE_EQUALIZEDDIR || "/equalized",
                RESULT: Config.resource.FILE_RESULTDIR || "/result",
                ERROR: Config.resource.FILE_ERROR || "/error",
                STAGING: Config.resource.FILE_STAGING || "/staging"
            }
        }
    }

    /**
     * Get Log configuration
     * @return {Object} Log configuration
     * @static
     */
    static get Log() {
        return {
            BASE_FILE: Config.resource.LOG_PATH || '/var/log/omr-fileorganizer.log',
            ROTATE_PATTERN: Config.resource.LOG_ROTATE_PATTERN || 'yyyy-MM-dd'
        }
    }

    /**
     *
     * @returns {{X: number, Y: number, WIDTH: number, HEIGHT: number}}
     * @constructor
     */
    static get CropRate() {
        return {
            X: .7,
            Y: 0,
            WIDTH: 1,
            HEIGHT: .35
        }
    }

    static get ImageMagickPath() {
        return Config.resource.IMAGE_MAGICK_PATH || ''
    }
}

module.exports = Config;