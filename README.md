# Track Player, version 1.6.2: (Jule 6, 2017)
This is WEB application based on Apps from Gurtam (http://apps.wialon.com).

## Description
Track Player allows to draw movements of units on the map and then play them.
It is possible to view how a unit was moving and how its various parameters were changing with time.
Tracks can be drawn and played for several units at once (for the same time interval only).
A different color can be applied to each track to distinguish them on the map.
At the bottom, there is a time line where you see playback progress, navigate along the tracks, control playback speed, etc.
While a track is played, different kinds of data dynamically update on the screen. That can be speed, sensor values, parameters, pictures from messages, etc.

## License:
[The MIT License](../master/LICENSE-MIT)

## Requirements
 * Browser: Google Chome 20+, Firefox 15+, Safari 5+, IE 9+, Opera 10+
 * Language: русский, English, Slovenčina, Finnish, Estonian
 * Components: SDK
 * URL params: Active SID, Base URL, Host URL, Language, Current user

## Quick start
Apps activation through the management system: http://docs.gurtam.com/en/hosting/cms/apps/apps  
Working with applications in the GPS tracking system: http://docs.gurtam.com/en/hosting/user/apps/apps

## Release History
 * v1.0 (March 8, 2013)  
- initial release

 * v1.1 (March 15, 2013)
- Google Maps API replaced by OpenLayers
- now unit icon can be rotated while playing
- problem with stack overflow resolved
- minor bugs fixed

 * v1.2 (April 24, 2013)
- English language supported
- problem with user units list solved

 * v1.3 (May 8, 2013)
- mobile devices touch supported
- OpenStreetMap layer added
- icon rotation now use units settings
- user setting stored between sessions
- minor bugs fixed

 * v1.4 (December 10, 2013)
- Google Maps layers removed

 * v1.5 (June 6, 2014)
- fix long unit name display
- changed the app name to "Track Player"
- check ACL "Query reports or messages"
- add docs link
- date/time format based on Wialon settings
- fix leading/ending period speed
- fix bug on delete some tracks

 * v1.6 (May 07, 2015)
- tons on code refactored
- OpenLayers replaced with Leaflet
- hotkeys control supported

 * v1.6.1 (May 18, 2016)
- Estonian and Spanish languages supported

 * v1.6.2 (Jule 6, 2017)
- fix js error on show/hide track
