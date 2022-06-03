const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const validate = require('../utils/validation')

const authentication = (req, res, next) => {
  try {
    let bearerHeader = req.headers.authorization;
    if(typeof bearerHeader == "undefined") return res.status(400).send({ status: false, message: "Token is missing" });
    
    let bearerToken = bearerHeader.split(' ')
    let token = bearerToken[1];
    jwt.verify(token, "Products-Management", function (err,data) {
      if(err) {
        return res.status(400).send({ status: false, message: err.message })
      }else {
        req.decodedToken = data;
        next()
      }
    });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

const authorization = async (req, res, next) => {
  try {
    let loggedInUser = req.decodedToken.userId;
    let loginUser;
    
    if(req.params?.userId){
      if(!validate.isValidObjectId(req.params.userId)) return res.status(400).send({ status: false, message: "Enter a valid user Id" })
      let checkUserId = await User.findById(req.params.userId);
      if(!checkUserId) return res.status(404).send({ status: false, message: "User not found" });
      loginUser = checkUserId._id.toString();
    }

    if(!loginUser) return res.status(400).send({ status: false, message: "User-id is required" })

    if(loggedInUser !== loginUser) return res.status(403).send({ status: false, message: "Error!! authorization failed" });
    next();
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

module.exports = { authentication, authorization }
