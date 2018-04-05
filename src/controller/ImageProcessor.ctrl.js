'use strict';
const fs = require('fs');
const WorkerManager = require('../lib/omr-base/worker/WorkerManager');
const Enumerator = require('../class/Enumerator');
const Config = require('../config/Config');
const path = require('path');
const qrcode = require('mstech-node-qrcode');

/**
 * Detect qrcode in images
 * @class ImageProcessor
 */
class ImageProcessor {

    /**
     * Constructor ExamController
     * @param pathImage {String}
     */
    constructor(pathImage) {
        this.pathImage = pathImage;
    }

    /**
     * Starts the qr code identification process
     * @param callback {Function}
     */
    startProcessingQrCode(callback) {

        if (callback)
            this.callback = callback;

        let objectParse;

        qrcode.decode(this.pathImage, true)
            .then((resultsDecode) => {
                try {
                    objectParse = JSON.parse(resultsDecode);

                    if (!objectParse.hasOwnProperty('Test_Id') || !objectParse.hasOwnProperty('School_Id') || !objectParse.hasOwnProperty('Section_Id') || !objectParse.hasOwnProperty('Student_Id')) {

                        let errTemplate = new Error("QRCode decoded data doesn't have 'Test_Id', 'Section_Id', 'Student_Id' OR 'School_Id'.");
                        errTemplate.details = JSON.stringify(objectParse);
                        this.sendResults(null, errTemplate, objectParse);
                    } else {

                        this.sendResults(null, null, objectParse);
                    }
                } catch (errDecode) {

                    this.sendResults(null, errDecode);
                }
            })
            .catch((err) => {
                this.sendResults(err);
            });
    }

    /**
     * Sends callbacks results to FileOrganizer
     * @param err
     * @param errTemplate
     * @param res
     * @constructor
     */
    sendResults(err, errTemplate, res) {

        if (!err && !errTemplate && res) {
            this.callback(null, null, res);
        } else if (errTemplate) {
            this.callback(null, errTemplate, res);
        } else if (err) {
            this.callback(err);
        }
    }

}

module.exports = ImageProcessor;