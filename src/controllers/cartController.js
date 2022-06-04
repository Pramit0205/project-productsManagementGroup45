const Cart = require("../models/cartModel");
const Product = require('../models/productModel');
const validate = require('../utils/validation');

const addCart = async (req, res) => {
  try {
    let userId = req.params.userId;
    let data = req.body;
    
    //checking for a valid user input
    if(validate.isValid(data)) return res.status(400).send({ status: false, message: "Details is required to add products in your cart" });


    if(data?.totalPrice || data?.totalItems || typeof data.totalPrice == 'string' || typeof data.totalItems == 'string') return res.status(400).send({ status: false, message: "Cannot change or update total price or total items value" })

    //checking if userId exist or not
    let checkCart = await Cart.findOne({ userId: userId });

    //validating the cartId
    if(data?.cartId || typeof data.cartId == 'string'){
      if(validate.isValid(data.cartId)) return res.status(400).send({ status: false, message: "Enter a valid cartId" });
      if(!validate.isValidObjectId(data.cartId)) return res.status(400).send({ status: false, message: "Enter a valid cartId" });
      if(checkCart._id.toString() !== data.cartId) return res.status(400).send({ status: false, message: "CartId is invalid" })
    }

    if(!checkCart) {
     
      if(!validate.isValidObjectId(data.productId)) return res.status(400).send({ status: false, message: "Enter a valid product Id" });

      //checking if product exist and not been deleted
      let checkProduct = await Product.findOne({_id: data.productId, isDeleted: false});
      if(!checkProduct) return res.status(404).send({ status: false, message: `No product found with this '${data.productId}' productId` });
      let createData = { userId: userId }

      createData.items = [];
      createData.items[0] = {}
      createData.items[0].productId = data.productId

      if(data?.quantity || typeof data.quantity == 'string') {
        //validating the quantity of product
        if(validate.isValid(data.quantity)) return res.status(400).send({ status: false, message: "Enter a valid value for quantity" });
        if(!validate.isValidNum(data.quantity)) return res.status(400).send({ status: false, message: "Quantity of product should be in numbers" })

        createData.items[0].quantity = Number(data.quantity)
        createData.totalPrice = checkProduct.price * Number(data.quantity);
      }else{
        createData.items[0].quantity = 1
        createData.totalPrice = checkProduct.price
      }
      
      createData.totalItems = createData.items.length;
      await Cart.create(createData);
      let resData = await Cart.findOne({ userId }).populate('items.productId')
      return res.status(201).send({ status: true, message: "Success", data: resData })
    }

    if(!validate.isValidObjectId(data.productId)) return res.status(400).send({ status: false, message: "Enter a valid product Id" });

    //checking if product exist and not been deleted
    let checkProduct = await Product.findOne({_id: data.productId, isDeleted: false});
    if(!checkProduct) return res.status(404).send({ status: false, message: `No product found with this '${data.productId}' productId` });

    let tempCart = checkCart;

    if(data?.quantity || typeof data.quantity == 'string') {
      //validating the quantity of product
      if(validate.isValid(data.quantity)) return res.status(400).send({ status: false, message: "Enter a valid value for quantity" });
      if(!validate.isValidNum(data.quantity)) return res.status(400).send({ status: false, message: "Quantity of product should be in numbers" })
      data.quantity = Number(data.quantity);
    }else{
      data.quantity = 1
    }

    //check if productId already exist in database or not
    tempCart.items.map(x => {
      if(x.productId.toString() == data.productId) {
        x.quantity += data.quantity;
        tempCart.totalPrice += checkProduct.price * data.quantity
      }
    })

    //check for the product that doesn't exist in the items
    let checkProductId = await Cart.findOne({_id: checkCart._id, 'items.productId': {$in: [data.productId]}})
    if(!checkProductId) {
      let newItem = {
        productId: data.productId,
        quantity: data.quantity
      }
      tempCart.items.push(newItem);
      tempCart.totalPrice += checkProduct.price * data.quantity
    }

    tempCart.totalPrice = tempCart.totalPrice.toFixed(2);
    tempCart.totalItems = tempCart.items.length

    let updateCart = await Cart.findByIdAndUpdate(
      {_id: checkCart._id},
      tempCart, 
      {new: true}
    ).populate('items.productId')
    res.status(201).send({ status: true, message: "Success", data: updateCart })
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

const updateCart = async (req, res) => {
  try {
    let userId = req.params.userId;

    //checking for a valid user input
    let findCart = await Cart.findOne({ userId: userId });
    if(!findCart) return res.status(404).send({ status: false, message: `No cart found with this '${userId}' userId` });

    //checking is cart is empty or not
    if(findCart.items.length == 0) return res.status(400).send({ status: false, message: "Cart is already empty" });

    let data = req.body;

    //checking for a valid user input
    if(validate.isValid(data)) return res.status(400).send({ status: false, message: "Details is required to remove products from your cart" });

    //restrict user from updating totalPrice or totalItems
    if(data?.totalPrice || data?.totalItems || typeof data.totalPrice == 'string' || typeof data.totalItems == 'string') return res.status(400).send({ status: false, message: "Cannot change or update total price or total items value" });

    //validating the cartId
    if(data?.cartId || typeof data.cartId == 'string'){
      if(validate.isValid(data.cartId)) return res.status(400).send({ status: false, message: "Enter a valid cartId" });
      if(!validate.isValidObjectId(data.cartId)) return res.status(400).send({ status: false, message: "Enter a valid cartId" });
      if(findCart._id.toString() !== data.cartId) return res.status(400).send({ status: false, message: "CartId is invalid" })
    }

    //checking if productId is valid or not
    if(validate.isValid(data.productId)) return res.status(400).send({ status: false, message: "ProductId is required" });
    if(!validate.isValidObjectId(data.productId)) return res.status(400).send({ status: false, message: "ProductId should be valid" });
    
    //checking if productId exist or not in Product Collection
    let checkProduct = await Product.findById({ _id: data.productId });
    if(!checkProduct) return res.status(404).send({ status: false, message: `No product found with this '${data.productId}' productId` });

    //checking if productId exist or not in Cart Collection
    let checkProductId = await Cart.findOne({ _id: findCart._id, 'items.productId': {$in: [data.productId]} });
    if(!checkProductId) return res.status(404).send({ status: false, message: `No product found in the cart with this '${data.productId}' productId` }); 

    //checking for valid removeProduct value
    if(data.removeProduct == undefined) return res.status(400).send({ status: false, message: "removeProduct is required" });
    
    if(!(/0|1/.test(data.removeProduct))) return res.status(400).send({ status: false, message: "removeProduct should be 0 or 1 in numbers" });

    //copy the cart from database
    let tempCart = findCart;

    //removing product from cart
    tempCart.items.map(x => {
      let getIndex = tempCart.items.indexOf(x);
      if(x.productId.toString() == data.productId) {
        if(data.removeProduct == 0) {
          
          tempCart.items.splice(getIndex, 1);
          tempCart.totalPrice -= x.quantity * checkProduct.price 
          
        }else if(data.removeProduct == 1) {
          x.quantity -= 1
          tempCart.totalPrice -= checkProduct.price
        }
      }

      if(x.quantity == 0) {
        tempCart.items.splice(getIndex, 1);
      }      
    })

    //updating totalPrice and totalItems
    if(tempCart.items.length == 0) {
      tempCart.items = [];
      tempCart.totalItems = 0;
      tempCart.totalPrice = 0;
    }else {
      tempCart.totalPrice = tempCart.totalPrice.toFixed(2);
      tempCart.totalItems = tempCart.items.length;
    }
    
  
    let getUpdatedCart = await Cart.findByIdAndUpdate(
      {_id: findCart._id},
      tempCart,
      {new: true}
    ).populate('items.productId')

    res.status(200).send({ status: true, message: "Success", data: getUpdatedCart });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
}

const getCart = async (req, res) =>{
  try {
    let userId = req.params.userId;

    //checking if the cart exist with this userId or not
    let findCart = await Cart.findOne({ userId: userId }).populate('items.productId');
    if(!findCart) return res.status(404).send({ status: false, message: `No cart found with this "${userId}" userId` });

    res.status(200).send({ status: true, message: "Success", data: findCart })
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

const deleteCart = async (req, res) =>{
  try {
    let userId = req.params.userId;

    //checking if the cart exist with this userId or not
    let findCart = await Cart.findOne({ userId: userId });
    if(!findCart) return res.status(404).send({ status: false, message: `No cart found with this "${userId}" userId` });

    //checking for an empty cart
    if(findCart.items.length == 0) return res.status(400).send({ status: false, message: "Cart is already empty" });

    await Cart.updateOne(
      {_id: findCart._id},
      {items: [], totalPrice: 0, totalItems: 0},
    )

    res.status(204).send({ status: true, message: "Success"})
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

module.exports = { addCart, updateCart, getCart, deleteCart }