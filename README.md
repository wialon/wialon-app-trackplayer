# Track Player, version 1.6.4: (April 1, 2025)
This is WEB application based on Apps from Gurtam (http://apps.wialon.com).

**This is a legacy app: it is no longer developed or maintained. The code is published as is, without support.**

## Description
Track Player allows to draw movements of units on the map and then play them.
It is possible to view how a unit was moving and how its various parameters were changing with time.
Tracks can be drawn and played for several units at once (for the same time interval only).
A different color can be applied to each track to distinguish them on the map.
At the bottom, there is a time line where you see playback progress, navigate along the tracks, control playback speed, etc.
While a track is played, different kinds of data dynamically update on the screen. That can be speed, sensor values, parameters, pictures from messages, etc.

## License
[The MIT License](LICENSE-MIT)

## Requirements
 * Browser: a current version of Google Chrome, Firefox, Safari or Edge
 * Language: en, br, es, et, fa, fi, fr, hr, it, pl, ru, sk, uk
 * Components: SDK
 * URL params: Active SID, Base URL, Host URL, Language, Current user

## Quick start
Apps activation through the management system: https://help.wialon.com/en/wialon-hosting/user-guide/management-system/apps  
Working with applications in the GPS tracking system: https://help.wialon.com/en/wialon-hosting/user-guide/monitoring-system/apps

## Installation
The repository contains the app in the form it is hosted in. Put the files on a web server and open `index.html` with the URL params listed above, for example
`index.html?sid=<Active SID>&baseUrl=https://hst-api.wialon.com&user=<Current user>&lang=en`.

 * On start the page requests `/trackplayer/app/app.json` and the optional `/trackplayer/whitelabel.json` (white label settings) by absolute paths, so host the app under the `/trackplayer/` path to have them picked up.
 * The WebGIS layer for Leaflet is loaded from `//apps.wialon.com/plugins/`.
