import { InputConfig } from "../model/InputConfig";

import WebGazer from "webgazer";

let eyeTrackingService = {};
let eyeTrackingListeners = [];
let eyeTrackingOptions = {
    provider: InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER
};

function callListeners(data) {
    for (const cb of eyeTrackingListeners) {
        cb(data);
    }
}

function parseConfig(options) {
    if (options.eyeTrackingProvider) eyeTrackingOptions.provider = options.eyeTrackingProvider;
}

function setupEyeTrackingServices() {
    switch (eyeTrackingOptions.provider) {
        case InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER:
            window.applyCalmanFilter = true;
            window.saveDataAccrossSessions = true;
            WebGazer.params.showVideoPreview = true;
            WebGazer.showPredictionPoints(false);
            WebGazer.showVideo(false);
            WebGazer.showFaceOverlay(false);
            WebGazer.showFaceFeedbackBox(false);
            WebGazer.setRegression("ridge");
            WebGazer.setGazeListener(function(data) {
            if (data) {
                const { x, y } = data;
                callListeners({ x, y });
            }
            });
            break;
        case InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD:
            window.GazeCloudAPI.UseClickRecalibration = true;
            window.GazeCloudAPI.OnResult = function(data) {
            if (data) {
                const { docX: x, docY: y } = data;
                callListeners({ x, y });
            }
            };
            break;
        case InputConfig.EYE_TRACKING_PROVIDER_SEESO:
            console.log("DEBUG", InputConfig.EYE_TRACKING_PROVIDER_SEESO);
            break;
    }
}

eyeTrackingService.init = function (inputConfig) {
    console.log("DEBUG", "DUMMY", inputConfig)
    if (inputConfig.eyeTrackingEnabled) {
        parseConfig(inputConfig);
        setupEyeTrackingServices();
    }
}

eyeTrackingService.register = function (cb) {
    if (!eyeTrackingListeners.includes(cb)) eyeTrackingListeners.push(cb);
}

eyeTrackingService.unregister = function (cb) {
    const idx = eyeTrackingListeners.indexOf(cb);
    if (idx > -1) eyeTrackingListeners.splice(idx, 1);
}

eyeTrackingService.calibrate = function () {
    switch (eyeTrackingProvider) {
        case InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER:
            // Do stuff
            break;
        case InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD:
            // Do stuff
            break;
        case InputConfig.EYE_TRACKING_PROVIDER_SEESO:
            // Do stuff
            break;
    }
}

eyeTrackingService.start = function () {
    switch (eyeTrackingOptions.provider) {
        case InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER:
            WebGazer.begin();
            break;
        case InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD:
            window.GazeCloudAPI.StartEyeTracking();
            break;
    }
}

eyeTrackingService.stop = function () {
    switch (eyeTrackingOptions.provider) {
        case InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER:
            WebGazer.clearGazeListener();
            // WebGazer.end(); // FIXME: "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
            break;
        case InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD:
            window.GazeCloudAPI.StopEyeTracking();
            break;
    }
}

export {eyeTrackingService};