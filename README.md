# WhatF***Words (WFW)
## Introduction
This is a web application which shows a chosen location in coordinates and 
English words, and generate a `geo:` link to the coordinates.

The words are in the format of `what.face.words`, and can uniquely identify
places on Earth accurate to 3 metres. It is designed to be easily spoken,
although I cannot guarantee that similar-sounding phrases aren't found close
together.

## Usage
This Progressive Web App (PWA) can be run in the browser, or can be installed
and run offline. While offline, maps may not be shown, and place name geocoding
doesn't work, but geolocation and conversion between words and coordinates work
offline.

If run in the browser, the hash is automatically changed to the words of the
chosen location, such that it can be bookmarked. When loaded with a hash, the
app jumps to the location denoted by the hash. For example, appending
[#alone.sings.dark](https://miklcct.github.io/WhatFxxxWords/#alone.sings.dark) 
to the end of the URL opens Charing Cross.

A location can be chosen by one of the three ways:
* By geolocation, which is automatically done if a location is not specified in
  the hash.
* By searching in the text box. Words, coordinates, or place names (online only)
  are supported.
* By tapping on the map.

Regardless of how the location is chosen, the app jumps to the chosen location
and shows a popup containing the words and coordinates, where the coordinates
are linked to a `geo:` URI.

## Deployment
This web application runs wholly on the client side, with the exception of 
resolving place names and loading maps. No special features are needed on the
web server apart from serving static files.

If you want to deploy your own instance, you need to:
1. Install the dependencies by running `yarn install`.
2. Compile the code by running `yarn build`.
3. Copy the contents of the `dist` folder onto a web server.