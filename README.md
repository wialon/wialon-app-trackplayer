# Track Player, version 1.3: (May 8, 2013)
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
 * Language: русский, English
 * Components: SDK
 * URL params: Active SID, Base URL, Host URL, Language, Current user

## Quick start
Apps activation through the management system: http://docs.gurtam.com/en/hosting/cms/apps/apps  
Working with applications in the GPS tracking system: http://docs.gurtam.com/en/hosting/user/apps/apps

## Release History
 * v1.0 (March 8, 2013)  
- initial release

 * v1.1 (March 15, 2013)
- Google Maps API replaced by OpenLayers;
- now unit icon can be rotated while playing;
- problem with stack overflow resolved;
- minor bugs fixed.

 * v1.2 (April 24, 2013)
- English language supported;
- problem with user units list solved. 

 * v1.3 (May 8, 2013)
- Mobile devices touch supported;
- OpenStreetMap layer added;
- icon rotation now use units settings;
- user setting stored between sessions;
- minor bugs fixed.
