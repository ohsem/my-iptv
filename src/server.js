const path = require('path')
const fs = require('fs')
const axios = require('axios')
const baseURL = 'https://my-iptv.herokuapp.com'
const unifiAuthURL = 'https://playtv.unifi.com.my:7042/VSP/V3/Authenticate'
const unifiEpgURL = 'https://raw.githubusercontent.com/weareblahs/epg/master/unifitv.xml'

module.exports = (fastify, options, next) => {
  fastify.register(require('point-of-view'), {
    engine: {
      ejs: require('ejs')
    }
  })

  fastify.get('/', (req, res) => {
    res.send({ 
      m3u8: [`${baseURL}/m3u8/unifi-tv?userID=\${your-unifi-playTV-userID}&clientPasswd=\${your-unifi-playTV-password}`],
      epg: [`${baseURL}/epg/unifi-tv`]
    })
  })
  fastify.get('/m3u8/unifi-tv', ({ query }, res) => {
    const { userID, clientPasswd } = query
    axios.post(unifiAuthURL, {
      "authenticateBasic": {
        userID,
        clientPasswd,
        "userType": "1",
        "timeZone": "Asia/Brunei",
        "isSupportWebpImgFormat": "0",
        "lang": "en"
      },
      "authenticateDevice": {
        "physicalDeviceID": "1928342308",
        "terminalID": "1928342308",
        "deviceModel": "PC Web TV"
      },
      "authenticateTolerant": {
        "areaCode": "1200",
        "templateName": "default",
        "bossID": "",
        "userGroup": "-1"
      }
    }, {
      headers: {
        "Host": 'playtv.unifi.com.my:7042',
        "Origin": 'https://playtv.unifi.com.my'
      }
    }).then(({ data }) => {
      if (data.VUID) {
        res.view('./src/m3u8/unifi-tv.ejs', { vuid: data.VUID})
      } else {
        console.error('Response from unifi server:', data)
        res.send({ message: 'Something went wrong. Please check your credential again'}, 401)
      }
    })


  })

  fastify.get('/epg/unifi-tv', (req, res) => {
    res.redirect(unifiEpgURL)
  })

  next()
}