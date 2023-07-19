const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { query } = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

//JWT verify
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).send({ message: "403 Forbidden" });
    }
    req.decoded = decoded;
  });
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hlzaati.mongodb.net/house-hunter?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  const usersCollection = client.db("house-hunter").collection("users");
  const houseCollection = client
    .db("house-hunter")
    .collection("house collection");

  await usersCollection.createIndex({ userEmail: 1 }, { unique: true });

  try {
    //jwt user token
    app.get("/jwt", async (req, res) => {
      const { email } = req.query;
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "20d",
      });
      res.send({ accessToken: token });
    });

    // Save users info in db
    app.post("/register", async (req, res) => {
      const user = req.body;
      const hashedPassword = await bcrypt.hash(user.userPass, 10);
      user.userPass = hashedPassword;
      try {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        if (error.code === 11000) {
          res.json({ error: "User with the same email already exists" });
        } else {
          res.json({ error: "Registration failed" });
        }
      }
    });

    //get user info from db
    app.post("/login", async (req, res) => {
      const userReq = req.body;
      const { email, password } = userReq;
      const user = await usersCollection.findOne({ userEmail: email });
      if (user) {
        const passwordMatch = await bcrypt.compare(password, user.userPass);
        if (passwordMatch) {
          res.json({ acknowledged: true });
        } else {
          res.json({ error: "Incorrect Credentials" });
        }
      } else {
        res.json({ error: "No Record Existed" });
      }
    });

    //check buyer role
    app.get("/buyer", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = {
        userEmail: email,
      };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === "House Renter" });
    });

    //check seller role
    app.get("/seller", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = {
        userEmail: email,
      };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "House Owner" });
    });

    //current user check
    app.get("/currentUser", async (req, res) => {
      const userEmail = req.query.email;
      try {
        const user = await usersCollection.findOne({ userEmail });
        if (user) {
          res.json({ email: user.userEmail });
        } else {
          res.status(404).json({ error: "User not found" });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //add house
    app.post("/addHouse", async (req, res) => {
      const house = req.body;
      const upload = await houseCollection.insertOne(house);
      res.send(upload);
    });

    // get my house
    app.get("/my-houses", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await houseCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/my-houses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await houseCollection.findOne(query);
      res.send(result);
    });

    app.put("/update-house/:id", async (req, res) => {
      const houseId = req.params.id;
      const updatedHouseData = req.body;
      try {
        const result = await houseCollection.updateOne(
          { _id: new ObjectId(houseId) },
          { $set: updatedHouseData }
        );

        if (result.modifiedCount === 1) {
          res.json({ acknowledged: true });
        } else {
          res.status(404).json({ error: "House not found" });
        }
      } catch (error) {
        console.error("Error updating house:", error);
        res.status(500).json({ error: "Could not update house" });
      }
    });

    // delete house
    app.delete("/delete-house/:id", async (req, res) => {
      const deleteId = req.params.id;
      const query = {
        _id: new ObjectId(deleteId),
      };
      const result = await houseCollection.deleteOne(query);
      res.send(result);
    });
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
