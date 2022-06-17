module.exports = {
  servers: {
    one: {
      host: '3.88.57.206',
      username: 'ubuntu',
      pem: '~/issae/staging-key-final.pem'
    }
  },
  app: {
    name: 'IISae',
    path: '../',
    docker: {
      image: 'zodern/meteor:root'
    },
    servers: {
      one: {}
    },
    buildOptions: {
      serverOnly: true
    },
    env: {
      ROOT_URL: 'http://3.88.57.206',
      MONGO_URL: 'mongodb://localhost/meteor'
    }
  },
  mongo: {
    version: '3.4.1',
    servers: {
      one: {}
    }
  }
}
