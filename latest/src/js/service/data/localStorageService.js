var errorMsg = 'could not access local storage, maybe disabled by user? Error: ';
var storage = null;
let FIRST_VISIT_KEY = 'FIRST_VISIT_KEY';
let USER_PASSWORDS_KEY = "USER_PASSWORDS_KEY";
let USER_MODELVERSION_KEY = "USER_MODELVERSION_KEY";
let SYNCED_DBS_LIST_KEY = "SYNCED_DBS_LIST_KEY";
let LAST_ACTIVEUSER_KEY = "LAST_ACTIVEUSER_KEY";
let AUTOLOGIN_USER_KEY = "AUTOLOGIN_USER_KEY";

if (typeof (Storage) !== "undefined") {
    try {
        var storage = window.localStorage;
    } catch (e) {
        log.error(errorMsg + e)
    }
}

var localStorageService = {
    save: function (key, value) {
        if (storage) {
            try {
                return storage.setItem(key, value);
            } catch (e) {
                log.error(errorMsg + e)
            }
        }
    },
    get: function (key) {
        if (storage) {
            try {
                return storage.getItem(key);
            } catch (e) {
                log.error(errorMsg + e)
            }
        }
    },
    remove: function (key) {
        if (storage) {
            try {
                return storage.removeItem(key);
            } catch (e) {
                log.error(errorMsg + e)
            }
        }
    },
    /**
     * returns true if the page was never visited before and this method was never called before.
     * returns false afterwards.
     * @return {boolean}
     */
    isFirstPageVisit() {
        let value = localStorageService.get(FIRST_VISIT_KEY);
        localStorageService.save(FIRST_VISIT_KEY, true);
        return !value;
    },
    /**
     * returns a previously saved user password
     * @param username the username as used for login
     * @return {*}
     */
    getUserPassword(username) {
        if (!username) {
            return null;
        }
        return getSaveObject(USER_PASSWORDS_KEY)[username];
    },
    /**
     * saves a given local user without a password
     * @param username the username of the local user to save
     */
    saveLocalUser(username) {
        let object = getSaveObject(USER_PASSWORDS_KEY);
        object[username] = '';
        localStorageService.save(USER_PASSWORDS_KEY, JSON.stringify(object));
    },
    /**
     * checks if the given username is a saved local user without password
     * @param username the username to check
     * @return true if the given username is a saved local user without password, false otherwise
     */
    isSavedLocalUser(username) {
        let object = getSaveObject(USER_PASSWORDS_KEY);
        return object[username] === '';
    },
    /**
     * checks if the last active user is a local user (not synced with cloud)
     */
    isLastActiveUserLocal() {
        let object = getSaveObject(USER_PASSWORDS_KEY);
        return object[localStorageService.getLastActiveUser()] === '';
    },
    /**
     * saves a given user password
     * @param username the username as used for login
     * @param password the password to save (should be salted + hashed)
     */
    saveUserPassword(username, password) {
        let object = getSaveObject(USER_PASSWORDS_KEY);
        object[username] = password;
        localStorageService.save(USER_PASSWORDS_KEY, JSON.stringify(object));
    },
    /**
     * removes a saved password of a given user from local storage, if autologin user is the given username,
     * autologin user is cleared.
     * @param username the username as used for login
     */
    removeUserPassword(username) {
        let object = getSaveObject(USER_PASSWORDS_KEY);
        delete object[username];
        localStorageService.save(USER_PASSWORDS_KEY, JSON.stringify(object));
        let autologinUser = localStorageService.getAutologinUser();
        if (autologinUser === username) {
            localStorageService.setAutologinUser('');
        }
    },
    /**
     * returns all saved users as a string list
     * @param loggedInUser (optional) if specified the logged in user is returned at first element in the list, if it is
     *                     included in the list of all saved users
     */
    getSavedUsers(loggedInUser) {
        let localUsers = localStorageService.getSavedLocalUsers();
        let onlineUsers = localStorageService.getSavedOnlineUsers();
        let allUsers = onlineUsers.concat(localUsers);
        if (loggedInUser && allUsers.includes(loggedInUser)) {
            allUsers = allUsers.filter(user => user !== loggedInUser);
            allUsers.unshift(loggedInUser);
        }
        return allUsers;
    },
    /**
     * returns all saved offline/local users as a string list
     */
    getSavedLocalUsers() {
        let object = getSaveObject(USER_PASSWORDS_KEY);
        let allUsers = Object.keys(object) || [];
        return allUsers.filter(username => object[username] === '').sort();
    },
    /**
     * returns all saved online users as a string list
     */
    getSavedOnlineUsers() {
        let object = getSaveObject(USER_PASSWORDS_KEY);
        let allUsers = Object.keys(object) || [];
        return allUsers.filter(username => object[username] !== '').sort();
    },
    /**
     * saves the last active user by username
     */
    setLastActiveUser(username) {
        localStorageService.save(LAST_ACTIVEUSER_KEY, username);
    },
    /**
     * retrieves the last active user
     */
    getLastActiveUser() {
        return localStorageService.get(LAST_ACTIVEUSER_KEY);
    },
    /**
     * saves a user that should be auto-logged in at startup
     */
    setAutologinUser(username) {
        localStorageService.save(AUTOLOGIN_USER_KEY, username);
    },
    /**
     * retrieves the user that should be auto-logged in at startup
     */
    getAutologinUser() {
        return localStorageService.get(AUTOLOGIN_USER_KEY);
    }
    ,
    /**
     * saves a name of the database that should be marked as "completely synced"
     * @param databaseName the name of the database to save
     * @return {*}
     */
    markSyncedDatabase(databaseName) {
        let list = getSyncedDbsList();
        if (!list.includes(databaseName)) {
            list.push(databaseName);
        }
        localStorageService.save(SYNCED_DBS_LIST_KEY, JSON.stringify(list));
    },
    /**
     * returns true if the given database was set to "completely synced" before using method "markSyncedDatabase()"
     * @param databaseName
     * @return {*}
     */
    isDatabaseSynced(databaseName) {
        return getSyncedDbsList().includes(databaseName);
    },
    /**
     * unmarks the given database name to be not longer "completely synced"
     * @param databaseName the name of the database to save
     * @return {*}
     */
    unmarkSyncedDatabase(databaseName) {
        let list = getSyncedDbsList();
        list = list.filter(name => name !== databaseName);
        localStorageService.save(SYNCED_DBS_LIST_KEY, JSON.stringify(list));
    },
    /**
     * get the current data model major version of the given user
     * @param user
     * @return {number}
     */
    getUserMajorModelVersion(user) {
        let object = getSaveObject(USER_MODELVERSION_KEY);
        let modelVersionString = object[user];
        let majorNumber = !modelVersionString ? 1 : parseInt(JSON.parse(object[user]).major);
        return majorNumber;
    },
    /**
     * set the current data model version of a user. The version is only set, if the given data model
     * major version is greater than the existing data model minor version.
     *
     * @param user the user to set the data model version
     * @param modelVersionString the version string to set (JSON string including major, minor, patch properties)
     */
    setUserModelVersion(user, modelVersionString) {
        let savedVersion = localStorageService.getUserMajorModelVersion(user);
        let newVersion = JSON.parse(modelVersionString).major;
        if (savedVersion < newVersion) {
            let object = getSaveObject(USER_MODELVERSION_KEY);
            object[user] = modelVersionString;
            localStorageService.save(USER_MODELVERSION_KEY, JSON.stringify(object));
        }
    }
};

function getSaveObject(key) {
    let passwordsObjectString = localStorageService.get(key);
    if (!passwordsObjectString) {
        localStorageService.save(key, JSON.stringify({}));
        return {};
    }
    return JSON.parse(passwordsObjectString);
}

function getSyncedDbsList() {
    let syncedDbsString = localStorageService.get(SYNCED_DBS_LIST_KEY);
    if (!syncedDbsString) {
        localStorageService.save(SYNCED_DBS_LIST_KEY, JSON.stringify([]));
        return [];
    }
    return JSON.parse(syncedDbsString);
}

export {localStorageService};