module.exports = {
  servers: {
    one: {
      host: '141.225.42.232',
      username: 'rusty',
      pem: '~/.ssh/id_rsa'
    }
  },
  app: {
    name: 'IISae',
    path: '../',
    docker: {
      image: 'zodern/meteor:root',
    },
    servers: {
      one: {}
    },
    buildOptions: {
      serverOnly: true
    },
    env: {
      ROOT_URL: 'http://iis-desk05.uom.memphis.edu',
      MONGO_URL: 'mongodb://localhost:27017/issae',
      PORT: 80
    }
  },
  mongo: {
    version: '4.2.0',
    servers: {
      one: {}
    }
  }
}
