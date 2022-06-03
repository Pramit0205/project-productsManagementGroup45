const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const cartSchema = new mongoose.Schema({ 
  userId: {type: ObjectId,ref: 'User',required: true,trim: true,},
  items: [{
    productId: {type: ObjectId,ref: 'Product',required: true,trim: true,},
    quantity: {type: Number,required: true,trim: true,min: 1},
    _id: false
  }],
  totalPrice: {type: Number,required: true,trim: true},
  totalItems: {type: Number,required: true,trim: true},
},{timestamps: true});

module.exports = mongoose.model('Cart', cartSchema); //carts