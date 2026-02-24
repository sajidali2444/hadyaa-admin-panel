module.exports = {
  apps: [
    {
      name: "hadyaa-admin-panel",
      cwd: __dirname,
      script: "./.output/server/index.mjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "3000",
      },
    },
  ],
};
