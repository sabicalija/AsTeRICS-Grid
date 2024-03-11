import { modelUtil } from '../util/modelUtil';
import { constants } from '../util/constants';
import { Model } from '../externals/objectmodel';

class GridActionREST extends Model({
    id: String,
    modelName: String,
    modelVersion: String,
    restUrl: [String],
    method: [String], // one of POST, PUT, GET,...
    contentType: [String], //REST content type
    body: [String], //The body / data of the request
    authUser: [String], //user for http authentication
    authPw: [String] //password for http authentication
}) {
    constructor(properties, elementToCopy) {
        properties = modelUtil.setDefaults(properties, elementToCopy, GridActionREST);
        super(properties);
        this.id = this.id || modelUtil.generateId('grid-action-rest');
        //this.method=GridActionREST.defaults.method;
        //this.contentType=GridActionREST.defaults.contentType;
    }

    static getModelName() {
        return 'GridActionREST';
    }
}

GridActionREST.defaults({
    id: '', //will be replaced by constructor
    modelName: GridActionREST.getModelName(),
    modelVersion: constants.MODEL_VERSION,
    method: 'POST', // POST, PUT, GET,....
    contentType: 'text/plain' //text/plain, application/json
});

export { GridActionREST };