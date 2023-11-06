const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;



// middilware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m4j1j7e.mongodb.net/?retryWrites=true&w=majority`;

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

    const databaseName = client.db('onlineGroupStudy');
    const usersCollection = databaseName.collection('users');


    // add user info to database
    app.post('/users', async(req, res) => {
      try{
        const user = req.body;
        console.log(user);
        const result = await usersCollection.insertOne(user)
        res.send(result);
      } catch (error) {
        console.error('error fatecing user data: ', error);
        res.status(500).json({error: 'Internal server error'})
      }
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Online group study server is running')
})

app.listen(port, () => {
    console.log(`online group study server is running on port: ${port}`);
})
