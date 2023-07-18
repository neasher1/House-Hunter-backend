const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { query } = require("express");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const run = async () => {
  try {
  } finally {
  }
};
run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("House Hunter Server is Running");
});

app.listen(port, () => {
  console.log(`House Hunter Server is running on port: ${5000}`);
});
