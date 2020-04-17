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

const Soup = imports.gi.Soup;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;

const USER_AGENT = 'GNOME Shell - CustomAPISearchProvider - extension';
const HTTP_TIMEOUT = 10;


function byteArrayToString (array) {
    return array instanceof Uint8Array ? ByteArray.toString (array):array;
}

class APIClient{
    constructor(params){
        this._settings = Convenience.getSettings();
        this._sources = this._settings.get_strv('sources');

        this._settings.connect("changed", ()=>{
            this._sources = this._settings.get_strv('sources');
        });
    }

    _handle_http_source(word, source, results, callback) {
      let query_url = source.format(encodeURIComponent(word));
      let request = Soup.Message.new('GET', query_url);

      _get_soup_session().queue_message(request,
          (http_session, message) => {
              if (message.status_code !== Soup.KnownStatusCode.OK) {
                  let error_message =
                      "APIClient:get(): Error code: %s".format(
                          message.status_code
                      );
                  //callback(error_message, null);
                  return;
              } else {
                  let result = null;
                  try {

                      let json_results = JSON.parse(request.response_body.data);

                      if (json_results.length > 0){
                          callback(null, json_results);
                          return;
                      }
                  }
                  catch(e) {
                      let message = "APIClient:get(): %s".format(e);
                      //callback(message, null);
                      return;
                  }
              }
          }
      );
    }

    _handle_cmdline_source(word, source, results, callback) {
      // We have a script to run
      if (source.trim() == '') {
          return
      }

      let cmd = source.format(word);
      var res = GLib.spawn_command_line_sync(cmd);

      if (res[0]) {
          let resText = byteArrayToString(res[1]).toString();
          let json_results = JSON.parse(resText);

          if (json_results.length > 0){
              callback(null, json_results);
              return;
          }
      }
    }

    get(word, callback, p1, p2) {

        let global_results = [];
        let search_callback = function(message, result) {
          if (result)
            global_results = global_results.concat(result);

          if ( global_results.length == 0 ) {
            let error = [{
              id : "no_result_found",
              label: "API Search",
              description: "No results found",
              icon: "",
              url : ""
            }];
            return callback("No result found for " + cmd, error);
          }

          return callback(message, global_results, p1, p2);
        }

        // Iterate over all sources
        this._sources.forEach(function(source){
            // Check if source is an HTTP() URL
            if ( source.startsWith('http://') || source.startsWith('https://') )
              this._handle_http_source(word, source, global_results, search_callback);
            else
              this._handle_cmdline_source(word, source, global_results, search_callback);
        }.bind(this));
    }

    destroy() {
        _get_soup_session().run_dispose();
        _SESSION = null;
    }

}

let _SESSION = null;

function _get_soup_session() {
    if(_SESSION === null) {
        _SESSION = new Soup.SessionAsync();
        Soup.Session.prototype.add_feature.call(
            _SESSION,
            new Soup.ProxyResolverDefault()
        );
        _SESSION.user_agent = USER_AGENT;
        _SESSION.timeout = HTTP_TIMEOUT;
    }

    return _SESSION;
}
