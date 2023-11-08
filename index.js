const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// middilware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175' 
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m4j1j7e.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// my created middileware
const logger = async (req, res, next) => {
  console.log('called:', req.host, req.originalUrl)
  next();
}

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const databaseName = client.db('onlineGroupStudy');
    const usersCollection = databaseName.collection('users');
    const assignmentsCollection = databaseName.collection('assignments');
    const submittedAssignmentCollection = databaseName.collection('submittedAssignments')

    // auth related api
    app.post('/jwt', logger, async (req, res) => {
      try {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1h'
        });

        res
          .cookie('token', token, {
            httpOnly: true,
            secure: false,
          })
          .send({ success: true })
      } catch (error) {
        console.error('Error getting token: ', error);
        res.status(500).json({ message: 'Internal server error' });
      }

    });


    // get assignments api
    app.get('/assignments', async (req, res) => {
      try {
        const cursor = assignmentsCollection.find();
        const result = await cursor.toArray();
        res.status(200).json(result);
      } catch (error) {
        console.error('Error getting assignments data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // get assignments  based on difficulty level api
    app.get(`/assignments/filteredAssignments/:difficultyLevel`, async (req, res) => {
      try {
        const { difficultyLevel } = req.params;
        const cursor = assignmentsCollection.find({ difficultyLevel });
        const result = await cursor.toArray();
        res.status(200).json(result);
      } catch (error) {
        console.error('Error getting assignments based on difficulty level data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // get assignment details api
    app.get('/assignments/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await assignmentsCollection.findOne(query);
        res.status(200).json(result);
      } catch (error) {
        console.error('Error getting assignment data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // get pending assignments
    app.get('/submittedAssignments', async (req, res) => {
      try {
        const status = 'pending';
        const pendingAssignments = await submittedAssignmentCollection.find({ status }).toArray();
        res.status(200).json(pendingAssignments);
      } catch (error) {
        console.error('Error getting pending assignment data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // get my assignments
    app.get('/submittedAssignments/myAssignment/:email', async (req, res) => {
      try {
        const examineeEmail = req.params.email;
        const myAssignments = await submittedAssignmentCollection.find({ examineeEmail }).toArray();
        res.status(200).json(myAssignments);
      } catch (error) {
        console.error('Error getting pending assignment data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // add user info to database
    app.post('/users', async (req, res) => {
      try {
        const user = req.body;
        console.log('Received user data:', user);

        const existingUser = await usersCollection.findOne({ email: user.email });
        if (existingUser) {
          return res.status(400).json({ message: 'Email address is already in use' });
        }
        const result = await usersCollection.insertOne(user);
        console.log(result);
        if (result.acknowledged) {
          res.status(201).json({ message: 'User created successfully' });
        } else {
          res.status(500).json({ message: 'Failed to create user' });
        }
      } catch (error) {
        console.error('Error inserting user data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // create assignment to post database
    app.post('/assignments', async (req, res) => {
      try {
        const newAssignment = req.body;
        const existingAssignment = await assignmentsCollection.findOne({ assignmentTitle: newAssignment.assignmentTitle });
        if (existingAssignment) {
          return res.status(400).json({ message: 'This assignment already exists' });
        }
        const result = await assignmentsCollection.insertOne(newAssignment);
        console.log(result);
        if (result.acknowledged) {
          res.status(201).json({ message: 'Assignment created successfully' });
        } else {
          res.status(500).json({ message: 'Failed to create assignment' });
        }
      } catch (error) {
        console.error('Error inserting assignment data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // submited assignment to post database
    app.post('/assignmentSubmission', async (req, res) => {
      console.log('route run');
      try {

        const assignmentSubmission = req.body;

        const result = await submittedAssignmentCollection.insertOne(assignmentSubmission);
        console.log(result);
        if (result.acknowledged) {
          res.status(201).json({ message: 'Assignment created successfully' });
        } else {
          res.status(500).json({ message: 'Failed to create assignment' });
        }
      } catch (error) {
        console.error('Error inserting assignment data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // delete assignment
    app.delete('/assignments/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await assignmentsCollection.deleteOne(query);
        res.send(result)
      } catch (error) {
        console.error('Error delete assignment data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // update assignment 
    app.patch('/assignments/:id', async (req, res) => {
      try {
        const id = req.params.id;

        const isValidObjectId = ObjectId.isValid(id);

        if (!isValidObjectId) {
          console.error('Invalid ObjectID format:', id);
          return;
        }
        const filter = { _id: new ObjectId(id) }
        const updatedAssignment = req.body;
        const updateDoc = {
          $set: {
            assignmentTitle: updatedAssignment.assignmentTitle,
            marks: updatedAssignment.marks,
            description: updatedAssignment.description,
            difficultyLevel: updatedAssignment.difficultyLevel,
            lastDate: updatedAssignment.lastDate,
            isFeatured: updatedAssignment.isFeatured,
            thumbnailImgURL: updatedAssignment.thumbnailImgURL,
            createdBy: updatedAssignment.createdBy,
            creatorEmail: updatedAssignment.creatorEmail
          }
        };
        const result = await assignmentsCollection.updateOne(filter, updateDoc);
        console.log(result);
        res.status(201).json({ message: 'Assignment updated successfully' });
      } catch (error) {
        console.error('Error updating assignment data:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // update submitted assignment after getting marks
    app.patch('/assignmentSubmission/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const isValidObjectId = ObjectId.isValid(id);

        if (!isValidObjectId) {
          console.error('Invalid ObjectID format:', id);
          return;
        }
        const filter = { _id: new ObjectId(id) }
        const updatedAssignment = req.body;
        const updateDoc = {
          $set: {
            examinerFeedback: updatedAssignment.examinerFeedback,
            obtainedMarks: updatedAssignment.obtainedMarks,
            examinerName: updatedAssignment.examinerName,
            examinerEmail: updatedAssignment.examinerEmail,
            status: updatedAssignment.status,
          }
        };
        const result = await submittedAssignmentCollection.updateOne(filter, updateDoc);
        console.log(result);
        res.status(201).json({ message: 'Submitted Assignment updated with optained marks successfully' });
      } catch (error) {
        console.error('Error updating submitted assignment data:', error);
        res.status(500).json({ message: 'Internal server error' });
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


app.get('/', (req, res) => {
  res.send('Online group study server is running')
})

app.listen(port, () => {
  console.log(`online group study server is running on port: ${port}`);
})
