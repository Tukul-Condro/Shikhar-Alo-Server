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
    const payrollCollection = client.db("ShikharAloDB").collection("payroll");

    // --------------users api---------------
    // add new user basd on exists email
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

    // get all users data
    app.get('/users', async (req,res)=>{
        const result = await userCollection.find().toArray();
        res.send(result);
      })

    // get single user data
    app.get('/users/:id', async(req,res) =>{
      const id = req.params.id;
      const result = await userCollection.findOne({_id: new ObjectId(id)});
      res.send(result);
    })
    // get user by email (for login check)
    app.get('/users/email/:email', async (req, res) => {
      const email = req.params.email;
      try {
        const user = await userCollection.findOne({ email });
        if (!user) return res.status(404).send({ error: "User not found" });
        res.send(user);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch user" });
      }
    });

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
        let query = {};
        if(email){
           query = {email: email};
        }
        const result = await workCollection.find(query).toArray();
        res.send(result);
      })
      
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
      });

               //------------------- payment by HR related api --------------------
// make payment  api and check duplicate month
    app.post('/payroll', async(req, res) =>{
      const payroll = req.body;
      
      const query ={
        email: payroll.email,
        month: payroll.month,
        year: payroll.year
      }
      // check duplicate payment
      const existing = await payrollCollection.findOne(query);
      if (existing) {
        return res.send({
          success: false,
          message: "Salary already requested for this month"
        });
      }

      const result = await payrollCollection.insertOne(payroll);
      res.send({ success: true, result })
    })

    app.get('/payroll', async(req, res) => {
      const result = await payrollCollection.find().toArray();
      res.send(result);
    })

    app.get('/payroll/:id', async(req, res) =>{
      try {
    const id = req.params.id; // get employeeId from URL
    console.log("Searching payroll for employeeId:", id);

    const result = await payrollCollection.find({ employeeId: id }).sort({ year: 1, month: 1, createdAt: -1 }).toArray();

    console.log("Found payroll:", result);
    res.send(result);
  } catch (error) {
    console.error("Error fetching payroll:", error);
    res.status(500).send({ error: "Failed to fetch payroll" });
  }
    })

  // verifief employee by HR
  app.patch('/users/:id/verify', async(req, res) =>{
      try{
        const id = req.params.id;
        const user = await userCollection.findOne({_id: new ObjectId(id)});
      
      const currentStatus = user?.isVerified || false;

      const updateStatus = !currentStatus;
      const result = await userCollection.updateOne({_id: new ObjectId(id)}, { $set: {isVerified: updateStatus }});
      res.send({
        modifiedCount: result.modifiedCount,
        isVerified: updateStatus
      });
      } catch(err){
        console.log(err);
        res.status(500).send({ message: "Failed to update verification" })
      }
  }) 

                 // --------------------ADMIN related api-------------------

// payment paid api by Admin
app.patch('/payroll/pay/:id', async(req,res) =>{
  const id = req.params.id;
  const filter = {_id : new ObjectId(id)};
  const updateDoc = {
    $set:{
      status:'paid',
      date: new Date()
    }
  }
  const result = await payrollCollection.updateOne(filter, updateDoc)
  res.send(result);
})

// adjust salary api
app.patch('/payroll/salary/:id', async(req, res) =>{
  const id = req.params.id;
  const {salary} = req.body;
  const payroll = await payrollCollection.findOne({_id: new ObjectId(id)});
    // prevent change if already paid
  if (payroll.status === "paid") {
    return res.send({
      success: false,
      message: "Salary already paid. Cannot adjust."
    });
  }
  // check salary is less than increas
  if(salary <= payroll.salary){
    return res.send({
      success: false,
      message: "salary can only be increased"
    })
  }
  const result = await payrollCollection.updateOne( {_id: new ObjectId(id)}, { $set:{salary: salary}} )
  res.send({success: true, result});
})

// made fire a user
app.patch('/users/fire/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { fired: true } }
    );
    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to fire user" });
  }
});

 //-----server connected  message-- Send a ping to confirm a successful connection--------
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