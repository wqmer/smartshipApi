const ticket = require("./ticket");
const carrier = require("./carrier");
const service = require("./service");

module.exports = {
  ...ticket,
  ...carrier,
  ...service,
};
