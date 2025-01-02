module.exports = {
  apps: [{
    name: 'transcriptor',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    cwd: '/root/transcriptor',
    interpreter: '/bin/bash'
  }]
}; 