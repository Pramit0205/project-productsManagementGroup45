const User = require('../models/userModel');
const validate = require('../utils/validation');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const { uploadFile } = require('../utils/awsUpload');

const createUser = async (req, res) => {
  try {
    let data = req.body;
    let files = req.files;

    //validating the request body 
    if (validate.isValidBody(data)) return res.status(400).send({ status: false, message: "Enter details to create your account" });

    //checking for fname
    if (validate.isValid(data.fname)) return res.status(400).send({ status: false, message: "First name is required and should not be an empty string" });

    //checking for lname
    if (validate.isValid(data.lname)) return res.status(400).send({ status: false, message: "Last name is required and should not be an empty string" });

    //checking for email-id
    if (!data.email) return res.status(400).send({ status: false, message: "User email-id is required" });

    //checking for user profile-pic
    if (files.length == 0) return res.status(400).send({ status: false, message: "Please upload profile image" });

    //checking for phone number
    if (!data.phone) return res.status(400).send({ status: false, message: "User phone number is required" });

    //checking for password
    if (!data.password) return res.status(400).send({ status: false, message: "Password is required" });

    //checking for address 
    if (!data.address) return res.status(400).send({ status: false, message: "Address is required" });

    //converting string to JSON
    data.address = JSON.parse(data.address)

    //validating the address
    if (validate.isValid(data.address)) return res.status(400).send({ status: false, message: "Address should be in object and must contain shipping and billing addresses" });

    //validating the shipping address
    if (validate.isValid(data.address.shipping)) return res.status(400).send({ status: false, message: "Shipping address should be in object and must contain street, city and pincode" });

    //checking for street shipping address
    if (validate.isValid(data.address.shipping.street)) return res.status(400).send({ status: false, message: "Street is required of shipping address and should not be empty string" });

    //checking for city shipping address
    if (validate.isValid(data.address.shipping.city)) return res.status(400).send({ status: false, message: "City is required of shipping address and should not be empty string" });

    //checking for pincode shipping address
    if (validate.isValid(data.address.shipping.pincode)) return res.status(400).send({ status: false, message: "Pincode is required of shipping address and should not be an empty string" });

    if (!validate.isValidString(data.address.shipping.pincode)) return res.status(400).send({ status: false, message: "Pincode should be in numbers" });

    if (!validate.isValidPincode(data.address.shipping.pincode)) return res.status(400).send({ status: false, message: "Enter a valid pincode" });

    //validating the billing address
    if (validate.isValid(data.address.billing)) return res.status(400).send({ status: false, message: "Billing address should be in object and must contain street, city and pincode" });

    //checking for street billing address
    if (validate.isValid(data.address.billing.street)) return res.status(400).send({ status: false, message: "Street is required of billing address and should not be empty string" });

    //checking for city billing address
    if (validate.isValid(data.address.billing.city)) return res.status(400).send({ status: false, message: "City is required of billing address and should not be empty string" });

    //checking for pincode billing address
    if (validate.isValid(data.address.billing.pincode)) return res.status(400).send({ status: false, message: "Pincode is required of billing address and should not be an empty string" });

    if (!validate.isValidString(data.address.billing.pincode)) return res.status(400).send({ status: false, message: "Pincode should be in numbers" });

    if (!validate.isValidPincode(data.address.billing.pincode)) return res.status(400).send({ status: false, message: "Enter a valid pincode" });

    //validating fname
    if (validate.isValidString(data.fname)) return res.status(400).send({ status: false, message: "Enter a valid first name and should not contain numbers" });

    //validating lname
    if (validate.isValidString(data.lname)) return res.status(400).send({ status: false, message: "Enter a valid last name and should not contain numbers" });

    //validating user email-id
    if (!validate.isValidEmail(data.email)) return res.status(400).send({ status: false, message: "Enter a valid email-id" });

    //validating user phone number
    if (!validate.isValidPhone(data.phone)) return res.status(400).send({ status: false, message: "Enter a valid phone number" });

    //validating user password
    if (!validate.isValidPwd(data.password)) return res.status(400).send({ status: false, message: "Password should be 8-15 characters long and must contain one of 0-9,A-Z,a-z and special characters" });

    //checking if email already exist or not
    let checkEmail = await User.findOne({ email: data.email });
    if (checkEmail) return res.status(400).send({ status: false, message: "Email already exist" });

    //checking if phone number already exist or not
    let checkPhone = await User.findOne({ phone: data.phone });
    if (checkPhone) return res.status(400).send({ status: false, message: "Phone number already exist" });

    //getting the AWS-S3 link after uploading the user's profileImage
    let profileImgUrl = await uploadFile(files[0]);
    data.profileImage = profileImgUrl;
    
    //hashing the password with bcrypt
    data.password = await bcrypt.hash(data.password, 10);

    let responseData = await User.create(data);
    res.status(201).send({ status: true, message: "User created successfully", data: responseData })
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

const loginUser = async function (req, res) {
  try {
    let data = req.body;
    if(validate.isValidBody(data)) return res.status(400).send({ status: false, message: "Email and Password is required to login" });

    const { email, password } = data;

    //checking for email-id
    if (!email) return res.status(400).send({ status: false, message: "User email-id is required" });

    //checking for password
    if (!password) return res.status(400).send({ status: false, message: "User password is required" });

    //validating user email-id
    if (!validate.isValidEmail(email)) return res.status(400).send({ status: false, message: "Enter a valid email-id" });
    
    // finding the user
    let user = await User.findOne({ email })
    if (!user) return res.status(404).send({ status: false, message: "User does not exist" })
    
    // password checking
    let actualPassWord = await bcrypt.compare(password, user.password);
    
    if (!actualPassWord) return res.status(400).send({ status: false, message: "Incorrect password" })

    // Token Generation
    let token = jwt.sign({ userId: user._id }, "Products-Management", {expiresIn: '1d'});

    res.status(200).send({ status: true, message: "User login successfully", data: { userId: user._id, token: token } })
  }catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

const getUser = async (req, res) => {
  try{
    let userId = req.params.userId;
  
    //getting the user document
    const user = await User.findOne({ _id: userId})
    return res.status(200).send({ status: true, message: 'User Profile Details', data: user})
  }catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

const updateUserProfile = async (req, res) => {
  try {
    let userId = req.params.userId;
    let data = req.body;
    let files = req.files;
    
    //getting the AWS-S3 link after uploading the user's profileImage
    if(files && files.length>0){
      let profileImgUrl = await uploadFile(files[0]);
      data.profileImage = profileImgUrl;
    }

    //validating the request body 
    if (validate.isValidBody(data)) return res.status(400).send({ status: false, message: "Enter details to update your account" });

    //getting the user document
    let userProfile = await User.findById(userId);

    if(data?.fname || typeof data.fname == 'string') {
      //checking for fname
      if (validate.isValid(data.fname)) return res.status(400).send({ status: false, message: "First name is required and should not be an empty string" });

      //validating fname
      if (validate.isValidString(data.fname)) return res.status(400).send({ status: false, message: "Enter a valid first name and should not contain numbers" });
    }

    if(data?.lname || typeof data.lname == 'string') {
      //checking for lname
      if (validate.isValid(data.lname)) return res.status(400).send({ status: false, message: "Last name is required and should not be an empty string" });

      //validating lname
      if (validate.isValidString(data.lname)) return res.status(400).send({ status: false, message: "Enter a valid last name and should not contain numbers" });
    }

    //validating user email-id
    if (data?.email && (!validate.isValidEmail(data.email))) return res.status(400).send({ status: false, message: "Enter a valid email-id" });

    //validating user phone number
    if (data?.phone && (!validate.isValidPhone(data.phone))) return res.status(400).send({ status: false, message: "Enter a valid phone number" });

    if(data?.password || typeof data.password == 'string') {
    //validating user password
      if (!validate.isValidPwd(data.password)) return res.status(400).send({ status: false, message: "Password should be 8-15 characters long and must contain one of 0-9,A-Z,a-z and special characters" });

      //hashing the password with bcrypt
      data.password = await bcrypt.hash(data.password, 10);
    }

    //checking if email already exist or not
    let checkEmail = await User.findOne({ email: data.email });
    if (checkEmail) return res.status(400).send({ status: false, message: "Email already exist" });

    //checking if phone number already exist or not
    let checkPhone = await User.findOne({ phone: data.phone });
    if (checkPhone) return res.status(400).send({ status: false, message: "Phone number already exist" });

    if(data?.address) {
      //validating the address
      if (validate.isValid(data.address)) return res.status(400).send({ status: false, message: "Address should be in object and must contain shipping and billing addresses" });

      //converting string to JSON
      data.address = JSON.parse(data.address)
      
      let tempAddress = JSON.parse(JSON.stringify(userProfile.address))

      if(data.address?.shipping) {
        //validating the shipping address
        if (validate.isValid(data.address.shipping)) return res.status(400).send({ status: false, message: "Shipping address should be in object and must contain street, city and pincode" });

        if(data.address.shipping?.street){
          if (validate.isValid(data.address.shipping.street)) return res.status(400).send({ status: false, message: "Street of shipping address should be valid and not an empty string" });

          tempAddress.shipping.street = data.address.shipping.street 
        }

        //checking for city shipping address
        if (data.address.shipping?.city) {
          if (validate.isValid(data.address.shipping.city)) return res.status(400).send({ status: false, message: "City of shipping address should be valid and not an empty string" });

          tempAddress.shipping.city = data.address.shipping.city
        }

        //checking for pincode shipping address
        if (data.address.shipping?.pincode) {
          if (validate.isValid(data.address.shipping.pincode)) return res.status(400).send({ status: false, message: "Pincode of shipping address and should not be an empty string" });

          if (!validate.isValidString(data.address.shipping.pincode)) return res.status(400).send({ status: false, message: "Pincode should be in numbers" });

          if (!validate.isValidPincode(data.address.shipping.pincode)) return res.status(400).send({ status: false, message: "Enter a valid pincode" });

          tempAddress.shipping.pincode = data.address.shipping.pincode;
        }
      }

      if(data.address?.billing) {
        //validating the shipping address
        if (validate.isValid(data.address.billing)) return res.status(400).send({ status: false, message: "Shipping address should be in object and must contain street, city and pincode" });

        if(data.address.billing?.street){
          if (validate.isValid(data.address.billing.street)) return res.status(400).send({ status: false, message: "Street of billing address should be valid and not an empty string" });

          tempAddress.billing.street = data.address.billing.street 
        }

        //checking for city billing address
        if (data.address.billing?.city) {
          if (validate.isValid(data.address.billing.city)) return res.status(400).send({ status: false, message: "City of billing address should be valid and not an empty string" });

          tempAddress.billing.city = data.address.billing.city
        }

        //checking for pincode billing address
        if (data.address.billing?.pincode) {
          if (validate.isValid(data.address.billing.pincode)) return res.status(400).send({ status: false, message: "Pincode of billing address and should not be an empty string" });

          if (!validate.isValidString(data.address.billing.pincode)) return res.status(400).send({ status: false, message: "Pincode should be in numbers" });

          if (!validate.isValidPincode(data.address.billing.pincode)) return res.status(400).send({ status: false, message: "Enter a valid pincode" });

          tempAddress.billing.pincode = data.address.billing.pincode;
        }
      }

      data.address = tempAddress;
    }

    let updateUser = await User.findOneAndUpdate(
      {_id: userId},
      data,
      {new: true}
    )
    res.status(200).send({ status: true, message: "User profile updated", data: updateUser });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

module.exports = { createUser, loginUser,  getUser, updateUserProfile }

