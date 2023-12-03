const mongoose = require("mongoose");
const teamSchema = new mongoose.Schema({
  name: String,
  members: Array,
});
module.exports = mongoose.model("Team", teamSchema);
