const axios = require('axios')
const ejs = require('ejs')
const NodeCache = require('node-cache')
const nodeCache = new NodeCache({ stdTTL: 60 * 30 })
const baseURL = 'https://my-iptv.herokuapp.com'
const unifiAuthURL = 'https://playtv.unifi.com.my:7042/VSP/V3/Authenticate'
const unifiEpgURL = 'https://raw.githubusercontent.com/weareblahs/epg/master/unifitv.xml'
const unifiTVTemplateURL = 'https://raw.githubusercontent.com/weareblahs/unifi-tv/main/dev/unifitv.ejs'
const UNIFI_CREDENTIAL_ERROR_CODE = '157021001'
const DEFAULT_TEMPLATE_TTL =  60 * 60 * 12
const DEFAULT_HEADER = {
  headers: {
    Host: 'playtv.unifi.com.my:7042',
    Origin: 'https://playtv.unifi.com.my'
  }
}

const cacheKey = key => Buffer.from(key).toString('base64')

module.exports = (fastify, options, next) => {
  fastify.get('/', (req, res) => {
    res.send({ 
      m3u8: [`${baseURL}/m3u8/unifi-tv?userID=\${your-unifi-playTV-userID}&clientPasswd=\${your-unifi-playTV-password}`],
      epg: [`${baseURL}/epg/unifi-tv`]
    })
  })

  const unifiTVm3u8Template = async () => {
    if (nodeCache.get("unifiTVTemplate")) return nodeCache.get("unifiTVTemplate");
    else {
      const { data } = await axios.get(unifiTVTemplateURL)
      nodeCache.set("unifiTVTemplate", data, DEFAULT_TEMPLATE_TTL)
      return data
    }
  }

  fastify.get('/m3u8/unifi-tv', async ({ query }, res) => {
    const { userID, clientPasswd } = query
    const userKey = cacheKey(`${userID}:${clientPasswd}`)
    const ejsTemplate = await unifiTVm3u8Template()

    if (!userID || !clientPasswd) res.send({ message: 'Please specify your credentials in the query parameter'}, 400)
    if (nodeCache.get(userKey)) {
      console.info(`Retrieving VUID from cache for userID=${userID}`)
      res.send(ejs.render(ejsTemplate, { vuid: nodeCache.get(userKey) }))
    }
    else {
      const reAuthenticate = ({ data }) => {
        if (data.VUID) {
          nodeCache.set(userKey, data.VUID)
          console.info(`VUID exist on the first Auth. Skipping the second Auth for userID=${userID}`)
          res.send(ejs.render(ejsTemplate, { vuid: data.VUID }))
        } else if (data.result.retCode === UNIFI_CREDENTIAL_ERROR_CODE) {
          console.error('Error from unifi auth server:', data.result.retMsg)
          res.code(400).send({ message: `Error from unifi auth server: ${data.result.retMsg}`})
        } else {
          const { physicalDeviceID, deviceModel } = data.devices[0]
          axios
            .post(
              unifiAuthURL,
              {
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
              },
              DEFAULT_HEADER
            )
            .then(({ data }) => {
              if (data.VUID) {
                nodeCache.set(userKey, data.VUID)
                console.info(`Retrieve VUID on the second Auth for userID=${userID}`)
                res.send(ejs.render(ejsTemplate, { vuid: data.VUID }))
              } else {
                console.error('Response from unifi server:', data)
                res.code(401).send({ message: 'Something went wrong. Please check your credential again'})
              }
            })
            .catch(err => {
              console.error('Error on second Auth response from unifi server:', err)
              res.code(401).send({ message: 'Something went wrong. Please try again later.'})
            })
        }
      }
      const dummyAuthData = {
        authenticateBasic: {
          userID,
          clientPasswd,
          userType: '1',
          lang: 'en'
        },
        authenticateDevice: { deviceModel: "PC Web TV" }
      }

      axios
        .post(unifiAuthURL, dummyAuthData, DEFAULT_HEADER)
        .then(reAuthenticate)
        .catch(err => {
          console.error('Error on first Auth response from unifi server:', err)
          res.code(400).send({ message: 'Something went wrong. Please try again later.'})
        })
    }
  })

  fastify.get('/epg/unifi-tv', (req, res) => {
    res.redirect(unifiEpgURL)
  })

  console.log(`Running the my-iptv app on port ${process.env.PORT}`)
  next()
}