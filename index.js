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
  // res.send("You are on / ");
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
    const cartCollections = client.db("Cart").collection("cart");

    app.post("/upload-book", async (req, res) => {
      try {
        const data = req.body;
        const result = await bookCollections.insertOne(data);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to upload book" });
      }
    });

    app.post("/add-to-cart", async (req, res) => {
      try {
        const data = req.body;
        const result = await cartCollections.insertOne(data);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add to cart" });
      }
    });

    app.patch("/book/:id", async (req, res) => {
      try {
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
      } catch (error) {
        res.status(500).send({ message: "Failed to update book" });
      }
    });

    app.delete("/book/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await bookCollections.deleteOne(filter);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete book" });
      }
    });

    app.get("/book/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await bookCollections.findOne(filter);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch book" });
      }
    });

    app.get("/cart/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { userId: id };
        const result = await cartCollections.find(filter).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch cart items" });
      }
    });

    app.delete("/cart/:userId/:id", async (req, res) => {
      try {
        const userId = req.params.userId;
        const id = req.params.id;
        const filter = { userId: userId, _id: new ObjectId(id) }; // Adjust the filter based on your schema
        const result = await cartCollections.deleteOne(filter);
        res.json({ message: "Item removed from cart successfully", result });
      } catch (error) {
        console.error("Failed to remove item from cart:", error);
        res.status(500).json({ message: "Failed to remove item from cart" });
      }
    });

    app.get("/all-books", async (req, res) => {
      try {
        let query = {};
        if (req.query?.category) {
          query = { category: req.query.category };
        }
        const result = await bookCollections.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch all books" });
      }
    });

    app.post("/createUser", async (req, res) => {
      try {
        const { email, password, username } = req.body;
        const result = await userDataCollections.insertOne({ email, password, username });
        res.status(200).send({ userId: result.insertedId });
      } catch (error) {
        res.status(500).send({ message: "Failed to create user" });
      }
    });

    app.post("/submit-review", async (req, res) => {
      try {
        const data = req.body;
        const result = await reviewCollections.insertOne(data);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to submit review" });
      }
    });

    app.get("/getReviews", async (req, res) => {
      try {
        let query = {};
        if (req.query?.category) {
          query = { category: req.query.category };
        }
        const result = await reviewCollections.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch reviews" });
      }
    });

    app.get("/getUserData/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await userDataCollections.findOne(filter);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch user data" });
      }
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
        res.status(200).send({ message: "Profile updated successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to update profile" });
      }
    });

    app.put("/updateUserProfile", async (req, res) => {
      try {
        const { userId, ...updateData } = req.body;
        if (!ObjectId.isValid(userId)) {
          return res.status(400).send({ message: "Invalid user ID" });
        }
        const result = await userDataCollections.updateOne(
          { _id: new ObjectId(userId) },
          { $set: updateData },
          { projection: { username: 0, email: 0 } }
        );
        if (result.matchedCount === 0) {
          res.status(404).send({ message: "User not found" });
        } else {
          res.status(200).send({ message: "User profile updated successfully" });
        }
      } catch (error) {
        res.status(500).send({ message: "Failed to update user profile" });
      }
    });

    app.post("/check-username", async (req, res) => {
      try {
        const { username } = req.body;
        const user = await userDataCollections.findOne({ username });
        if (user) {
          res.status(200).send({ exists: true });
        } else {
          res.status(200).send({ exists: false });
        }
      } catch (error) {
        res.status(500).send({ message: "Failed to check username" });
      }
    });

    app.post("/check-email", async (req, res) => {
      try {
        const { email } = req.body;
        const user = await userDataCollections.findOne({ email });
        if (user) {
          res.status(200).send({ exists: true });
        } else {
          res.status(200).send({ exists: false });
        }
      } catch (error) {
        res.status(500).send({ message: "Failed to check email" });
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
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.error);

app.listen(port, () => {
  console.log(`Express App Listening on PORT -> ${port}`);
});
