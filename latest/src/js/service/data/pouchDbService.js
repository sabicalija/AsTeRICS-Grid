import $ from 'jquery';
import PouchDB from 'PouchDB';
import {localStorageService} from "./localStorageService";
import {constants} from "../../util/constants";
import {filterService} from "./filterService";
import {PouchDbAdapter} from "./pouchDbAdapter";
import {MapCache} from "../../util/MapCache";

let pouchDbService = {};

let _pouchDbAdapter = null;
let _documentCache = new MapCache();
let _lastQueryTime = 1000;
let _resumeSyncTimeoutHandler = null;

/**
 * inits the pouchdb to use to a user-database, e.g. with the same name as the username
 * if a local database named as the given username does not exist, a new local database is created.
 * If the database to initialize is already open and a remoteCouchDbAddress is given, only synchronization is started.
 *
 * @param databaseName the database name to use, e.g. use username
 * @param remoteCouchDbAddress optional parameter, if defined an address of a remote couchdb endpoint where the
 *        local database should be synced
 * @param onlyRemote if true only the remote database is used and no local database is created
 * @return {*} a promise that is resolved at a time when pouchDbService can be used for retrieving/saving data to a
 *             database named like the given username
 */
pouchDbService.initDatabase = function (databaseName, remoteCouchDbAddress, onlyRemote) {
    if (_pouchDbAdapter && _pouchDbAdapter.getOpenedDatabaseName() === databaseName && remoteCouchDbAddress) {
        return _pouchDbAdapter.startSync(remoteCouchDbAddress);
    }
    _documentCache.clearAll();
    pouchDbService.closeCurrentDatabase();
    _pouchDbAdapter = new PouchDbAdapter(databaseName, remoteCouchDbAddress, onlyRemote, false, changeHandler);
    return _pouchDbAdapter.init();
};

/**
 * see pouchDbService.initDatabase(), only difference: calling this method indicates that the user
 * just registered and therefore the databases are just being created and synchronization strategy can be different,
 * see documentation of local method setupSync() in PouchDbAdapter.
 * @param databaseName
 * @param remoteCouchDbAddress
 * @param onlyRemote
 */
pouchDbService.createDatabase = function (databaseName, remoteCouchDbAddress, onlyRemote) {
    _documentCache.clearAll();
    pouchDbService.closeCurrentDatabase();
    _pouchDbAdapter = new PouchDbAdapter(databaseName, remoteCouchDbAddress, onlyRemote, true, changeHandler);
    return _pouchDbAdapter.init();
};

/**
 * queries for encrypted objects in the local database and resolves promise with result.
 * If no elements are found 'null' is resolved, if exactly one element was found, this element is resolved,
 * otherwise an array of the found elements is resolved.
 *
 * @param modelName the modelName to find, e.g. "GridData"
 * @param id the id of the object to find (optional)
 * @return {Promise}
 */
pouchDbService.query = function (modelName, id) {
    if (id && _documentCache.has(id)) {
        log.debug('using cache for retrieving id: ' + id);
        return Promise.resolve(_documentCache.get(id));
    }
    let dbToUse = getDbToUse();
    let queryStartTime = new Date().getTime();
    let returnPromise = queryInternal(modelName, id, dbToUse);
    returnPromise.then(result => {
        if (id && result) {
            _documentCache.set(id, result);
        }
    });
    returnPromise.finally(() => {
        _lastQueryTime = new Date().getTime() - queryStartTime;
        log.trace('last query time: ', _lastQueryTime);
    });
    return returnPromise;
};

/**
 * returns (resolves) all documents that are stored in pouchDb.
 * @return {Promise}
 */
pouchDbService.all = function () {
    let dbToUse = getDbToUse();
    cancelSyncInternal();
    return new Promise((resolve, reject) => {
        dbToUse.allDocs({
            include_docs: true,
            attachments: false
        }).then(function (res) {
            resolve(dbResToResolveObject(res));
        }).catch(function (err) {
            log.error(err);
            reject();
        }).finally(() => {
            resumeSyncInternal();
        });
    });
};

/**
 * saves an object to database that is already encrypted
 *
 * @param modelName the modelName to save, e.g. "GridData"
 * @param data the encrypted data object to save
 * @return {Promise} promise that resolves if operation finished, rejects on a failure
 */
pouchDbService.save = function (modelName, data) {
    log.debug('saving ' + modelName + '...');
    cancelSyncInternal();
    if (data.id) {
        _documentCache.clear(data.id, data);
    }
    return new Promise((resolve, reject) => {
        if (!data || !data._id || !modelName || !data.encryptedDataBase64) {
            log.error('did not specify needed parameter "modelName" or "_id" or data is not encrypted! aborting.');
            return reject();
        }
        _pouchDbAdapter.put(data).then((response) => {
            data._rev = response.rev;
            _documentCache.set(data.id, data);
            log.debug('updated ' + modelName + ', id: ' + data._id);
            resolve();
        }).catch(function (err) {
            if (data.id) {
                _documentCache.clear(data.id);
            }
            if (err.error === 'conflict') {
                log.warn('conflict with remote version updating document with id: ' + data.id);
                resolve();
            } else {
                log.error(err);
                reject(err);
            }
            reject();
        }).finally(() => {
            resumeSyncInternal();
        });
    });
};

/**
 * Deletes an object from database by ID.
 *
 * @param id ID of the object to delete.
 * @return {Promise} promise that resolves if operation finished
 */
pouchDbService.remove = function (id) {
    let dbToUse = getDbToUse();
    return queryInternal(null, id, dbToUse).then(object => {
        _documentCache.clear(id);
        log.debug('deleted object from db! id: ' + object.id);
        return dbToUse.remove(object);
    });
};

/**
 * resets the whole database, if it is the default local database, otherwise the call is rejected
 * @return {Promise} resolves after reset is finished
 */
pouchDbService.resetDatabase = function () {
    if (!pouchDbService.isUsingLocalDb() || pouchDbService.getOpenedDatabaseName() !== constants.LOCAL_NOLOGIN_USERNAME) {
        return Promise.reject();
    }
    _documentCache.clearAll();
    return new Promise(resolve => {
        getDbToUse().destroy().then(function () {
            pouchDbService.initDatabase(localStorageService.getAutologinUser()).then(() => resolve());
        }).catch(function (err) {
            log.error('error destroying database: ' + err);
        })
    });
};

/**
 * deletes the specified local database
 * @param databaseName the name of the database to delete
 * @return {*}
 */
pouchDbService.deleteDatabase = function (databaseName) {
    if ((pouchDbService.getOpenedDatabaseName() === databaseName && !pouchDbService.isUsingLocalDb()) || !databaseName) {
        log.warn("won't delete database since using remote db or databaseName not specified...");
        return Promise.reject();
    }
    _documentCache.clearAll();
    let promises = [];
    if (pouchDbService.getOpenedDatabaseName() === databaseName) {
        promises.push(pouchDbService.closeCurrentDatabase());
    }
    return Promise.all(promises).then(() => {
        let db = new PouchDB(databaseName);
        return db.destroy();
    });
};

/**
 * closes the currently opened database(s), afterwards new initialization of pouchDbService using initDatabase() or
 * createDatabase() is necessary.
 * @return {*}
 */
pouchDbService.closeCurrentDatabase = function () {
    if (!_pouchDbAdapter) {
        return Promise.resolve();
    }
    cancelSyncInternal();
    let promise = _pouchDbAdapter.close();
    _pouchDbAdapter = null;
    return promise;
};

/**
 * returns the database name of the currently opened (local) database
 * @return {*}
 */
pouchDbService.getOpenedDatabaseName = function () {
    return _pouchDbAdapter ? _pouchDbAdapter.getOpenedDatabaseName() : null;
};

/**
 * returns true if pouchDbService is currently using a local database, otherwise (only remote) false
 * @return {boolean} true, if currently using local database, false if using remote database, null if not initialized
 * and using no database
 */
pouchDbService.isUsingLocalDb = function () {
    return _pouchDbAdapter ? _pouchDbAdapter.isUsingLocalDb() : null;
};

/**
 * returns the current synchronization state of the databases, see constants.DB_SYNC_STATE_*. If no synchronization
 * is set up constants.DB_SYNC_STATE_FAIL is returned, if database not initialized null is returned.
 * @return {*}
 */
pouchDbService.getSyncState = function () {
    return _pouchDbAdapter ? _pouchDbAdapter.getSyncState() : null;
};

/**
 * returns true if synchronizations is currently set up and enabled, false if sync is not set up, null if database
 * is not initialized
 * @return {*}
 */
pouchDbService.isSyncEnabled = function () {
    return _pouchDbAdapter ? _pouchDbAdapter.isSyncEnabled() : null;
};

function getDbToUse() {
    return getPouchDbAdapter().getDbToUse();
}

function getPouchDbAdapter() {
    if (!_pouchDbAdapter || !_pouchDbAdapter.getDbToUse()) {
        throw 'Using pouchDbService uninitialized is not possible. First initialize a database by using pouchDbService.initDatabase() or pouchDbService.createDatabase().'
    }
    return _pouchDbAdapter;
}

function queryInternal(modelName, id, dbToQuery) {
    if (!modelName && !id) {
        log.error('did not specify modelName or id!');
        return Promise.reject();
    }

    cancelSyncInternal();
    let returnPromise = new Promise((resolve, reject) => {
        log.debug('getting ' + modelName + '(id: ' + id + ')...');
        let query = {
            selector: {}
        };
        if (id) {
            query.selector.id = id;
        }
        if (modelName) {
            query.selector.modelName = modelName;
        }
        dbToQuery.find(query).then(function (res) {
            let objects = dbResToResolveObject(res);
            let length = objects && objects.length ? objects.length : objects ? 1 : 0;
            log.debug('found ' + modelName + ": " + length + ' elements');
            resolve(objects);
        }).catch(function (err) {
            log.error(err);
            reject();
        });
    });
    returnPromise.finally(() => {
        resumeSyncInternal();
    });
    return returnPromise;
}

/**
 * converts a native result object of pouchDB queries to a list of documents or single document used in the app
 * @param res
 * @return {*}
 */
function dbResToResolveObject(res) {
    let objects = [];
    if (res.docs && res.docs.length > 0) { //convert result of .query()
        res.docs.forEach(doc => {
            objects.push(doc);
        });
    } else if (res.rows && res.rows.length > 0) { //convert result of .allDocs()
        res.rows.forEach(row => {
            if (row.doc && row.doc.modelName) {
                objects.push(row.doc);
            }
        });
    }
    if (objects.length === 0) {
        return null;
    } else if (objects.length === 1) {
        return objects[0];
    } else {
        return objects;
    }
}

/**
 * cancels current synchronization activity
 */
function cancelSyncInternal() {
    if (_resumeSyncTimeoutHandler) {
        clearTimeout(_resumeSyncTimeoutHandler);
        _resumeSyncTimeoutHandler = null;
    }
    if (!getPouchDbAdapter().isUsingLocalDb() || getPouchDbAdapter().getSyncState() === constants.DB_SYNC_STATE_SYNCINC) {
        getPouchDbAdapter().cancelSync();
    }
}

/**
 * Resumes sync after a timeout. The timeout is specified by the duration of the last query() request to the remote
 * database. Therefore for bulked requests to pouchDbService sync is paused for the time of all requests and only
 * re-started in idle state.
 * Sync is not resumed/started if global onlyRemote parameter is set
 */
function resumeSyncInternal() {
    let timeout = getPouchDbAdapter().wasCurrentDatabaseSynced() ? 0 : _lastQueryTime + 1000;
    _resumeSyncTimeoutHandler = setTimeout(() => {
        getPouchDbAdapter().resumeSync();
    }, timeout);
}

function changeHandler(changedIds, changedDocsEncrypted) {
    changedDocsEncrypted.forEach(doc => {
        _documentCache.set(doc.id, doc);
    });
    let changedDocs = changedDocsEncrypted.map(rawDoc => filterService.convertDatabaseToLiveObjects(rawDoc));
    let user = pouchDbService.getOpenedDatabaseName();
    let currentUserDataModelVersion = localStorageService.getUserMajorModelVersion(user);
    changedDocs.forEach(doc => {
        localStorageService.setUserModelVersion(user, doc.modelVersion);
    });
    if (currentUserDataModelVersion === localStorageService.getUserMajorModelVersion(user)) {
        $(document).trigger(constants.EVENT_DB_PULL_UPDATED, [changedIds, changedDocs]);
    } else {
        $(document).trigger(constants.EVENT_DB_DATAMODEL_UPDATE, [changedIds, changedDocs]);
    }
}

export {pouchDbService};