import {GridElement} from "./GridElement.js";

class GridElementCollect extends GridElement.extend({
    showLabels: [Boolean],
    imageHeightPercentage: [Number],
    mode: [String],
    singleLine: [Boolean]
}) {
    constructor(props) {
        props = props || {};
        props.showLabels = true;
        props.singleLine = true;
        props.imageHeightPercentage = 85;
        props.mode = GridElementCollect.MODE_AUTO;
        props.type = GridElement.ELEMENT_TYPE_COLLECT;
        super(props);
    }
}

GridElementCollect.MODE_AUTO = 'MODE_AUTO';
GridElementCollect.MODE_COLLECT_SEPARATED = 'MODE_COLLECT_SEPARATED';
GridElementCollect.MODE_COLLECT_TEXT = 'MODE_COLLECT_TEXT';
GridElementCollect.MODES = [GridElementCollect.MODE_AUTO, GridElementCollect.MODE_COLLECT_SEPARATED, GridElementCollect.MODE_COLLECT_TEXT];

export {GridElementCollect};