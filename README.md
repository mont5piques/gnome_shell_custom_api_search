# Custom API Search Provider


![Screenshot](screenshot.png)


This extension allow to use a custom API as a gnome search provider.
It was tested on gnome-shell 3.26 to 3.33



## Installation

```
cp -r custom-api-search-provider@nytrio.com ~/.local/share/gnome-shell/extensions/

```

Or thru [http://extensions.gnome.org/](http://extensions.gnome.org/)

## Using the extension

The extensions will issue an API call for each search request on the shell that starts with `+` character. This call could be handled :
* By a script 
* Or by an HTTP API



### Configuring a script handler

In extension settings, you will need to add your script path as a source. The script must be executable.
**Example** : `/home/user/scripts/my_search_script.py %s` 
In this case, `%s` (script argument) will be replaced by the search request.
The API response must meet the required JSON output format (see section below).

Due to compatibility limitations, scripts are executed in a sync manner. This behavior causes a freeze when the script is called, prefer then using an HTTP handler.


### Configuring an HTTP(s) handler

In extension settings, you will need to add your complete URL as a source. The source must start with http:// or https:// to be recognized as a URL source.
**Example** : `https://mysuperservice.domain.com/myapi?query=%s` 
In this case, `%s` (query parameter) will be replaced by the URI encoded search request.
The API response must meet the required JSON output format (see section below).


## Required JSON format

The output format must be a valid JSON with this structure :
```
[{
    "id": "6dba9538-4ea5-4859-b056-47509c3ee9e5",
    "label": "UFW rules",
    "description": "Dec UFW rules",
    "icon": "lock",
    "url": "https://zta.domain.com/doc/ufw-rules-KBAtzkS7Kl"
}, {
    "id": "4ac67c6d-7b9e-45ea-85f8-f1a1e02a7d1d",
    "label": "Python DNS server",
    "description": "Dec Python DNS server",
    "icon": "https://myserver.mydomain.com/icon.png",
    "url": "https://zta.domain.com/doc/python-dns-server-ojabHtamDR"
}]

```

See field description below for details.

| **Field** | **Description** | **Required / **Optional** |
|:--- |:--- |:--- |
| id | A unique string result id (not necessarily an UUID) | Required |
| label | Search result label (first column in result list) | Required |
| description | Search result description (2nd column in result list) | Optional |
| icon | Icon (either a standard icon from /usr/share/icons or an HTTP[s] link to a dynamic icon) | Optional |
| url | A uri to open if the result is selected (could be in any xdg supported protocol) | Optional |
