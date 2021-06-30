# IPTV
API to retrive IPTV links and informations.
The API is hosted at https://my-iptv.herokuapp.com.

Retrieve the m3u8 ejs template from https://raw.githubusercontent.com/weareblahs/unifi-tv/main/dev/unifitv.ejs. Thanks to @weareblahs

### Unifi TV
- m3u8 Provider
  - https://my-iptv.herokuapp.com/m3u8/unifi-tv?userID=${unifi-playTV-userid}&clientPasswd=${unifi-playTV-password}
- EPG
  - https://my-iptv.herokuapp.com/epg/unifi-tv
    - Redirecting to https://github.com/weareblahs/epg/blob/master/unifitv.xml

### Local Development
#### Requirements
1. [Nodejs](https://nodejs.org/en/)

To start the server locally follow this steps.
1. Install the dependencies
    ```bash
    $ npm install
    ```
1. Start the dev server
    ```bash
    $ npm run dev
    ```
1. Start the as production server
    ```bash
    $ npm start
    ```
