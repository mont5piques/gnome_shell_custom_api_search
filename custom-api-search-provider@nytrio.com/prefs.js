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

const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Settings = Convenience.getSettings();

const Gettext = imports.gettext.domain('custom-api-search');
const _ = Gettext.gettext;

const COLUMN_ID = 0;

/*
 *	SearchSourcesWidget class for settings widget
 */
const SearchSourcesWidget = new GObject.Class({

	Name: 'CustomAPISearch.Prefs.SearchSourcesWidget',
	GTypeName: 'SearchSourcesWidget',
	Extends: Gtk.Box,

	/*
	 *	Initialize new instance of SearchSourcesWidget class
	 */
	_init : function(params) {

		this.parent(params);
		this.orientation = Gtk.Orientation.VERTICAL;
		this.margin = 12;

		// Search API sources
		let scrolledWindow = new Gtk.ScrolledWindow();
		scrolledWindow.set_border_width(0);
		scrolledWindow.set_shadow_type(1);

		this._store = new Gtk.ListStore();
		this._store.set_column_types([GObject.TYPE_STRING]);
		this._loadStoreFromSettings();

		this._actor = new Gtk.TreeView({ model: this._store,
									   headers_visible: false,
									   reorderable: false,
									   hexpand: true,
									   vexpand: true });
		this._actor.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

		let column = new Gtk.TreeViewColumn();

		let cell = new Gtk.CellRendererText({ editable: false });
		column.pack_start(cell, true);
		column.add_attribute(cell, "text", COLUMN_ID);
		this._actor.append_column(column);

		scrolledWindow.add(this._actor);
		this.add(scrolledWindow);

		let toolbar = new Gtk.Toolbar();
		toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);
		toolbar.set_icon_size(1);

		let delButton = new Gtk.ToolButton({ icon_name: 'list-remove-symbolic' });
		delButton.connect('clicked', Lang.bind(this, this._deleteSelected));
		toolbar.add(delButton);

		let editButton = new Gtk.ToolButton({ icon_name: 'edit-symbolic' });
		editButton.connect('clicked', Lang.bind(this, this._editSelected));
		toolbar.add(editButton);

		let newButton = new Gtk.ToolButton({ icon_name: 'list-add-symbolic' });
		newButton.connect('clicked', Lang.bind(this, this._createNew));
		toolbar.add(newButton);

		this.add(toolbar);
	},

	/*
	 *	Creates modal dialog when adding new or editing search source
	 *	title - dialog title
	 *	text - text in dialog
	 *	onOkButton - callback on OK button clicked
	 */
	_createDialog: function(title, text, onOkButton) {

		let dialog = new Gtk.Dialog({title: title});
		dialog.set_modal(true);
		dialog.set_resizable(false);
		dialog.set_border_width(12);

		this._entry = new Gtk.Entry({text: text});
		//this._entry.margin_top = 12;
		this._entry.margin_bottom = 12;
		this._entry.width_chars = 40;

		this._entry.connect("changed", Lang.bind(this, function() {

			if (this._entry.get_text().length === 0)
				this._okButton.sensitive = false;
			else
				this._okButton.sensitive = true;
		}));

		dialog.add_button(Gtk.STOCK_CANCEL, 0);
		this._okButton = dialog.add_button(Gtk.STOCK_OK, 1);	// default
		this._okButton.set_can_default(true);
		this._okButton.sensitive = false;
		dialog.set_default(this._okButton);
		this._entry.activates_default = true;

		let dialog_area = dialog.get_content_area();
		//dialog_area.pack_start(label, 0, 0, 0);
		dialog_area.pack_start(this._entry, 0, 0, 0);

		dialog.connect("response", Lang.bind(this, function(w, response_id) {

			if (response_id) {	// button OK
				onOkButton();
			}

			dialog.hide();
		}));

		dialog.show_all();
	},

	/*
	 *	On create new clicked callback
	 */
	_createNew: function() {

		this._createDialog(_("New Search API source"), '', Lang.bind(this, function() {

			// update tree view
			let iter = this._store.append();
			this._store.set_value(iter, COLUMN_ID, this._entry.get_text());

			// update settings
			let sources = Settings.get_strv('sources');
			if (sources == null)
				sources = new Array();

			sources.push(this._entry.get_text());
			Settings.set_strv('sources', sources);
		}));
	},

	/*
	 *	On edit clicked callback
	 */
	_editSelected: function() {

		let [any, model, iter] = this._actor.get_selection().get_selected();

		if (any) {
			this._createDialog(_("Edit Search API source"), model.get_value(iter, COLUMN_ID),
			Lang.bind(this, function() {
				// update tree view
				this._store.set_value(iter, COLUMN_ID, this._entry.get_text());

				// update settings
				let index = model.get_path(iter).get_indices();
				let sources = Settings.get_strv('sources');
				if (sources == null)
					sources = new Array();

				if (index < sources.length) {
					sources[index] = this._entry.get_text();
					Settings.set_strv('sources', sources);
				}
			}));
		}
	},

	/*
	 *	On delete clicked callback
	 */
	_deleteSelected: function() {

		let [any, model, iter] = this._actor.get_selection().get_selected();

		if (any) {
			// must call before remove
			let index = model.get_path(iter).get_indices();
			// update tree view
			this._store.remove(iter);

			// update settings
			let sources = Settings.get_strv('sources');
			if (sources == null)
				sources = new Array();

			if (index < sources.length) {
				sources.splice(index, 1);
				Settings.set_strv('sources', sources);
			}
		}
	},

	/*
	 *	Loads search sources entries from gsettings structure
	 */
	_loadStoreFromSettings: function() {

		let sources = Settings.get_strv('sources');

		if (sources) {

			for (let i = 0; i < sources.length; i++) {

				if (sources[i]) {	// test on empty string

					let iter = this._store.append();
					this._store.set_value(iter, COLUMN_ID, sources[i]);
				}
			}
		}
	}
});

/*
 *	Initialize the settings widget
 */
function init() {
    Convenience.initTranslations("custom-api-search");
}

/*
 *	Builds settings widget
 */
function buildPrefsWidget() {

	let widget = new SearchSourcesWidget();
	widget.show_all();

	return widget;
}
