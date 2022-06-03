const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const route = require('./routes/route');

const app = express();
const upload = multer();

app.use(upload.any());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb+srv://Uranium-Batch:aruSjkdGdfhc9MRK@functionup.eel5r.mongodb.net/group45Database?retryWrites=true&w=majority', {
  useNewUrlParser: true
})
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.log("Error connecting to mongoDB: ", err));

app.use('/', route);

app.listen(process.env.PORT || 3000, function() {
  console.log('Application is running at PORT:',process.env.PORT||3000)
})