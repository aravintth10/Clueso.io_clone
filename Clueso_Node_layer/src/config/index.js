// src/config/index.js
require("dotenv").config();

const ServerConfig = {
     PORT: process.env.PORT || 3001,
};

const Logger = {
     info: (...args) => console.log(new Date().toISOString(), ": info:", ...args),
     warn: (...args) => console.warn(new Date().toISOString(), ": warn:", ...args),
     error: (...args) => console.error(new Date().toISOString(), ": error:", ...args),
};

module.exports = {
     ServerConfig,
     Logger,
};
