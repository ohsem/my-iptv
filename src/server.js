const axios = require('axios')
const baseURL = 'https://my-iptv.herokuapp.com'
const unifiAuthURL = 'https://playtv.unifi.com.my:7042/VSP/V3/Authenticate'
const unifiEpgURL = 'https://raw.githubusercontent.com/weareblahs/epg/master/unifitv.xml'

const DEFAULT_HEADER = {
  headers: {
    Host: 'playtv.unifi.com.my:7042',
    Origin: 'https://playtv.unifi.com.my'
  }
}

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
  
  fastify.get('/m3u8/unifi-tv', async ({ query }, res) => {
    const { userID, clientPasswd } = query
    const firstAuthData = {
      authenticateBasic: {
        userID,
        clientPasswd,
        userType: '1',
        lang: 'en'
      }
    }
    const firstAuth = await axios.post(unifiAuthURL, firstAuthData, DEFAULT_HEADER)
    const { physicalDeviceID, deviceModel } = firstAuth.data.devices[0]
    const secondAuthData = {
      authenticateBasic: {
        userID,
        clientPasswd,
        userType: '1',
        timeZone: 'Asia/Brunei',
        isSupportWebpImgFormat: '0',
        lang: 'en'
      },
      authenticateDevice: {
        physicalDeviceID,
        terminalID: physicalDeviceID,
        deviceModel
      },
      authenticateTolerant: {
        areaCode: '1200',
        templateName: 'default',
        bossID: '',
        userGroup: '-1'
      }
    }

    axios
      .post(unifiAuthURL, secondAuthData, DEFAULT_HEADER)
      .then(({ data }) => {
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