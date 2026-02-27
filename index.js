const express = require("express");
const app = express();
const cors = require("cors");
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

      // --------------users api---------------
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
      app.get('/users', async (req,res)=>{
        const result = await userCollection.find().toArray();
        res.send(result);
      })

      // -------------Employee Works relaterd api-----------
      // add new work
      app.post('/works', async (req, res) =>{
        const work = req.body;
        const result = await workCollection.insertOne(work);
        res.send(result);
      })

    // Get works for a specific employee
      app.get('/works', async (req, res) => {
        const  email = req.query.email;
        const query = {email: email};
        const result = await workCollection.find(query).toArray();
        res.send(result);
      })

      // app.get('/works/:id',async (res,req)=>{
      //   const id = res.params.id;
      //   const query = {_id : new ObjectId(id)}
      //   const result = await workCollection.findOne(query);
      //   res.sen(result)
      // })
      // Update work by ID
      app.patch("/works/:id", async (req,res)=>{
      try{
        const id = req.params.id;
        const updateData = req.body;
        const query = { _id: new ObjectId(id)};
        const updateDoc = {
            $set:{
              task:updateData.task,
              workHour:updateData.workHour,
              date:updateData.date
            }
          };
        const result = await workCollection.updateOne(query,updateDoc);
          res.send(result);
        }catch(err){
          console.log(err);
          res.status(500).send({
            message:"Update Failed"
          });
        }
      });

      // Delete work by ID
      app.delete('/works/:id', async (req, res) => {
        const  id  = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await workCollection.deleteOne(query);
        res.send(result);

        // try {
        //   const result = await workCollection.deleteOne({ _id: new ObjectId(id) });
        //   res.send(result); // result.deletedCount will be 1 if deleted
        // } catch (err) {
        //   console.error(err);
        //   res.status(500).send({ error: 'Failed to delete work' });
        // }
      });

      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }finally {
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