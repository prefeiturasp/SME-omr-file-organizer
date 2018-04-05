'use strict';
const path = require('path');
const fs = require('fs');
const Config = require('../config/Config.js');
const ImageMagick = require('gm').subClass({imageMagick: true, appPath: Config.ImageMagickPath});
const WorkerManager = require('../lib/omr-base/worker/WorkerManager');
const ImageProcessor = require('../controller/ImageProcessor.ctrl.js');
const Enumerator = require('../class/Enumerator.js');
const Connector = require('../lib/omr-base/connector/ConnectorManager')(Config, Enumerator);

/**
 * @class FileOrganizer
 */
class FileOrganizer {

    /**
     * Pré configuration
     */
    constructor() {
        this.sendFiles = {};
        this.fileError = {
            externalId: null,
            processStatus: null,
            description: ""
        };
        this.countError = 0;
        this.countSuccess = 0;
    }

    /**
     * Initialize process
     */
    init() {
        logger.info('Started', {
            resource: {
                process: "FileOrganizer.init",
            }
        });

        Connector.GetExamList()
            .then((filesReceived) => {
                if (filesReceived) {
                    this.filesReceived = filesReceived;
                    this.processStart();

                } else {
                    process.exit(0);
                }
            })
            .catch(() => {
                process.exit(1);
            });
    }

    /**
     * Handler images list for detection
     */
    processStart() {
        var wM = new WorkerManager();
        var examsBasePath = this.filesReceived.path;

        this.filesReceived.files.forEach((file, i) => {

            /**
             * name: EqualizeImage
             */
            wM.Push({
                name: `EqualizeImage${i}`,
                depends: i == 0 ? '' : `SendsImageProcessing${i - 1}`,
                job: WorkerManager.JobList.EqualizeImage,
                params: [
                    ImageMagick,
                    examsBasePath + "\\" + file.name,
                    examsBasePath,
                    {
                        w: 72,
                        h: 72
                    },
                    {
                        w: 595,
                        h: 842
                    },
                    2,
                    1,
                    null,
                    40,
                    true
                ]
            });

            wM.Push({
                name: `SendsImageProcessing${i}`,
                depends: `EqualizeImage${i}`,
                job: (() => {
                    var _c, Data, Handler;

                    Handler = (error, errTemplate, res) => {
                        if (error || errTemplate) {

                            this.countError++;

                            this.fileError.externalId = file.externalId;
                            this.fileError.processStatus = Enumerator.ProcessStatus.FO_ERROR;
                            if (error) this.fileError.description = error.message;
                            if (errTemplate) this.fileError.examOwner = res;

                            logger.error((error? error.message: errTemplate.message), {
                                resource: {
                                    process: `FileOrganizer.processStart.SendsImageProcessing.${i}`,
                                    params: [file.fileOriginalName, file.externalId]
                                },
                                detail: {
                                    description: error || errTemplate
                                }
                            });

                            Connector.SendFoLog(this.fileError)
                                .then(()=> {
                                    _c();
                                })
                                .catch (()=> {
                                    _c();
                                });
                        } else {

                            this.countSuccess++;

                            if (this.sendFiles.hasOwnProperty(res.Test_Id + "")) {
                                this.sendFiles[res.Test_Id].push(file.externalId);
                            } else {
                                this.sendFiles[res.Test_Id] = [];
                                this.sendFiles[res.Test_Id].push(file.externalId);
                            }

                            logger.debug('File detect: ', res);
                            _c();
                        }
                    };

                    return {
                        Config: function (_callback, _sharedData) {
                            _c = _callback;
                            Data = _sharedData;
                        }.bind(this),
                        Run: function () {

                            let extName = path.extname(file.name);
                            let baseName = path.basename(file.name, extName);
                            let imageProcessor = new ImageProcessor(path.normalize(examsBasePath + "\\" + baseName + "." + Enumerator.FileExtensions.PNG), logger);
                            imageProcessor.startProcessingQrCode(Handler);

                        }.bind(this)
                    }
                })()
            });
        });

        wM.RunJob(this.jobCallback.bind(this));
    }

    /**
     * Handler workers results
     * @param error {Object} error details
     */
    jobCallback(error) {
        if (error) {
            logger.error(error.message, {
                resource: {
                    process: `FileOrganizer.jobCallback`
                },
                detail: {
                    description: error
                }
            }, () => {
                process.exit(1);
            });
        }
        else {
            Connector.SendFilesByTestIds(this.sendFiles)
                .then(()=> {
                    this.removeFilesAndFolder();
                })
                .catch(() => {
                    this.removeFilesAndFolder();
                });
        }
    }

    /**
     * Remove files and folder
     */
    removeFilesAndFolder() {
        if (fs.lstatSync(this.filesReceived.path).isDirectory()) {
            fs.readdir(this.filesReceived.path, (error, files)=> {
                if (error) {
                    return logger.info(error.message, {
                        resource: {
                            process: `FileOrganizer.removeFilesAndFolder`,
                            params: [this.filesReceived.path]
                        },
                        detail: {
                            description: error
                        }
                    }, () => {
                        process.exit(1);
                    });
                }

                try {
                    files.forEach((file)=> {
                        let curPath = this.filesReceived.path + "/" + file;
                        fs.unlinkSync(curPath);
                    });

                    fs.rmdirSync(this.filesReceived.path);

                    logger.info('Finished', {
                        resource: {
                            process: `FileOrganizer.removeFilesAndFolder`,
                            params: [this.filesReceived.path]
                        },
                        detail: {
                            body: {
                                total: this.countSuccess + this.countError,
                                success: this.countSuccess,
                                error: this.countError
                            }
                        }
                    }, () => {
                        process.exit(0);
                    });
                } catch (error) {
                    logger.info(error.message, {
                        resource: {
                            process: `FileOrganizer.removeFilesAndFolder`,
                            params: [this.filesReceived.path]
                        },
                        detail: {
                            description: error
                        }
                    }, () => {
                        process.exit(1);
                    });
                }
            });
        }
    }
}

module.exports = FileOrganizer;