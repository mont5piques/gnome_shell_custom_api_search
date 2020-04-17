/*
 * Custom API Search Provider
 * A global search extension based on API results
 * inspired from WordReferenceSearchProvider (author : Lorenzo Carbonell)
 * with GNOME Shell
 *
 *
 * This file is part of Custom API Search Provider
 *
 * Custom API Search Provider is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Custom API Search Provider is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-openweather.
 * If not, see <http://www.gnu.org/licenses/>.
  */

// To debug: log('blah');

// And run: journalctl /usr/bin/gnome-session -f -o cat | grep LOG
const St = imports.gi.St;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;
const Util = imports.misc.util;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const APIClient = Extension.imports.search_client;
const Convenience = Extension.imports.convenience;

const Gettext = imports.gettext.domain(Extension.metadata.uuid);
const _ = Gettext.gettext;

class CustomAPISearchProvider{
    constructor(){

        Gtk.IconTheme.get_default().append_search_path(
            Extension.dir.get_child('icons').get_path());
        // Use the default app for opening https links as the app for
        // launching full search.
        this.appInfo = {};
        // Fake the name and icon of the app
        this.appInfo.get_name = ()=>{
            return 'Custom API Search Provider';
        };
        this.appInfo.get_icon = ()=>{
            return new Gio.ThemedIcon({name: "search"});
        };

        // Custom messages that will be shown as search results
        this._messages = {
            '__loading__': {
                id: '__loading__',
                name: _('Custom API Search'),
                description : _('Loading items, please wait...'),
                // TODO: do these kinds of icon creations better
                createIcon: this.createIcon
            },
            '__error__': {
                id: '__error__',
                name: _('Custom API Search'),
                description : _('Oops, an error occurred while searching.'),
                createIcon: this.createIcon
            }
        };
        // API results will be stored here
        this.resultsMap = new Map();
        this._api = new APIClient.APIClient();
        // Wait before making an API request
        this._timeoutId = 0;
    }

    /**
     * Open the url in default app
     * @param {String} identifier
     * @param {Array} terms
     * @param timestamp
     */
    activateResult(identifier, terms, timestamp) {
        let result;
        // only do something if the result is not a custom message
        if (!(identifier in this._messages)) {
            result = this.resultsMap.get(identifier);
            if (result) {
                Util.trySpawnCommandLine(
                    "xdg-open " + result.url);
            }
        }
    }
    /**
     * Run callback with results
     * @param {Array} identifiers
     * @param {Function} callback
     */
    getResultMetas(identifiers, callback) {
        let metas = [];
        for (let i = 0; i < identifiers.length; i++) {
            let result;
            // return predefined message if it exists
            if (identifiers[i] in this._messages) {
                metas.push(this._messages[identifiers[i]]);
            } else {
                // TODO: check for messages that don't exist, show generic error message
                let meta = this.resultsMap.get(identifiers[i]);
                if (meta){
                    metas.push({
                        id: meta.id,
                        name: meta.label,
                        description : meta.description,
                        createIcon: meta.icon ? this.createCustomIcon(meta.icon) : this.createIcon
                    });
                }
            }
        }
        callback(metas);
    }

    /**
     * Search API if the query is a Wikidata query.
     * Wikidata query must start with a 'wd' as the first term.
     * @param {Array} terms
     * @param {Function} callback
     * @param {Gio.Cancellable} cancellable
     */
    getInitialResultSet(terms, callback, cancellable) {

        if (terms != null && terms.length >= 1 && (terms[0].substring(0, 1) === '+' || terms[0].substring(0, 1) === '=')) {
            // show the loading message
            this.showMessage('__loading__', callback);
            // remove previous timeout
            if (this._timeoutId > 0) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = 0;
            }

            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
                // now search
                this._api.get(
                    this._getQuery(terms.join(' ')),
                    this._getResultSet.bind(this),
                    callback,
                    this._timeoutId
                );
                return false;
            });
        } else {
            // return an emtpy result set
            this._getResultSet(null, {}, callback, 0);
        }
    }

    /**
     * Show any message as a search item
     * @param {String} identifier Message identifier
     * @param {Function} callback Callback that pushes the result to search
     * overview
     */
    showMessage(identifier, callback) {
        callback([identifier]);
    }

    /**
     * TODO: implement
     * @param {Array} previousResults
     * @param {Array} terms
     * @returns {Array}
     */
    getSubsetResultSearch(previousResults, terms) {
        return [];
    }

    /**
     * Return subset of results
     * @param {Array} results
     * @param {number} max
     * @returns {Array}
     */
    filterResults(results, max) {
        // override max for now
        max = this._api.limit;
        return results.slice(0, max);
    }

    /**
     * Return query string from terms array
     * @param {String[]} terms
     * @returns {String}
     */
    _getQuery(terms) {
        return terms.substring(1).trim();
    }

    /**
     * Parse results that we get from the API and save them in this.resultsMap.
     * Inform the user if no results are found.
     * @param {null|String} error
     * @param {Object|null} result
     * @param {Function} callback
     * @private
     */
    _getResultSet(error, result, callback, timeoutId) {
        let results = [];
        if (timeoutId === this._timeoutId && result && result.length > 0) {
            result.forEach((aresult) => {
                this.resultsMap.set(aresult.id, aresult);
                results.push(aresult.id);
            });
            callback(results);
        } else if (error) {
            log('Cannot fetch result');
	     log(error);
            // Let the user know that an error has occurred.
            this.showMessage('__error__', callback);
        }
    }

    /**
     * Create meta icon
     * @param size
     * @param {Object} meta
     */
    createIcon(size) {
        let box = new Clutter.Box();
        let icon = new St.Icon({gicon: new Gio.ThemedIcon({name: 'search'}),
                                icon_size: size});
        box.add_child(icon);
        return box;
    }

    createCustomIcon(icon_url) {
        return function(size) {
            let box = new Clutter.Box();
            let gicon = Gio.icon_new_for_string(icon_url);
            let icon = new St.Icon({gicon: gicon, icon_size: size});
            box.add_child(icon);
            return box;
        };
    }
}

let customAPISearchProvider = null;

function init() {
    Convenience.initTranslations();
}

function enable() {
    if (!customAPISearchProvider) {
        customAPISearchProvider = new CustomAPISearchProvider();
        Main.overview.viewSelector._searchResults._registerProvider(
            customAPISearchProvider
        );
    }
}

function disable() {
    if (customAPISearchProvider){
        Main.overview.viewSelector._searchResults._unregisterProvider(
            customAPISearchProvider
        );
        customAPISearchProvider = null;
    }
}
