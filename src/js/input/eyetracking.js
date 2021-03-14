import { L } from "../util/lquery.js";
import { inputEventHandler } from "./inputEventHandler";
import { InputEventKey } from "../model/InputEventKey";
import { InputConfig } from "../model/InputConfig";

let EyeTracker = {};

EyeTracker.getInstanceFromConfig = function (inputConfig, itemSelector, eyeActiveClass) {
    return new EyeTrackerConstructor(itemSelector, eyeActiveClass, {
        eyeTrackingProvider: inputConfig.eyeTrackingProvider,
        inputEventSelect: inputConfig.eyeTrackingInputs.filter((e) => e.label === InputConfig.SELECT)[0],
    });
};

function EyeTrackerConstructor(itemSelector, eyeActiveClass, options) {
    var thiz = this;

    // options
    var eyeActiveClass = eyeActiveClass;
    var eyeActiveClass = eyeActiveClass;
    var showGazeEstimationPoint = true;
    var clickDuration = 2000;
    var clearTreshold = 800;
    // var eyeTrackingProvider = InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD;
    var eyeTrackingProvider = InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER; // FIXME

    // internal
    var _x = 0;
    var _y = 0;
    var _initialized = false;
    var _updateTime = 0;
    var _lastUpdateTime = 0;
    var _currentGridTarget = null;
    var _previousGridTarget = null;
    var _gazePoint = null;
    var _stats = [];

    function init() {
        parseOptions(options);
    }

    function parseOptions(options) {
        if (options) {
            eyeTrackingProvider = options.eyeTrackingProvider || eyeTrackingProvider;
            showGazeEstimationPoint = options.showGazeEstimationPoint || showGazeEstimationPoint;
        }
    }

    function initEstimationPoint() {
        if (!showGazeEstimationPoint) return;
        _gazePoint = document.createElement("div");
        _gazePoint.style.backgroundColor = "red";
        _gazePoint.style.width = "2rem";
        _gazePoint.style.height = "2rem";
        _gazePoint.style.position = "absolute";
        _gazePoint.style.left = window.innerWidth / 2 + "px";
        _gazePoint.style.top = window.innerHeight / 2 + "px";
        _gazePoint.style.borderRadius = "1rem";
        _gazePoint.style.zIndex = 50;
        document.body.appendChild(_gazePoint);
        thiz._gazePoint = _gazePoint;
    }

    function destroyEstimationPoint() {
        if (!showGazeEstimationPoint || !thiz._gazePoint) return;
        document.body.removeChild(thiz._gazePoint);
        thiz._gazePoint = null;
    }

    function updateEstimationPoint() {
        thiz._gazePoint.style.left = thiz._x + "px";
        thiz._gazePoint.style.top = thiz._y + "px";
    }
    
    function initStats() {
        thiz._stats = L.selectAsList(itemSelector).map(elem => {
            return {
                id: elem.id,
                counter: 0,
                timestamp: 0,
            };
        });
    }

    function estimateGaze() {
        const currentTarget = document.elementFromPoint(thiz._x, thiz._y);
        thiz._currentGridTarget = L.selectAsList(itemSelector).find(elem => elem.contains(currentTarget) || elem === currentTarget);
    }

    function updateStats() {
        if (thiz._previousGridTarget && thiz._previousGridTarget === thiz._currentGridTarget) {
            const gridElemStats = thiz._stats.find(({ id }) => id === thiz._currentGridTarget.id);
            if (gridElemStats.timestamp) {
                gridElemStats.counter += thiz._updateTime - gridElemStats.timestamp;
            }
            gridElemStats.timestamp = thiz._updateTime;
        }

        for (let stat of thiz._stats) {
            const lastVisit = thiz._updateTime - stat.timestamp;
            if (lastVisit > clearTreshold) {
                stat.counter -= lastVisit;
            }
            if (stat.counter < 0) stat.counter = 0;
        }

        thiz._previousGridTarget = thiz._currentGridTarget || thiz._previousGridTarget;
    }

    function resetStats() {
        for (let stat of thiz._stats) {
            stat.counter = 0;
            stat.timestamp = thiz._updateTime;
        }
    }

    function updateGrid() {
        const grid = L.selectAsList(itemSelector)
        for (let elem of grid) {
            const elemStats = thiz._stats.find(({ id }) => id === elem.id);
            const percentage = Math.round((elemStats.counter / clickDuration) * 100);
            const percentageClass = step(percentage, 5);
            const currentClasses = Array.from(elem.classList);
            currentClasses.filter(className => className.startsWith(eyeActiveClass)).forEach(className => elem.classList.remove(className));
            elem.classList.add(eyeActiveClass + "-" + percentageClass);
        }
    }

    function step(value, step, min = 0, max = 100) {
        const clamp = Math.max(min, Math.min(max, value));
        const count = ((max - min) / step) + 1;
        const values = new Array(count).fill(0, 0, count).map((e, i) => i * step);
        const distances = values.map((v) => Math.abs(v - clamp));
        const nearestValue = Math.min(...distances);
        const valuePos = distances.findIndex((e) => e === nearestValue);
        return values[valuePos];
    }

    function evaluateStats() {
        const maxCounter = Math.max(...thiz._stats.map(({ counter }) => counter));
        if (maxCounter > clickDuration) {
            const elementIdx = thiz._stats.findIndex(stat => maxCounter === stat.counter);
            const { id } = thiz._stats[elementIdx];
            const gridElement = document.getElementById(id);
            resetStats();
            gridElement.click();
        }
    }

    function initEyeTracking() {
        console.log("DEBUG", "initEyeTracking");
        initStats();
        initEstimationPoint();
        thiz._initialized = true;
    }

    function updateEstimationPoints({x, y}) {
        thiz._updateTime =  Date.now();
        thiz._x = x;
        thiz._y = y;
    }

    thiz.update = function (data) {
        if (!thiz._initialized) initEyeTracking();

        updateEstimationPoints(data);
        estimateGaze();
        updateStats();
        updateGrid();
        updateEstimationPoint();
        evaluateStats();
        // console.log("DEBUG", "update", thiz._stats);
    }
    
    thiz.destroy = function () {
        destroyEstimationPoint();
        thiz._initialized = false;
    };
    init();
}

export { EyeTracker };
