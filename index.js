const express = require("express");
const app = express();
const cors = require("cors");
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4bs6y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("ShikharAloDB").collection("users");
    const workCollection = client.db("ShikharAloDB").collection("works");

    // users api
    app.post('/users', async(req, res) =>{
      const user = req.body;
      // insert email if user dosen't exists:
      // you can do this many ways(1. email unique 2. upsert 3. simple checking)
      const query = {email : user.email}
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already exists', insertedId : null})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    // Employee Works relaterd api
    app.post('/addWorks', async (req, res) =>{
      const work = req.body;
      const result = await workCollection.insertOne(work);
      res.send(result);
    })

  app.get('/works/:email', async (req, res) =>{
  try {
    const email = req.params.email;

    const result = await workCollection
      .find({ email: email })
      .sort({ date: -1 })
      .toArray();

    res.send(result);

  } catch (error) {
    res.status(500).send({ message: "Failed to get works" });
  }
});

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('Shikhar Alo is here')
})

app.listen(port, ()=>{
    console.log(`Shikhar Alo is sitting on port ${port}`);
})