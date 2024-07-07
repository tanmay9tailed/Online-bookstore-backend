require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;
const uri = process.env.MONGODB_URI;

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
  res.send(`Express App Listening on PORT -> ${port}`);
});

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const bookCollections = client.db("BookInventory").collection("books");
    const userDataCollections = client.db("User").collection("UserData");
    const reviewCollections = client.db("Reviews").collection("review");

    app.post("/upload-book", async (req, res) => {
      const data = req.body;
      const result = await bookCollections.insertOne(data);
      res.send(result);
    });

    app.patch("/book/:id", async (req, res) => {
      const id = req.params.id;
      const updateBookData = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...updateBookData,
        },
      };
      const result = await bookCollections.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.delete("/book/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bookCollections.deleteOne(filter);
      res.send(result);
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bookCollections.findOne(filter);
      res.send(result);
    });

    app.get("/all-books", async (req, res) => {
      let query = {};
      if (req.query?.category) {
        query = { category: req.query.category };
      }
      const result = await bookCollections.find(query).toArray();
      res.send(result);
    });

    app.post("/createUser", async (req, res) => {
      try {
        const { email, password, username } = req.body;
        const result = await userDataCollections.insertOne({ email, password, username });
        res.status(200).send({ userId: result.insertedId });
      } catch (error) {
        res.status(500).send({ message: 'Failed to create user' });
        console.log(error);
      }
    });

    app.post("/submit-review", async (req, res) => {
      try {
        const data = req.body;
        console.log(data)
        const result = await reviewCollections.insertOne(data);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to submit review" });
      }
    });

    app.get("/getReviews", async (req, res) => {
      let query = {};
      if (req.query?.category) {
        query = { category: req.query.category };
      }
      const result = await reviewCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/getUserData/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userDataCollections.findOne(filter);
      res.send(result);
    });

    app.post("/upload-profile", async (req, res) => {
      try {
        const { userId, location, age, work, dob, description } = req.body;
        const result = await userDataCollections.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              location,
              age,
              work,
              dob,
              description,
            },
          }
        );
        res.status(200).send({ message: 'Profile updated successfully' });
      } catch (error) {
        res.status(500).send({ message: 'Failed to update profile' });
      }
    });

    app.put("/updateUserProfile", async (req, res) => {
      try {
        const { userId, ...updateData } = req.body;
        if (!ObjectId.isValid(userId)) {
          return res.status(400).send({ message: 'Invalid user ID' });
        }
        const result = await userDataCollections.updateOne(
          { _id: new ObjectId(userId) },
          { $set: updateData },
          { projection: { username: 0, email: 0 } } 
        );
        if (result.matchedCount === 0) {
          res.status(404).send({ message: 'User not found' });
        } else {
          res.status(200).send({ message: 'User profile updated successfully' });
        }
      } catch (error) {
        res.status(500).send({ message: 'Failed to update user profile' });
        console.log(error);
      }
    });

    app.post("/check-username", async (req, res) => {
      try {
        const { username } = req.body;
        const user = await userDataCollections.findOne({ username });
        // console.log(user)
        if (user) {
          res.status(200).send({ exists: true });
        } else {
          res.status(200).send({ exists: false });
        }
      } catch (error) {
        res.status(500).send({ message: "Failed to check username" });
      }
    });

    app.post("/login", async (req, res) => {
      try {
        const { username, password } = req.body;
        const user = await userDataCollections.findOne({ username });
        if (user && password === user.password) {
          res.status(200).send({ userId: user._id });
        } else {
          res.status(400).send({ message: "Invalid username or password" });
        }
      } catch (error) {
        res.status(500).send({ message: "Failed to login" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Express App Listening on PORT -> ${port}`);
});
