import {L} from "../util/lquery.js";
import {inputEventHandler} from "./inputEventHandler";
import {InputEventKey} from "../model/InputEventKey";
import {InputConfig} from "../model/InputConfig";

import WebGazer from "webgazer";

let EyeTracker = {};

EyeTracker.getInstanceFromConfig = function (inputConfig, itemSelector) {
    return new EyeTrackerConstructor(itemSelector, {
      eyeTrackingProvider: inputConfig.eyeTrackingProvider,
      inputEventSelect: inputConfig.eyeTrackingInputs.filter((e) => e.label === InputConfig.SELECT)[0],
    });
};

function EyeTrackerConstructor(itemSelector, options) {
    var thiz = this;

    // options
    var itemSelector = itemSelector;
    var eyeTrackingProvider = InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD;

    // internal
    var _x = 0;
    var _y = 0;
    var _isTracking = false;

    function init() {
        parseOptions(options);
    }

    function parseOptions(options) {
        if (options) {
            eyeTrackingProvider = options.eyeTrackingProvider || eyeTrackingProvider;
        }
    }

    thiz.initTracking = function () {
        switch (eyeTrackingProvider) {
            case InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER:
                window.applyCalmanFilter = true;
                window.saveDataAccrossSessions = true;
                WebGazer.params.showVideoPreview = true;
                WebGazer.showPredictionPoints(false);
                WebGazer.showVideo(false);
                WebGazer.showFaceOverlay(false);
                WebGazer.showFaceFeedbackBox(false);
                WebGazer.setRegression("ridge").setGazeListener(function (data) {
                    if (data) {
                        thiz._x = data.x;
                        thiz._y = data.y;
                        console.log("DEBUG - Prediction Update", { x: thiz._x, y: thiz._y });
                    }
                });
                break;
            case InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD:
                window.GazeCloudAPI.UseClickRecalibration = true;
                window.GazeCloudAPI.OnResult = function(data) {
                    if (data) {
                        thiz._x = data.docX;
                        thiz._y = data.docY;
                        console.log("DEBUG - Prediction Update", { x: thiz._x, y: thiz._y });
                    }
                };
                break;
            case InputConfig.EYE_TRACKING_PROVIDER_SEESO:
                console.log("DEBUG", InputConfig.EYE_TRACKING_PROVIDER_SEESO);
                break;
        }
    }

    thiz.calibrateTracking = function () {
        switch (eyeTrackingProvider) {
            case InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER:
                // Do stuff
                break;
            case InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD:
                // Do stuff
                break;
        }
    };

    thiz.startTracking = function () {
        if (!_isTracking) {
            _isTracking = true;
            switch (eyeTrackingProvider) {
                case InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER:
                    WebGazer.begin();
                    break;
                case InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD:
                    window.GazeCloudAPI.StartEyeTracking();
                    break;
            }
        }
    };

    thiz.stopTracking = function () {
        _isTracking = false;
        switch (eyeTrackingProvider) {
            case InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER:
                WebGazer.clearGazeListener();
                WebGazer.end();
                break;
            case InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD:
                window.GazeCloudAPI.StopEyeTracking();
                break;
        }
    };

    // thiz.getCurrentPrediction = function () {
    //     return { x: _x, y: _y };
    // }

    thiz.destroy = function () {
        thiz.stopTracking();
    }
    init();
}

export {EyeTracker};